const path = require("path");
const fs = require("fs");
const https = require("https");

let _adminApp = null;
let _publicKeys = null;
let _keysExpiry = 0;

// Intenta encontrar el archivo de credenciales en ubicaciones comunes
function findServiceAccount() {
  // 1. Prioridad: Variable de entorno (método recomendado para Railway)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.warn("[firebaseAdmin] Error al parsear FIREBASE_SERVICE_ACCOUNT env var");
    }
  }

  // 2. Archivo específico en la carpeta public (donde el usuario lo puso)
  const publicPath = path.join(process.cwd(), "public", "libroia-dba4c-firebase-adminsdk-fbsvc-335b1c8035.json");
  if (fs.existsSync(publicPath)) {
    try {
      return JSON.parse(fs.readFileSync(publicPath, "utf8"));
    } catch (e) {
      console.warn("[firebaseAdmin] Error al leer archivo en public/");
    }
  }

  // 3. Archivo genérico en el root (para desarrollo local)
  const rootPath = path.join(process.cwd(), "firebase-service-account.json");
  if (fs.existsSync(rootPath)) {
    try {
      return JSON.parse(fs.readFileSync(rootPath, "utf8"));
    } catch (e) {
      console.warn("[firebaseAdmin] Error al leer firebase-service-account.json");
    }
  }

  return null;
}

function tryInitAdmin() {
  if (_adminApp) return _adminApp;
  try {
    const admin = require("firebase-admin");
    if (admin.apps.length) {
      _adminApp = admin.apps[0];
      return _adminApp;
    }

    const serviceAccount = findServiceAccount();
    if (serviceAccount) {
      console.log("[firebaseAdmin] Inicializando con cuenta de servicio encontrada.");
      _adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: "libroia-dba4c",
      });
      return _adminApp;
    }

    // Intento sin credenciales (solo funciona con ADC)
    _adminApp = admin.initializeApp({ projectId: "libroia-dba4c" });
    return _adminApp;
  } catch (e) {
    console.warn("[firebaseAdmin] Fallo inicialización SDK:", e.message);
    return null;
  }
}

// Fallback manual si el SDK no tiene credenciales válidas
async function verifyFirebaseTokenManually(idToken) {
  const { createVerify } = require("crypto");
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Token mal formado");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error("Token expirado");
  if (payload.aud !== "libroia-dba4c") throw new Error("Token para otro proyecto");

  if (!_publicKeys || Date.now() > _keysExpiry) {
    await new Promise((resolve, reject) => {
      https.get("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com", (res) => {
        let data = "";
        res.on("data", d => data += d);
        res.on("end", () => {
          _publicKeys = JSON.parse(data);
          const cc = res.headers["cache-control"] || "";
          const ma = cc.match(/max-age=(\d+)/);
          _keysExpiry = Date.now() + (ma ? Number(ma[1]) * 1000 : 3600000);
          resolve();
        });
      }).on("error", reject);
    });
  }

  const cert = _publicKeys[header.kid];
  if (!cert) throw new Error("kid no encontrado");

  const verifier = createVerify("RSA-SHA256");
  verifier.update(parts[0] + "." + parts[1]);
  if (!verifier.verify(cert, Buffer.from(parts[2], "base64url"))) throw new Error("Firma inválida");

  return payload;
}

async function verifyIdToken(idToken) {
  const app = tryInitAdmin();
  if (app) {
    try {
      const admin = require("firebase-admin");
      return await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      if (!e.message.includes("credential") && !e.message.includes("UNAUTHENTICATED")) throw e;
    }
  }
  return await verifyFirebaseTokenManually(idToken);
}

module.exports = {
  getFirebaseAdmin: () => ({
    auth: () => ({ verifyIdToken })
  })
};
