import React from 'react';
import { Link } from 'expo-router';
import { MessageSquare, HelpCircle, Github, Twitter, Linkedin } from 'lucide-react';
import { FeedbackForm } from './FeedbackForm';
import { HelpCenter } from './HelpCenter';
import { useAuth } from '../contexts/AuthContext';
import { useFirebase } from '@/contexts/FirebaseContext';

export function Footer() {
  const { user } = useAuth();
  const { service } = useFirebase();
  const [showFeedbackForm, setShowFeedbackForm] = React.useState(false);
  const [showHelpCenter, setShowHelpCenter] = React.useState(false);
  
  const handleSignOut = async () => {
    if (service) {
      try {
        await service.signOut();
        console.log('User signed out');
      } catch (error) {
        console.error("Error signing out: ", error);
      }
    }
  };

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
          
          {user ? (
            <button onClick={handleSignOut} className="text-gray-400 hover:text-white transition-colors">Sign Out</button>
          ) : (
            <Link href={{ pathname: "/login" as any }} className="text-gray-400 hover:text-white transition-colors">Login</Link>
          )}
        </div>
      </div>
      
      {showFeedbackForm && (
        <FeedbackForm 
          onClose={() => setShowFeedbackForm(false)} 
          userEmail={user?.email || undefined}
        />
      )}
      
      {showHelpCenter && (
        <HelpCenter onClose={() => setShowHelpCenter(false)} />
      )}
    </footer>
  );
} 