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
  // Return minimal content temporarily
  /*
  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Auth Form Placeholder</Text>
    </View>
  );
  */

  // Original component logic commented out below
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

  // Return the original JSX structure, now inside comments
  return (
    <View
      className="flex-1 w-full h-full bg-black bg-opacity-90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[100]"
    >
      <View
        className="absolute inset-0 pointer-events-none"
      >
        {/* Ensure SVG Background is commented using JSX style */}
        {/* 
        <Svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 1440 900" className="w-full h-full">
          <Path
            fill="url(#auth-pattern)"
            d="M0 0h1440v900H0z"
          />
        </Svg>
        */}
      </View>

      <ScrollView
        className="w-full max-w-md bg-gray-900 bg-opacity-80 rounded-xl shadow-2xl overflow-hidden"
        contentContainerStyle={{ paddingHorizontal: Platform.OS === 'web' ? 32 : 24, paddingVertical: 32 }}
      >
        
        <View className="mb-8 flex items-center">
          {/* SVG User Icon already commented from previous attempt */}
          {/*
          <Svg className="w-16 h-16 text-primary mb-4" viewBox="0 0 24 24" fill="currentColor">
            <Path d="M12 1.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm0 10c-4.42 0-8 1.79-8 4v1.5c0 .83.67 1.5 1.5 1.5h13c.83 0 1.5-.67 1.5-1.5V15.5c0-2.21-3.58-4-8-4z"/>
          </Svg>
          */}
          <Text className="text-3xl font-bold text-white tracking-tight">
            {mode === 'signin' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
          </Text>
          <Text className="text-gray-400 mt-2">
            {mode === 'signin' ? 'Sign in to access your props bible' : mode === 'signup' ? 'Join the production crew' : 'Enter your email to reset password'}
          </Text>
        </View>

        {error && (
          <View className="bg-red-500 bg-opacity-20 border border-red-600 p-3 rounded-lg mb-6">
            <Text className="text-red-300 text-sm text-center">{error}</Text>
          </View>
        )}
        {success && (
          <View className="bg-green-500 bg-opacity-20 border border-green-600 p-3 rounded-lg mb-6">
            <Text className="text-green-300 text-sm text-center">{success}</Text>
          </View>
        )}

        {mode !== 'forgot' ? (
          <>
            <View className="mb-5">
              <RequiredLabel>Email Address</RequiredLabel>
              <TextInput
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View className="mb-6 relative">
              <RequiredLabel>Password</RequiredLabel>
              <TextInput
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors pr-12"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                {/* Ensure only placeholder is present */}
                <Text style={{color: '#9CA3AF'}}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            
            {mode === 'signin' && (
               <TouchableOpacity onPress={() => setMode('forgot')} className="mb-6">
                  <Text className="text-sm text-primary hover:underline text-right">Forgot Password?</Text>
               </TouchableOpacity>
            )}

            <TouchableOpacity
              className="w-full flex flex-row items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors disabled:opacity-50"
              onPress={handleSubmit}
              disabled={loading || !isInitialized}
            >
              {/* Ensure only placeholder is present */}
              {loading && <ActivityIndicator size="small" color="#FFFFFF" style={{marginRight: 8}}/>}
              <Text className="text-sm font-semibold text-white">{mode === 'signin' ? 'Sign In' : 'Sign Up'}</Text>
            </TouchableOpacity>

            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-gray-700" />
              <Text className="px-4 text-sm text-gray-500">OR</Text>
              <View className="flex-1 h-px bg-gray-700" />
            </View>

            <TouchableOpacity
              className="w-full bg-gray-800 hover:bg-gray-700 active:bg-gray-600 border border-gray-700 py-3 rounded-lg flex items-center justify-center flex-row transition-colors shadow-sm"
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
               {/* Comment out Google SVG Icon */}
               {/* 
               <Svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
                  <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <Path fill="none" d="M0 0h48v48H0z"/>
               </Svg>
               */}
               {/* Wrap Google button text */}
               <Text className="text-base font-medium text-gray-300">Sign {mode === 'signin' ? 'in' : 'up'} with Google</Text>
            </TouchableOpacity>

            <View className="mt-8 text-center">
              <Text className="text-sm text-gray-400">
                {mode === 'signin' ? 'Don\'t have an account? ' : 'Already have an account? '}
                <Text 
                  className="font-medium text-primary hover:underline"
                  onPress={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </Text>
              </Text>
            </View>
          </>
        ) : (
          // Forgot Password Form
          <View>
            <View className="mb-5">
              <RequiredLabel>Email Address</RequiredLabel>
              <TextInput
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
            <TouchableOpacity
              className="w-full flex flex-row items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors disabled:opacity-50"
              onPress={handleForgotPassword}
              disabled={loading || !isInitialized}
            >
              {/* Ensure only placeholder is present */}
              {loading && <ActivityIndicator size="small" color="#FFFFFF" style={{marginRight: 8}}/>}
              <Text className="text-sm font-semibold text-white">Send Reset Link</Text>
            </TouchableOpacity>
            <TouchableOpacity 
               onPress={() => setMode('signin')} 
               className="flex-row items-center justify-center mt-4" /* Added mt-4 for spacing */
             >
               {/* Ensure text is wrapped */}
               <Text className="text-sm text-gray-400 hover:text-gray-200">Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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