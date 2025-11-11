import React, { useEffect, useState } from 'react';
import { PropStatusUpdate, lifecycleStatusLabels, lifecycleStatusPriority, StatusPriority, PropLifecycleStatus } from '../../types/lifecycle.ts';
import { History, MoveRight, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { UserProfile } from '../../shared/types/auth';
import type { FirebaseService } from '../../shared/services/firebase/types';

interface StatusHistoryProps {
  history: PropStatusUpdate[];
  maxItems?: number;
  firebaseService?: FirebaseService | null;
}

interface UserInfo {
  uid: string;
  displayName?: string;
  email?: string;
}

// Helper to get Firebase service - tries mobile context if service not provided
function useFirebaseService(providedService?: FirebaseService | null): FirebaseService | null {
  // If service is provided as prop (web), use it
  if (providedService) {
    return providedService;
  }
  
  // Otherwise try mobile context (for mobile/shared pages)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useFirebase } = require('../../platforms/mobile/contexts/FirebaseContext');
    const { service } = useFirebase();
    return service || null;
  } catch {
    // Not in mobile context or hook not available
    return null;
  }
}

export function StatusHistory({ history, maxItems = 5, firebaseService }: StatusHistoryProps) {
  const [userInfoMap, setUserInfoMap] = useState<Map<string, UserInfo>>(new Map());
  const service = useFirebaseService(firebaseService);
  // Sort history by date descending (newest first)
  const sortedHistory = [...history].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Limit items if needed
  const displayItems = maxItems ? sortedHistory.slice(0, maxItems) : sortedHistory;
  const hasMoreItems = sortedHistory.length > maxItems;

  // Fetch user information for all unique UIDs
  useEffect(() => {
    if (!service || history.length === 0) return;

    const fetchUserInfo = async () => {
      const uniqueUids = [...new Set(history.map(item => item.updatedBy).filter(Boolean))];
      const userMap = new Map<string, UserInfo>();

      await Promise.all(
        uniqueUids.map(async (uid) => {
          try {
            const userDoc = await service.getDocument<UserProfile>('userProfiles', uid);
            if (userDoc && userDoc.data) {
              userMap.set(uid, {
                uid,
                displayName: userDoc.data.displayName,
                email: userDoc.data.email,
              });
            } else {
              // Fallback: use UID if profile not found
              userMap.set(uid, { uid });
            }
          } catch (error) {
            console.error(`Error fetching user profile for ${uid}:`, error);
            userMap.set(uid, { uid });
          }
        })
      );

      setUserInfoMap(userMap);
    };

    fetchUserInfo();
  }, [service, history]);

  // Get status color
  const getStatusColor = (status: string): string => {
    const statusKey = status as PropLifecycleStatus;
    const priority = lifecycleStatusPriority[statusKey] || 'info';
    
    switch (priority) {
      case 'critical':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-[var(--highlight-color)]';
      default:
        return 'text-green-500';
    }
  };

  if (history.length === 0) {
    return (
      <div className="text-center p-4 border border-dashed border-[var(--border-color)] rounded-lg">
        <p className="text-[var(--text-secondary)]">No status updates yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-[var(--text-primary)] flex items-center gap-2">
          <History className="h-5 w-5" />
          Status History
        </h3>
      </div>

      <ul className="space-y-4">
        {displayItems.map((item, index) => (
          <li key={item.id} className="p-4 bg-[var(--bg-secondary)] rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-[var(--text-secondary)] text-sm">
                  {new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString()}
                </p>
                <div className="flex items-center mt-1 gap-2">
                  <span className={getStatusColor(lifecycleStatusPriority[item.previousStatus])}>
                    {lifecycleStatusLabels[item.previousStatus]}
                  </span>
                  <MoveRight className="h-3 w-3 text-[var(--text-secondary)]" />
                  <span className={`font-medium ${getStatusColor(lifecycleStatusPriority[item.newStatus])}`}>
                    {lifecycleStatusLabels[item.newStatus]}
                  </span>
                </div>
                {item.updatedBy && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-[var(--text-secondary)]">
                    <User className="h-3 w-3" />
                    <span>
                      {userInfoMap.get(item.updatedBy)?.displayName || 
                       userInfoMap.get(item.updatedBy)?.email || 
                       'Unknown user'}
                    </span>
                  </div>
                )}
              </div>
              {item.notified && item.notified.length > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-[var(--highlight-bg)] text-[var(--highlight-color)]">
                  Team notified
                </span>
              )}
            </div>
            {item.notes && (
              <div className="mt-2 text-sm text-[var(--text-primary)] bg-[var(--bg-primary)] p-3 rounded border border-[var(--border-color)]">
                <div dangerouslySetInnerHTML={{ __html: item.notes }} />
              </div>
            )}
          </li>
        ))}
      </ul>

      {hasMoreItems && (
        <button 
          className="w-full text-center py-2 text-sm text-[var(--highlight-color)] hover:text-[var(--highlight-color)]/80"
          onClick={() => {
            // This would be connected to a state handler for viewing full history
          }}
        >
          View all {history.length} updates
        </button>
      )}
    </div>
  );
} 
