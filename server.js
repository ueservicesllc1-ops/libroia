console.log("[BOOT] Iniciando proceso Node...");
const path = require("path");
const express = require("express");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

// 1. RESPUESTA INMEDIATA PARA RAILWAY
app.get("/api/health", (req, res) => res.status(200).send("OK"));
app.get("/health", (req, res) => res.status(200).send("OK"));

app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));

app.use(session({
  name: "libro.sid",
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: false,
  cookie: { sameSite: "none", secure: true }
}));

// 2. RUTAS DINÁMICAS (Carga protegida)
try {
    app.use("/api/auth", require("./routes/authRoutes"));
    app.use("/api/billing", require("./routes/billingRoutes"));
    app.use("/api/ai", require("./routes/aiGenerateRoutes"));
    app.use("/api/media", require("./routes/mediaRoutes"));
    app.use("/api/marketplace", require("./routes/marketplaceRoutes"));
    app.use("/api/publish", require("./routes/publishRoutes"));
    app.use("/api/payments", require("./routes/paymentRoutes"));
    
    // Servir estáticos
    app.use("/libroia", express.static(path.join(__dirname, "libroia")));
    app.use(express.static(__dirname, { index: false }));
    app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
} catch (e) {
    console.error("[BOOT ERROR] Error cargando rutas:", e);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[READY] Servidor en puerto ${PORT}`);
});
