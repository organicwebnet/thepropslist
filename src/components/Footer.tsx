import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { FeedbackForm } from './FeedbackForm';
import { auth } from '../lib/firebase';

export function Footer() {
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  
  return (
    <footer className="mt-auto py-3 px-6 text-center border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="text-xs text-[var(--text-secondary)]">
          © {new Date().getFullYear()} Props Bible
        </div>
        
        <button
          onClick={() => setShowFeedbackForm(true)}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
        >
          <MessageSquare className="h-3 w-3" />
          <span>Feedback</span>
        </button>
      </div>
      
      {showFeedbackForm && (
        <FeedbackForm 
          onClose={() => setShowFeedbackForm(false)} 
          userEmail={auth.currentUser?.email || undefined}
        />
      )}
    </footer>
  );
} 