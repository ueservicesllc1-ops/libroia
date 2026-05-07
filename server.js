console.log("[BOOT] Iniciando proceso Node...");
const path = require("path");
const express = require("express");
const session = require("express-session");
const { envBool } = require("./lib/envFlags");

const app = express();
const PORT = process.env.PORT || 3000;
const DEV = process.env.NODE_ENV === "development";

// 1. RESPUESTA INMEDIATA (Health Checks)
app.get("/api/health", (req, res) => res.status(200).json({ ok: true }));
app.get("/health", (req, res) => res.status(200).send("OK"));

app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));

app.use(session({
  name: "libro.sid",
  secret: process.env.SESSION_SECRET || "secret-123",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    httpOnly: true, 
    maxAge: 7 * 24 * 60 * 60 * 1000, 
    sameSite: DEV ? "lax" : "none", 
    secure: !DEV 
  }
}));

// 2. CONFIGURACIÓN (Antes que las rutas pesadas)
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

// 3. CARGA DE RUTAS Y DB
try {
    const { initDb } = require("./lib/billing/db");
    const DATA_DIR = path.join(__dirname, "data");
    const BOOKS_FILE = path.join(DATA_DIR, "books.json");
    
    initDb(DATA_DIR);
    console.log("[SYSTEM] Base de datos inicializada.");

    app.use("/api/auth", require("./routes/authRoutes"));
    app.use("/api/billing", require("./routes/billingRoutes"));
    app.use("/api/ai", require("./routes/aiGenerateRoutes"));
    app.use("/api/media", require("./routes/mediaRoutes"));
    app.use("/api/marketplace", require("./routes/marketplaceRoutes"));
    app.use("/api/publish", require("./routes/publishRoutes"));
    app.use("/api/payments", require("./routes/paymentRoutes"));
    app.use("/api/admin", require("./routes/adminRoutes"));
    app.use("/api/seller", require("./routes/sellerRoutes"));
    app.use("/api/buyer", require("./routes/buyerRoutes"));
    
    // Servir estáticos
    app.use("/libroia", express.static(path.join(__dirname, "libroia")));
    app.use(express.static(__dirname, { index: false }));
    app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
    app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "libroia", "library.html")));
    app.get("/vender", (req, res) => res.sendFile(path.join(__dirname, "libroia", "seller-apply.html")));
    app.get("/vender-dashboard", (req, res) => res.sendFile(path.join(__dirname, "libroia", "seller-dashboard.html")));
    app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "libroia", "admin.html")));
    app.get("/escribir", (req, res) => res.sendFile(path.join(__dirname, "libroia", "app.html")));
} catch (e) {
    console.error("[BOOT ERROR] Error crítico en carga:", e);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[READY] Servidor escuchando en puerto ${PORT}`);
});
