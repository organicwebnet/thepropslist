import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  cleanupOldEmails, 
  cleanupExpiredCodes, 
  cleanupFailedEmails, 
  manualCleanup, 
  databaseHealthCheck,
  cleanupOrphanedStorage
} from '../index';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

// Mock Firebase Admin
vi.mock('firebase-admin', () => ({
  firestore: vi.fn(() => ({
    collection: vi.fn(),
    batch: vi.fn(() => ({
      delete: vi.fn(),
      commit: vi.fn(() => Promise.resolve())
    })),
    FieldValue: {
      serverTimestamp: vi.fn(() => 'mock-timestamp')
    },
    Timestamp: {
      fromMillis: vi.fn((ms) => ({ seconds: Math.floor(ms / 1000) }))
    }
  }))
}));

// Mock Firebase Functions Logger
vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
}));

describe('Database Maintenance and Garbage Collection Functions', () => {
  let mockDb: any;
  let mockBatch: any;
  let mockCollection: any;
  let mockQuery: any;
  let mockSnapshot: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock Firestore batch
    mockBatch = {
      delete: vi.fn(),
      commit: vi.fn(() => Promise.resolve())
    };

    // Mock Firestore query
    mockQuery = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn()
    };

    // Mock Firestore collection
    mockCollection = vi.fn(() => mockQuery);

    // Mock Firestore database
    mockDb = {
      collection: mockCollection,
      batch: vi.fn(() => mockBatch)
    };

    // Mock admin.firestore to return our mock
    vi.mocked(admin.firestore).mockReturnValue(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('cleanupOldEmails', () => {
    it('should clean up old processed emails successfully', async () => {
      // Mock old emails found
      const mockDocs = [
        { ref: { id: 'email1' } },
        { ref: { id: 'email2' } },
        { ref: { id: 'email3' } }
      ];
      
      mockSnapshot = {
        docs: mockDocs,
        empty: false,
        size: 3
      };
      
      mockQuery.get.mockResolvedValue(mockSnapshot);

      // Mock the event parameter
      const mockEvent = {};

      await cleanupOldEmails(mockEvent);

      // Verify query was built correctly
      expect(mockCollection).toHaveBeenCalledWith('emails');
      expect(mockQuery.where).toHaveBeenCalledWith('processed', '==', true);
      expect(mockQuery.where).toHaveBeenCalledWith('processingAt', '<', expect.any(Object));
      expect(mockQuery.limit).toHaveBeenCalledWith(500);

      // Verify batch operations
      expect(mockBatch.delete).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith('Starting email cleanup process', expect.any(Object));
      expect(logger.info).toHaveBeenCalledWith('Found 3 old emails to delete');
      expect(logger.info).toHaveBeenCalledWith('Email cleanup completed. Deleted 3 old emails');
    });

    it('should handle no old emails found', async () => {
      // Mock no emails found
      mockSnapshot = {
        docs: [],
        empty: true,
        size: 0
      };
      
      mockQuery.get.mockResolvedValue(mockSnapshot);

      const mockEvent = {};
      await cleanupOldEmails(mockEvent);

      // Verify no batch operations
      expect(mockBatch.delete).not.toHaveBeenCalled();
      expect(mockBatch.commit).not.toHaveBeenCalled();

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith('No old emails found to clean up');
    });

    it('should handle large batches correctly', async () => {
      // Mock large number of emails (600 docs)
      const mockDocs = Array(600).fill(null).map((_, i) => ({ ref: { id: `email${i}` } }));
      
      mockSnapshot = {
        docs: mockDocs,
        empty: false,
        size: 600
      };
      
      mockQuery.get.mockResolvedValue(mockSnapshot);

      const mockEvent = {};
      await cleanupOldEmails(mockEvent);

      // Verify batch processing in chunks
      expect(mockBatch.delete).toHaveBeenCalledTimes(600);
      expect(mockBatch.commit).toHaveBeenCalledTimes(2); // 450 + 150

      // Verify logging shows progress
      expect(logger.info).toHaveBeenCalledWith('Deleted 450 emails so far');
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Firestore error');
      mockQuery.get.mockRejectedValue(mockError);

      const mockEvent = {};
      
      await expect(cleanupOldEmails(mockEvent)).rejects.toThrow('Firestore error');
      expect(logger.error).toHaveBeenCalledWith('Error during email cleanup:', mockError);
    });
  });

  describe('cleanupExpiredCodes', () => {
    it('should clean up expired signup codes', async () => {
      const mockSignupDocs = [
        { ref: { id: 'signup1' } },
        { ref: { id: 'signup2' } }
      ];
      
      const mockResetDocs = [
        { ref: { id: 'reset1' } }
      ];

      // Mock signup codes query
      const mockSignupQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn(() => Promise.resolve({
          docs: mockSignupDocs,
          empty: false,
          size: 2
        }))
      };

      // Mock reset codes query
      const mockResetQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn(() => Promise.resolve({
          docs: mockResetDocs,
          empty: false,
          size: 1
        }))
      };

      // Mock collection to return different queries
      mockCollection.mockImplementation((collectionName) => {
        if (collectionName === 'pending_signups') return mockSignupQuery;
        if (collectionName === 'pending_password_resets') return mockResetQuery;
        return mockQuery;
      });

      const mockEvent = {};
      await cleanupExpiredCodes(mockEvent);

      // Verify both collections were queried
      expect(mockCollection).toHaveBeenCalledWith('pending_signups');
      expect(mockCollection).toHaveBeenCalledWith('pending_password_resets');

      // Verify batch operations
      expect(mockBatch.delete).toHaveBeenCalledTimes(3); // 2 signup + 1 reset
      expect(mockBatch.commit).toHaveBeenCalledTimes(2); // One commit per collection

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith('Starting expired codes cleanup process');
      expect(logger.info).toHaveBeenCalledWith('Deleted 2 expired signup codes');
      expect(logger.info).toHaveBeenCalledWith('Deleted 1 expired password reset codes');
      expect(logger.info).toHaveBeenCalledWith('Expired codes cleanup completed');
    });

    it('should handle no expired codes found', async () => {
      // Mock no expired codes
      const mockEmptyQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn(() => Promise.resolve({
          docs: [],
          empty: true,
          size: 0
        }))
      };

      mockCollection.mockReturnValue(mockEmptyQuery);

      const mockEvent = {};
      await cleanupExpiredCodes(mockEvent);

      // Verify no batch operations
      expect(mockBatch.delete).not.toHaveBeenCalled();
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });
  });

  describe('cleanupFailedEmails', () => {
    it('should clean up old failed emails', async () => {
      const mockFailedDocs = [
        { ref: { id: 'failed1' } },
        { ref: { id: 'failed2' } }
      ];
      
      mockSnapshot = {
        docs: mockFailedDocs,
        empty: false,
        size: 2
      };
      
      mockQuery.get.mockResolvedValue(mockSnapshot);

      const mockEvent = {};
      await cleanupFailedEmails(mockEvent);

      // Verify query was built correctly
      expect(mockCollection).toHaveBeenCalledWith('emails');
      expect(mockQuery.where).toHaveBeenCalledWith('delivery.state', '==', 'failed');
      expect(mockQuery.where).toHaveBeenCalledWith('delivery.failedAt', '<', expect.any(Object));

      // Verify batch operations
      expect(mockBatch.delete).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith('Starting failed emails cleanup process', expect.any(Object));
      expect(logger.info).toHaveBeenCalledWith('Found 2 old failed emails to delete');
      expect(logger.info).toHaveBeenCalledWith('Failed emails cleanup completed. Deleted 2 old failed emails');
    });
  });

  describe('manualCleanup', () => {
    let mockRequest: any;

    beforeEach(() => {
      // Mock admin user profile
      const mockUserProfile = {
        exists: true,
        data: () => ({
          groups: { 'system-admin': true }
        })
      };

      const mockUserDoc = {
        exists: true,
        data: () => ({
          role: 'user'
        })
      };

      // Mock Firestore document operations
      const mockDoc = {
        get: vi.fn()
      };

      mockCollection.mockImplementation((collectionName) => {
        if (collectionName === 'userProfiles') {
          return {
            doc: vi.fn(() => mockDoc)
          };
        }
        return mockQuery;
      });

      mockDoc.get.mockImplementation((docPath) => {
        if (docPath.includes('userProfiles')) {
          return Promise.resolve(mockUserProfile);
        }
        return Promise.resolve({ exists: false });
      });

      mockRequest = {
        auth: { uid: 'test-admin-uid' },
        data: { collection: 'emails', daysOld: 30, dryRun: true }
      };
    });

    it('should perform dry run cleanup successfully', async () => {
      mockSnapshot = {
        docs: [
          { ref: { id: 'doc1' } },
          { ref: { id: 'doc2' } }
        ],
        empty: false,
        size: 2
      };
      
      mockQuery.get.mockResolvedValue(mockSnapshot);

      const result = await manualCleanup(mockRequest);

      // Verify result
      expect(result).toEqual({
        success: true,
        message: 'Dry run: Would delete 2 documents from emails',
        wouldDeleteCount: 2,
        dryRun: true
      });

      // Verify no actual deletion in dry run
      expect(mockBatch.delete).not.toHaveBeenCalled();
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });

    it('should perform actual cleanup when dryRun is false', async () => {
      mockRequest.data.dryRun = false;
      
      mockSnapshot = {
        docs: [
          { ref: { id: 'doc1' } },
          { ref: { id: 'doc2' } }
        ],
        empty: false,
        size: 2
      };
      
      mockQuery.get.mockResolvedValue(mockSnapshot);

      const result = await manualCleanup(mockRequest);

      // Verify result
      expect(result).toEqual({
        success: true,
        message: 'Successfully deleted 2 documents from emails',
        deletedCount: 2,
        dryRun: false
      });

      // Verify actual deletion
      expect(mockBatch.delete).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should reject unauthenticated requests', async () => {
      mockRequest.auth = null;

      await expect(manualCleanup(mockRequest)).rejects.toThrow('unauthenticated');
    });

    it('should reject non-admin users', async () => {
      // Mock non-admin user
      const mockNonAdminProfile = {
        exists: true,
        data: () => ({
          groups: {} // No system-admin group
        })
      };

      const mockNonAdminUser = {
        exists: true,
        data: () => ({
          role: 'user' // Not god role
        })
      };

      const mockDoc = {
        get: vi.fn()
      };

      mockCollection.mockImplementation((collectionName) => {
        if (collectionName === 'userProfiles') {
          return {
            doc: vi.fn(() => mockDoc)
          };
        }
        return mockQuery;
      });

      mockDoc.get.mockImplementation((docPath) => {
        if (docPath.includes('userProfiles')) {
          return Promise.resolve(mockNonAdminProfile);
        }
        if (docPath.includes('users')) {
          return Promise.resolve(mockNonAdminUser);
        }
        return Promise.resolve({ exists: false });
      });

      await expect(manualCleanup(mockRequest)).rejects.toThrow('forbidden');
    });

    it('should validate input parameters', async () => {
      // Test missing collection
      mockRequest.data = { daysOld: 30, dryRun: true };
      await expect(manualCleanup(mockRequest)).rejects.toThrow('Collection name is required and must be a string');

      // Test invalid collection
      mockRequest.data = { collection: 'invalid_collection', daysOld: 30, dryRun: true };
      await expect(manualCleanup(mockRequest)).rejects.toThrow("Collection 'invalid_collection' is not allowed for cleanup");

      // Test invalid daysOld
      mockRequest.data = { collection: 'emails', daysOld: -1, dryRun: true };
      await expect(manualCleanup(mockRequest)).rejects.toThrow('daysOld must be a number between 1 and 365');

      // Test invalid dryRun
      mockRequest.data = { collection: 'emails', daysOld: 30, dryRun: 'invalid' };
      await expect(manualCleanup(mockRequest)).rejects.toThrow('dryRun must be a boolean');
    });

    it('should handle different collection types correctly', async () => {
      // Test pending_signups collection
      mockRequest.data = { collection: 'pending_signups', daysOld: 7, dryRun: true };
      
      mockSnapshot = {
        docs: [{ ref: { id: 'signup1' } }],
        empty: false,
        size: 1
      };
      
      mockQuery.get.mockResolvedValue(mockSnapshot);

      const result = await manualCleanup(mockRequest);

      // Verify query was built for pending_signups
      expect(mockQuery.where).toHaveBeenCalledWith('expiresAt', '<', expect.any(Number));
      expect(result.wouldDeleteCount).toBe(1);
    });
  });

  describe('databaseHealthCheck', () => {
    let mockRequest: any;

    beforeEach(() => {
      // Mock admin user profile
      const mockUserProfile = {
        exists: true,
        data: () => ({
          groups: { 'system-admin': true }
        })
      };

      const mockUserDoc = {
        exists: true,
        data: () => ({
          role: 'user'
        })
      };

      // Mock Firestore document operations
      const mockDoc = {
        get: vi.fn()
      };

      mockCollection.mockImplementation((collectionName) => {
        if (collectionName === 'userProfiles') {
          return {
            doc: vi.fn(() => mockDoc)
          };
        }
        return mockQuery;
      });

      mockDoc.get.mockImplementation((docPath) => {
        if (docPath.includes('userProfiles')) {
          return Promise.resolve(mockUserProfile);
        }
        return Promise.resolve({ exists: false });
      });

      mockRequest = {
        auth: { uid: 'test-admin-uid' }
      };
    });

    it('should generate comprehensive health report', async () => {
      // Mock count queries
      const mockCountQuery = {
        where: vi.fn().mockReturnThis(),
        count: vi.fn(() => ({
          get: vi.fn(() => Promise.resolve({
            data: () => ({ count: 10 })
          }))
        }))
      };

      mockCollection.mockReturnValue(mockCountQuery);

      const result = await databaseHealthCheck(mockRequest);

      // Verify result structure
      expect(result.success).toBe(true);
      expect(result.healthReport).toHaveProperty('timestamp');
      expect(result.healthReport).toHaveProperty('collections');
      expect(result.healthReport).toHaveProperty('summary');

      // Verify collections were checked
      expect(mockCollection).toHaveBeenCalledWith('emails');
      expect(mockCollection).toHaveBeenCalledWith('pending_signups');
      expect(mockCollection).toHaveBeenCalledWith('pending_password_resets');

      // Verify summary structure
      expect(result.healthReport.summary).toHaveProperty('totalCleanupOpportunity');
      expect(result.healthReport.summary).toHaveProperty('recommendations');
    });

    it('should reject non-admin users', async () => {
      // Mock non-admin user
      const mockNonAdminProfile = {
        exists: true,
        data: () => ({
          groups: {} // No system-admin group
        })
      };

      const mockNonAdminUser = {
        exists: true,
        data: () => ({
          role: 'user' // Not god role
        })
      };

      const mockDoc = {
        get: vi.fn()
      };

      mockCollection.mockImplementation((collectionName) => {
        if (collectionName === 'userProfiles') {
          return {
            doc: vi.fn(() => mockDoc)
          };
        }
        return mockQuery;
      });

      mockDoc.get.mockImplementation((docPath) => {
        if (docPath.includes('userProfiles')) {
          return Promise.resolve(mockNonAdminProfile);
        }
        if (docPath.includes('users')) {
          return Promise.resolve(mockNonAdminUser);
        }
        return Promise.resolve({ exists: false });
      });

      await expect(databaseHealthCheck(mockRequest)).rejects.toThrow('forbidden');
    });
  });

  describe('Integration Tests', () => {
    it('should handle batch processing with large datasets', async () => {
      // Test with 1000 documents to ensure proper batching
      const mockDocs = Array(1000).fill(null).map((_, i) => ({ ref: { id: `doc${i}` } }));
      
      mockSnapshot = {
        docs: mockDocs,
        empty: false,
        size: 1000
      };
      
      mockQuery.get.mockResolvedValue(mockSnapshot);

      const mockEvent = {};
      await cleanupOldEmails(mockEvent);

      // Verify proper batching (1000 docs = 3 batches: 450 + 450 + 100)
      expect(mockBatch.delete).toHaveBeenCalledTimes(1000);
      expect(mockBatch.commit).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent cleanup operations', async () => {
      // Mock multiple collections being cleaned up
      const mockSignupDocs = Array(100).fill(null).map((_, i) => ({ ref: { id: `signup${i}` } }));
      const mockResetDocs = Array(50).fill(null).map((_, i) => ({ ref: { id: `reset${i}` } }));

      const mockSignupQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn(() => Promise.resolve({
          docs: mockSignupDocs,
          empty: false,
          size: 100
        }))
      };

      const mockResetQuery = {
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn(() => Promise.resolve({
          docs: mockResetDocs,
          empty: false,
          size: 50
        }))
      };

      mockCollection.mockImplementation((collectionName) => {
        if (collectionName === 'pending_signups') return mockSignupQuery;
        if (collectionName === 'pending_password_resets') return mockResetQuery;
        return mockQuery;
      });

      const mockEvent = {};
      await cleanupExpiredCodes(mockEvent);

      // Verify both collections were processed
      expect(mockBatch.delete).toHaveBeenCalledTimes(150); // 100 + 50
      expect(mockBatch.commit).toHaveBeenCalledTimes(2); // One per collection
    });
  });

  describe('cleanupOrphanedStorage', () => {
    const mockAuth = { uid: 'admin-uid' };
    const mockAdminProfile = { exists: true, data: () => ({ groups: { 'system-admin': true } }) };
    const mockGodProfile = { exists: true, data: () => ({ role: 'god' }) };

    beforeEach(() => {
      // Default mock for userProfile to be admin
      mockCollection.doc.mockReturnValue({
        get: vi.fn().mockResolvedValue(mockAdminProfile),
      });
    });

    it('should require authentication', async () => {
      const req = { data: { dryRun: true } };
      await expect(cleanupOrphanedStorage(req as any)).rejects.toThrow('unauthenticated');
    });

    it('should require system admin or god role', async () => {
      mockCollection.doc.mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ groups: {} }) }), // Not admin
      });
      const req = { auth: mockAuth, data: { dryRun: true } };
      await expect(cleanupOrphanedStorage(req as any)).rejects.toThrow('permission-denied');
    });

    it('should validate maxFiles parameter', async () => {
      const req = { auth: mockAuth, data: { dryRun: true, maxFiles: 0 } };
      await expect(cleanupOrphanedStorage(req as any)).rejects.toThrow('maxFiles must be a number between 1 and 10000');
      
      const req2 = { auth: mockAuth, data: { dryRun: true, maxFiles: 10001 } };
      await expect(cleanupOrphanedStorage(req as any)).rejects.toThrow('maxFiles must be a number between 1 and 10000');
    });

    it('should validate concurrency parameter', async () => {
      const req = { auth: mockAuth, data: { dryRun: true, concurrency: 0 } };
      await expect(cleanupOrphanedStorage(req as any)).rejects.toThrow('concurrency must be a number between 1 and 50');
      
      const req2 = { auth: mockAuth, data: { dryRun: true, concurrency: 51 } };
      await expect(cleanupOrphanedStorage(req as any)).rejects.toThrow('concurrency must be a number between 1 and 50');
    });

    it('should perform dry run and identify orphaned files', async () => {
      // Mock storage files
      const mockStorageFiles = [
        { name: 'profile_images/user1', metadata: { size: '1024', timeCreated: '2023-01-01' } },
        { name: 'orphaned_file.jpg', metadata: { size: '2048', timeCreated: '2023-01-02' } }
      ];

      // Mock Firestore collections with storage references
      mockCollection.get
        .mockResolvedValueOnce({ empty: false, size: 1, docs: [{ data: () => ({ photoURL: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/profile_images%2Fuser1?alt=media' }) }] }) // userProfiles
        .mockResolvedValueOnce({ empty: true, size: 0, docs: [] }) // shows
        .mockResolvedValueOnce({ empty: true, size: 0, docs: [] }) // props
        .mockResolvedValueOnce({ empty: true, size: 0, docs: [] }) // todo_boards
        .mockResolvedValueOnce({ empty: true, size: 0, docs: [] }); // feedback

      // Mock storage bucket
      const mockBucket = {
        getFiles: vi.fn().mockResolvedValue([mockStorageFiles]),
        name: 'test-bucket'
      };

      // Mock admin.storage().bucket()
      vi.spyOn(admin, 'storage').mockReturnValue({
        bucket: vi.fn().mockReturnValue(mockBucket)
      } as any);

      const req = { auth: mockAuth, data: { dryRun: true, maxFiles: 1000 } };
      const result = await cleanupOrphanedStorage(req as any);

      expect(result.success).toBe(true);
      expect(result.summary.dryRun).toBe(true);
      expect(result.summary.orphanedFilesFound).toBe(1);
      expect(result.orphanedFiles).toHaveLength(1);
      expect(result.orphanedFiles[0].name).toBe('orphaned_file.jpg');
    });

    it('should handle empty storage bucket', async () => {
      // Mock empty storage
      const mockBucket = {
        getFiles: vi.fn().mockResolvedValue([[]]),
        name: 'test-bucket'
      };

      vi.spyOn(admin, 'storage').mockReturnValue({
        bucket: vi.fn().mockReturnValue(mockBucket)
      } as any);

      // Mock empty Firestore collections
      mockCollection.get.mockResolvedValue({ empty: true, size: 0, docs: [] });

      const req = { auth: mockAuth, data: { dryRun: true } };
      const result = await cleanupOrphanedStorage(req as any);

      expect(result.success).toBe(true);
      expect(result.summary.orphanedFilesFound).toBe(0);
      expect(result.orphanedFiles).toHaveLength(0);
    });

    it('should handle storage API errors gracefully', async () => {
      // Mock storage error
      const mockBucket = {
        getFiles: vi.fn().mockRejectedValue(new Error('Storage API error'))
      };

      vi.spyOn(admin, 'storage').mockReturnValue({
        bucket: vi.fn().mockReturnValue(mockBucket)
      } as any);

      const req = { auth: mockAuth, data: { dryRun: true } };
      await expect(cleanupOrphanedStorage(req as any)).rejects.toThrow('Storage cleanup failed');
    });

    it('should respect maxFiles limit', async () => {
      // Mock many storage files
      const mockStorageFiles = Array(1500).fill(null).map((_, i) => ({
        name: `file${i}.jpg`,
        metadata: { size: '1024', timeCreated: '2023-01-01' }
      }));

      const mockBucket = {
        getFiles: vi.fn().mockResolvedValue([mockStorageFiles]),
        name: 'test-bucket'
      };

      vi.spyOn(admin, 'storage').mockReturnValue({
        bucket: vi.fn().mockReturnValue(mockBucket)
      } as any);

      mockCollection.get.mockResolvedValue({ empty: true, size: 0, docs: [] });

      const req = { auth: mockAuth, data: { dryRun: true, maxFiles: 1000 } };
      const result = await cleanupOrphanedStorage(req as any);

      expect(mockBucket.getFiles).toHaveBeenCalledWith({ maxResults: 1000 });
      expect(result.summary.totalFilesScanned).toBe(1000);
    });

    it('should find missing references in Firestore', async () => {
      // Mock storage with no files
      const mockBucket = {
        getFiles: vi.fn().mockResolvedValue([[]]),
        name: 'test-bucket'
      };

      vi.spyOn(admin, 'storage').mockReturnValue({
        bucket: vi.fn().mockReturnValue(mockBucket)
      } as any);

      // Mock Firestore with reference to non-existent file
      mockCollection.get
        .mockResolvedValueOnce({ 
          empty: false, 
          size: 1, 
          docs: [{ 
            data: () => ({ 
              photoURL: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/missing%2Ffile.jpg?alt=media' 
            }) 
          }] 
        }); // userProfiles
      // Mock other collections as empty
      for (let i = 0; i < 4; i++) {
        mockCollection.get.mockResolvedValueOnce({ empty: true, size: 0, docs: [] });
      }

      // Mock file.exists() to return false for missing file
      const mockFile = {
        exists: vi.fn().mockResolvedValue([false])
      };
      (mockBucket as any).file = vi.fn().mockReturnValue(mockFile);

      const req = { auth: mockAuth, data: { dryRun: true } };
      const result = await cleanupOrphanedStorage(req as any);

      expect(result.success).toBe(true);
      expect(result.summary.missingReferencesFound).toBe(1);
      expect(result.missingReferences).toHaveLength(1);
      expect(result.missingReferences[0]).toContain('missing/file.jpg');
    });
  });
});
