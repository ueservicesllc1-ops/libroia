const admin = require("firebase-admin");

let initialized = false;

function getFirebaseAdmin() {
  if (initialized) return admin;

  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  try {
    if (saEnv) {
      const serviceAccount = JSON.parse(saEnv.trim());
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || "libroia-dba4c"
      });
      console.log("[Firebase] Inicializado con FIREBASE_SERVICE_ACCOUNT de Railway.");
    } else {
      // Fallback para desarrollo local si no hay variable
      admin.initializeApp({ projectId: "libroia-dba4c" });
      console.warn("[Firebase] Inicializado sin credenciales (modo limitado).");
    }
    initialized = true;
  } catch (err) {
    console.error("[Firebase] Error al inicializar:", err.message);
    // Inicializamos una app vacía para evitar que el servidor explote al importar
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "libroia-dba4c" });
    }
    initialized = true;
  }

  return admin;
}

module.exports = { getFirebaseAdmin };
