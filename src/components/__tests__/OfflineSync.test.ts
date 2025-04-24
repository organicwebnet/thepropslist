/**
 * @file OfflineSync.test.ts
 * 
 * Note: This file has known TypeScript type inference issues with Jest mocks.
 * These issues are documented in KNOWN_ISSUES.md and don't affect test functionality.
 * See KNOWN_ISSUES.md#typescript-and-jest-mocking-issues for details.
 * 
 * Current workarounds:
 * - Using type assertions for mock implementations
 * - Simplified mock type definitions
 * - Partial interface implementations where appropriate
 */

import '@testing-library/jest-dom';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { WebFirebaseService } from '../../platforms/web/services/firebase';
import { OfflineSyncService } from '../../shared/services/firebase/offline';
import { 
  FirestoreDocument, 
  FirebaseService, 
  OfflineSync, 
  FirebaseFirestore, 
  FirestoreCollection,
  FirebaseStorage,
  FirebaseAuth 
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

// Helper type for mocked functions
type MockedPromise<T> = jest.Mock<Promise<T>>;
type MockedFunction<T> = jest.Mock<T>;

// Create properly typed mock functions
const createMockPromise = <T>(value: T): MockedPromise<T> => {
  return jest.fn().mockResolvedValue(value);
};

const createMockPromiseWithParams = <T>(value: T): MockedPromise<T> => {
  return jest.fn().mockResolvedValue(value);
};

const createMockReturnValue = <T>(value: T): MockedFunction<T> => {
  return jest.fn().mockReturnValue(value);
};

interface MockDocument extends Omit<FirestoreDocument, 'get'> {
  id: string;
  data(): MockDocumentData;
  get(): Promise<MockDocumentData>;
}

const createMockDocument = (id: string, data: MockDocumentData): MockDocument => ({
  id,
  data: () => data,
  get: createMockPromise(data),
  exists: () => true,
  set: createMockPromiseWithParams(undefined),
  update: createMockPromiseWithParams(undefined),
  delete: createMockPromise(undefined)
});

const mockDocs = [
  createMockDocument('doc1', { name: 'Test Doc 1', updatedAt: new Date() }),
  createMockDocument('doc2', { name: 'Test Doc 2', updatedAt: new Date() })
];

const mockOfflineSync: OfflineSync = {
  enableSync: createMockPromise(undefined),
  disableSync: createMockPromise(undefined),
  getSyncStatus: createMockPromise(true)
};

const mockCollection: Partial<FirestoreCollection> = {
  where: jest.fn().mockReturnValue({
    get: createMockPromise(mockDocs)
  })
};

const mockFirestore: Partial<FirebaseFirestore> = {
  collection: createMockReturnValue(mockCollection as FirestoreCollection)
};

const mockStorage: FirebaseStorage = {
  upload: createMockPromiseWithParams('mock-url'),
  getDownloadURL: createMockPromiseWithParams('mock-url'),
  delete: createMockPromiseWithParams(undefined)
};

const mockAuth: FirebaseAuth = {
  currentUser: null,
  signIn: createMockPromiseWithParams(undefined),
  signOut: createMockPromise(undefined),
  createUser: createMockPromiseWithParams(undefined),
  onAuthStateChanged: jest.fn()
};

const mockFirebaseService: FirebaseService = {
  initialize: createMockPromise(undefined),
  auth: createMockReturnValue(mockAuth),
  offline: createMockReturnValue(mockOfflineSync),
  firestore: createMockReturnValue(mockFirestore as FirebaseFirestore),
  storage: createMockReturnValue(mockStorage)
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
      expect(mockFirebaseService.offline().enableSync).toHaveBeenCalled();
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
      const errorOfflineSync: OfflineSync = {
        enableSync: jest.fn().mockRejectedValue(new Error('Failed to enable sync')),
        disableSync: createMockPromise(undefined),
        getSyncStatus: createMockPromise(false)
      };

      const errorFirebaseService: FirebaseService = {
        ...mockFirebaseService,
        offline: createMockReturnValue(errorOfflineSync)
      };

      const errorSync = new OfflineSyncService(errorFirebaseService);
      await expect(errorSync.initialize()).rejects.toThrow('Failed to enable sync');
    });

    it('should handle sync errors', async () => {
      const errorCollection: Partial<FirestoreCollection> = {
        where: jest.fn().mockRejectedValue(new Error('Sync failed'))
      };

      const errorFirestore: Partial<FirebaseFirestore> = {
        collection: createMockReturnValue(errorCollection as FirestoreCollection)
      };

      const errorFirebaseService: FirebaseService = {
        ...mockFirebaseService,
        firestore: createMockReturnValue(errorFirestore as FirebaseFirestore)
      };

      const errorSync = new OfflineSyncService(errorFirebaseService);
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
      expect(status.lastSync).toBeGreaterThan(Date.now() - 1000); // Within the last second
    });
  });
}); 