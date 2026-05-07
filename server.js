const path = require("path");
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");

const app = express();
const PORT = process.env.PORT || 3000;
const DEV = process.env.NODE_ENV === "development";

// 1. ABRIR EL PUERTO DE INMEDIATO (Para que Railway no dé 502)
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`[SYSTEM] Servidor escuchando en puerto ${PORT}`);
});

// 2. HEALTH CHECK INSTANTÁNEO
app.get("/api/health", (req, res) => res.status(200).send("OK"));

// ── Configuración de Seguridad ────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginOpenerPolicy: false }));
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  next();
});

app.set("trust proxy", 1);
app.use(session({
  name: "libro.sid",
  secret: process.env.SESSION_SECRET || "libroai-secret-123",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: DEV ? "lax" : "none", secure: !DEV }
}));

app.use("/api/payments/webhook", express.raw({ type: 'application/json' })); // Manejado luego en routes
app.use(express.json({ limit: "2mb" }));

// 3. CARGA DE RUTAS Y DB (Después de abrir el puerto)
try {
  const { initDb } = require("./lib/billing/db");
  const DATA_DIR = path.join(__dirname, "data");
  const BOOKS_FILE = path.join(DATA_DIR, "books.json");

  // Inicializar DB de forma asíncrona para no bloquear
  const fs = require("fs");
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  initDb(DATA_DIR);
  console.log("[SYSTEM] Base de datos lista.");

  // Importar y usar rutas
  app.use("/api/auth", require("./routes/authRoutes"));
  app.use("/api/billing", require("./routes/billingRoutes"));
  app.use("/api/ai", require("./routes/aiGenerateRoutes"));
  app.use("/api/books", require("./routes/booksRoutes").createBooksRouter(DATA_DIR, BOOKS_FILE));
  app.use("/api/media", require("./routes/mediaRoutes"));
  app.use("/api/marketplace", require("./routes/marketplaceRoutes"));
  app.use("/api/publish", require("./routes/publishRoutes"));
  app.use("/api/payments", require("./routes/paymentRoutes"));
  app.use("/api/admin", require("./routes/adminRoutes"));
  app.use("/api/seller", require("./routes/sellerRoutes"));
  app.use("/api/buyer", require("./routes/buyerRoutes"));

  // Rutas de archivos
  app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
  app.get("/escribir", (req, res) => res.sendFile(path.join(__dirname, "libroia", "app.html")));
  app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "libroia", "library.html")));
  
  app.use("/libroia", express.static(path.join(__dirname, "libroia")));
  app.use(express.static(__dirname, { index: false }));

  console.log("[SYSTEM] Todas las rutas cargadas.");
} catch (err) {
  console.error("[CRITICAL ERROR] Error cargando módulos:", err.message);
}

process.on("unhandledRejection", (reason) => console.error("Unhandled Rejection:", reason));
