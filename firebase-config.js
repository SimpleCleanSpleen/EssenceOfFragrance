// Your Firebase settings (SETUP.md, step 4).
// These keys are safe to publish: Firebase web config is public by design.
// What protects the journal is the database rules (only the owner can write).

export const firebaseConfig = {
  apiKey: 'AIzaSyDT2pClKJb_5gFOHOQg5IMQjZZumcG9y2Y',
  authDomain: 'essenceoffragrance-3fe42.firebaseapp.com',
  projectId: 'essenceoffragrance-3fe42',
  storageBucket: 'essenceoffragrance-3fe42.firebasestorage.app',
  messagingSenderId: '527268594875',
  appId: '1:527268594875:web:86bac839fc54e962ec959e',
};

// SHA-256 of the owner's Google email (lowercase), so the address itself isn't published.
// Only shows/hides the owner buttons; the database rules do the real protecting.
// To change owner: run  echo -n "new@gmail.com" | sha256sum  and paste the result here.
export const OWNER_EMAIL_SHA256 = '22e6a65699867f1d91bedef5f8ecd80930b78d4e31935a84ed1fef3e1d070682';
