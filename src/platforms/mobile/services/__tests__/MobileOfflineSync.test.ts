import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { MobileOfflineSync } from '../MobileOfflineSync';
import { PendingOperation } from '../../../../shared/services/firebase/types';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import firestore from '@react-native-firebase/firestore';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');

jest.mock('@react-native-firebase/firestore', () => {
  const mockEnableNetwork = jest.fn().mockResolvedValue(undefined);
  const mockDisableNetwork = jest.fn().mockResolvedValue(undefined);

  return jest.fn(() => ({
    enableNetwork: mockEnableNetwork,
    disableNetwork: mockDisableNetwork,
  }));
});

describe('MobileOfflineSync', () => {
  let offlineSync: MobileOfflineSync;
  let netInfoCallback: (state: { isConnected: boolean }) => void;
  let mockFirestoreInstance: FirebaseFirestoreTypes.Module;

  beforeEach(() => {
    jest.clearAllMocks();
    (NetInfo.addEventListener as jest.Mock).mockImplementation(callback => {
      netInfoCallback = callback;
      return () => {};
    });

    mockFirestoreInstance = firestore() as unknown as FirebaseFirestoreTypes.Module;

    offlineSync = new MobileOfflineSync(mockFirestoreInstance);
  });

  describe('initialization', () => {
    it('should initialize with default values', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(null) // OFFLINE_SYNC
        .mockResolvedValueOnce(null) // PENDING_OPERATIONS
        .mockResolvedValueOnce(null); // RETRY_ATTEMPTS

      await offlineSync.initialize();
      const status = await offlineSync.getSyncStatus();

      expect(status.isEnabled).toBe(false);
      expect(status.pendingOperations).toBe(0);
      expect(status.isOnline).toBe(true);
    });

    it('should restore state from AsyncStorage', async () => {
      const mockOperations = [
        {
          id: '1',
          execute: jest.fn(),
          isProcessing: true,
          timestamp: Date.now()
        }
      ];

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('true') // OFFLINE_SYNC
        .mockResolvedValueOnce(JSON.stringify(mockOperations)) // PENDING_OPERATIONS
        .mockResolvedValueOnce(null); // RETRY_ATTEMPTS

      await offlineSync.initialize();
      const status = await offlineSync.getSyncStatus();

      expect(status.isEnabled).toBe(true);
      expect(status.pendingOperations).toBe(1);
    });
  });

  describe('operation queueing', () => {
    it('should queue operations with correct priority', async () => {
      const mockOperations: PendingOperation[] = [
        {
          id: '1',
          execute: jest.fn(),
          priority: 'normal',
          timestamp: Date.now()
        },
        {
          id: '2',
          execute: jest.fn(),
          priority: 'high',
          timestamp: Date.now()
        }
      ];

      await offlineSync.enableSync();
      await offlineSync.queueOperation(mockOperations[0]);
      await offlineSync.queueOperation(mockOperations[1]);

      const status = await offlineSync.getQueueStatus();
      expect(status.pending).toBe(2);
    });

    it('should process operations in priority order', async () => {
      const executionOrder: string[] = [];
      const mockOperations: PendingOperation[] = [
        {
          id: '1',
          execute: async () => {
            executionOrder.push('1');
          },
          priority: 'normal'
        },
        {
          id: '2',
          execute: async () => {
            executionOrder.push('2');
          },
          priority: 'high'
        }
      ];

      await offlineSync.enableSync();
      await offlineSync.queueOperation(mockOperations[0]);
      await offlineSync.queueOperation(mockOperations[1]);

      // Simulate online state
      netInfoCallback({ isConnected: true });

      // Wait for operations to process
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(executionOrder).toEqual(['2', '1']);
    });
  });

  describe('retry mechanism', () => {
    it('should retry failed operations', async () => {
      const mockOperation: PendingOperation = {
        id: '1',
        execute: jest.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce(undefined),
        priority: 'high'
      };

      await offlineSync.enableSync();
      await offlineSync.queueOperation(mockOperation);

      // Simulate online state
      netInfoCallback({ isConnected: true });

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 6000));

      expect(mockOperation.execute).toHaveBeenCalledTimes(3);
    });

    it('should mark operation as failed after max retries', async () => {
      const mockOperation: PendingOperation = {
        id: '1',
        execute: jest.fn().mockRejectedValue(new Error('Persistent error')),
        priority: 'high'
      };

      await offlineSync.enableSync();
      await offlineSync.queueOperation(mockOperation);

      // Simulate online state
      netInfoCallback({ isConnected: true });

      // Wait for max retries
      await new Promise(resolve => setTimeout(resolve, 20000));

      const status = await offlineSync.getQueueStatus();
      expect(status.failedOperations).toBe(1);
    });
  });

  describe('network state handling', () => {
    it('should process pending operations when network is restored', async () => {
      const mockOperation: PendingOperation = {
        id: '1',
        execute: jest.fn().mockResolvedValue(undefined),
        priority: 'normal'
      };

      await offlineSync.enableSync();
      await offlineSync.queueOperation(mockOperation);

      // Simulate offline state
      netInfoCallback({ isConnected: false });
      
      // Verify no execution
      expect(mockOperation.execute).not.toHaveBeenCalled();

      // Simulate online state
      netInfoCallback({ isConnected: true });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockOperation.execute).toHaveBeenCalled();
    });
  });

  describe('enableSync', () => {
    it('should call firestoreInstance.enableNetwork', async () => {
      await offlineSync.enableSync();
      expect(mockFirestoreInstance.enableNetwork).toHaveBeenCalledTimes(1);
    });
  });

  describe('disableSync', () => {
    it('should call firestoreInstance.disableNetwork', async () => {
      await offlineSync.disableSync();
      expect(mockFirestoreInstance.disableNetwork).toHaveBeenCalledTimes(1);
    });
  });
}); 