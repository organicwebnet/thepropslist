import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, Auth } from 'firebase/auth';
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
    'EXPO_PUBLIC_FIREBASE_API_KEY',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
    'EXPO_PUBLIC_FIREBASE_APP_ID'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required Firebase configuration: ${missingVars.join(', ')}`);
  }
};

validateFirebaseConfig();

// Helper function for Google Sign In - Needs Auth instance passed in
export const signInWithGoogle = async (authInstance: Auth) => {
  if (!authInstance) {
    return;
  } 
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    
    await signInWithRedirect(authInstance, provider);
    
    const result = await getRedirectResult(authInstance);
    if (result) {
      return result;
    }
  } catch (error: any) {
    if (error.code === 'auth/unauthorized-domain') {
      throw new Error(`This domain (${window.location.hostname}) is not authorized for Google Sign-In. Please verify domain configuration in Firebase Console.`);
    } else {
      throw error;
    }
  }
};

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Custom fetch function - Needs Storage instance and Auth instance passed in
// export async function fetchStorageImage(url: string): Promise<Blob> { 
// This function likely needs refactoring to use the storage service from context
// For now, let's comment it out to avoid errors, assuming it's not immediately critical
/*
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
*/