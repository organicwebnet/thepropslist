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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const previousConnectedRef = useRef(true);
  const previousPendingRef = useRef(0);
  const syncedMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    let intervalId: NodeJS.Timeout | null = null;

    const checkSyncStatus = async () => {
      try {
        // Check if offline sync is available
        const offlineSync = service.offline();
        if (!offlineSync) {
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
        // Silently fail - offline sync might not be available
        console.warn('Failed to get sync status:', error);
      }
    };

    // Use a reasonable fixed interval - we'll check every 5 seconds
    // This balances responsiveness with API call frequency
    const CHECK_INTERVAL: number = TIMEOUTS.SYNC_CHECK_INTERVAL_SYNCING;

    // If we just came online, wait a moment for sync to start, then check
    if (justCameOnline) {
      timeoutId = setTimeout(() => {
        checkSyncStatus();
        // Start interval after initial check
        intervalId = setInterval(checkSyncStatus, CHECK_INTERVAL);
      }, TIMEOUTS.SYNC_CHECK_DELAY);
    } else {
      // Check immediately and start interval
      checkSyncStatus();
      intervalId = setInterval(checkSyncStatus, CHECK_INTERVAL);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
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

  if (showSyncedMessage) {
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
          top: insets.top,
          paddingTop: 4,
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
