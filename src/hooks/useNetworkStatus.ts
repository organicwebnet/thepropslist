import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus(syncing: boolean = false) {
  const [isConnected, setIsConnected] = useState(true);
  const [justCameOnline, setJustCameOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(syncing);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (isConnected === false && state.isConnected) {
        setJustCameOnline(true);
        setTimeout(() => setJustCameOnline(false), 3000);
      }
      setIsConnected(!!state.isConnected);
    });
    return () => unsubscribe();
  }, [isConnected]);

  useEffect(() => {
    setIsSyncing(syncing);
  }, [syncing]);

  return { isConnected, isSyncing, justCameOnline };
} 