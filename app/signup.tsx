/**
 * Signup Screen
 * Complete signup flow with email verification
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import { useFirebase } from '../src/platforms/mobile/contexts/FirebaseContext';
import { useAuth } from '../src/contexts/AuthContext';
import { startCodeVerification, verifyCode } from '../src/services/AuthCodeService';
import { validateEmail, validatePassword, validateDisplayName } from '../src/shared/utils/validation';
import { RESEND_CODE_COOLDOWN } from '../src/shared/constants/timing';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SignupStep = 'email' | 'code' | 'password';

export default function SignupScreen() {
  const router = useRouter();
  const { service: firebaseService, isInitialized } = useFirebase();
  const { user } = useAuth();
  
  const [step, setStep] = useState<SignupStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    // Check if user is already signed in
    if (user) {
      router.replace('/(tabs)');
    }
    
    // Check if email was already verified
    AsyncStorage.getItem('propsbible_signup_email').then((storedEmail) => {
      if (storedEmail && step === 'email') {
        setEmail(storedEmail);
        setStep('password');
        setSuccess('Email already verified. Please complete your account setup.');
      }
    });
  }, [user, router, step]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSendCode = async () => {
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Please enter a valid email address');
      return;
    }

    if (!isInitialized || !firebaseService) {
      setError('Firebase service not available');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const firestore = firebaseService.getFirestoreReactNativeInstance();
      await startCodeVerification(firestore, email, 'signup');
      setStep('code');
      setSuccess('Verification code sent! Check your email (including spam folder).');
      setResendCooldown(RESEND_CODE_COOLDOWN);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    if (!isInitialized || !firebaseService) {
      setError('Firebase service not available');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const firestore = firebaseService.getFirestoreReactNativeInstance();
      const isValid = await verifyCode(firestore, email, code, 'signup');
      if (isValid) {
        // Store verified email
        await AsyncStorage.setItem('propsbible_signup_email', email);
        setStep('password');
        setSuccess('Email verified! Please set your name and password.');
      } else {
        setError('Invalid or expired code. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    await handleSendCode();
  };

  const handleCompleteSignup = async () => {
    const nameValidation = validateDisplayName(displayName);
    if (!nameValidation.valid) {
      setError(nameValidation.error || 'Please enter your name');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Password is invalid');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!isInitialized || !firebaseService) {
      setError('Firebase service not available');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Get verified email from storage
      const verifiedEmail = await AsyncStorage.getItem('propsbible_signup_email');
      if (!verifiedEmail || verifiedEmail !== email) {
        throw new Error('Email verification expired. Please start over.');
      }

      // Create user account
      const { createUserWithEmailAndPassword, updateProfile } = await import('@react-native-firebase/auth');
      const auth = (firebaseService as any).auth;
      
      const userCredential = await createUserWithEmailAndPassword(auth, verifiedEmail, password);
      const newUser = userCredential.user;

      // Update display name
      await updateProfile(newUser, { displayName: displayName.trim() });

      // Create user profile
      const { UserRole, DEFAULT_ROLE_PERMISSIONS } = await import('../src/shared/types/auth');
      const userProfile = {
        uid: newUser.uid,
        email: verifiedEmail,
        displayName: displayName.trim(),
        role: UserRole.VIEWER,
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: DEFAULT_ROLE_PERMISSIONS[UserRole.VIEWER],
        plan: 'free',
        subscriptionStatus: 'inactive',
        onboardingCompleted: false,
      };

      await firebaseService.setDocument('userProfiles', newUser.uid, userProfile);

      // Clean up
      await AsyncStorage.removeItem('propsbible_signup_email');

      setSuccess('Account created successfully!');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1000);
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(err.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.formContainer}>
            {/* Header */}
            <View style={styles.header}>
              <Ionicons name="person-add" size={64} color="#c084fc" />
              <Text style={styles.title}>
                {step === 'email' ? 'Create Account' : step === 'code' ? 'Verify Email' : 'Complete Signup'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 'email' 
                  ? 'Enter your email to get started'
                  : step === 'code'
                  ? 'Enter the code sent to your email'
                  : 'Set your name and password'}
              </Text>
            </View>

            {/* Error/Success Messages */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {success && (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>{success}</Text>
              </View>
            )}

            {/* Email Step */}
            {step === 'email' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="you@example.com"
                    placeholderTextColor="#6b7280"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleSendCode}
                  disabled={loading || !isInitialized}
                >
                  {loading && <ActivityIndicator size="small" color="#FFFFFF" style={styles.loadingIcon} />}
                  <Text style={styles.submitButtonText}>Send Verification Code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.backButton}
                >
                  <Text style={styles.backText}>Back to Sign In</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Code Verification Step */}
            {step === 'code' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Verification Code *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="000000"
                    placeholderTextColor="#6b7280"
                    value={code}
                    onChangeText={(text) => setCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!loading}
                  />
                  <Text style={styles.hintText}>Enter the 6-digit code sent to {email}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleVerifyCode}
                  disabled={loading || !isInitialized}
                >
                  {loading && <ActivityIndicator size="small" color="#FFFFFF" style={styles.loadingIcon} />}
                  <Text style={styles.submitButtonText}>Verify Code</Text>
                </TouchableOpacity>

                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>Didn't receive the code? </Text>
                  <TouchableOpacity
                    onPress={handleResendCode}
                    disabled={resendCooldown > 0 || loading}
                  >
                    <Text style={[styles.resendLink, resendCooldown > 0 && styles.resendLinkDisabled]}>
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => setStep('email')}
                  style={styles.backButton}
                >
                  <Text style={styles.backText}>Change Email</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Password Step */}
            {step === 'password' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="John Doe"
                    placeholderTextColor="#6b7280"
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password *</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="••••••••"
                      placeholderTextColor="#6b7280"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete="new-password"
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.hintText}>Must be at least 8 characters</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password *</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="••••••••"
                      placeholderTextColor="#6b7280"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoComplete="new-password"
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleCompleteSignup}
                  disabled={loading || !isInitialized}
                >
                  {loading && <ActivityIndicator size="small" color="#FFFFFF" style={styles.loadingIcon} />}
                  <Text style={styles.submitButtonText}>Create Account</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 32,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#dc2626',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: '#16a34a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  successText: {
    color: '#86efac',
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#d1d5db',
    marginBottom: 6,
  },
  textInput: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    color: '#ffffff',
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 48,
    borderRadius: 8,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    color: '#ffffff',
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#c084fc',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingIcon: {
    marginRight: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  resendLink: {
    fontSize: 14,
    color: '#c084fc',
    fontWeight: '500',
  },
  resendLinkDisabled: {
    color: '#6b7280',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});

