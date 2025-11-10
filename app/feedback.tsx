/**
 * Feedback Page
 * Allows users to submit feedback, bug reports, and feature requests
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFirebase } from '../src/platforms/mobile/contexts/FirebaseContext';
import { useAuth } from '../src/contexts/AuthContext';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../src/contexts/ThemeContext';
import { lightTheme, darkTheme } from '../src/styles/theme';
import { APP_NAME } from '../src/shared/constants/app';
import { validateEmail, sanitiseForFirestore } from '../src/shared/utils/validation';
import { AppGradient } from '../src/components/AppGradient';
import NetInfo from '@react-native-community/netinfo';

type FeedbackType = 'bug' | 'feature' | 'feedback';
type Severity = 'low' | 'medium' | 'high';

export default function FeedbackPage() {
  const router = useRouter();
  const { service: firebaseService } = useFirebase();
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = theme === 'light' ? lightTheme.colors : darkTheme.colors;
  const styles = getStyles(colors);

  const [type, setType] = useState<FeedbackType>('bug');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll access is required to attach screenshots');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        // Check file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (asset.fileSize && asset.fileSize > maxSize) {
          Alert.alert(
            'File Too Large',
            'The selected image is too large. Please select an image smaller than 5MB.',
            [{ text: 'OK' }]
          );
          return;
        }
        setScreenshotUri(asset.uri);
        setScreenshot(asset.uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
    setScreenshotUri(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      setError('Please fill in both title and message');
      return;
    }

    if (email && !validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (isOffline) {
      setError('You are currently offline. Please check your internet connection and try again.');
      return;
    }

    if (!firebaseService) {
      setError('Firebase service not available');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Sanitise user input before storing
      const feedbackDoc = {
        type,
        severity,
        title: sanitiseForFirestore(title, 100),
        message: sanitiseForFirestore(message, 5000),
        email: email || user?.email || null,
        userId: user?.uid || null,
        createdAt: new Date().toISOString(),
        status: 'new',
        platform: 'mobile',
      };

      const docRef = await firebaseService.addDocument('feedback', feedbackDoc);
      const id = docRef.id;

      // Upload screenshot if provided
      if (screenshotUri && firebaseService.uploadFile) {
        try {
          // Upload to Firebase Storage using the service method
          const path = `feedback/${id}/${Date.now()}_screenshot.jpg`;
          const url = await firebaseService.uploadFile(path, screenshotUri);
          
          // Update feedback document with screenshot URL
          await firebaseService.updateDocument('feedback', id, { screenshotUrl: url });
        } catch (uploadError) {
          console.error('Error uploading screenshot:', uploadError);
          // Show warning but continue - feedback is already submitted
          Alert.alert(
            'Upload Warning',
            'Your feedback was submitted successfully, but the screenshot could not be uploaded. You can try submitting again with a smaller image.',
            [{ text: 'OK' }]
          );
        }
      }

      setSubmittedId(id);
      setTitle('');
      setMessage('');
      setScreenshot(null);
      setScreenshotUri(null);
      setEmail(user?.email || '');

      Alert.alert(
        'Thank You!',
        `Your feedback has been submitted. Reference ID: ${id}`,
        [{ text: 'OK' }]
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send feedback';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppGradient>
      <Stack.Screen
        options={{
          title: 'Feedback',
          headerStyle: { backgroundColor: 'transparent' },
          headerTintColor: '#fff',
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Send Feedback or Report a Bug</Text>
          <Text style={styles.subtitle}>
            Help us improve {APP_NAME} by sharing your thoughts, reporting bugs, or suggesting features.
          </Text>

          {isOffline && (
            <View style={styles.errorContainer}>
              <Ionicons name="cloud-offline" size={20} color="#ef4444" />
              <Text style={styles.errorText}>You are currently offline. Please check your internet connection.</Text>
            </View>
          )}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {submittedId && (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text style={styles.successText}>
                Thanks! Your feedback has been submitted. Reference: {submittedId}
              </Text>
            </View>
          )}

            <View style={styles.formGroup}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={type}
                onValueChange={(value) => setType(value)}
                style={styles.picker}
                accessibilityLabel="Feedback type"
                accessibilityHint="Select the type of feedback you are submitting"
              >
                <Picker.Item label="Bug Report" value="bug" />
                <Picker.Item label="Feature Request" value="feature" />
                <Picker.Item label="General Feedback" value="feedback" />
              </Picker>
            </View>
          </View>

          <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.label}>Severity</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={severity}
                  onValueChange={(value) => setSeverity(value)}
                  style={styles.picker}
                  accessibilityLabel="Severity level"
                  accessibilityHint="Select the severity of the issue"
                >
                  <Picker.Item label="Low" value="low" />
                  <Picker.Item label="Medium" value="medium" />
                  <Picker.Item label="High" value="high" />
                </Picker>
              </View>
            </View>

            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.label}>Email (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel="Email address"
                accessibilityHint="Optional email address for follow-up"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Screenshot (optional)</Text>
            {screenshotUri ? (
              <View style={styles.screenshotContainer}>
                <Image source={{ uri: screenshotUri }} style={styles.screenshot} />
                <TouchableOpacity
                  style={styles.removeScreenshotButton}
                  onPress={handleRemoveScreenshot}
                  accessibilityLabel="Remove screenshot"
                  accessibilityRole="button"
                >
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.screenshotButton}
                onPress={handlePickImage}
                accessibilityLabel="Add screenshot"
                accessibilityRole="button"
                accessibilityHint="Opens your photo library to select an image"
              >
                <Ionicons name="camera" size={24} color={colors.primary} />
                <Text style={styles.screenshotButtonText}>Add Screenshot</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Brief description"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              accessibilityLabel="Feedback title"
              accessibilityHint="Enter a brief description of your feedback"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Message *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your feedback in detail..."
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              accessibilityLabel="Feedback message"
              accessibilityHint="Provide detailed information about your feedback"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (submitting || isOffline) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || !title.trim() || !message.trim() || isOffline}
            accessibilityLabel="Submit feedback"
            accessibilityRole="button"
            accessibilityHint={isOffline ? "Submit button disabled while offline" : "Submits your feedback"}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AppGradient>
  );
}

const getStyles = (colors: typeof lightTheme.colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#fca5a5',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#86efac',
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formGroupHalf: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  pickerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  picker: {
    color: '#fff',
    height: 50,
  },
  screenshotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderStyle: 'dashed',
    gap: 8,
  },
  screenshotButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  screenshotContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  screenshot: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  removeScreenshotButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

