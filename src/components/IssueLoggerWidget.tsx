/**
 * Issue Logger Widget Component
 * Provides a floating action button for manual issue reporting
 * Mobile version of the web Issue Logger widget
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { issueLoggerService, type IssueReport } from '../services/IssueLoggerService';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../shared/constants/app';

interface IssueLoggerWidgetProps {
  enabled?: boolean;
  apiBaseUrl?: string;
  owner?: string;
  repo?: string;
}

export function IssueLoggerWidget({
  enabled = true,
  apiBaseUrl,
  owner,
  repo,
}: IssueLoggerWidgetProps) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');

  useEffect(() => {
    if (enabled) {
      issueLoggerService.initialize({ apiBaseUrl, owner, repo, enabled });
    }
  }, [enabled, apiBaseUrl, owner, repo]);

  const handleTakeScreenshot = async () => {
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
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64 = result.assets[0].base64;
        if (base64) {
          setScreenshot(`data:image/jpeg;base64,${base64}`);
        }
      }
    } catch (error) {
      console.error('Error taking screenshot:', error);
      Alert.alert('Error', 'Failed to capture screenshot');
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Validation Error', 'Please fill in both title and description');
      return;
    }

    if (!issueLoggerService.isConfigured()) {
      Alert.alert(
        'Configuration Error',
        'Issue Logger is not properly configured. Please contact support.'
      );
      return;
    }

    setSubmitting(true);

    try {
      const issueBody = `## Description\n${description}\n\n`;
      const bodyWithContext = issueBody + `## User Information\n- **User ID**: ${user?.uid || 'Not logged in'}\n- **Email**: ${user?.email || 'Not provided'}\n- **Platform**: Mobile (React Native)\n- **Severity**: ${severity}\n- **Timestamp**: ${new Date().toISOString()}\n\n_Submitted from ${APP_NAME} mobile app_`;

      const report: IssueReport = {
        title,
        body: bodyWithContext,
        imageDataUrl: screenshot || undefined,
        labels: ['bug', `severity-${severity}`, 'platform-mobile', 'manual-report'],
        severity,
        platform: 'mobile',
      };

      const result = await issueLoggerService.submitIssue(report);

      if (result.success) {
        Alert.alert(
          'Issue Reported',
          'Thank you for reporting this issue. We will look into it shortly.',
          [
            {
              text: 'OK',
              onPress: () => {
                setVisible(false);
                setTitle('');
                setDescription('');
                setScreenshot(null);
                setSeverity('medium');
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit issue. Please try again.');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to submit issue: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!enabled || !issueLoggerService.isConfigured()) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
        accessibilityLabel="Report an issue"
        accessibilityRole="button"
        accessibilityHint="Opens a form to report bugs or issues"
      >
        <Text style={styles.fabIcon}>🐞</Text>
      </TouchableOpacity>

      {/* Issue Report Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report an Issue</Text>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.closeButton}
                accessibilityLabel="Close issue report modal"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Severity</Text>
                <View style={styles.severityButtons}>
                  {(['low', 'medium', 'high', 'critical'] as const).map((sev) => (
                    <TouchableOpacity
                      key={sev}
                      style={[
                        styles.severityButton,
                        severity === sev && styles.severityButtonActive,
                      ]}
                      onPress={() => setSeverity(sev)}
                      accessibilityLabel={`Set severity to ${sev}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: severity === sev }}
                    >
                      <Text
                        style={[
                          styles.severityButtonText,
                          severity === sev && styles.severityButtonTextActive,
                        ]}
                      >
                        {sev.charAt(0).toUpperCase() + sev.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Brief description of the issue"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                  accessibilityLabel="Issue title"
                  accessibilityHint="Enter a brief description of the issue"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe the issue in detail..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  accessibilityLabel="Issue description"
                  accessibilityHint="Provide detailed information about the issue"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Screenshot (optional)</Text>
                {screenshot ? (
                  <View style={styles.screenshotContainer}>
                    <Image source={{ uri: screenshot }} style={styles.screenshot} />
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
                    onPress={handleTakeScreenshot}
                    accessibilityLabel="Add screenshot"
                    accessibilityRole="button"
                    accessibilityHint="Opens your photo library to select an image"
                  >
                    <Ionicons name="camera" size={24} color="#3b82f6" />
                    <Text style={styles.screenshotButtonText}>Add Screenshot</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting || !title.trim() || !description.trim()}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Submit Issue</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
  },
  fabIcon: {
    fontSize: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  severityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    alignItems: 'center',
  },
  severityButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  severityButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  severityButtonTextActive: {
    color: '#fff',
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
    color: '#3b82f6',
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
    backgroundColor: '#3b82f6',
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

