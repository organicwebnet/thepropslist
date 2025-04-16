import { useState } from 'react';
import { MessageSquare, HelpCircle } from 'lucide-react';
import { FeedbackForm } from './FeedbackForm';
import { HelpCenter } from './HelpCenter';
import { auth } from '../lib/firebase';

export function Footer() {
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  
  return (
    <footer className="mt-auto py-3 px-6 text-center border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="text-xs text-[var(--text-secondary)]">
          © {new Date().getFullYear()} Props Bible
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowHelpCenter(true)}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
          >
            <HelpCircle className="h-3 w-3" />
            <span>Help</span>
          </button>
          
          <button
            onClick={() => setShowFeedbackForm(true)}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
          >
            <MessageSquare className="h-3 w-3" />
            <span>Feedback</span>
          </button>
        </div>
      </div>
      
      {showFeedbackForm && (
        <FeedbackForm 
          onClose={() => setShowFeedbackForm(false)} 
          userEmail={auth.currentUser?.email || undefined}
        />
      )}
      
      {showHelpCenter && (
        <HelpCenter onClose={() => setShowHelpCenter(false)} />
      )}
    </footer>
  );
} 