const https = require("https");
let _adminApp = null;
let _publicKeys = null;
let _keysExpiry = 0;

// ── Opción A: Firebase Admin SDK (requiere service account o ADC) ─────────────
function tryInitAdmin() {
  if (_adminApp) return _adminApp;
  try {
    const admin = require("firebase-admin");
    if (admin.apps.length) {
      _adminApp = admin.apps[0];
      return _adminApp;
    }
    // Si hay GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT en env, usar eso
    const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (saEnv) {
      const serviceAccount = JSON.parse(saEnv);
      _adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: "libroia-dba4c",
      });
      return _adminApp;
    }
    // Intento sin credenciales (funciona solo con ADC)
    _adminApp = admin.initializeApp({ projectId: "libroia-dba4c" });
    return _adminApp;
  } catch (e) {
    console.warn("[firebaseAdmin] Firebase Admin SDK no disponible:", e.message);
    return null;
  }
}

// ── Opción B: verificación manual con claves públicas de Google (sin service account) ──
function fetchGooglePublicKeys() {
  return new Promise((resolve, reject) => {
    const url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const keys = JSON.parse(data);
          // Cache-Control header: max-age=NNN
          const cc = res.headers["cache-control"] || "";
          const ma = cc.match(/max-age=(\d+)/);
          _publicKeys = keys;
          _keysExpiry = Date.now() + (ma ? Number(ma[1]) * 1000 : 3600000);
          resolve(keys);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function verifyFirebaseTokenManually(idToken) {
  const { createVerify } = require("crypto");
  // Decode header to get kid
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Token mal formado");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));

  // Validaciones básicas del payload
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error("Token expirado");
  if (payload.iat > now + 300) throw new Error("Token del futuro");
  if (payload.aud !== "libroia-dba4c") throw new Error("Token para otro proyecto");
  if (payload.iss !== "https://securetoken.google.com/libroia-dba4c") throw new Error("Emisor inválido");

  // Obtener/cachear claves públicas
  if (!_publicKeys || Date.now() > _keysExpiry) {
    await fetchGooglePublicKeys();
  }
  const cert = _publicKeys[header.kid];
  if (!cert) throw new Error("kid no encontrado en claves de Google");

  // Verificar firma RSA-SHA256
  const signInput = parts[0] + "." + parts[1];
  const sig = Buffer.from(parts[2], "base64url");
  const verifier = createVerify("RSA-SHA256");
  verifier.update(signInput);
  if (!verifier.verify(cert, sig)) throw new Error("Firma inválida");

  return payload;
}

// ── API pública: verifyIdToken compatible con firebase-admin ─────────────────
async function verifyIdToken(idToken) {
  // Intentar con Admin SDK primero
  const app = tryInitAdmin();
  if (app) {
    try {
      const admin = require("firebase-admin");
      return await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      // Si falla por credenciales, caer al método manual
      if (!e.message?.includes("credential") && !e.message?.includes("UNAUTHENTICATED")) {
        throw e;
      }
      console.warn("[firebaseAdmin] Admin SDK sin credenciales, usando verificación manual");
    }
  }
  // Verificación manual (sin service account)
  return await verifyFirebaseTokenManually(idToken);
}

function getFirebaseAdmin() {
  return {
    auth: () => ({ verifyIdToken }),
  };
}

module.exports = { getFirebaseAdmin };
