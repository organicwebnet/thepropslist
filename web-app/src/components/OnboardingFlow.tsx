import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useFirebase } from '../contexts/FirebaseContext';
import { User, CheckCircle, Theater, Package, Home, ArrowRight, ArrowLeft, Users } from 'lucide-react';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase';

interface OnboardingFlowProps {
  isOpen: boolean;
  onComplete: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ isOpen, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showCreated, setShowCreated] = useState(false);
  const [propAdded, setPropAdded] = useState(false);
  const { userProfile, user, markOnboardingCompleted } = useWebAuth();
  const { service } = useFirebase();
  const navigate = useNavigate();

  const steps = [
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Add your name, role, and profile photo to get started',
      icon: User,
      action: () => navigate('/profile'),
      checkComplete: () => userProfile?.displayName && userProfile?.role && userProfile?.displayName !== 'User'
    },
    {
      id: 'show',
      title: 'Create Your First Show',
      description: 'A show is your workspace where you manage props, tasks, and team members',
      icon: Theater,
      action: () => navigate('/shows/new'),
      checkComplete: () => showCreated
    },
    {
      id: 'prop',
      title: 'Add Your First Prop',
      description: 'Start building your props inventory by adding your first prop',
      icon: Package,
      action: () => navigate('/props/add'),
      checkComplete: () => propAdded
    },
    {
      id: 'explore',
      title: 'Welcome to The Props List!',
      description: 'Here\'s a quick overview of the main features you can use to manage your theater productions',
      icon: Home,
      action: () => navigate('/'),
      checkComplete: () => true
    }
  ];

  // Check if user has shows
  const checkShows = async () => {
    const userId = userProfile?.uid || user?.uid;
    if (!userId) {
      console.log('OnboardingFlow: No user ID available for checking shows');
      return;
    }
    
    try {
      const showsSnapshot = await getDocs(collection(db, 'shows'));
      const shows = showsSnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));
      
      console.log('OnboardingFlow: All shows from Firestore:', shows);
      console.log('OnboardingFlow: Looking for shows created by user:', userId);
      
      // Log each show's createdBy field
      shows.forEach((show, index) => {
        console.log(`OnboardingFlow: Show ${index}:`, {
          id: show.id,
          name: show.data?.name,
          createdBy: show.data?.createdBy,
          matches: show.data?.createdBy === userId
        });
      });
      
      const userShows = shows.filter(show => {
        const matches = show.data?.createdBy === userId;
        console.log('OnboardingFlow: Show filter check:', {
          showId: show.id,
          showCreatedBy: show.data?.createdBy,
          userId: userId,
          matches: matches
        });
        return matches;
      });
      
      setShowCreated(userShows.length > 0);
      console.log('OnboardingFlow: Final result - found:', userShows.length, 'shows for user');
    } catch (error) {
      console.error('Error checking shows:', error);
    }
  };

  // Check if user has props
  const checkProps = async () => {
    const userId = userProfile?.uid || user?.uid;
    if (!userId) return;
    
    try {
      const propsSnapshot = await getDocs(collection(db, 'props'));
      const props = propsSnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));
      
      const userProps = props.filter(prop => prop.data.createdBy === userId);
      setPropAdded(userProps.length > 0);
      console.log('OnboardingFlow: Checked props, found:', userProps.length, 'props');
    } catch (error) {
      console.error('Error checking props:', error);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    checkShows();
    checkProps();
  }, [isOpen, userProfile, user, service]);

  // Add a refresh mechanism when the component becomes visible again
  useEffect(() => {
    if (isOpen) {
      // Double-check that user hasn't already completed onboarding
      if (userProfile?.onboardingCompleted) {
        console.log('OnboardingFlow: User has already completed onboarding, closing modal');
        onComplete();
        return;
      }
      
      // Refresh the state when the onboarding modal opens
      // Add a small delay to ensure any recent changes are saved
      setTimeout(() => {
        checkShows();
        checkProps();
      }, 500);
    }
  }, [isOpen, userProfile?.onboardingCompleted, onComplete]);

  // Auto-advance when current step is completed
  useEffect(() => {
    if (isOpen && currentStep < steps.length) {
      const currentStepData = steps[currentStep];
      const isStepComplete = currentStepData.checkComplete();
      
      console.log('OnboardingFlow: Checking step completion:', {
        currentStep,
        stepId: currentStepData.id,
        isStepComplete,
        showCreated,
        propAdded
      });
      
      // If the current step is complete and we're not on the last step, auto-advance
      if (isStepComplete && currentStep < steps.length - 1) {
        console.log('OnboardingFlow: Auto-advancing to next step');
        setTimeout(() => {
          setCurrentStep(currentStep + 1);
        }, 1000); // Small delay to show the completion state
      }
      
      // If we're on the last step (explore) and it's complete, finish onboarding
      if (isStepComplete && currentStep === steps.length - 1) {
        console.log('OnboardingFlow: Final step complete, finishing onboarding');
        setTimeout(() => {
          handleComplete();
        }, 2000); // Give user time to see the completion
      }
    }
  }, [isOpen, currentStep, showCreated, propAdded, userProfile, user]);

  // Add a window focus listener to refresh when user returns to the page
  useEffect(() => {
    const handleFocus = () => {
      if (isOpen) {
        console.log('OnboardingFlow: Window focused, refreshing state');
        setTimeout(() => {
          checkShows();
          checkProps();
        }, 200);
      }
    };

    // Also listen for visibility change (when tab becomes active)
    const handleVisibilityChange = () => {
      if (isOpen && !document.hidden) {
        console.log('OnboardingFlow: Tab became visible, refreshing state');
        setTimeout(() => {
          checkShows();
          checkProps();
        }, 300);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen]);

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

  const handleComplete = async () => {
    try {
      await markOnboardingCompleted();
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      onComplete(); // Still close the modal even if there's an error
    }
  };

  const handleStepAction = () => {
    const step = steps[currentStep];
    const isStepComplete = step.checkComplete();
    
    console.log('Onboarding step action:', {
      currentStep,
      stepId: step.id,
      isStepComplete,
      userProfile: userProfile ? {
        displayName: userProfile.displayName,
        role: userProfile.role,
        onboardingCompleted: userProfile.onboardingCompleted
      } : null
    });
    
    if (isStepComplete) {
      // If step is complete, move to next step
      handleNext();
    } else {
      // If step is not complete, go to the step's action
      step.action();
    }
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const isStepComplete = currentStepData.checkComplete();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-pb-darker rounded-2xl border border-pb-primary/20 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to The Props List!</h2>
            <p className="text-pb-gray">Let's get you set up in just a few steps</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      index <= currentStep
                        ? 'bg-pb-primary border-pb-primary text-white'
                        : 'border-pb-gray text-pb-gray'
                    }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs text-pb-gray mt-2 text-center max-w-20">
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
            <div className="w-full bg-pb-gray/20 rounded-full h-2">
              <motion.div
                className="bg-pb-primary h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Current Step Content */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 bg-pb-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <currentStepData.icon className="w-8 h-8 text-pb-primary" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{currentStepData.title}</h3>
            <p className="text-pb-gray mb-6">{currentStepData.description}</p>
            
            {/* Special content for the final step */}
            {currentStepData.id === 'explore' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-pb-darker/40 rounded-lg p-6 mb-6 border border-pb-primary/20"
              >
                <h4 className="text-lg font-semibold text-white mb-4">Main Features:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start space-x-3">
                    <Theater className="w-5 h-5 text-pb-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-white">Show Management</div>
                      <div className="text-pb-gray">Create and manage your theater productions</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Package className="w-5 h-5 text-pb-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-white">Props Inventory</div>
                      <div className="text-pb-gray">Track all your props with photos and details</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Users className="w-5 h-5 text-pb-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-white">Team Collaboration</div>
                      <div className="text-pb-gray">Invite team members and assign roles</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Home className="w-5 h-5 text-pb-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-white">Task Boards</div>
                      <div className="text-pb-gray">Organize work with Kanban-style boards</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-pb-primary/10 rounded-lg border border-pb-primary/20">
                  <div className="flex items-center text-pb-primary">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Onboarding Complete!</span>
                  </div>
                  <p className="text-pb-gray text-sm mt-1">You're all set to start managing your theater productions!</p>
                </div>
              </motion.div>
            )}
            
            {isStepComplete && currentStepData.id !== 'explore' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-pb-success/20 border border-pb-success/30 rounded-lg p-3 mb-4"
              >
                <div className="flex items-center justify-center text-pb-success">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Step completed!</span>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center px-4 py-2 rounded-lg border border-pb-gray text-pb-gray hover:text-white hover:border-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </button>

            <div className="flex gap-3">
              <button
                onClick={handleStepAction}
                className="px-6 py-2 rounded-lg bg-pb-primary text-white font-medium hover:bg-pb-secondary transition-colors"
              >
                {isStepComplete ? 'Continue' : `Go to ${currentStepData.title}`}
              </button>
              
              <button
                onClick={() => {
                  console.log('OnboardingFlow: Manual refresh triggered');
                  checkShows();
                  checkProps();
                }}
                className="px-4 py-2 rounded-lg border border-pb-gray text-pb-gray hover:text-white hover:border-white transition-colors text-sm"
              >
                Refresh
              </button>
              
              {currentStep === steps.length - 1 ? (
                <button
                  onClick={handleComplete}
                  className="px-6 py-2 rounded-lg bg-pb-success text-white font-medium hover:bg-pb-success/80 transition-colors"
                >
                  Finish Setup
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex items-center px-4 py-2 rounded-lg border border-pb-primary text-pb-primary hover:bg-pb-primary hover:text-white transition-colors"
                >
                  Skip
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              )}
            </div>
          </div>


          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-pb-gray">
              You can always access your profile and settings from the top-right menu
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingFlow;
