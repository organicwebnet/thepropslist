/**
 * Signup Screen
 * Redirects users to web app for signup
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { APP_URL } from '../src/shared/constants/app';

export default function SignupScreen() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // Check if user is already signed in
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user, router]);

  const handleOpenWebApp = async () => {
    const webAppUrl = `${APP_URL}/signup`;
    try {
      const canOpen = await Linking.canOpenURL(webAppUrl);
      if (canOpen) {
        await Linking.openURL(webAppUrl);
      } else {
        // Fallback: try without protocol
        await Linking.openURL(webAppUrl);
      }
    } catch (error) {
      console.error('Error opening web app:', error);
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
              <Ionicons name="globe-outline" size={64} color="#c084fc" />
              <Text style={styles.title}>Sign Up on Web App</Text>
              <Text style={styles.subtitle}>
                To get started, please create your account on our web app first
              </Text>
            </View>

            {/* Info Message */}
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle" size={24} color="#60a5fa" />
                <Text style={styles.infoText}>
                  New users should sign up on the web app to set up their account and configure the system.
                </Text>
              </View>
            </View>

            {/* Recommendation */}
            <View style={styles.recommendationContainer}>
              <View style={styles.recommendationRow}>
                <Ionicons name="tablet-portrait-outline" size={24} color="#fbbf24" />
                <Text style={styles.recommendationText}>
                  We recommend using a tablet or PC for the best experience, as the web app is optimized for larger screens.
                </Text>
              </View>
            </View>

            {/* Web App Button */}
            <TouchableOpacity
              style={styles.webAppButton}
              onPress={handleOpenWebApp}
            >
              <Ionicons name="open-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.webAppButtonText}>Open Web App to Sign Up</Text>
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Text style={styles.backText}>Back to Sign In</Text>
            </TouchableOpacity>

            {/* Web App URL */}
            <View style={styles.urlContainer}>
              <Text style={styles.urlLabel}>Or visit:</Text>
              <Text style={styles.urlText}>{APP_URL}/signup</Text>
            </View>
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
    lineHeight: 22,
  },
  infoContainer: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderWidth: 1,
    borderColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    color: '#93c5fd',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  recommendationContainer: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  recommendationText: {
    color: '#fde68a',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  webAppButton: {
    backgroundColor: '#c084fc',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  webAppButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  backText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  urlContainer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  urlLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  urlText: {
    fontSize: 14,
    color: '#c084fc',
    fontWeight: '500',
  },
});
