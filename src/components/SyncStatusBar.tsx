import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useFirebase } from '../platforms/mobile/contexts/FirebaseContext';

// Constants for timeouts and intervals
const TIMEOUTS = {
  OFFLINE_INDICATOR_DISPLAY: 3000, // 3 seconds
  SYNCED_MESSAGE_DISPLAY: 2000, // 2 seconds
  SYNC_CHECK_DELAY: 500, // 500ms delay when coming online
  SYNC_CHECK_INTERVAL_SYNCING: 5000, // 5 seconds when syncing
  SYNC_CHECK_INTERVAL_IDLE: 10000, // 10 seconds when idle
} as const;

type MaterialIconName = 'cloud-off' | 'cloud-sync' | 'cloud-done' | 'sync';

export const SyncStatusBar: React.FC = () => {
  const { isConnected, justCameOnline } = useNetworkStatus(false);
  const { service } = useFirebase();
  const insets = useSafeAreaInsets();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [showOfflineIndicator, setShowOfflineIndicator] = useState(false);
  const [justWentOffline, setJustWentOffline] = useState(false);
  const [showSyncedMessage, setShowSyncedMessage] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const previousConnectedRef = useRef(true);
  const previousPendingRef = useRef(0);
  const syncedMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncingStateRef = useRef<boolean>(false);

  // Track when we go offline to show indicator briefly
  useEffect(() => {
    if (previousConnectedRef.current && !isConnected) {
      // Just went offline
      setJustWentOffline(true);
      setShowOfflineIndicator(true);
      
      // Hide after configured timeout
      const timer = setTimeout(() => {
        setShowOfflineIndicator(false);
        setJustWentOffline(false);
      }, TIMEOUTS.OFFLINE_INDICATOR_DISPLAY);
      
      return () => clearTimeout(timer);
    }
    previousConnectedRef.current = isConnected;
  }, [isConnected]);

  // Check sync status periodically when online
  useEffect(() => {
    if (!service || !isConnected) {
      setIsSyncing(false);
      setPendingOperations(0);
      previousPendingRef.current = 0;
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;
    let intervalId: NodeJS.Timeout | null = null; // Keep for backward compatibility during transition

    const checkSyncStatus = async (): Promise<void> => {
      try {
        // Clear any previous error
        setSyncError(null);
        
        // Check if offline sync is available
        const offlineSync = service.offline();
        if (!offlineSync) {
          setSyncError('Offline sync not available');
          return;
        }
        
        const queueStatus = await offlineSync.getQueueStatus();
        const pending = queueStatus.pending || 0;
        
        // Use functional update to prevent race conditions
        setPendingOperations(prevPending => {
          const previousPending = previousPendingRef.current;
          
          // Check if we just finished syncing (had pending operations, now we don't)
          if (previousPending > 0 && pending === 0 && isConnected) {
            // Just finished syncing - show success message briefly
            setShowSyncedMessage(true);
            setIsSyncing(false);
            
            // Clear any existing timeout
            if (syncedMessageTimeoutRef.current) {
              clearTimeout(syncedMessageTimeoutRef.current);
            }
            
            syncedMessageTimeoutRef.current = setTimeout(() => {
              setShowSyncedMessage(false);
              syncedMessageTimeoutRef.current = null;
            }, TIMEOUTS.SYNCED_MESSAGE_DISPLAY);
          } else if (pending > 0) {
            // We're syncing if there are pending operations and we're online
            setIsSyncing(true);
          } else {
            setIsSyncing(false);
          }
          
          previousPendingRef.current = pending;
          return pending;
        });
      } catch (error) {
        // Log error and set error state for user feedback
        const errorMessage = error instanceof Error ? error.message : 'Sync status unavailable';
        console.warn('Failed to get sync status:', error);
        setSyncError(errorMessage);
        
        // Still show offline indicator if we can't check status and we're offline
        if (!isConnected) {
          setShowOfflineIndicator(true);
        }
      }
    };

    // Use adaptive interval - faster when syncing, slower when idle
    // Function to start/restart interval with adaptive timing
    const startAdaptiveInterval = () => {
      // Clear existing interval if any
      if (currentIntervalRef.current) {
        clearInterval(currentIntervalRef.current);
        currentIntervalRef.current = null;
      }
      
      // Determine interval based on current syncing state
      const isCurrentlySyncing = previousPendingRef.current > 0;
      const interval = isCurrentlySyncing 
        ? TIMEOUTS.SYNC_CHECK_INTERVAL_SYNCING 
        : TIMEOUTS.SYNC_CHECK_INTERVAL_IDLE;
      
      // Store current state
      lastSyncingStateRef.current = isCurrentlySyncing;
      
      // Create interval that checks and adapts
      currentIntervalRef.current = setInterval(async () => {
        await checkSyncStatus();
        
        // After check completes, see if we need to change interval
        const newSyncingState = previousPendingRef.current > 0;
        if (newSyncingState !== lastSyncingStateRef.current) {
          // State changed - restart with new interval
          startAdaptiveInterval();
        }
      }, interval);
    };

    // If we just came online, wait a moment for sync to start, then check
    if (justCameOnline) {
      timeoutId = setTimeout(async () => {
        await checkSyncStatus();
        // Start adaptive interval after initial check
        startAdaptiveInterval();
      }, TIMEOUTS.SYNC_CHECK_DELAY);
    } else {
      // Check immediately and start adaptive interval
      (async () => {
        await checkSyncStatus();
        startAdaptiveInterval();
      })();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
      if (currentIntervalRef.current) {
        clearInterval(currentIntervalRef.current);
        currentIntervalRef.current = null;
      }
    };
  }, [service, isConnected, justCameOnline]);

  // Cleanup synced message timeout on unmount
  useEffect(() => {
    return () => {
      if (syncedMessageTimeoutRef.current) {
        clearTimeout(syncedMessageTimeoutRef.current);
      }
    };
  }, []);

  // Animate fade in/out
  useEffect(() => {
    const shouldShow = showOfflineIndicator || justCameOnline || isSyncing || showSyncedMessage;
    
    Animated.timing(fadeAnim, {
      toValue: shouldShow ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showOfflineIndicator, justCameOnline, isSyncing, showSyncedMessage, fadeAnim]);

  // Rotate animation for sync icon
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (isSyncing) {
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      rotateAnimation.start();
      return () => rotateAnimation.stop();
    } else {
      rotateAnim.setValue(0);
    }
  }, [isSyncing, rotateAnim]);
  
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Determine what to show
  let icon: MaterialIconName = 'cloud-off';
  let message = "Offline: Changes will sync when you're back online.";
  let color = '#e57373';

  if (syncError && isConnected) {
    // Show error state when sync status check fails
    icon = 'cloud-off';
    message = 'Unable to check sync status';
    color = '#ff9800'; // Orange to indicate warning
  } else if (showSyncedMessage) {
    icon = 'cloud-done';
    message = 'All changes synced with server';
    color = '#4caf50';
  } else if (isSyncing) {
    icon = 'cloud-sync';
    message = `Syncing ${pendingOperations} change${pendingOperations !== 1 ? 's' : ''}...`;
    color = '#2196f3';
  } else if (justCameOnline && pendingOperations === 0) {
    // Just came online but no pending operations - show brief success
    icon = 'cloud-done';
    message = 'Connected and up to date';
    color = '#4caf50';
  } else if (showOfflineIndicator || justWentOffline) {
    icon = 'cloud-off';
    message = "Offline: Your changes are saved locally";
    color = '#ff9800'; // Orange to indicate offline but safe
  } else {
    // Don't show anything if we're online and not syncing
    return null;
  }

  return (
    <Animated.View 
      accessibilityRole="text"
      accessibilityLabel={message}
      style={[
        styles.bar, 
        { 
          backgroundColor: color,
          opacity: fadeAnim,
          top: insets.top, // Position from top of safe area
          paddingTop: 4, // Small padding for content
          transform: [{ translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-50, 0]
          })}]
        }
      ]}
    > 
      <MaterialIcons name={icon} size={18} color="#fff" style={{ marginRight: 8 }} />
      <Text style={styles.text}>{message}</Text>
      {isSyncing && (
        <Animated.View 
          style={{ 
            marginLeft: 8,
            transform: [{ rotate: rotateInterpolate }]
          }}
        >
          <MaterialIcons name="sync" size={16} color="#fff" />
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
}); 
