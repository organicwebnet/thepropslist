import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useFirebase } from '../contexts/FirebaseContext';
import { User, CheckCircle, Theater, Package, Home, ArrowRight, ArrowLeft } from 'lucide-react';

interface OnboardingFlowProps {
  isOpen: boolean;
  onComplete: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ isOpen, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [showCreated, setShowCreated] = useState(false);
  const [propAdded, setPropAdded] = useState(false);
  const { userProfile, markOnboardingCompleted } = useWebAuth();
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
      title: 'Explore the Dashboard',
      description: 'Learn about the key features and how to navigate the system',
      icon: Home,
      action: () => navigate('/'),
      checkComplete: () => true
    }
  ];

  useEffect(() => {
    if (!isOpen) return;

    // Check if user has shows
    const checkShows = async () => {
      if (!userProfile?.uid) return;
      try {
        const shows = await service.getCollection('shows');
        const userShows = shows.filter(show => show.data.createdBy === userProfile.uid);
        setShowCreated(userShows.length > 0);
      } catch (error) {
        console.error('Error checking shows:', error);
      }
    };

    // Check if user has props
    const checkProps = async () => {
      if (!userProfile?.uid) return;
      try {
        const props = await service.getCollection('props');
        const userProps = props.filter(prop => prop.data.createdBy === userProfile.uid);
        setPropAdded(userProps.length > 0);
      } catch (error) {
        console.error('Error checking props:', error);
      }
    };

    checkShows();
    checkProps();
  }, [isOpen, userProfile, service]);

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
    step.action();
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
            
            {isStepComplete && (
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
