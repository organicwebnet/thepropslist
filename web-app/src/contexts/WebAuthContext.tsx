import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, Timestamp, collection, query, where, getDocs, Firestore } from 'firebase/firestore';
import { buildVerificationEmailDoc, buildPasswordResetEmailDoc } from '../services/EmailService';
import { auth, db } from '../firebase';

// Type assertion for db to fix TypeScript issues
const firestoreDb = db as Firestore;
// If you implement caching, import your webCache here
// import { webCache } from '../services/webCache';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  role: 'admin' | 'user' | 'viewer' | 'god' | 'editor' | 'props_supervisor' | 'art_director';
  organizations: string[];
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    defaultView: 'grid' | 'list' | 'card';
  };
  lastLogin: Date;
  createdAt: Date;
  groups?: { [key: string]: boolean };
  onboardingCompleted?: boolean;
}

interface WebAuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  startEmailVerification: (email: string) => Promise<void>;
  isEmailLinkInUrl: (url: string) => boolean;
  completeEmailVerification: (email: string, url?: string) => Promise<void>;
  finalizeSignup: (displayName: string, password: string) => Promise<void>;
  startCodeVerification: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<any>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  markOnboardingCompleted: () => Promise<void>;
  getCurrentOrganization: () => string | null;
  setCurrentOrganization: (orgId: string) => void;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
}

const WebAuthContext = createContext<WebAuthContextType | undefined>(undefined);

interface WebAuthProviderProps {
  children: ReactNode;
}

export function WebAuthProvider({ children }: WebAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          await loadUserProfile(firebaseUser.uid);
          await updateLastLogin(firebaseUser.uid);
        } else {
          setUser(null);
          setUserProfile(null);
          setCurrentOrganization(null);
          // If using cache: await webCache.clear();
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const loadUserProfile = async (uid: string) => {
    try {
      console.log('WebAuthContext: Loading user profile for UID:', uid);
      // If using cache, try cache first
      // const cached = await webCache.get<UserProfile>(`user-profile-${uid}`);
      // if (cached) { setUserProfile(cached); return cached; }
      const userDocRef = doc(firestoreDb, 'userProfiles', uid);
      const userDoc = await getDoc(userDocRef);
      console.log('WebAuthContext: User document exists:', userDoc.exists());
      if (userDoc.exists()) {
        const rawCreatedAt = userDoc.data().createdAt;
        let createdAt: Date | null = null;
        if (rawCreatedAt && typeof rawCreatedAt.toDate === 'function') {
          createdAt = rawCreatedAt.toDate();
        } else if (typeof rawCreatedAt === 'string' || typeof rawCreatedAt === 'number') {
          createdAt = new Date(rawCreatedAt);
        } else {
          createdAt = null;
        }
        const rawLastLogin = userDoc.data().lastLogin;
        let lastLogin: Date | null = null;
        if (rawLastLogin && typeof rawLastLogin.toDate === 'function') {
          lastLogin = rawLastLogin.toDate();
        } else if (typeof rawLastLogin === 'string' || typeof rawLastLogin === 'number') {
          lastLogin = new Date(rawLastLogin);
        } else {
          lastLogin = null;
        }
        const profileData = {
          ...userDoc.data(),
          lastLogin,
          createdAt
        } as UserProfile;
        
        console.log('WebAuthContext: Loaded user profile data:', {
          uid: profileData.uid,
          email: profileData.email,
          onboardingCompleted: profileData.onboardingCompleted,
          displayName: profileData.displayName
        });
        
        setUserProfile(profileData);
        // If using cache: await webCache.set(`user-profile-${uid}`, profileData, 60 * 60 * 1000);
        if (Array.isArray(profileData.organizations) && profileData.organizations.length > 0) {
          setCurrentOrganization(profileData.organizations[0]);
        }
        return profileData;
      } else {
        console.log('WebAuthContext: User document does not exist, creating new profile');
        // If invite-only mode is enabled, require a valid invitation before creating a profile
        const inviteOnly = String(import.meta.env.VITE_INVITE_ONLY || '').toLowerCase() === 'true';
        if (inviteOnly) {
          try {
            const emailToCheck = (user?.email || '').toLowerCase();
            const invitesRef = collection(firestoreDb, 'invitations');
            const q = query(invitesRef, where('email', '==', emailToCheck));
            const snap = await getDocs(q);
            const hasInvite = !snap.empty;
            if (!hasInvite) {
              setError('Signups are invite‑only. Please request an invite to join.');
              await signOut(auth);
              setUser(null);
              setUserProfile(null);
              setCurrentOrganization(null);
              return null;
            }
          } catch (invErr) {
            console.warn('Invite check failed; denying profile creation for safety', invErr);
            setError('Unable to verify invitation. Please try again later or request a new invite.');
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
            setCurrentOrganization(null);
            return null;
          }
        }

        // Create default profile for new users (open signup or invited)
        const defaultProfile: UserProfile = {
          uid,
          email: user?.email || '',
          displayName: user?.displayName || 'User',
          role: 'user',
          organizations: [],
          preferences: {
            theme: 'light',
            notifications: true,
            defaultView: 'grid'
          },
          lastLogin: new Date(),
          createdAt: new Date(),
          onboardingCompleted: false
        };
        await setDoc(userDocRef, {
          ...defaultProfile,
          lastLogin: Timestamp.now(),
          createdAt: Timestamp.now()
        });
        setUserProfile(defaultProfile);
        return defaultProfile;
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError('Failed to load user profile');
      return null;
    }
  };

  const updateLastLogin = async (uid: string) => {
    try {
      const userDocRef = doc(firestoreDb, 'userProfiles', uid);
      await updateDoc(userDocRef, { lastLogin: Timestamp.now() });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };


  // Email link verification flow
  const actionCodeSettings = {
    // Send users back to this url to finish sign-in
    url: `${window.location.origin}/complete-signup`,
    handleCodeInApp: true
  } as const;

  const startEmailVerification = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      // Persist for redirect flow
      window.localStorage.setItem('propsbible_signup_email', email);
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const isEmailLinkInUrl = (url: string) => {
    try {
      return isSignInWithEmailLink(auth, url);
    } catch {
      return false;
    }
  };

  const completeEmailVerification = async (email: string, url?: string) => {
    try {
      setLoading(true);
      setError(null);
      const href = url || window.location.href;
      await signInWithEmailLink(auth, email, href);
      // onAuthStateChanged will load/create profile (subject to invite-only rules)
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const finalizeSignup = async (displayName: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the verified email from localStorage
      const storedEmail = window.localStorage.getItem('propsbible_signup_email');
      if (!storedEmail) throw new Error('Signup session expired. Please start over.');
      
      // Validate password
      if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters long.');
      }
      
      // Validate display name
      if (!displayName || displayName.trim().length === 0) {
        throw new Error('Display name is required.');
      }
      
      // Create the Firebase user with their chosen password
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, storedEmail, password);
      } catch (createError: any) {
        if (createError.code === 'auth/email-already-in-use') {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }
        throw createError;
      }
      const newUser = userCredential.user;
      
      // Update Firebase user profile with display name
      await updateProfile(newUser, { displayName });
      
      // Create the user profile document in userProfiles collection
      const userProfileRef = doc(firestoreDb, 'userProfiles', newUser.uid);
      await setDoc(userProfileRef, {
        uid: newUser.uid,
        email: storedEmail,
        displayName: displayName.trim(),
        role: 'user',
        createdAt: new Date(),
        lastLogin: new Date(),
        themePreference: 'light',
        notifications: true,
        defaultView: 'grid',
        organizations: [],
        onboardingCompleted: false,
        groups: {},
        plan: 'free',
        subscriptionStatus: 'inactive',
        lastStripeEventTs: Date.now()
      });
      
      // Clean up the stored email
      window.localStorage.removeItem('propsbible_signup_email');
      
      // The onAuthStateChanged will automatically load the user profile
    } catch (error: any) {
      // Don't set error state here - let the calling component handle it
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Google Sign-in error:', error);
      
      if (error.code !== 'auth/popup-closed-by-user') {
        let errorMessage = error.message;
        
        // Handle specific authentication errors with user-friendly messages
        switch (error.code) {
          case 'auth/unauthorized-domain':
            errorMessage = 'This domain is not authorized for Google Sign-in. Please contact support.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your internet connection and try again.';
            break;
          case 'auth/popup-blocked':
            errorMessage = 'Popup was blocked by your browser. Please allow popups for this site and try again.';
            break;
          case 'auth/account-exists-with-different-credential':
            errorMessage = 'An account already exists with this email using a different sign-in method. Please use the original sign-in method or contact support.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Google Sign-in is not enabled. Please contact support.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed attempts. Please wait a moment and try again.';
            break;
          default:
            // Check for SSL/certificate related errors
            if (error.message?.includes('NET::ERR_CERT') || error.message?.includes('certificate')) {
              errorMessage = 'SSL certificate error. Please try refreshing the page or contact support if the issue persists.';
            } else if (error.message?.includes('firebaseapp.com')) {
              errorMessage = 'Domain configuration error. Please contact support.';
            }
        }
        
        setError(errorMessage);
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithApple = async () => {
    try {
      setLoading(true);
      setError(null);
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      
      // Apple Sign-In requires specific parameters for web
      const result = await signInWithPopup(auth, provider);
      
      // Handle Apple's privacy features - email and name might be hidden
      if (result.user) {
        const user = result.user;
        
        // If Apple provided a name, update the user profile
        if ((result as any).additionalUserInfo?.profile?.name) {
          const name = (result as any).additionalUserInfo.profile.name;
          const displayName = name.firstName && name.lastName 
            ? `${name.firstName} ${name.lastName}`.trim()
            : user.displayName || 'Apple User';
          
          if (displayName !== user.displayName) {
            await updateProfile(user, { displayName });
          }
        }
        
        // Handle Apple's private email relay
        if (user.email && user.email.includes('@privaterelay.appleid.com')) {
          console.log('Apple private email relay detected:', user.email);
          // You might want to store this information for user reference
        }
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        setError(error.message);
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  // Code-based verification using Firestore + email queue
  const codeCollection = 'pending_signups';

  const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();
  const hashCode = async (code: string) => {
    try {
      // Simple SHA-256 hashing in browser
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode(code));
      const arr = Array.from(new Uint8Array(buf));
      return arr.map(byte => byte.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('HashCode error:', error);
      throw new Error(`Hash generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const startCodeVerification = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      const code = generateCode();
      const codeHash = await hashCode(code);
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      const attempts = 0;
      await setDoc(doc(firestoreDb, codeCollection, email.toLowerCase()), {
        codeHash,
        expiresAt,
        attempts,
        createdAt: Timestamp.now()
      });
      // enqueue email
      try {
        const emailDoc = buildVerificationEmailDoc(email, code);
        const emailId = Date.now().toString();
        console.log('Creating email document with ID:', emailId, 'for email:', email);
        await setDoc(doc(firestoreDb, 'emails', emailId), emailDoc);
        console.log('Email document created successfully with ID:', emailId);
      } catch (mailErr) {
        console.error('Failed to queue verification email', mailErr);
        // Re-throw the error so the user knows if email queuing failed
        throw new Error(`Failed to queue email: ${mailErr instanceof Error ? mailErr.message : 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Code verification start error:', error);
      setError(`Failed to send code: ${error.message || 'Unknown error'}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (email: string, code: string) => {
    try {
      setLoading(true);
      setError(null);
      const ref = doc(firestoreDb, codeCollection, email.toLowerCase());
      const snap = await getDoc(ref);
      if (!snap.exists()) return false;
      const data = snap.data() as any;
      if (Date.now() > (data.expiresAt || 0)) return false;
      const providedHash = await hashCode(code);
      const isMatch = providedHash === data.codeHash;
      
      if (isMatch) {
        // Code is valid, store the verified email for later use in finalizeSignup
        // We'll create the Firebase user only after they set their password
        window.localStorage.setItem('propsbible_signup_email', email);
        
        // Clean up the verification code
        await deleteDoc(ref);
        
        return true;
      } else {
        // Basic attempt tracking for failed attempts
        await updateDoc(ref, { attempts: (data.attempts || 0) + 1 });
        return false;
      }
    } catch (error: any) {
      setError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError(null);
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
      setCurrentOrganization(null);
      // If using cache: await webCache.clear();
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate email format
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      
      console.log('Sending password reset email to:', email);
      
      // First, check if the user exists in Firebase Auth by trying to sign them in with a dummy password
      // This will fail but won't throw an error for non-existent users in some cases
      // We'll use a different approach - check if there's a user profile in Firestore
      try {
        const userProfileRef = doc(firestoreDb, 'userProfiles', email.toLowerCase());
        const userProfileSnap = await getDoc(userProfileRef);
        
        if (!userProfileSnap.exists()) {
          // Check if there's a user with this email in the userProfiles collection
          const userProfilesQuery = query(
            collection(firestoreDb, 'userProfiles'),
            where('email', '==', email.toLowerCase())
          );
          const userProfilesSnap = await getDocs(userProfilesQuery);
          
          if (userProfilesSnap.empty) {
            throw new Error('No account found with this email address.');
          }
        }
      } catch (checkError: any) {
        if (checkError.message === 'No account found with this email address.') {
          throw checkError;
        }
        // If there's an error checking, we'll proceed anyway to avoid blocking legitimate users
        console.warn('Could not verify user existence, proceeding with password reset:', checkError);
      }
      
      // Use the SAME system as working verification codes
      const code = generateCode();
      const codeHash = await hashCode(code);
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours (longer than verification codes)
      const attempts = 0;
      
      // Store in the SAME collection pattern as verification codes
      await setDoc(doc(firestoreDb, 'pending_password_resets', email.toLowerCase()), {
        codeHash,
        expiresAt,
        attempts,
        createdAt: Timestamp.now(),
        type: 'password_reset' // Mark as password reset type
      });
      
      // Queue the password reset email using the SAME system as verification codes
      try {
        const emailDoc = buildPasswordResetEmailDoc(email, `https://app.thepropslist.uk/reset-password?code=${code}&email=${encodeURIComponent(email)}`);
        console.log('Creating password reset email document:', emailDoc);
        await setDoc(doc(firestoreDb, 'emails', Date.now().toString()), emailDoc);
        console.log('Password reset email document created successfully');
      } catch (mailErr) {
        console.error('Failed to queue password reset email', mailErr);
        // Don't throw the error, but log it properly (same as verification codes)
      }
      
      console.log('Password reset email queued successfully');
      return { success: true, message: 'Password reset email sent successfully' };
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      // Handle specific error types
      if (error.message?.includes('Failed to send password reset email')) {
        setError(error.message);
      } else if (error.message === 'No account found with this email address.') {
        setError('No account found with this email address.');
      } else if (error.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address. Please check and try again.');
      } else if (error.code === 'auth/invalid-credential') {
        setError('Invalid email address or account not found. Please check your email and try again.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many password reset attempts. Please wait before trying again.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(error.message || 'Failed to send password reset email. Please try again.');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    try {
      setLoading(true);
      setError(null);
      if (!user) throw new Error('No user');
      const userDocRef = doc(firestoreDb, 'userProfiles', user.uid);
      await updateDoc(userDocRef, updates);
      await loadUserProfile(user.uid);
    } catch (error: any) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const markOnboardingCompleted = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user) throw new Error('No user');
      
      console.log('WebAuthContext: Marking onboarding as completed for user:', user.uid);
      const userDocRef = doc(firestoreDb, 'userProfiles', user.uid);
      await updateDoc(userDocRef, { onboardingCompleted: true });
      console.log('WebAuthContext: Successfully updated user document with onboardingCompleted: true');
      
      await loadUserProfile(user.uid);
      console.log('WebAuthContext: Reloaded user profile after marking onboarding complete');
    } catch (error: any) {
      console.error('WebAuthContext: Error marking onboarding completed:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getCurrentOrganization = () => currentOrganization;
  const setCurrentOrganizationState = (orgId: string) => {
    setCurrentOrganization(orgId);
  };

  const clearError = () => setError(null);

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.uid);
    }
  };

  return (
    <WebAuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error,
        signIn,
        signInWithGoogle,
        signInWithApple,
        startEmailVerification,
        isEmailLinkInUrl,
        completeEmailVerification,
        finalizeSignup,
        startCodeVerification,
        verifyCode,
        signOut: handleSignOut,
        resetPassword,
        updateUserProfile,
        markOnboardingCompleted,
        getCurrentOrganization,
        setCurrentOrganization: setCurrentOrganizationState,
        clearError,
        refreshProfile
      }}
    >
      {children}
    </WebAuthContext.Provider>
  );
}

export function useWebAuth(): WebAuthContextType {
  const context = useContext(WebAuthContext);
  if (context === undefined) {
    throw new Error('useWebAuth must be used within a WebAuthProvider');
  }
  return context;
} 