import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Read Firebase config from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Check loaded variables (for debugging)
console.log("Checking loaded env vars in config.ts:");
console.log("API Key defined:", !!firebaseConfig.apiKey);
console.log("Auth Domain defined:", !!firebaseConfig.authDomain);
console.log("Project ID defined:", !!firebaseConfig.projectId);
// Add more logs if needed

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Check if required config values are present
const isConfigComplete =
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.storageBucket &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId;

if (isConfigComplete) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase initialized successfully from environment variables!");
  } catch (error) {
    console.error("Firebase initialization error from environment variables:", error);
  }
} else {
  console.error(
    'Firebase config is incomplete. Check your .env file and ensure all EXPO_PUBLIC_ variables are set correctly in app/_firebase/config.ts'
  );
   // Log which specific variables are missing
   Object.entries(firebaseConfig).forEach(([key, value]) => {
    if (!value) {
      console.error(`Missing environment variable: EXPO_PUBLIC_${key.replace(/([A-Z])/g, '_$1').toUpperCase().replace('FIREBASE_','')}`);
    }
  });
}

export { app, auth, db }; 