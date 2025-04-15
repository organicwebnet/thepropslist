import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase with custom auth domain for development
if (window.location.hostname === 'localhost') {
  firebaseConfig.authDomain = 'props-bible-app-1c1cb.firebaseapp.com'; // Use the actual Firebase auth domain for localhost
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Configure auth persistence
auth.useDeviceLanguage();
setPersistence(auth, browserLocalPersistence);

const storage = getStorage(app);
const analytics = getAnalytics(app);

// Initialize Google provider
const googleProvider = new GoogleAuthProvider();

// Enhanced configuration for Google provider
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account',
  login_hint: 'user@example.com'
});

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Custom fetch function for Storage operations with retry logic
export async function fetchStorageImage(url: string): Promise<Blob> {
  const MAX_RETRIES = 3;
  const INITIAL_RETRY_DELAY = 1000; // 1 second
  let retryCount = 0;
  let lastError: Error | null = null;

  while (retryCount < MAX_RETRIES) {
    try {
      // Get a fresh download URL for the image
      const fileRef = ref(storage, url);
      const downloadURL = await getDownloadURL(fileRef);

      // Get the current user's token if authenticated
      const currentUser = auth.currentUser;
      const headers: HeadersInit = {
        'Accept': 'image/*',
      };

      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Fetch the image with proper CORS and credentials
      const response = await fetch(downloadURL, {
        method: 'GET',
        headers,
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      return await response.blob();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Attempt ${retryCount + 1} failed:`, lastError.message);
      
      if (retryCount < MAX_RETRIES - 1) {
        const backoffDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        await delay(backoffDelay);
        retryCount++;
      } else {
        break;
      }
    }
  }

  // If we get here, all retries failed
  const errorMessage = `Failed to fetch image after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

export { db, auth, storage, analytics, googleProvider };