import React, { useState } from 'react';
import { X, UserPlus, Trash2, Mail, Shield } from 'lucide-react';
import type { Show, ShowCollaborator } from '../types.ts';

interface ShareModalProps {
  show: Show;
  onClose: () => void;
  onAddCollaborator: (email: string, role: 'editor' | 'viewer') => Promise<void>;
  onRemoveCollaborator: (email: string) => Promise<void>;
  currentUserEmail: string;
}

export function ShareModal({ show, onClose, onAddCollaborator, onRemoveCollaborator, currentUserEmail }: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Please enter an email address');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if user is already a collaborator
    if (show.collaborators?.some((c: ShowCollaborator) => c.email === email)) {
      setError('This user is already a collaborator');
      return;
    }

    // Check if user is the owner
    if (email === currentUserEmail) {
      setError('You cannot add yourself as a collaborator');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddCollaborator(email, role);
      setEmail('');
      setRole('editor');
    } catch (error) {
      setError('Failed to add collaborator. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (collaborator: ShowCollaborator) => {
    if (confirm(`Are you sure you want to remove ${collaborator.email} from this show?`)) {
      try {
        await onRemoveCollaborator(collaborator.email);
      } catch (error) {
        setError('Failed to remove collaborator. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-[#1A1A1A] rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold gradient-text">Share "{show.name}"</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Add Collaborator
            </label>
            <div className="flex space-x-2">
              <div className="flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
                className="bg-[#0A0A0A] border border-gray-800 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 text-sm font-medium text-white hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#1A1A1A] disabled:opacity-50 transition-colors"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Collaborator
          </button>
        </form>

        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Current Collaborators</h3>
          <div className="space-y-3">
            {show.collaborators?.map((collaborator: ShowCollaborator) => (
              <div
                key={collaborator.email}
                className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-gray-800"
              >
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-white">{collaborator.email}</div>
                    <div className="flex items-center space-x-1 text-xs text-gray-400">
                      <Shield className="h-3 w-3" />
                      <span>{collaborator.role}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(collaborator)}
                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                  title="Remove collaborator"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {(!show.collaborators || show.collaborators.length === 0) && (
              <p className="text-center text-gray-400 text-sm py-4">
                No collaborators yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}