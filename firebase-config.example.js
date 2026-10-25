// Copy this file to firebase-config.js and fill in your own values.
// These keys are safe to publish: Firebase web config is public by design.
// What actually protects your journal is firestore.rules (only OWNER_UID can write).
//
// Where to find them: Firebase console → ⚙️ Project settings → General →
// "Your apps" → Web app → "SDK setup and configuration" → Config.

export const firebaseConfig = {
  apiKey: 'AIzaSy...your-key...',
  authDomain: 'your-project-id.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project-id.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abcdef1234567890',
};

// Your Firebase user ID. Sign in on the site once and it will show you this value.
export const OWNER_UID = 'paste-your-uid-here';
