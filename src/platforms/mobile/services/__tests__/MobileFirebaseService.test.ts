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
  SyncStatus
} from '../../../../shared/services/firebase/types';
import { MobileFirebaseService } from '../firebase';
import { MobileOfflineSync } from '../MobileOfflineSync';
import '@react-native-community/netinfo';

jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-firebase/firestore');
jest.mock('@react-native-firebase/storage');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('../MobileOfflineSync');

const createMockDocRef = (id: string = 'test-doc'): FirebaseFirestoreTypes.DocumentReference => ({
  id,
  path: `test/${id}`,
  parent: {} as FirebaseFirestoreTypes.CollectionReference,
  type: 'document'
} as FirebaseFirestoreTypes.DocumentReference);

const createMockSnapshot = (id: string = 'test-doc', data: any = {}): FirebaseFirestoreTypes.DocumentSnapshot => ({
  id,
  data: () => data,
  exists: true,
  ref: createMockDocRef(id),
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

const mockAuth = {} as FirebaseAuthTypes.Module;
const mockFirestore = {
  collection: jest.fn()
} as unknown as FirebaseFirestoreTypes.Module;
const mockStorage = {} as FirebaseStorageTypes.Reference;
const mockCollectionRef = createMockCollectionRef();

const mockOfflineSync: jest.Mocked<MobileOfflineSync> = {
  isEnabled: false,
  isOnline: true,
  pendingOperations: [],
  lastSyncTimestamp: 0,
  syncInProgress: false,
  initialize: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  queueOperation: jest.fn(),
  getQueueStatus: jest.fn().mockResolvedValue({ pending: 0, processing: 0, lastProcessed: null }),
  getSyncStatus: jest.fn().mockResolvedValue(true),
  enableSync: jest.fn().mockResolvedValue(undefined),
  disableSync: jest.fn().mockResolvedValue(undefined),
  processPendingOperations: jest.fn()
} as unknown as jest.Mocked<MobileOfflineSync>;

(auth as jest.Mock).mockReturnValue(mockAuth);
(firestore as jest.Mock).mockReturnValue(mockFirestore);
(storage as jest.Mock).mockReturnValue(mockStorage);
(MobileOfflineSync as jest.Mock).mockImplementation(() => mockOfflineSync);
(firestore().collection as jest.Mock).mockReturnValue(mockCollectionRef);

describe('MobileFirebaseService', () => {
  let service: MobileFirebaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MobileFirebaseService();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await service.initialize();
      expect(auth).toHaveBeenCalled();
      expect(firestore).toHaveBeenCalled();
      expect(storage).toHaveBeenCalled();
    });
  });

  describe('Service Getters', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return auth service', () => {
      expect(service.auth()).toBe(mockAuth);
    });

    it('should return firestore service', () => {
      expect(service.firestore()).toBe(mockFirestore);
    });

    it('should return storage service', () => {
      expect(service.storage()).toBe(mockStorage);
    });

    it('should return offline sync service', () => {
      expect(service.offline()).toBeDefined();
    });
  });

  describe('Firestore Operations', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    describe('Document Operations', () => {
      const mockDoc = createMockDocRef();
      const mockData = { field: 'value' };

      it('should create document wrapper', () => {
        const docRef = service.createDocumentWrapper('test/doc');
        expect(docRef).toBeDefined();
      });

      it('should handle document real-time updates', () => {
        const callback = jest.fn();
        const unsubscribe = jest.fn();
        mockDoc.onSnapshot = jest.fn().mockReturnValue(unsubscribe);

        const result = service.listenToDocument('test/doc', callback);
        expect(mockDoc.onSnapshot).toHaveBeenCalled();
        expect(result).toBe(unsubscribe);
      });
    });

    describe('Collection Operations', () => {
      it('should handle collection queries with filters', () => {
        const callback = jest.fn();
        service.listenToCollection('test', callback);

        expect(mockCollectionRef.onSnapshot).toHaveBeenCalled();
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
      expect(mockOfflineSync.queueOperation).toHaveBeenCalledWith(operation);
    });

    it('should get queue status', async () => {
      const status = await service.offline().getQueueStatus();
      expect(mockOfflineSync.getQueueStatus).toHaveBeenCalled();
      expect(status).toEqual({ pending: 0, processing: 0, lastProcessed: null });
    });
  });
}); 