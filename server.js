const path = require("path");
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const fs = require("fs/promises");
const helmet = require("helmet");

const { initDb } = require("./lib/billing/db");
const { envBool } = require("./lib/envFlags");

// Importar rutas
const authRoutes = require("./routes/authRoutes");
const billingRoutes = require("./routes/billingRoutes");
const aiGenerateRoutes = require("./routes/aiGenerateRoutes");
const { createBooksRouter } = require("./routes/booksRoutes");
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

// ── Configuración de Seguridad y Proxy ────────────────────────────────────────
app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false, 
}));

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  next();
});

// ── Sesiones ──────────────────────────────────────────────────────────────────
app.use(session({
  name: "libro.sid",
  secret: process.env.SESSION_SECRET || "libroai-secret-key-123",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: DEV ? "lax" : "none",
    secure: !DEV,
  },
}));

// ── Middleware Base ───────────────────────────────────────────────────────────
app.use("/api/payments/webhook", express.raw({ type: 'application/json' }), paymentRoutes);
app.use(express.json({ limit: "2mb" }));

// ── Rutas API ─────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/ai", aiGenerateRoutes);
app.use("/api/books", createBooksRouter(DATA_DIR, BOOKS_FILE));
app.use("/api/media", mediaRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/publish", publishRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ai", editorActionsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/buyer", buyerRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true, node_env: process.env.NODE_ENV }));

app.get("/api/config/public", (req, res) => {
  res.json({
    skipAuth: envBool("SKIP_AUTH"),
    billingRelaxed: envBool("BILLING_RELAXED"),
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    physicalShippingCents: parseInt(process.env.PHYSICAL_SHIPPING_FLAT_CENTS || "999", 10),
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

// ── Rutas de Navegación ───────────────────────────────────────────────────────
const requirePageAuth = (req, res, next) => {
  if (req.session && req.session.userId) return next();
  res.redirect("/");
};

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.get("/escribir", requirePageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "libroia", "app.html"));
});

app.get("/dashboard", requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "libroia", "library.html")));
app.get("/admin", requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "libroia", "admin.html")));
app.get("/vender", (req, res) => res.sendFile(path.join(__dirname, "libroia", "seller-apply.html")));
app.get("/vender-dashboard", requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, "libroia", "seller-dashboard.html")));

// ── Archivos Estáticos ────────────────────────────────────────────────────────
app.use("/libroia", express.static(path.join(__dirname, "libroia")));
app.use("/data/media", express.static(path.join(__dirname, "data", "media")));
app.use(express.static(__dirname, { index: false })); // Servir archivos de la raíz pero no index.html (ya tiene ruta)

// ── Inicio del Servidor ───────────────────────────────────────────────────────
async function start() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(path.join(DATA_DIR, "media"), { recursive: true });
    initDb(DATA_DIR);
    console.log("[OK] Base de datos y carpetas listas.");
  } catch (err) {
    console.error("[ERROR] Error en el inicio de datos:", err);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[READY] Servidor escuchando en puerto ${PORT}`);
  });
}

start();
