import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import storage, { FirebaseStorageTypes } from '@react-native-firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  FirebaseService, 
  FirebaseError, 
  FirebaseDocument,
  OfflineSync,
  PendingOperation,
  QueueStatus,
  SyncStatus,
  CustomDocumentReference
} from '../../../../shared/services/firebase/types';
import { MobileFirebaseService } from '../firebase';
import { MobileOfflineSync } from '../MobileOfflineSync';
import '@react-native-community/netinfo';

// --- Mock Setup ---

// Mock factory for auth
jest.mock('@react-native-firebase/auth', () => {
  const mockAuthInstance = {
    currentUser: null,
    // Add other mock methods/properties as needed
  };
  return jest.fn(() => mockAuthInstance);
});

// Mock factory for firestore
jest.mock('@react-native-firebase/firestore', () => {
  const Timestamp = {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: jest.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 }))
  };
  
  const mockFirestoreInstance = {
    collection: jest.fn(),
    doc: jest.fn(),
    batch: jest.fn(),
    runTransaction: jest.fn(),
    enableNetwork: jest.fn(),
    disableNetwork: jest.fn(),
    // Ensure Timestamp is directly on the instance object type
    Timestamp: Timestamp, 
  };

  // The factory function returns the instance
  const firestoreMockFactory = jest.fn(() => mockFirestoreInstance);
  // Don't attach Timestamp to the factory itself
  // firestoreMockFactory.Timestamp = Timestamp; 
  
  return firestoreMockFactory;
});

// Mock factory for storage
jest.mock('@react-native-firebase/storage', () => {
  const mockStorageInstance = {
    ref: jest.fn(),
  };
  return jest.fn(() => mockStorageInstance);
});

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('../MobileOfflineSync');

// --- Mock Data & Helper Functions ---

const createMockDocRef = (id: string = 'test-doc'): CustomDocumentReference => ({
  id,
  path: `test/${id}`,
  parent: {} as FirebaseFirestoreTypes.CollectionReference, 
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  onSnapshot: jest.fn(),
} as CustomDocumentReference);

const createMockSnapshot = (id: string = 'test-doc', data: any = {}): FirebaseFirestoreTypes.DocumentSnapshot => ({
  id,
  data: () => data,
  exists: true,
  ref: createMockDocRef(id) as FirebaseFirestoreTypes.DocumentReference,
  metadata: { hasPendingWrites: false, fromCache: false }
} as unknown as FirebaseFirestoreTypes.DocumentSnapshot);

interface MockCollectionReference extends Partial<FirebaseFirestoreTypes.CollectionReference> {
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  onSnapshot: jest.Mock;
  doc: jest.Mock;
}

const createMockCollectionRef = (): MockCollectionReference => ({
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  onSnapshot: jest.fn(),
  doc: jest.fn().mockImplementation((id) => createMockDocRef(id))
});

const createMockPendingOperation = (
  type: 'set' | 'update' | 'delete' = 'set',
  id: string = 'test-op-1'
): PendingOperation => ({
  id,
  type,
  execute: jest.fn(),
  timestamp: Date.now(),
  priority: 'normal',
  status: 'pending',
  collection: 'test',
  documentId: 'doc1',
  data: { field: 'value' }
});

// --- Test Suite ---

describe('MobileFirebaseService', () => {
  let service: MobileFirebaseService;
  let mockAuthInstance: FirebaseAuthTypes.Module;
  let mockFirestoreInstance: FirebaseFirestoreTypes.Module;
  let mockStorageInstance: FirebaseStorageTypes.Module;
  let mockOfflineSyncInstance: jest.Mocked<MobileOfflineSync>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuthInstance = auth();
    mockFirestoreInstance = firestore();
    mockStorageInstance = storage();

    // Ensure firestore().doc(string) returns a mock DocumentReference
    (mockFirestoreInstance.doc as jest.Mock).mockImplementation((path: string) => {
      const id = path.split('/').pop() || 'mock-id';
      return createMockDocRef(id);
    });
    // Setup other necessary mocks called in constructor/beforeEach
    (mockFirestoreInstance.collection as jest.Mock).mockReturnValue(createMockCollectionRef());
    (mockStorageInstance.ref as jest.Mock).mockReturnValue({ /* mock storage ref */ });

    service = new MobileFirebaseService();

    mockOfflineSyncInstance = (MobileOfflineSync as jest.Mock).mock.instances[0] as jest.Mocked<MobileOfflineSync>;

    expect(MobileOfflineSync).toHaveBeenCalledWith(mockFirestoreInstance);
  });

  describe('Initialization', () => {
    it('should initialize correctly', () => {
      expect(auth).toHaveBeenCalled();
      expect(firestore).toHaveBeenCalled();
      expect(storage).toHaveBeenCalled();
      expect(MobileOfflineSync).toHaveBeenCalled();
    });
  });

  describe('Service Getters', () => {
    it('should return auth service', () => {
      expect(service.auth()).toBe(mockAuthInstance);
    });
    it('should return firestore service', () => {
      expect(service.firestore()).toBe(mockFirestoreInstance);
    });
    it('should return storage service', () => {
      expect(service.storage()).toBe(mockStorageInstance);
    });
    it('should return offline sync service', () => {
      expect(service.offline()).toBe(mockOfflineSyncInstance);
    });
  });

  describe('Firestore Operations', () => {

    describe('Document Operations', () => {
      const mockData = { field: 'value' };

      it('should create document wrapper using path', () => {
        // Cast service to 'any' for this call as a workaround for persistent type error
        const docWrapper = (service as any).createDocumentWrapper('test/doc'); 
        
        expect(mockFirestoreInstance.doc).toHaveBeenCalledWith('test/doc');
        expect(docWrapper).toBeDefined();
        expect(docWrapper.id).toBe('doc'); 
        expect(docWrapper.ref).toBeDefined();
        expect(typeof docWrapper.get).toBe('function');
      });

      it('should handle document real-time updates', () => {
        const onNextCallback = jest.fn();
        const onErrorCallback = jest.fn();
        const mockUnsubscribe = jest.fn();

        const mockDocOnSnapshot = jest.fn((onNext, onError) => {
          const snapshot = createMockSnapshot('test-doc', { field: 'new value' });
          onNext(snapshot);
          return mockUnsubscribe;
        });
        const mockDocRefForListener = {
          ...createMockDocRef('test-doc'),
          onSnapshot: mockDocOnSnapshot
        };
        (mockFirestoreInstance.doc as jest.Mock).mockReturnValue(mockDocRefForListener);

        const unsubscribe = service.listenToDocument('test/doc', onNextCallback, onErrorCallback);
        
        expect(mockFirestoreInstance.doc).toHaveBeenCalledWith('test/doc');
        expect(mockDocOnSnapshot).toHaveBeenCalled();
        expect(onNextCallback).toHaveBeenCalled();
        const wrappedDocArg = onNextCallback.mock.calls[0][0] as FirebaseDocument<any>;
        expect(wrappedDocArg.id).toBe('test-doc');
        expect(wrappedDocArg.data).toEqual({ field: 'new value' });

        unsubscribe();
        expect(mockUnsubscribe).toHaveBeenCalled();
      });
    });

    describe('Collection Operations', () => {
      it('should handle collection real-time updates', () => {
        const onNextCallback = jest.fn();
        (mockFirestoreInstance.collection as jest.Mock).mockReturnValue({
          ...createMockCollectionRef(),
          onSnapshot: jest.fn((onNext) => {
            const snapshot = { docs: [createMockSnapshot('doc1'), createMockSnapshot('doc2')] };
            onNext(snapshot);
            return jest.fn();
          })
        });

        service.listenToCollection('test', onNextCallback);
        expect(mockFirestoreInstance.collection).toHaveBeenCalledWith('test');
        expect(onNextCallback).toHaveBeenCalled();
      });
    });
  });

  describe('Offline Operations', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should queue offline operations', async () => {
      const operation = createMockPendingOperation();
      await service.offline().queueOperation(operation);
      expect(mockOfflineSyncInstance.queueOperation).toHaveBeenCalledWith(operation);
    });

    it('should get queue status', async () => {
      mockOfflineSyncInstance.getQueueStatus.mockResolvedValue({ pending: 1, processing: 0, lastProcessed: null });
      
      const status = await service.offline().getQueueStatus();
      expect(mockOfflineSyncInstance.getQueueStatus).toHaveBeenCalled();
      expect(status).toEqual({ pending: 1, processing: 0, lastProcessed: null });
    });
  });
}); 