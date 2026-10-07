// api/firebase.js - version safe qui ne crash pas
let db = null;
try {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    if (process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
      db = admin.firestore();
      console.log('Firebase OK');
    } else {
      console.log('Firebase env manquantes - mode mémoire');
    }
  } else {
    db = admin.firestore();
  }
} catch(e){
  console.log('Firebase désactivé:', e.message);
  db = null;
}
module.exports = db;
