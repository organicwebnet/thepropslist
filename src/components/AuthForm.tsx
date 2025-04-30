import React, { useState, useEffect } from 'react';
import { 
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StyleSheet,
  ScrollView
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import type { AuthError } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebase } from '../contexts/FirebaseContext';
// Temporarily comment out Lucide icons
import { LogIn, UserPlus, Loader2, ArrowLeft, Eye, EyeOff, X } from 'lucide-react-native';

interface AuthFormProps {
  onClose: () => void;
}

export type AuthMode = 'signin' | 'signup' | 'forgot';

function RequiredLabel({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <Text className="block text-sm font-medium text-gray-300 mb-1.5">
      {children}
      <Text className="text-primary">*</Text>
    </Text>
  );
}

export function AuthForm({ onClose }: AuthFormProps): JSX.Element {
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
    setError('Google Sign-In not yet implemented for this platform setup.');
    setLoading(false);
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
      let message = 'Failed to send reset email. Please try again.';
      
      switch (error.code) {
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
          console.error('Password reset error:', error);
          if (error.message) message = error.message;
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
      const firebaseError = error as AuthError;
      let message = 'An error occurred. Please try again.';
      
      switch (firebaseError.code) {
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
          console.error('Auth error:', error);
          if (error.message) message = error.message;
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      className="flex-1 w-full h-full bg-black bg-opacity-90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[100]"
    >
      {/* Dramatic stage background */}
      <View
        className="absolute inset-0 pointer-events-none"
      >
        {/* Background image */}
        <View
          className="absolute inset-0 bg-cover bg-center"
        />
        {/* Gradient overlays for depth and readability */}
        <View
          className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-20"
        />
        <View
          className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20"
        />
        {/* Blue atmospheric fog overlay */}
        <View
          className="absolute inset-0 mix-blend-color bg-blue-900/20"
        />
        {/* Additional lighting effect */}
        <View
          className="absolute inset-0 bg-gradient-radial from-blue-500/10 via-transparent to-transparent opacity-20"
        />
      </View>

      {/* Main content container */}
      <View
        className="relative w-full bg-gray-900 bg-opacity-90 border border-primary/30 rounded-lg overflow-hidden"
        style={{ maxHeight: '90%' }}
      >
        {/* Subtle spotlight effect */}
        <View
          className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"
        />

        {/* Wrap the actual form content in ScrollView */}
        <ScrollView 
          contentContainerStyle={{ padding: Platform.OS === 'web' ? 32 : 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button for forgot password mode */}
          {mode === 'forgot' && (
            <TouchableOpacity 
              onPress={() => setMode('signin')} 
              className="absolute top-3 left-3 p-2 z-10"
              aria-label="Back to sign in"
            >
              <Text className="text-blue-400">Back</Text>
            </TouchableOpacity>
          )}

          <View className="mb-6 text-center">
            <Text className="text-2xl font-bold text-primary mb-2">
              {mode === 'signin' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
            </Text>
            <Text className="text-sm text-gray-400">
              {mode === 'signin' && 'Welcome back to the Props Bible'}
              {mode === 'signup' && 'Join the Props Bible community'}
              {mode === 'forgot' && 'Enter your email to receive reset instructions'}
            </Text>
          </View>

          <View>
            {error && (
              <View
                className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md"
              >
                <Text className="text-sm text-red-300">{error}</Text>
              </View>
            )}
            {success && (
              <View
                className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-md"
              >
                <Text className="text-sm text-green-300">{success}</Text>
              </View>
            )}

            <View
              className="mb-4"
            >
              <RequiredLabel>Email Address</RequiredLabel>
              <TextInput 
                  value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:border-primary transition duration-200"
                style={{ 
                  elevation: 0, 
                  shadowOpacity: 0, 
                  shadowColor: 'transparent' 
                }}
                aria-label="Email Address"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

              {mode !== 'forgot' && (
              <View className="mb-2"> 
                <View className="flex justify-between items-baseline mb-1.5">
                  <RequiredLabel>Password</RequiredLabel>
                </View>
                <View className="relative"> 
                  <TextInput 
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-md placeholder-gray-500 focus:outline-none focus:border-primary transition duration-200 pr-10"
                    style={{ 
                      elevation: 0, 
                      shadowOpacity: 0, 
                      shadowColor: 'transparent' 
                    }}
                    aria-label="Password"
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)} 
                    className="absolute right-3 top-[38px] transform -translate-y-1/2 p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color="#9CA3AF" />
                    ) : (
                      <Eye size={18} color="#9CA3AF" />
                    )}
                  </TouchableOpacity>
                </View>
                {mode === 'signin' && (
                  <TouchableOpacity onPress={() => setMode('forgot')} className="mt-2 text-sm text-blue-400 hover:underline text-right">
                    <Text className="text-blue-400">Forgot password?</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity 
              onPress={mode === 'forgot' ? handleForgotPassword : handleSubmit}
              disabled={loading}
              className={`w-full flex flex-row items-center justify-center px-4 py-3 ${loading ? 'bg-primary/70' : 'bg-primary hover:bg-primary/90'} text-white font-semibold rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-primary`}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                ) : (
                  <>{/* Render appropriate icon based on mode */}
                  {mode === 'signin' && <LogIn size={18} color="#FFFFFF" style={{ marginRight: 8 }} />}
                  {mode === 'signup' && <UserPlus size={18} color="#FFFFFF" style={{ marginRight: 8 }} />}
                  {mode === 'forgot' && <ArrowLeft size={18} color="#FFFFFF" style={{ marginRight: 8 }} />}
                  </>
                )}
                <Text style={{ color: '#FFFFFF' }}>
                  {loading ? 'Processing...' : (mode === 'signin' ? 'Sign In' : (mode === 'signup' ? 'Sign Up' : 'Send Reset Email'))}
                </Text>
            </TouchableOpacity>
          </View>

          {mode !== 'forgot' && (
            <View className="my-6 flex flex-row items-center">
              <View className="flex-grow border-t border-gray-700" />
              <Text className="mx-4 text-xs text-gray-500">OR</Text>
              <View className="flex-grow border-t border-gray-700" />
            </View>
          )}

          {mode !== 'forgot' && (
            <TouchableOpacity 
              onPress={handleGoogleSignIn} 
              disabled={loading}
              className="w-full flex flex-row items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500"
            >
              {/* Temporarily comment out Google SVG again */}
               
              <Svg aria-hidden={true} focusable={false} viewBox="0 0 488 512" width={18} height={18} style={{ marginRight: 10 }} >
                 <Path fill="#4285F4" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
              </Svg>
              
              <Text className="text-gray-700 font-medium text-sm">Sign {mode === 'signin' ? 'in' : 'up'} with Google</Text>
            </TouchableOpacity>
          )}

          <View className="mt-6 text-center">
            {mode === 'signin' ? (
              <View style={styles.switchAuthContainer}>
                <Text style={styles.switchAuthText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => setMode('signup')} >
                  <Text style={[styles.switchAuthLink, styles.switchAuthLinkHover]}>Sign up</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {mode === 'signup' ? (
              <View style={styles.switchAuthContainer}>
                <Text style={styles.switchAuthText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => setMode('signin')} >
                  <Text style={[styles.switchAuthLink, styles.switchAuthLinkHover]}>Sign in</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {mode === 'forgot' && (
              <Text style={styles.switchAuthText}>Enter your email to receive a reset link</Text>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  switchAuthContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  switchAuthText: {
    color: '#60A5FA',
    fontSize: 14,
  },
  switchAuthLink: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '600',
  },
  switchAuthLinkHover: {
    textDecorationLine: 'underline',
  }
});