import firebase from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Debug: Log all available environment variables
console.log('DEBUG: Available environment variables:', {
  FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY,
  FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID,
});

if (!process.env.VITE_FIREBASE_API_KEY || !process.env.VITE_FIREBASE_PROJECT_ID) {
  throw new Error('Missing required Firebase configuration. Please check your environment variables.');
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: '1:123456789:web:abcdef', // This will be replaced with your actual App ID
};

console.log('DEBUG: Firebase config:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? '***' : undefined,
  projectId: firebaseConfig.projectId || 'MISSING',
});

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
}

// Get Firestore instance
const db = firestore();

// Enable offline persistence
firestore().settings({
  persistence: true,
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED
});

export { firebase, db };
export default { firebase, db }; 