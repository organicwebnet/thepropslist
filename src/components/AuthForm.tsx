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
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient';
import type { AuthError } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useFirebase } from '../platforms/mobile/contexts/FirebaseContext';
import { appleAuthService } from '../services/AppleAuthService';
import { googleSignInService } from '../services/GoogleSignInService';

interface AuthFormProps {
  onClose: () => void;
}

export type AuthMode = 'signin' | 'signup' | 'forgot';

function RequiredLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Text style={styles.label}>
      {children}
      <Text style={styles.required}>*</Text>
    </Text>
  );
}

export function AuthForm({ onClose }: AuthFormProps): React.JSX.Element {
  const { service: firebaseService, isInitialized, error: firebaseError } = useFirebase();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (firebaseError) {
      setError(`Firebase initialization failed: ${firebaseError.message}`);
    }
  }, [firebaseError]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await googleSignInService.signIn();
      
      if (result.success && result.user) {
        setError(null);
        setSuccess('Google Sign-In successful!');
        onClose(); // Close the auth form on successful sign-in
      } else {
        setError(result.error || 'Google Sign-In failed');
      }
    } catch (err: any) {
      setError(err.message || 'Google Sign-In error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!appleAuthService.isAvailable()) {
        setError('Apple Sign-In is only available on iOS devices');
        return;
      }

      const result = await appleAuthService.signIn();
      
      if (result.success && result.user) {
        // TODO: Integrate with Firebase Auth
        // For now, we'll show a success message
        setError(null);
        setSuccess('Apple Sign-In successful! Integration with Firebase pending.');
        // You would typically call Firebase Auth here to create/link the account
        // await firebaseService.signInWithApple(result.user);
      } else {
        setError(result.error || 'Apple Sign-In failed');
      }
    } catch (err: any) {
      setError(err.message || 'Apple Sign-In error occurred');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      setError('Please enter your email address');
      return false;
    }
    
    if (!trimmedEmail.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (mode !== 'forgot' && !trimmedPassword) {
      setError('Please enter your password');
      return false;
    }

    if (mode === 'signup' && trimmedPassword.length < 6) {
      setError('Password should be at least 6 characters long');
      return false;
    }

    return true;
  };

  const handleForgotPassword = async () => {
    setError(null);
    setSuccess(null);

    if (!isInitialized || !firebaseService) {
      setError("Firebase service not available.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await firebaseService.sendPasswordResetEmail(email.trim());
      setSuccess('Password reset email sent! Please check your inbox.');
      setEmail('');
    } catch (error: any) {
              console.error('[AuthForm Forgot Password Error]', error);
      
      let message = 'Failed to send reset email. Please try again.';
      
      // Handle Firebase error structure (could be nested)
      const errorCode = error?.code || error?.error?.code;
      const errorMessage = error?.message || error?.error?.message;
      
      switch (errorCode) {
        case 'auth/user-not-found':
          message = 'No account found with this email address.';
          break;
        case 'auth/invalid-email':
          message = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many attempts. Please try again later.';
          break;
        default:
          if (errorMessage) {
            message = errorMessage;
          }
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    
    if (!isInitialized || !firebaseService) {
      setError("Firebase service not available.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      if (mode === 'signup') {
        await firebaseService.createUserWithEmailAndPassword(trimmedEmail, trimmedPassword);
      } else {
        await firebaseService.signInWithEmailAndPassword(trimmedEmail, trimmedPassword);
      }
      onClose();
    } catch (error: any) {
      console.error('[AuthForm Error]', error);
      
      let message = 'An error occurred. Please try again.';
      
      // Handle Firebase error structure (could be nested)
      const errorCode = error?.code || error?.error?.code;
      const errorMessage = error?.message || error?.error?.message;
      
      switch (errorCode) {
        case 'auth/email-already-in-use':
          message = 'This email is already registered. Please sign in instead.';
          break;
        case 'auth/weak-password':
          message = 'Password should be at least 6 characters long.';
          break;
        case 'auth/invalid-email':
          message = 'Please enter a valid email address.';
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'Invalid email or password. Please check your credentials and try again.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your connection.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many attempts. Please try again later.';
          break;
        case 'auth/operation-not-allowed':
          message = 'Email/password sign up is not enabled. Please contact support.';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled.';
          break;
        default:
          // If no specific error code match, use the error message if available
          if (errorMessage) {
            message = errorMessage;
          }
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'signin': return 'Welcome Back';
      case 'signup': return 'Create Account';
      case 'forgot': return 'Reset Password';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
              case 'signin': return 'Sign in to access your props list';
      case 'signup': return 'Join the production crew';
      case 'forgot': return 'Enter your email to reset password';
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
            <Ionicons name="person-circle" size={64} color="#c084fc" />
            <Text style={styles.title}>{getTitle()}</Text>
            <Text style={styles.subtitle}>{getSubtitle()}</Text>
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

          {mode !== 'forgot' ? (
            <>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <RequiredLabel>Email Address</RequiredLabel>
                <TextInput
                  style={styles.textInput}
                  placeholder="you@example.com"
                  placeholderTextColor="#6b7280"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <RequiredLabel>Password</RequiredLabel>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••"
                    placeholderTextColor="#6b7280"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
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
              </View>
              
              {/* Forgot Password Link */}
              {mode === 'signin' && (
                <TouchableOpacity onPress={() => setMode('forgot')} style={styles.forgotContainer}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, (loading || !isInitialized) && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading || !isInitialized}
              >
                {loading && <ActivityIndicator size="small" color="#FFFFFF" style={styles.loadingIcon} />}
                <Text style={styles.submitButtonText}>
                  {mode === 'signin' ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Sign In Button */}
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                disabled={loading}
              >
                <Ionicons name="logo-google" size={20} color="#fff" />
                <Text style={styles.googleButtonText}>
                  Sign {mode === 'signin' ? 'in' : 'up'} with Google
                </Text>
              </TouchableOpacity>

              {/* Apple Sign In Button */}
              <TouchableOpacity
                style={styles.appleButton}
                onPress={handleAppleSignIn}
                disabled={loading}
              >
                <Ionicons name="logo-apple" size={20} color="#fff" />
                <Text style={styles.appleButtonText}>
                  Sign {mode === 'signin' ? 'in' : 'up'} with Apple
                </Text>
              </TouchableOpacity>

              {/* Mode Switch */}
              <View style={styles.switchContainer}>
                <Text style={styles.switchText}>
                  {mode === 'signin' ? 'Don\'t have an account? ' : 'Already have an account? '}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  <Text style={styles.switchLink}>
                    {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // Forgot Password Form
            <View>
              <View style={styles.inputGroup}>
                <RequiredLabel>Email Address</RequiredLabel>
                <TextInput
                  style={styles.textInput}
                  placeholder="you@example.com"
                  placeholderTextColor="#6b7280"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
              
              <TouchableOpacity
                style={[styles.resetButton, (loading || !isInitialized) && styles.submitButtonDisabled]}
                onPress={handleForgotPassword}
                disabled={loading || !isInitialized}
              >
                {loading && <ActivityIndicator size="small" color="#FFFFFF" style={styles.loadingIcon} />}
                <Text style={styles.submitButtonText}>Send Reset Link</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setMode('signin')} 
                style={styles.backContainer}
              >
                <Text style={styles.backText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
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
  required: {
    color: '#c084fc',
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
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 14,
    color: '#c084fc',
  },
  submitButton: {
    backgroundColor: '#c084fc',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#4b5563',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  googleButton: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  googleButtonText: {
    color: '#d1d5db',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  appleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  switchLink: {
    fontSize: 14,
    color: '#c084fc',
    fontWeight: '500',
  },
  resetButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  backContainer: {
    alignItems: 'center',
  },
  backText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
