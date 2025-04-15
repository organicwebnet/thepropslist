import type { UserProfile } from '../types';

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/user.phonenumbers.read',
  'https://www.googleapis.com/auth/user.organization.read',
  'https://www.googleapis.com/auth/user.addresses.read'
];

let gapiInitialized = false;
let gisInitialized = false;

export async function initGoogleApi() {
  if (gapiInitialized && gisInitialized) return window.gapi.client;

  try {
    // Load the Google API client library
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API script'));
      document.body.appendChild(script);
    });

    // Load the Google Identity Services library
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
      document.body.appendChild(script);
    });

    // Initialize the client
    await new Promise<void>((resolve, reject) => {
      window.gapi.load('client:auth2', {
        callback: resolve,
        onerror: () => reject(new Error('Failed to load client:auth2')),
      });
    });

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      throw new Error('Google Client ID is not configured. Please check your environment variables.');
    }

    // Initialize the client with your credentials
    await window.gapi.client.init({
      clientId,
      scope: SCOPES.join(' '),
      discoveryDocs: ['https://people.googleapis.com/$discovery/rest?version=v1']
    });

    // Initialize Google Identity Services
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        console.log('Google Identity Services initialized');
      }
    });

    gapiInitialized = true;
    gisInitialized = true;
    return window.gapi.client;
  } catch (error) {
    console.error('Error initializing Google API:', error);
    gapiInitialized = false;
    gisInitialized = false;
    throw error;
  }
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export async function getGoogleAuthToken(): Promise<string> {
  if (!gapiInitialized || !gisInitialized) {
    await initGoogleApi();
  }

  if (!window.gapi?.auth2) {
    throw new Error('Google API not properly initialized');
  }

  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const auth2 = window.gapi.auth2.getAuthInstance();
      
      if (!auth2) {
        throw new Error('Auth instance not available');
      }

      if (!auth2.isSignedIn.get()) {
        await auth2.signIn({
          prompt: 'select_account',
          ux_mode: 'popup'
        });
      }

      const user = auth2.currentUser.get();
      if (!user) {
        throw new Error('No user available after sign in');
      }

      const authResponse = user.getAuthResponse();
      if (!authResponse?.access_token) {
        throw new Error('No access token available');
      }

      return authResponse.access_token;
    } catch (error) {
      console.error(`Auth attempt ${retries + 1} failed:`, error);
      retries++;
      
      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        throw new Error(`Failed to get auth token after ${MAX_RETRIES} attempts: ${error.message}`);
      }
    }
  }

  throw new Error('Failed to get auth token after maximum retries');
}

export async function fetchGoogleProfile(): Promise<Partial<UserProfile>> {
  try {
    // Ensure we have a valid auth token
    const token = await getGoogleAuthToken();
    
    if (!token) {
      throw new Error('No valid auth token received');
    }

    // Set the access token for the request
    window.gapi.client.setToken({ access_token: token });

    const response = await window.gapi.client.people.people.get({
      resourceName: 'people/me',
      personFields: 'names,emailAddresses,photos,phoneNumbers,addresses,organizations,biographies'
    });

    if (!response?.result) {
      throw new Error('No profile data received from Google API');
    }

    const { result } = response;
    
    return {
      displayName: result.names?.[0]?.displayName || '',
      email: result.emailAddresses?.[0]?.value || '',
      photoURL: result.photos?.[0]?.url || '',
      phone: result.phoneNumbers?.[0]?.value || '',
      location: result.locations?.[0]?.value || '',
      organization: result.organizations?.[0]?.name || '',
      bio: result.biographies?.[0]?.value || ''
    };
  } catch (error) {
    console.error('Error fetching Google profile:', error);
    throw error;
  }
}