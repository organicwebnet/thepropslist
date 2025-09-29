import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  EmailAuthProvider,
  linkWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { buildVerificationEmailDoc } from '../services/EmailService';
import { auth, db } from '../firebase';
// If you implement caching, import your webCache here
// import { webCache } from '../services/webCache';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  role: 'admin' | 'user' | 'viewer' | 'god';
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
  resetPassword: (email: string) => Promise<void>;
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
      // If using cache, try cache first
      // const cached = await webCache.get<UserProfile>(`user-profile-${uid}`);
      // if (cached) { setUserProfile(cached); return cached; }
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
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
        setUserProfile(profileData);
        // If using cache: await webCache.set(`user-profile-${uid}`, profileData, 60 * 60 * 1000);
        if (Array.isArray(profileData.organizations) && profileData.organizations.length > 0) {
          setCurrentOrganization(profileData.organizations[0]);
        }
        return profileData;
      } else {
        // If invite-only mode is enabled, require a valid invitation before creating a profile
        const inviteOnly = String(import.meta.env.VITE_INVITE_ONLY || '').toLowerCase() === 'true';
        if (inviteOnly) {
          try {
            const emailToCheck = (user?.email || '').toLowerCase();
            const invitesRef = collection(db, 'invitations');
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
      const userDocRef = doc(db, 'users', uid);
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
      if (!user || !user.email) throw new Error('No verified user session.');
      // Attach password credential
      const credential = EmailAuthProvider.credential(user.email, password);
      await linkWithCredential(user, credential).catch(async (e: any) => {
        // If already has password provider, fall back to updateProfile only
        if (!String(e?.code || '').includes('already-in-use')) throw e;
      });
      await updateProfile(user, { displayName });
      await loadUserProfile(user.uid);
    } catch (error: any) {
      setError(error.message);
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
      if (error.code !== 'auth/popup-closed-by-user') {
        setError(error.message);
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
        if (result.additionalUserInfo?.profile?.name) {
          const name = result.additionalUserInfo.profile.name as any;
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
      throw new Error(`Hash generation failed: ${error.message}`);
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
      await setDoc(doc(db, codeCollection, email.toLowerCase()), {
        codeHash,
        expiresAt,
        attempts,
        createdAt: Timestamp.now()
      });
      // enqueue email
      try {
        const emailDoc = buildVerificationEmailDoc(email, code);
        console.log('Creating email document:', emailDoc);
        await setDoc(doc(db, 'emails', Date.now().toString()), emailDoc);
        console.log('Email document created successfully');
      } catch (mailErr) {
        console.error('Failed to queue verification email', mailErr);
        // Don't throw the error, but log it properly
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
      const ref = doc(db, codeCollection, email.toLowerCase());
      const snap = await getDoc(ref);
      if (!snap.exists()) return false;
      const data = snap.data() as any;
      if (Date.now() > (data.expiresAt || 0)) return false;
      const providedHash = await hashCode(code);
      const isMatch = providedHash === data.codeHash;
      // Basic attempt tracking
      await updateDoc(ref, { attempts: (data.attempts || 0) + 1 });
      return isMatch;
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
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      setError(error.message);
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
      const userDocRef = doc(db, 'users', user.uid);
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
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { onboardingCompleted: true });
      await loadUserProfile(user.uid);
    } catch (error: any) {
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