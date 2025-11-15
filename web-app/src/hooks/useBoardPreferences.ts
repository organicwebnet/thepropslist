/**
 * Hook for managing board view preferences
 * Stores view mode preference (kanban/todo) in user profile
 */

import { useState, useEffect, useCallback } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { useWebAuth } from '../contexts/WebAuthContext';
import { logger } from '../utils/logger';

export type BoardViewMode = 'kanban' | 'todo';

export function useBoardPreferences() {
  const { service } = useFirebase();
  const { user } = useWebAuth();
  const [viewMode, setViewMode] = useState<BoardViewMode>('kanban');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preference from user profile
  useEffect(() => {
    if (!user?.uid || !service) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Listen to user profile document for real-time updates
    const unsubscribe = service.listenToDocument(
      `userProfiles/${user.uid}`,
      (doc) => {
        if (!doc?.data) {
          // No profile yet, use default
          setViewMode('kanban');
          setLoading(false);
          return;
        }

        const preferences = doc.data.preferences;
        const boardViewMode = preferences?.boardViewMode;
        
        if (boardViewMode === 'kanban' || boardViewMode === 'todo') {
          setViewMode(boardViewMode);
        } else {
          // Default to kanban for existing users
          setViewMode('kanban');
        }
        setLoading(false);
      },
      (err) => {
        logger.taskBoardError('Error listening to board preferences', err);
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
        // Fall back to default
        setViewMode('kanban');
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid, service]);

  // Save preference to user profile
  const saveViewMode = useCallback(async (mode: BoardViewMode) => {
    if (!user?.uid || !service) {
      throw new Error('User not authenticated or service not available');
    }

    try {
      // Get current user profile to preserve other preferences
      const userDoc = await service.getDocument('userProfiles', user.uid);
      const currentPreferences = userDoc?.data?.preferences || {};

      await service.updateDocument('userProfiles', user.uid, {
        preferences: {
          ...currentPreferences,
          boardViewMode: mode,
        },
        updatedAt: new Date().toISOString(),
      });

      // Update local state optimistically
      setViewMode(mode);
    } catch (err) {
      logger.taskBoardError('Error saving board view preference', err);
      setError(err instanceof Error ? err.message : 'Failed to save preference');
      throw err;
    }
  }, [user?.uid, service]);

  return {
    viewMode,
    loading,
    error,
    saveViewMode,
  };
}

