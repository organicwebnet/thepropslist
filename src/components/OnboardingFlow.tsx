/**
 * Onboarding Flow Component
 * Guides new users through essential setup steps
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFirebase } from '../platforms/mobile/contexts/FirebaseContext';
import { useAuth } from '../contexts/AuthContext';
import LinearGradient from 'react-native-linear-gradient';

interface OnboardingFlowProps {
  isOpen: boolean;
  onComplete: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: () => void;
  checkComplete: () => Promise<boolean>;
}

export function OnboardingFlow({ isOpen, onComplete }: OnboardingFlowProps) {
  const router = useRouter();
  const { service: firebaseService, isInitialized } = useFirebase();
  const { user, userProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [showCreated, setShowCreated] = useState(false);
  const [propAdded, setPropAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<Record<string, boolean>>({});

  const steps: OnboardingStep[] = [
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Add your name and role to personalize your experience',
      icon: 'person',
      action: () => {
        router.push('/(tabs)/profile');
        onComplete(); // Close onboarding when navigating
      },
      checkComplete: async () => {
        return !!(userProfile?.displayName && userProfile?.displayName !== 'User' && userProfile?.role);
      },
    },
    {
      id: 'show',
      title: 'Create Your First Show',
      description: 'A show is your workspace where you manage props, tasks, and team members',
      icon: 'theater',
      action: () => {
        router.push('/shows/new');
        onComplete(); // Close onboarding when navigating
      },
      checkComplete: async () => {
        if (!user || !firebaseService || !isInitialized) return false;
        try {
          const shows = await firebaseService.getCollection('shows', {
            where: [['createdBy', '==', user.uid]],
            limit: 1,
          });
          return shows.length > 0;
        } catch (error) {
          console.error('Error checking shows:', error);
          return false;
        }
      },
    },
    {
      id: 'prop',
      title: 'Add Your First Prop',
      description: 'Start building your props inventory by adding your first prop',
      icon: 'cube',
      action: () => {
        router.push('/props/add');
        onComplete(); // Close onboarding when navigating
      },
      checkComplete: async () => {
        if (!user || !firebaseService || !isInitialized) return false;
        try {
          const props = await firebaseService.getCollection('props', {
            where: [['createdBy', '==', user.uid]],
            limit: 1,
          });
          return props.length > 0;
        } catch (error) {
          console.error('Error checking props:', error);
          return false;
        }
      },
    },
    {
      id: 'explore',
      title: 'Welcome to The Props List!',
      description: "You're all set! Explore the app and start managing your productions.",
      icon: 'checkmark-circle',
      action: () => {
        handleComplete();
      },
      checkComplete: async () => true,
    },
  ];

  // Check step completion status
  useEffect(() => {
    if (!isOpen || !isInitialized || !user) return;

    const checkSteps = async () => {
      setLoading(true);
      const statuses: Record<string, boolean> = {};
      
      for (const step of steps) {
        try {
          statuses[step.id] = await step.checkComplete();
        } catch (error) {
          console.error(`Error checking step ${step.id}:`, error);
          statuses[step.id] = false;
        }
      }
      
      setStepStatuses(statuses);
      setLoading(false);
    };

    checkSteps();
    
    // Refresh periodically - use longer interval to reduce load
    const interval = setInterval(checkSteps, 5000);
    return () => clearInterval(interval);
    // Use primitive dependencies to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isInitialized, user?.uid, userProfile?.onboardingCompleted]);

  // Auto-advance when current step is completed
  useEffect(() => {
    if (currentStep < steps.length && stepStatuses[steps[currentStep].id]) {
      // Auto-advance after a short delay
      const timer = setTimeout(() => {
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [stepStatuses, currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    if (!user || !firebaseService || !isInitialized) {
      onComplete();
      return;
    }

    try {
      // Mark onboarding as completed
      await firebaseService.updateDocument('userProfiles', user.uid, {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
      });
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
    } finally {
      onComplete();
    }
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const isCompleted = stepStatuses[currentStepData.id];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
          locations={[0, 0.2, 0.5, 0.8, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleSkip}
                style={styles.skipButton}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Step Icon */}
              <View style={styles.iconContainer}>
                <View style={[styles.iconCircle, isCompleted && styles.iconCircleCompleted]}>
                  {loading ? (
                    <ActivityIndicator size="large" color="#c084fc" />
                  ) : (
                    <Ionicons
                      name={isCompleted ? 'checkmark-circle' : currentStepData.icon}
                      size={64}
                      color={isCompleted ? '#22c55e' : '#c084fc'}
                    />
                  )}
                </View>
                {isCompleted && (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark" size={16} color="#ffffff" />
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                )}
              </View>

              {/* Step Title */}
              <Text style={styles.title}>{currentStepData.title}</Text>

              {/* Step Description */}
              <Text style={styles.description}>{currentStepData.description}</Text>

              {/* Progress Dots */}
              <View style={styles.progressContainer}>
                {steps.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.progressDot,
                      index === currentStep && styles.progressDotActive,
                      index < currentStep && styles.progressDotCompleted,
                    ]}
                  />
                ))}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                onPress={handlePrevious}
                style={[styles.navButton, currentStep === 0 && styles.navButtonDisabled]}
                disabled={currentStep === 0}
              >
                <Ionicons name="arrow-back" size={20} color={currentStep === 0 ? '#6b7280' : '#ffffff'} />
                <Text style={[styles.navButtonText, currentStep === 0 && styles.navButtonTextDisabled]}>
                  Previous
                </Text>
              </TouchableOpacity>

              {isCompleted && !isLastStep ? (
                <TouchableOpacity
                  onPress={handleNext}
                  style={[styles.actionButton, styles.actionButtonCompleted]}
                >
                  <Text style={styles.actionButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={currentStepData.action}
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>
                    {isLastStep ? 'Get Started' : 'Get Started'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#ffffff" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#1f2937',
    margin: 20,
    marginTop: 60,
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#c084fc',
  },
  iconCircleCompleted: {
    borderColor: '#22c55e',
    backgroundColor: '#1f2937',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    gap: 6,
  },
  completedText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4b5563',
  },
  progressDotActive: {
    backgroundColor: '#c084fc',
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: '#22c55e',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 12,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#374151',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  navButtonTextDisabled: {
    color: '#6b7280',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#c084fc',
    gap: 8,
    flex: 2,
    justifyContent: 'center',
  },
  actionButtonCompleted: {
    backgroundColor: '#22c55e',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});





