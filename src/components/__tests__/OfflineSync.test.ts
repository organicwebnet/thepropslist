/**
 * @file OfflineSync.test.ts
 * 
 * Note: This file has known TypeScript type inference issues with Jest mocks.
 * These issues are documented in KNOWN_ISSUES.md and don't affect test functionality.
 * See KNOWN_ISSUES.md#typescript-and-jest-mocking-issues for details.
 * 
 * Current workarounds:
 * - Using type assertions (`as any`) for complex mock implementations
 * - Simplified mock type definitions
 * - Partial interface implementations where appropriate
 */

import '@testing-library/jest-dom';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { WebFirebaseService } from '../../platforms/web/services/firebase';
import { OfflineSyncService } from '../../shared/services/firebase/offline';
import { 
  FirebaseDocument,
  FirebaseService, 
  OfflineSync, 
  FirebaseFirestore, 
  FirebaseCollection,
  FirebaseStorage,
  FirebaseAuth, 
  SyncStatus,
  QueueStatus,
  PendingOperation,
  CustomUser,
  CustomDocumentReference,
  CustomCollectionReference,
  CustomStorageReference,
  CustomTransaction,
  CustomWriteBatch,
  CustomDocumentData,
  CustomAuth, 
  CustomFirestore, 
  CustomStorage 
} from '../../shared/services/firebase/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key],
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    getAllKeys: () => Object.keys(store)
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

interface MockDocumentData {
  name: string;
  updatedAt: Date;
}

// Define individual mock functions first
const mockInitializeFn = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockGetItemFn = jest.fn< <T>(key: string) => Promise<T | null>>().mockResolvedValue(null as any);
const mockSetItemFn = jest.fn< <T>(key: string, value: T) => Promise<void>>().mockResolvedValue(undefined);
const mockRemoveItemFn = jest.fn<(key: string) => Promise<void>>().mockResolvedValue(undefined);
const mockClearFn = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockEnableSyncFn = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockDisableSyncFn = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockGetSyncStatusFn = jest.fn<() => Promise<SyncStatus>>().mockResolvedValue({ isEnabled: true, isOnline: true, pendingOperations: 0, lastSyncTimestamp: null });
const mockQueueOperationFn = jest.fn<(operation: PendingOperation) => Promise<void>>().mockResolvedValue(undefined);
const mockGetQueueStatusFn = jest.fn<() => Promise<QueueStatus>>().mockResolvedValue({ pending: 0, processing: 0, lastProcessed: null });

// Assemble the mock object, typed as OfflineSync (without jest.Mocked)
const mockOfflineSync: OfflineSync = {
  initialize: mockInitializeFn,
  getItem: mockGetItemFn as any,
  setItem: mockSetItemFn,
  removeItem: mockRemoveItemFn,
  clear: mockClearFn,
  enableSync: mockEnableSyncFn,
  disableSync: mockDisableSyncFn,
  getSyncStatus: mockGetSyncStatusFn,
  queueOperation: mockQueueOperationFn,
  getQueueStatus: mockGetQueueStatusFn,
};

// Keep FirebaseAuth simple
const mockAuth: FirebaseAuth = {} as any;

// --- Mock Document Methods ---
const mockDocGetFn = jest.fn<() => Promise<any | undefined>>().mockResolvedValue({});
const mockDocSetFn = jest.fn<(data: any) => Promise<void>>().mockResolvedValue(undefined);
const mockDocUpdateFn = jest.fn<(data: Partial<any>) => Promise<void>>().mockResolvedValue(undefined);
const mockDocDeleteFn = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

const mockDocMethods: Omit<FirebaseDocument<any>, 'id'> = {
    ref: {} as CustomDocumentReference<any>, 
    get: mockDocGetFn,
    set: mockDocSetFn,
    update: mockDocUpdateFn,
    delete: mockDocDeleteFn,
};

// --- Mock Collection Methods ---
const mockCollectionWhereFn = jest.fn<(field: string, op: any, value: any) => FirebaseCollection<any>>();
const mockCollectionOrderByFn = jest.fn<(field: string, direction?: 'asc' | 'desc') => FirebaseCollection<any>>();
const mockCollectionLimitFn = jest.fn<(limit: number) => FirebaseCollection<any>>();
const mockCollectionGetFn = jest.fn<() => Promise<FirebaseDocument<any>[]>>().mockResolvedValue([]);
const mockCollectionAddFn = jest.fn<(data: any) => Promise<FirebaseDocument<any>>>().mockResolvedValue({ id: 'new-doc', ...mockDocMethods });
const mockCollectionDocFn = jest.fn<(id: string) => FirebaseDocument<any>>((id: string) => ({ 
    id: id,
    ...mockDocMethods
}));

// Assemble mock collection, typing as FirebaseCollection
const mockCollection: FirebaseCollection<any> = {
    where: mockCollectionWhereFn,
    orderBy: mockCollectionOrderByFn,
    limit: mockCollectionLimitFn,
    get: mockCollectionGetFn,
    add: mockCollectionAddFn,
    doc: mockCollectionDocFn,
};
// Make chainable methods return the mockCollection itself
mockCollectionWhereFn.mockImplementation(() => mockCollection);
mockCollectionOrderByFn.mockImplementation(() => mockCollection);
mockCollectionLimitFn.mockImplementation(() => mockCollection);

// --- Mock Firestore Methods ---
const mockFirestoreCollectionFn = jest.fn<(path: string) => FirebaseCollection<any>>().mockReturnValue(mockCollection);
const mockFirestoreDocFn = jest.fn<(path: string) => FirebaseDocument<any>>(); // Add implementation if needed
const mockFirestoreBatchFn = jest.fn<() => CustomWriteBatch>();
const mockFirestoreRunTransactionFn = jest.fn< <T>(updateFunction: (transaction: CustomTransaction) => Promise<T>) => Promise<T>>();

// Assemble mock Firestore, typing as FirebaseFirestore
const mockFirestore: FirebaseFirestore = {
    collection: mockFirestoreCollectionFn,
    doc: mockFirestoreDocFn,
    batch: mockFirestoreBatchFn,
    runTransaction: mockFirestoreRunTransactionFn,
};

// --- Mock Storage Methods ---
const mockStorageRefFn = jest.fn<(path?: string) => CustomStorageReference>();

// Assemble mock Storage, typing as FirebaseStorage
const mockStorage: FirebaseStorage = {
    ref: mockStorageRefFn,
};

const mockTransaction = {} as CustomTransaction;
const mockBatch = {} as CustomWriteBatch;
const mockStorageRef = {} as CustomStorageReference;

// --- Mock FirebaseService Methods ---
const mockServiceInitializeFn = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockServiceAuthFn = jest.fn<() => CustomAuth>(() => mockAuth);
const mockServiceFirestoreFn = jest.fn<() => CustomFirestore>(() => mockFirestore);
const mockServiceStorageFn = jest.fn<() => CustomStorage>(() => mockStorage);
const mockServiceOfflineFn = jest.fn<() => OfflineSync>(() => mockOfflineSync);
const mockServiceRunTransactionFn = jest.fn< <T>(updateFunction: (transaction: CustomTransaction) => Promise<T>) => Promise<T>>()
    .mockImplementation(async <T>(updateFunction: (transaction: CustomTransaction) => Promise<T>): Promise<T> => {
      const result = await updateFunction(mockTransaction);
      return result as T;
    });
const mockServiceBatchFn = jest.fn<() => CustomWriteBatch>(() => mockBatch);
const mockServiceListenDocFn = jest.fn< <T extends CustomDocumentData>(path: string, onNext: (doc: FirebaseDocument<T>) => void, onError?: (error: Error) => void) => () => void>().mockReturnValue(jest.fn());
const mockServiceListenCollFn = jest.fn< <T extends CustomDocumentData>(path: string, onNext: (docs: FirebaseDocument<T>[]) => void, onError?: (error: Error) => void) => () => void>().mockReturnValue(jest.fn());
const mockServiceCreateWrapperFn = jest.fn< <T extends CustomDocumentData>(docRef: CustomDocumentReference<T>) => FirebaseDocument<T>>(
    <T extends CustomDocumentData>(docRef: CustomDocumentReference<T>): FirebaseDocument<T> => ({ 
        id: docRef.id, 
        ref: docRef,
        get: jest.fn<() => Promise<T | undefined>>().mockResolvedValue(undefined),
        set: jest.fn<(data: T) => Promise<void>>().mockResolvedValue(undefined),
        update: jest.fn<(data: Partial<T>) => Promise<void>>().mockResolvedValue(undefined),
        delete: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
     } as FirebaseDocument<T>)
);
const mockServiceGetStorageRefFn = jest.fn<(path: string) => CustomStorageReference>(() => mockStorageRef);

// Assemble mock FirebaseService, typing as FirebaseService
const mockFirebaseService: FirebaseService = {
  initialize: mockServiceInitializeFn,
  auth: mockServiceAuthFn,
  firestore: mockServiceFirestoreFn,
  storage: mockServiceStorageFn,
  offline: mockServiceOfflineFn,
  runTransaction: mockServiceRunTransactionFn as any,
  batch: mockServiceBatchFn,
  listenToDocument: mockServiceListenDocFn,
  listenToCollection: mockServiceListenCollFn,
  createDocumentWrapper: mockServiceCreateWrapperFn as any,
  getStorageRef: mockServiceGetStorageRefFn,
  deleteDocument: jest.fn< (collectionPath: string, documentId: string) => Promise<void>>().mockResolvedValue(undefined),
  getDocument: jest.fn< <T extends CustomDocumentData>(collectionPath: string, documentId: string) => Promise<FirebaseDocument<T> | null>>().mockResolvedValue(null) as any,
  updateDocument: jest.fn< <T extends CustomDocumentData>(collectionPath: string, documentId: string, data: Partial<T>) => Promise<void>>().mockResolvedValue(undefined),
  addDocument: jest.fn< <T extends CustomDocumentData>(collectionPath: string, data: T) => Promise<FirebaseDocument<T>>>().mockResolvedValue({ id: 'mock-doc-id' } as FirebaseDocument<any>) as any,
  uploadFile: jest.fn<(path: string, file: File) => Promise<string>>().mockResolvedValue('mock-url'),
  deleteFile: jest.fn<(path: string) => Promise<void>>().mockResolvedValue(undefined),
  deleteShow: jest.fn<(showId: string) => Promise<void>>().mockResolvedValue(undefined),
  signInWithEmailAndPassword: jest.fn<(email: string, pass: string) => Promise<any>>().mockResolvedValue({ user: { uid: 'mock-user' } } as any),
  createUserWithEmailAndPassword: jest.fn<(email: string, pass: string) => Promise<any>>().mockResolvedValue({ user: { uid: 'mock-user' } } as any),
  sendPasswordResetEmail: jest.fn<(email: string) => Promise<void>>().mockResolvedValue(undefined),
};

describe('OfflineSyncService', () => {
  let offlineSync: OfflineSyncService;

  beforeEach(() => {
    localStorageMock.clear();
    offlineSync = new OfflineSyncService(mockFirebaseService);
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(offlineSync.initialize()).resolves.not.toThrow();
      // Expect the specific mock function to have been called via the service
      expect(mockEnableSyncFn).toHaveBeenCalled();
    });
  });

  describe('sync operations', () => {
    beforeEach(async () => {
      await offlineSync.initialize();
    });

    it('should sync a collection', async () => {
      await offlineSync.syncCollection('props');
      const status = await offlineSync.getSyncStatus();
      expect(status.syncedCollections).toContain('props');
    });

    it('should cache documents locally', async () => {
      await offlineSync.syncCollection('props');
      const doc = await offlineSync.getCachedDocument('props', 'doc1');
      expect(doc).toBeTruthy();
      expect(doc.name).toBe('Test Doc 1');
    });

    it('should clear cache', async () => {
      await offlineSync.syncCollection('props');
      await offlineSync.clearCache();
      const doc = await offlineSync.getCachedDocument('props', 'doc1');
      expect(doc).toBeNull();
    });

    it('should sync all collections', async () => {
      await offlineSync.syncAll();
      const status = await offlineSync.getSyncStatus();
      expect(status.isEnabled).toBe(true);
      expect(status.lastSync).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors', async () => {
      const mockEnableSyncWithError = jest.fn<() => Promise<void>>();
      mockEnableSyncWithError.mockRejectedValue(new Error('Failed to enable sync'));

      const errorOfflineSyncMock = {
        ...mockOfflineSync,
        enableSync: mockEnableSyncWithError,
      };
      const errorFirebaseServiceMock = {
        ...mockFirebaseService,
        offline: jest.fn(() => errorOfflineSyncMock) as any
      };
      const errorSync = new OfflineSyncService(errorFirebaseServiceMock as FirebaseService);
      await expect(errorSync.initialize()).rejects.toThrow('Failed to enable sync');
    });

    it('should handle sync errors', async () => {
      const mockGetWithError = jest.fn<() => Promise<FirebaseDocument<any>[]>>();
      mockGetWithError.mockRejectedValue(new Error('Sync failed'));
      
      const errorCollectionMock = {
        ...mockCollection,
        get: mockGetWithError,
      };
      const errorFirestoreMock = {
          ...mockFirestore,
          collection: jest.fn(() => errorCollectionMock) as any
      };
      const errorFirebaseServiceMock = {
        ...mockFirebaseService,
        firestore: errorFirestoreMock as any 
      };
      const errorSync = new OfflineSyncService(errorFirebaseServiceMock as FirebaseService);
      await errorSync.initialize(); 
      await expect(errorSync.syncCollection('props')).rejects.toThrow('Sync failed');
    });
  });

  describe('cache management', () => {
    beforeEach(async () => {
      await offlineSync.initialize();
    });

    it('should expire cached documents after 24 hours', async () => {
      await offlineSync.syncCollection('props');
      
      // Mock Date.now to return a time 25 hours in the future
      const realDateNow = Date.now.bind(global.Date);
      const twentyFiveHoursInMs = 25 * 60 * 60 * 1000;
      global.Date.now = jest.fn(() => realDateNow() + twentyFiveHoursInMs);

      const doc = await offlineSync.getCachedDocument('props', 'doc1');
      expect(doc).toBeNull();

      // Restore Date.now
      global.Date.now = realDateNow;
    });

    it('should update sync metadata after operations', async () => {
      await offlineSync.syncAll();
      const status = await offlineSync.getSyncStatus();
      expect(status.lastSync).toBeLessThanOrEqual(Date.now());
      expect(status.lastSync).toBeGreaterThan(Date.now() - 1000);
    });
  });
}); 