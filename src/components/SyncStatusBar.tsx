import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const SyncStatusBar: React.FC<{ syncing?: boolean }> = ({ syncing = false }) => {
  const { isConnected, isSyncing, justCameOnline } = useNetworkStatus(syncing);

  if (isConnected && !isSyncing && !justCameOnline) return null;

  let icon: any = 'cloud-off';
  let message = "Offline: Changes will sync when you're back online.";
  let color = '#e57373';

  if (justCameOnline) {
    icon = 'cloud-done';
    message = 'Back online, syncing...';
    color = '#4caf50';
  } else if (isSyncing) {
    icon = 'cloud-sync';
    message = 'Syncing...';
    color = '#2196f3';
  }

  return (
    <View style={[styles.bar, { backgroundColor: color }]}> 
      <MaterialIcons name={icon} size={20} color="#fff" style={{ marginRight: 8 }} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    justifyContent: 'center',
    zIndex: 100,
    elevation: 10,
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
}); 
