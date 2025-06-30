import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { MobileOfflineSync } from '../MobileOfflineSync.ts';
import { PendingOperation } from '../../../../shared/services/firebase/types.ts';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import firestoreModule from '@react-native-firebase/firestore';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');

// Updated mock for @react-native-firebase/firestore
jest.mock('@react-native-firebase/firestore', () => {
  const mockFirestoreModuleInstance: Partial<FirebaseFirestoreTypes.Module> = {
    enableNetwork: jest.fn().mockResolvedValue(undefined),
    disableNetwork: jest.fn().mockResolvedValue(undefined),
    settings: jest.fn(),
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    batch: jest.fn(() => ({
      commit: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
    })),
    runTransaction: jest.fn(callback => callback({ get: jest.fn(), set: jest.fn(), update: jest.fn(), delete: jest.fn() })),
  };

  const mockModuleCallable = () => mockFirestoreModuleInstance as FirebaseFirestoreTypes.Module;

  (mockModuleCallable as any).Timestamp = {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: jest.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
  };
  (mockModuleCallable as any).FieldValue = {
    serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  };

  return {
    __esModule: true,
    default: jest.fn(mockModuleCallable),
  };
});

describe('MobileOfflineSync', () => {
  let offlineSync: MobileOfflineSync;
  let netInfoCallback: (state: { isConnected: boolean }) => void;
  let mockFirestoreInstance: FirebaseFirestoreTypes.Module;

  beforeEach(() => {
    jest.clearAllMocks();
    (NetInfo.addEventListener as jest.Mock).mockImplementation(callback => {
      netInfoCallback = callback;
      return () => {
        // No-op function for unsubscribe
      };
    });

    // Directly call the imported module, relying on Jest's mock for the default export.
    // Cast to any to bypass TypeScript's strict type checking for the call itself,
    // as Jest will resolve the default mock function at runtime.
    mockFirestoreInstance = (firestoreModule as any)();

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

      expect((status as any).isEnabled).toBe(false);
      expect(status.pendingOperations).toBe(0);
      expect((status as any).isOnline).toBe(true);
    });

    it('should restore state from AsyncStorage', async () => {
      const mockOperations = [
        {
          id: '1',
          type: 'add',
          collection: 'testCollection',
          data: {},
          timestamp: Date.now()
        }
      ];

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce('true') // OFFLINE_SYNC
        .mockResolvedValueOnce(JSON.stringify(mockOperations)) // PENDING_OPERATIONS
        .mockResolvedValueOnce(null); // RETRY_ATTEMPTS

      await offlineSync.initialize();
      const status = await offlineSync.getSyncStatus();

      expect((status as any).isEnabled).toBe(true);
      expect(status.pendingOperations).toBe(1);
    });
  });

  describe('operation queueing', () => {
    it('should queue operations with correct priority', async () => {
      const mockOperations: PendingOperation[] = [
        {
          id: '1',
          type: 'add',
          collection: 'testCollection',
          data: {},
          timestamp: Date.now()
        },
        {
          id: '2',
          type: 'add',
          collection: 'testCollection',
          data: {},
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
          type: 'add',
          collection: 'testCollection',
          data: {},
          timestamp: Date.now()
        },
        {
          id: '2',
          type: 'add',
          collection: 'testCollection',
          data: {},
          timestamp: Date.now()
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
        type: 'add',
        collection: 'testCollection',
        data: {},
        timestamp: Date.now()
      } as any;

      await offlineSync.enableSync();
      await offlineSync.queueOperation(mockOperation);

      // Simulate online state
      netInfoCallback({ isConnected: true });

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 6000));

      expect((mockOperation as any).execute).toHaveBeenCalledTimes(3);
    });

    it('should mark operation as failed after max retries', async () => {
      const mockOperation: PendingOperation = {
        id: '1',
        type: 'add',
        collection: 'testCollection',
        data: {},
        timestamp: Date.now()
      } as any;

      await offlineSync.enableSync();
      await offlineSync.queueOperation(mockOperation);

      // Simulate online state
      netInfoCallback({ isConnected: true });

      // Wait for max retries
      await new Promise(resolve => setTimeout(resolve, 20000));

      const status = await offlineSync.getQueueStatus();
      expect((status as any).failedOperations).toBe(1);
    });
  });

  describe('network state handling', () => {
    it('should process pending operations when network is restored', async () => {
      const mockOperation: PendingOperation = {
        id: '1',
        type: 'add',
        collection: 'testCollection',
        data: {},
        timestamp: Date.now()
      } as any;

      await offlineSync.enableSync();
      await offlineSync.queueOperation(mockOperation);

      // Simulate offline state
      netInfoCallback({ isConnected: false });
      
      // Verify no execution
      expect((mockOperation as any).execute).not.toHaveBeenCalled();

      // Simulate online state
      netInfoCallback({ isConnected: true });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect((mockOperation as any).execute).toHaveBeenCalled();
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
