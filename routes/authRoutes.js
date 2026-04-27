const express = require("express");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const { getDb } = require("../lib/billing/db");
const { isSkipAuth } = require("../middleware/requireAuth");
const { getFirebaseAdmin } = require("../lib/firebaseAdmin");

const router = express.Router();
const BCRYPT_ROUNDS = 11;

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    plan: user.plan,
    subscription_status: user.subscription_status,
    is_seller: user.is_seller,
    is_admin: user.is_admin,
  };
}

function newUserBillingParams() {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + Math.max(1, Math.floor(Number(process.env.BILLING_CYCLE_DAYS) || 30)));
  const iso = (d) => d.toISOString();
  return { now: iso(now), end: iso(end) };
}

router.post("/register", async (req, res) => {
  if (isSkipAuth()) {
    return res.status(400).json({ error: "Registro desactivado en modo prueba (SKIP_AUTH)." });
  }
  const email = String((req.body && req.body.email) || "")
    .trim()
    .toLowerCase();
  const password = String((req.body && req.body.password) || "");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Email invalido." });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "La contrasena debe tener al menos 8 caracteres." });
  }
  if (password.length > 200) {
    return res.status(400).json({ error: "Contrasena demasiado larga." });
  }

  try {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  if (existing) {
    if (existing.password_hash) {
      return res.status(409).json({ error: "Ese email ya esta registrado. Inicia sesion." });
    }
    if (existing.google_sub) {
      return res.status(409).json({
        error: "Ese email ya esta asociado a Google. Usa Continuar con Google o otro email.",
      });
    }
    const t = new Date().toISOString();
    db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?"
    ).run(hash, t, existing.id);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(existing.id);
    req.session.userId = user.id;
    req.session.user = publicUser(user);
    return res.json({ ok: true, user: req.session.user });
  }

  const { now, end } = newUserBillingParams();
  const isAdmin = (email === "luisuf@gmail.com") ? 1 : 0;
  const t = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO users (
        email, stripe_customer_id, plan, subscription_status,
        billing_cycle_start, billing_cycle_end,
        included_tokens_limit, included_tokens_used,
        sonnet_payg_enabled, sonnet_monthly_spend_limit, sonnet_monthly_spend_used,
        password_hash, google_sub,
        is_seller, is_admin,
        created_at, updated_at
      ) VALUES (?, NULL, 'free', 'active', ?, ?, 50000, 0, 0, NULL, 0, ?, NULL, 0, ?, ?, ?)`
    )
    .run(email, now, end, hash, isAdmin, t, t);
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  req.session.userId = user.id;
  req.session.user = publicUser(user);
  return res.json({ ok: true, user: req.session.user });
  } catch (err) {
    console.error("[auth/register]", err);
    return res.status(500).json({ error: "Error interno al registrar." });
  }
});

router.post("/login", async (req, res) => {
  if (isSkipAuth()) {
    return res.status(400).json({ error: "Login desactivado en modo prueba (SKIP_AUTH)." });
  }
  const email = String((req.body && req.body.email) || "")
    .trim()
    .toLowerCase();
  const password = String((req.body && req.body.password) || "");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Email invalido." });
  }
  if (!password) {
    return res.status(400).json({ error: "Introduce tu contrasena." });
  }

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    return res.status(401).json({ error: "Email o contrasena incorrectos." });
  }
  if (!user.password_hash) {
    if (user.google_sub) {
      return res.status(401).json({ error: "Esta cuenta usa Google. Pulsa Continuar con Google." });
    }
    return res.status(401).json({ error: "Cuenta sin contrasena. Registrate con el mismo email para definirla." });
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Email o contrasena incorrectos." });
  }

  req.session.userId = user.id;
  req.session.user = publicUser(user);
  return res.json({ ok: true, user: req.session.user });
});

router.post("/google", async (req, res) => {
  if (isSkipAuth()) {
    return res.status(400).json({ error: "Google desactivado en modo prueba (SKIP_AUTH)." });
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ error: "Google Sign-In no esta configurado en el servidor." });
  }
  const credential = String((req.body && req.body.credential) || "");
  if (!credential) {
    return res.status(400).json({ error: "Falta el token de Google." });
  }

  const oauth = new OAuth2Client(clientId);
  let payload;
  try {
    const ticket = await oauth.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: "No se pudo verificar la cuenta de Google." });
  }

  const sub = payload.sub;
  const email = String(payload.email || "")
    .trim()
    .toLowerCase();
  if (!sub || !email) {
    return res.status(400).json({ error: "Google no devolvio datos suficientes." });
  }
  if (payload.email_verified === false) {
    return res.status(403).json({ error: "El email de Google no esta verificado." });
  }

  const db = getDb();
  let user = db.prepare("SELECT * FROM users WHERE google_sub = ?").get(sub);
  if (user) {
    req.session.userId = user.id;
    req.session.user = publicUser(user);
    return res.json({ ok: true, user: req.session.user });
  }

  const byEmail = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (byEmail) {
    if (byEmail.google_sub && byEmail.google_sub !== sub) {
      return res.status(409).json({ error: "Este email ya esta vinculado a otra cuenta de Google." });
    }
    const t = new Date().toISOString();
    db.prepare("UPDATE users SET google_sub = ?, updated_at = ? WHERE id = ?").run(sub, t, byEmail.id);
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(byEmail.id);
    req.session.userId = user.id;
    req.session.user = publicUser(user);
    return res.json({ ok: true, user: req.session.user });
  }

  const { now, end } = newUserBillingParams();
  const isAdmin = (email === "luisuf@gmail.com") ? 1 : 0;
  const t = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO users (
        email, stripe_customer_id, plan, subscription_status,
        billing_cycle_start, billing_cycle_end,
        included_tokens_limit, included_tokens_used,
        sonnet_payg_enabled, sonnet_monthly_spend_limit, sonnet_monthly_spend_used,
        password_hash, google_sub,
        is_seller, is_admin,
        created_at, updated_at
      ) VALUES (?, NULL, 'free', 'active', ?, ?, 50000, 0, 0, NULL, 0, NULL, ?, 0, ?, ?, ?)`
    )
    .run(email, now, end, sub, isAdmin, t, t);
  user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  req.session.userId = user.id;
  req.session.user = publicUser(user);
  res.json({ ok: true, user: req.session.user });
});

router.post("/firebase", async (req, res) => {
  if (isSkipAuth()) {
    return res.status(400).json({ error: "Firebase login desactivado en modo prueba." });
  }
  const token = String((req.body && req.body.token) || "");
  if (!token) return res.status(400).json({ error: "Falta el token de Firebase." });

  let decodedToken;
  try {
    const admin = getFirebaseAdmin();
    decodedToken = await admin.auth().verifyIdToken(token);
  } catch (err) {
    return res.status(401).json({ error: "Token de Firebase invalido." });
  }

  const email = String(decodedToken.email || "").trim().toLowerCase();
  const sub = decodedToken.uid;
  if (!email || !sub) {
    return res.status(400).json({ error: "Token sin email o uid." });
  }

  const db = getDb();
  let user = db.prepare("SELECT * FROM users WHERE google_sub = ?").get(sub);
  if (user) {
    req.session.userId = user.id;
    req.session.user = publicUser(user);
    return res.json({ ok: true, user: req.session.user });
  }

  const byEmail = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (byEmail) {
    const t = new Date().toISOString();
    db.prepare("UPDATE users SET google_sub = ?, updated_at = ? WHERE id = ?").run(sub, t, byEmail.id);
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(byEmail.id);
    req.session.userId = user.id;
    req.session.user = publicUser(user);
    return res.json({ ok: true, user: req.session.user });
  }

  const { now, end } = newUserBillingParams();
  const isAdmin = (email === "luisuf@gmail.com") ? 1 : 0;
  const t = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO users (
        email, stripe_customer_id, plan, subscription_status,
        billing_cycle_start, billing_cycle_end,
        included_tokens_limit, included_tokens_used,
        sonnet_payg_enabled, sonnet_monthly_spend_limit, sonnet_monthly_spend_used,
        password_hash, google_sub,
        is_seller, is_admin,
        created_at, updated_at
      ) VALUES (?, NULL, 'free', 'active', ?, ?, 50000, 0, 0, NULL, 0, NULL, ?, 0, ?, ?, ?)`
    )
    .run(email, now, end, sub, isAdmin, t, t);
  user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
  req.session.userId = user.id;
  req.session.user = publicUser(user);
  res.json({ ok: true, user: req.session.user });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("libro.sid");
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  let db;
  try {
    db = getDb();
  } catch {
    return res.status(503).json({ error: "Base de datos no disponible." });
  }

  const pick = (row) =>
    row
      ? {
          id: row.id,
          email: row.email,
          plan: row.plan,
          subscription_status: row.subscription_status,
          sonnet_payg_enabled: row.sonnet_payg_enabled,
          sonnet_monthly_spend_limit: row.sonnet_monthly_spend_limit,
          is_seller: row.is_seller,
          is_admin: row.is_admin,
        }
      : null;

  if (isSkipAuth()) {
    const uid = Number(process.env.DEV_USER_ID || 1);
    const u = db
      .prepare(
        "SELECT id, email, plan, subscription_status, sonnet_payg_enabled, sonnet_monthly_spend_limit, is_seller, is_admin FROM users WHERE id = ?"
      )
      .get(uid);
    if (!u) {
      return res.status(200).json({
        libroai: true,
        user: {
          id: uid,
          email: "dev@local",
          plan: "basic",
          subscription_status: "active",
          sonnet_payg_enabled: 1,
          sonnet_monthly_spend_limit: null,
        },
      });
    }
    return res.status(200).json({ libroai: true, user: pick(u) });
  }

  const sessionUserId = req.session && req.session.userId;
  if (!sessionUserId) {
    return res.status(200).json({ libroai: true, user: null });
  }

  const u = db
    .prepare(
      "SELECT id, email, plan, subscription_status, sonnet_payg_enabled, sonnet_monthly_spend_limit, is_seller, is_admin FROM users WHERE id = ?"
    )
    .get(sessionUserId);
  if (!u) {
    return res.status(200).json({ libroai: true, user: null });
  }
  return res.status(200).json({ libroai: true, user: pick(u) });
});

module.exports = router;
