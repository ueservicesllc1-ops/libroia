const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const session = require("express-session");
const fs = require("fs/promises");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { envBool } = require("./lib/envFlags");

const { initDb } = require("./lib/billing/db");
const authRoutes = require("./routes/authRoutes");
const billingRoutes = require("./routes/billingRoutes");
const aiGenerateRoutes = require("./routes/aiGenerateRoutes");
const { createBooksRouter } = require("./routes/booksRoutes");
const stripeWebhookRaw = require("./routes/stripeWebhookRaw");
const mediaRoutes = require("./routes/mediaRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const publishRoutes = require("./routes/publishRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const editorActionsRoutes = require("./routes/editorActionsRoutes");
const adminRoutes = require("./routes/adminRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const buyerRoutes = require("./routes/buyerRoutes");

const app = express();

const DEV = process.env.NODE_ENV === "development";
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const BOOKS_FILE = path.join(DATA_DIR, "books.json");
const SESSION_NAME = "libro.sid";

// ── Cabeceras de seguridad HTTP (helmet) ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
}));

app.use(
  session({
    name: SESSION_NAME,
    secret: process.env.SESSION_SECRET || "cambia-esto-en-produccion",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: DEV ? false : (process.env.NODE_ENV === "production"),
    },
  })
);

// Webhook de Stripe (Raw Body)
app.post("/api/payments/webhook", express.raw({ type: 'application/json' }), paymentRoutes);

app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  if (DEV) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  }
  const p = req.originalUrl.split("?")[0];
  if (p.startsWith("/api")) {
    res.setHeader("X-LibroAI", "1");
  }
  // Log de depuración para rutas críticas
  if (p === "/libroia" || p === "/dashboard" || p === "/escribir") {
    console.log(`[DEBUG] Request: ${p}, SessionID: ${req.sessionID}, userId: ${req.session?.userId}`);
  }
  next();
});

// ── Rutas API ─────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/ai/generate", aiGenerateRoutes);
app.use("/api/books", createBooksRouter(DATA_DIR));
app.use("/api/media", mediaRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/publish", publishRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ai", editorActionsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/buyer", buyerRoutes);

app.get("/api/config/public", (req, res) => {
  res.json({
    skipAuth: envBool("SKIP_AUTH"),
    billingRelaxed: envBool("BILLING_RELAXED"),
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  });
});

app.get("/api/config/firebase", (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID
  });
});

// Rutas Amigables (HTML) - Colocar ANTES de express.static para que los manejadores tengan prioridad
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.get("/escribir", (req, res) => {
  const uid = req.session.userId;
  if (!uid) return res.redirect("/");
  
  const { getDb } = require("./lib/billing/db");
  const db = getDb();
  const user = db.prepare("SELECT is_seller, is_admin FROM users WHERE id = ?").get(uid);
  
  if (!user || (!user.is_seller && !user.is_admin)) {
    return res.redirect("/dashboard");
  }
  res.sendFile(path.join(__dirname, "libroia", "app.html"));
});

app.get("/libroia", (req, res) => res.redirect("/escribir"));
app.get("/libroia/", (req, res) => res.redirect("/escribir"));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "libroia", "library.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "libroia", "admin.html")));
app.get("/library", (req, res) => res.redirect("/dashboard"));
app.get("/vender", (req, res) => res.sendFile(path.join(__dirname, "libroia", "seller-apply.html")));
app.get("/vender-dashboard", (req, res) => res.sendFile(path.join(__dirname, "libroia", "seller-dashboard.html")));

app.use(express.static(__dirname));
app.use("/libroia", express.static(path.join(__dirname, "libroia")));
app.use("/data/media", express.static(path.join(__dirname, "data", "media")));

// Servir assets específicos de la landing (evita exponer .env)
app.get("/landing.css", (req, res) => res.sendFile(path.join(__dirname, "landing.css")));
app.get("/libroia_elegant_wine_mockup_1777240835114.png", (req, res) => res.sendFile(path.join(__dirname, "libroia_elegant_wine_mockup_1777240835114.png")));
app.get("/libroia_ultra_premium_mockup_1777240598297.png", (req, res) => res.sendFile(path.join(__dirname, "libroia_ultra_premium_mockup_1777240598297.png")));

// ── Inicialización ────────────────────────────────────────────────────────────
(async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(path.join(DATA_DIR, "media"), { recursive: true });
    initDb(DATA_DIR);
    console.log("Database initialized.");
    
    app.listen(PORT, () => {
      console.log(`LibroAI running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Startup error:", err);
  }
})();
