// Copy this file to firebase-config.js and fill in your own values.
// These keys are safe to publish: Firebase web config is public by design.
// What actually protects your journal is firestore.rules (only the owner can write).
//
// Where to find them: Firebase console → ⚙️ Project settings → General →
// "Your apps" → Web app → "SDK setup and configuration" → Config.

export const firebaseConfig = {
  apiKey: 'AIzaSy...your-key...',
  authDomain: 'your-project-id.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project-id.firebasestorage.app',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abcdef1234567890',
};

// SHA-256 of the owner's Google email, all lowercase (keeps the address out of public code).
// Get it with:  echo -n "owner@gmail.com" | sha256sum
// or any online "SHA-256 generator", using the email in lowercase.
export const OWNER_EMAIL_SHA256 = 'paste-the-64-character-hash-here';
