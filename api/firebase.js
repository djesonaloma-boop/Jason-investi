// ============================================================
// JASON INVEST — FIREBASE BACKEND PUBLIC — VERSION CORRIGEE
// Remplis avec tes clés Firebase Console > Project Settings
// ============================================================

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "ton-projet.firebaseapp.com",
  databaseURL: "https://ton-projet-default-rtdb.firebaseio.com",
  projectId: "ton-projet",
  storageBucket: "ton-projet.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:xxxxxxxx"
};

// Pour api/index.js sur Vercel (Service Account)
export const FIREBASE_SERVICE_ACCOUNT = {
  projectId: process.env.FIREBASE_PROJECT_ID || "ton-projet",
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-xxxx@ton-projet.iam.gserviceaccount.com",
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n')
};

export function isFirebaseConfigured() {
  return Boolean(
    FIREBASE_SERVICE_ACCOUNT.projectId &&
    FIREBASE_SERVICE_ACCOUNT.clientEmail &&
    FIREBASE_SERVICE_ACCOUNT.privateKey
  );
}

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "10092007";
