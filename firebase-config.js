// Your Firebase settings. See SETUP.md, step 4.
// While these still say YOUR_..., the site runs in preview mode with sample perfumes.
// These keys are safe to publish: Firebase web config is public by design.

export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

// Your Firebase user ID (SETUP.md, step 7). Must match OWNER_UID in firestore.rules.
export const OWNER_UID = 'YOUR_OWNER_UID';
