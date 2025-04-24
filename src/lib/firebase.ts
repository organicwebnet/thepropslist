import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

interface GoogleButtonConfig {
  type: 'standard' | 'icon';
  theme: 'outline' | 'filled_blue' | 'filled_black';
  size: 'large' | 'medium' | 'small';
}

// Initialize Google Sign-In with FedCM support
const loadGoogleScript = () => {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In script'));
    document.head.appendChild(script);
  });
};

// Validate Firebase config
const validateFirebaseConfig = () => {
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID'
  ];

  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required Firebase configuration: ${missingVars.join(', ')}`);
  }
};

validateFirebaseConfig();

const firebaseConfig = {
  apiKey: import.meta.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

console.log('Firebase Config:', {
  ...firebaseConfig,
  apiKey: '***' // Hide API key in logs
});

// Initialize Firebase with proper auth domain handling
if (window.location.hostname === 'localhost') {
  // For localhost, use the Firebase auth domain to avoid third-party cookie issues
  console.log('Running on localhost - using Firebase authDomain for authentication');
} else {
  if (window.location.protocol !== 'https:') {
    window.location.href = window.location.href.replace('http:', 'https:');
  }
}

let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Helper function for Google Sign In
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    
    // Use redirect instead of popup for better compatibility
    await signInWithRedirect(auth, provider);
    
    // The redirect result is handled automatically when the page loads
    const result = await getRedirectResult(auth);
    if (result) {
      return result;
    }
  } catch (error: any) {
    console.error('Error in Google sign in:', error);
    
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error(`This domain (${window.location.hostname}) is not authorized for Google Sign-In. Please verify domain configuration in Firebase Console.`);
    } else {
      throw error;
    }
  }
};

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

// Export configured instances
export { db, auth, storage, analytics };