const admin = require("firebase-admin");

let firebaseApp;

function initFirebaseAdmin() {
  if (!firebaseApp && !admin.apps.length) {
    try {
      firebaseApp = admin.initializeApp({
        // Since we don't have a service account JSON, we will let application default credentials work,
        // or just initialize without credentials if we only want to decode tokens 
        // without contacting Firebase APIs, wait, verifyIdToken requires project ID.
        projectId: "libroia-dba4c"
      });
    } catch (e) {
      console.warn("Failed to initialize firebase-admin:", e.message);
    }
  }
}

function getFirebaseAdmin() {
  if (!firebaseApp) initFirebaseAdmin();
  return admin;
}

module.exports = { getFirebaseAdmin };
