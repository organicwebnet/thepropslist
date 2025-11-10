/**
 * Auth Code Service
 * Handles email verification codes and password reset codes
 * Uses the same system as the web app for consistency
 */

import * as Crypto from 'expo-crypto';
import { doc, setDoc, getDoc, deleteDoc, updateDoc, Timestamp } from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { buildVerificationEmailDoc } from './EmailTemplateService';
import { SIGNUP_CODE_EXPIRY, PASSWORD_RESET_CODE_EXPIRY } from '../shared/constants/timing';
import { isValidVerificationCode } from '../shared/utils/validation';

/**
 * Generate a 6-digit verification code
 */
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash a code using SHA-256 (same as web app)
 */
export async function hashCode(code: string): Promise<string> {
  try {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      code,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return hash;
  } catch (error) {
    console.error('HashCode error:', error);
    throw new Error(`Hash generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Start email verification code process
 * 
 * @param firestore - Firestore instance (React Native Firebase Module)
 * @param email - User's email address (will be lowercased)
 * @param type - Type of verification: 'signup' or 'password_reset'
 * @throws {Error} If email queuing fails
 */
export async function startCodeVerification(
  firestore: FirebaseFirestoreTypes.Module,
  email: string,
  type: 'signup' | 'password_reset' = 'signup'
): Promise<void> {
  const code = generateCode();
  const codeHash = await hashCode(code);
  const expiresAt = Date.now() + (type === 'password_reset' ? PASSWORD_RESET_CODE_EXPIRY : SIGNUP_CODE_EXPIRY);
  const attempts = 0;
  
  const collection = type === 'password_reset' ? 'pending_password_resets' : 'pending_signups';
  
  await setDoc(doc(firestore, collection, email.toLowerCase()), {
    codeHash,
    expiresAt,
    attempts,
    createdAt: Timestamp.now()
  });
  
  // Queue email using the same system as web app
  try {
    const emailDoc = buildVerificationEmailDoc({ toEmail: email, code });
    const emailId = Date.now().toString();
    await setDoc(doc(firestore, 'emails', emailId), emailDoc);
  } catch (mailErr) {
    console.error('Failed to queue verification email', mailErr);
    throw new Error(`Failed to queue email: ${mailErr instanceof Error ? mailErr.message : 'Unknown error'}`);
  }
}

/**
 * Verify a code
 * 
 * @param firestore - Firestore instance (React Native Firebase Module)
 * @param email - User's email address
 * @param code - Verification code to check
 * @param type - Type of verification: 'signup' or 'password_reset'
 * @returns true if code is valid, false otherwise
 */
export async function verifyCode(
  firestore: FirebaseFirestoreTypes.Module,
  email: string,
  code: string,
  type: 'signup' | 'password_reset' = 'signup'
): Promise<boolean> {
  // Validate code format
  if (!isValidVerificationCode(code)) {
    return false;
  }
  
  const collection = type === 'password_reset' ? 'pending_password_resets' : 'pending_signups';
  const ref = doc(firestore, collection, email.toLowerCase());
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    return false;
  }
  
  const data = snap.data();
  
  // Check expiration
  if (Date.now() > (data?.expiresAt || 0)) {
    return false;
  }
  
  // Verify code hash
  const providedHash = await hashCode(code);
  const isMatch = providedHash === data?.codeHash;
  
  if (isMatch) {
    // Code is valid, clean up
    await deleteDoc(ref);
    return true;
  } else {
    // Increment attempts
    await updateDoc(ref, { attempts: (data?.attempts || 0) + 1 });
    return false;
  }
}

/**
 * Update password using reset code (via Cloud Function)
 */
export async function updatePasswordWithCode(
  email: string,
  code: string,
  newPassword: string
): Promise<void> {
  // Use Cloud Function to update password
  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const updatePasswordFunction = httpsCallable(getFunctions(), 'updateUserPasswordWithCode');
  
  await updatePasswordFunction({
    email: email.toLowerCase(),
    code: code,
    newPassword: newPassword
  });
}

