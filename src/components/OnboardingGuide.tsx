import { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface OnboardingGuideProps {
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingGuide({ onClose, onComplete }: OnboardingGuideProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    if (auth.currentUser) {
      // Mark onboarding as complete in user profile
      await setDoc(doc(db, 'userProfiles', auth.currentUser.uid), {
        onboardingCompleted: true,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl w-full max-w-2xl border border-[var(--border-color)]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[var(--border-color)]">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Welcome to Props Bible</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Let's Get Started!</h3>
              <p>Props Bible helps you manage your theatrical props efficiently. Here's what you can do:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Create and organize shows</li>
                <li>Track props and their details</li>
                <li>Collaborate with your team</li>
                <li>Generate reports and prop lists</li>
              </ul>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Creating Your First Show</h3>
              <p>Start by creating a show:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Click on the "Shows" tab</li>
                <li>Fill in your show's details</li>
                <li>Add acts and scenes</li>
                <li>Save your show</li>
              </ol>
              <div className="mt-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
                <p className="text-sm">Quick Tip: You can use our Macbeth template to see how shows are structured!</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Managing Props</h3>
              <p>Once you have a show, you can start adding props:</p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>Navigate to the "Props" tab</li>
                <li>Click "Add Prop" to create new props</li>
                <li>Add details like name, category, and images</li>
                <li>Assign props to specific acts and scenes</li>
              </ol>
              <div className="mt-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
                <p className="text-sm">Pro Tip: Use categories to organize your props effectively!</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Collaboration & Help</h3>
              <p>Work with your team and get help when needed:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Share shows with collaborators</li>
                <li>Access the help center anytime</li>
                <li>Use the feedback button for support</li>
                <li>Check out our documentation for detailed guides</li>
              </ul>
              <div className="mt-4 p-4 bg-[var(--bg-secondary)] rounded-lg">
                <p className="text-sm">Remember: You can always access help by clicking the help link in the footer!</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-[var(--border-color)]">
          <button
            onClick={handlePrevious}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              step === 1
                ? 'text-[var(--text-secondary)] cursor-not-allowed'
                : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
            }`}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index + 1 === step
                    ? 'bg-[var(--highlight-color)]'
                    : 'bg-[var(--border-color)]'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--highlight-color)] text-white rounded-lg hover:bg-[var(--highlight-color)]/90 transition-colors"
          >
            {step === totalSteps ? 'Get Started' : 'Next'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 