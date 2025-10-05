"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("../index");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
// Mock Firebase Admin
vitest_1.vi.mock('firebase-admin', () => ({
    firestore: vitest_1.vi.fn(() => ({
        collection: vitest_1.vi.fn(),
        batch: vitest_1.vi.fn(() => ({
            delete: vitest_1.vi.fn(),
            commit: vitest_1.vi.fn(() => Promise.resolve())
        })),
        FieldValue: {
            serverTimestamp: vitest_1.vi.fn(() => 'mock-timestamp')
        },
        Timestamp: {
            fromMillis: vitest_1.vi.fn((ms) => ({ seconds: Math.floor(ms / 1000) }))
        }
    }))
}));
// Mock Firebase Functions Logger
vitest_1.vi.mock('firebase-functions/logger', () => ({
    info: vitest_1.vi.fn(),
    error: vitest_1.vi.fn(),
    warn: vitest_1.vi.fn()
}));
(0, vitest_1.describe)('Database Maintenance and Garbage Collection Functions', () => {
    let mockDb;
    let mockBatch;
    let mockCollection;
    let mockQuery;
    let mockSnapshot;
    (0, vitest_1.beforeEach)(() => {
        // Reset all mocks
        vitest_1.vi.clearAllMocks();
        // Mock Firestore batch
        mockBatch = {
            delete: vitest_1.vi.fn(),
            commit: vitest_1.vi.fn(() => Promise.resolve())
        };
        // Mock Firestore query
        mockQuery = {
            where: vitest_1.vi.fn().mockReturnThis(),
            limit: vitest_1.vi.fn().mockReturnThis(),
            get: vitest_1.vi.fn()
        };
        // Mock Firestore collection
        mockCollection = vitest_1.vi.fn(() => mockQuery);
        // Mock Firestore database
        mockDb = {
            collection: mockCollection,
            batch: vitest_1.vi.fn(() => mockBatch)
        };
        // Mock admin.firestore to return our mock
        vitest_1.vi.mocked(admin.firestore).mockReturnValue(mockDb);
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('cleanupOldEmails', () => {
        (0, vitest_1.it)('should clean up old processed emails successfully', async () => {
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
            await (0, index_1.cleanupOldEmails)(mockEvent);
            // Verify query was built correctly
            (0, vitest_1.expect)(mockCollection).toHaveBeenCalledWith('emails');
            (0, vitest_1.expect)(mockQuery.where).toHaveBeenCalledWith('processed', '==', true);
            (0, vitest_1.expect)(mockQuery.where).toHaveBeenCalledWith('processingAt', '<', vitest_1.expect.any(Object));
            (0, vitest_1.expect)(mockQuery.limit).toHaveBeenCalledWith(500);
            // Verify batch operations
            (0, vitest_1.expect)(mockBatch.delete).toHaveBeenCalledTimes(3);
            (0, vitest_1.expect)(mockBatch.commit).toHaveBeenCalledTimes(1);
            // Verify logging
            (0, vitest_1.expect)(logger.info).toHaveBeenCalledWith('Starting email cleanup process', vitest_1.expect.any(Object));
            (0, vitest_1.expect)(logger.info).toHaveBeenCalledWith('Found 3 old emails to delete');
            (0, vitest_1.expect)(logger.info).toHaveBeenCalledWith('Email cleanup completed. Deleted 3 old emails');
        });
        (0, vitest_1.it)('should handle no old emails found', async () => {
            // Mock no emails found
            mockSnapshot = {
                docs: [],
                empty: true,
                size: 0
            };
            mockQuery.get.mockResolvedValue(mockSnapshot);
            const mockEvent = {};
            await (0, index_1.cleanupOldEmails)(mockEvent);
            // Verify no batch operations
            (0, vitest_1.expect)(mockBatch.delete).not.toHaveBeenCalled();
            (0, vitest_1.expect)(mockBatch.commit).not.toHaveBeenCalled();
            // Verify logging
            (0, vitest_1.expect)(logger.info).toHaveBeenCalledWith('No old emails found to clean up');
        });
        (0, vitest_1.it)('should handle large batches correctly', async () => {
            // Mock large number of emails (600 docs)
            const mockDocs = Array(600).fill(null).map((_, i) => ({ ref: { id: `email${i}` } }));
            mockSnapshot = {
                docs: mockDocs,
                empty: false,
                size: 600
            };
            mockQuery.get.mockResolvedValue(mockSnapshot);
            const mockEvent = {};
            await (0, index_1.cleanupOldEmails)(mockEvent);
            // Verify batch processing in chunks
            (0, vitest_1.expect)(mockBatch.delete).toHaveBeenCalledTimes(600);
            (0, vitest_1.expect)(mockBatch.commit).toHaveBeenCalledTimes(2); // 450 + 150
            // Verify logging shows progress
            (0, vitest_1.expect)(logger.info).toHaveBeenCalledWith('Deleted 450 emails so far');
        });
        (0, vitest_1.it)('should handle errors gracefully', async () => {
            const mockError = new Error('Firestore error');
            mockQuery.get.mockRejectedValue(mockError);
            const mockEvent = {};
            await (0, vitest_1.expect)((0, index_1.cleanupOldEmails)(mockEvent)).rejects.toThrow('Firestore error');
            (0, vitest_1.expect)(logger.error).toHaveBeenCalledWith('Error during email cleanup:', mockError);
        });
    });
    (0, vitest_1.describe)('cleanupExpiredCodes', () => {
        (0, vitest_1.it)('should clean up expired signup codes', async () => {
            const mockSignupDocs = [
                { ref: { id: 'signup1' } },
                { ref: { id: 'signup2' } }
            ];
            const mockResetDocs = [
                { ref: { id: 'reset1' } }
            ];
            // Mock signup codes query
            const mockSignupQuery = {
                where: vitest_1.vi.fn().mockReturnThis(),
                limit: vitest_1.vi.fn().mockReturnThis(),
                get: vitest_1.vi.fn(() => Promise.resolve({
                    docs: mockSignupDocs,
                    empty: false,
                    size: 2
                }))
            };
            // Mock reset codes query
            const mockResetQuery = {
                where: vitest_1.vi.fn().mockReturnThis(),
                limit: vitest_1.vi.fn().mockReturnThis(),
                get: vitest_1.vi.fn(() => Promise.resolve({
                    docs: mockResetDocs,
                    empty: false,
                    size: 1
                }))
            };
            // Mock collection to return different queries
            mockCollection.mockImplementation((collectionName) => {
                if (collectionName === 'pending_signups')
                    return mockSignupQuery;
                if (collectionName === 'pending_password_resets')
                    return mockResetQuery;
                return mockQuery;
            });
            const mockEvent = {};
            await (0, index_1.cleanupExpiredCodes)(mockEvent);
            // Verify both collections were queried
            (0, vitest_1.expect)(mockCollection).toHaveBeenCalledWith('pending_signups');
            (0, vitest_1.expect)(mockCollection).toHaveBeenCalledWith('pending_password_resets');
            // Verify batch operations
            (0, vitest_1.expect)(mockBatch.delete).toHaveBeenCalledTimes(3); // 2 signup + 1 reset
            (0, vitest_1.expect)(mockBatch.commit).toHaveBeenCalledTimes(2); // One commit per collection
            // Verify logging
            (0, vitest_1.expect)(logger.info).toHaveBeenCalledWith('Starting expired codes cleanup process');
            (0, vitest_1.expect)(logger.info).toHaveBeenCalledWith('Deleted 2 expired signup codes');
            (0, vitest_1.expect)(logger.info).toHaveBeenCalledWith('Deleted 1 expired password reset codes');
            (0, vitest_1.expect)(logger.info).toHaveBeenCalledWith('Expired codes cleanup completed');
        });
        (0, vitest_1.it)('should handle no expired codes found', async () => {
            // Mock no expired codes
            const mockEmptyQuery = {
                where: vitest_1.vi.fn().mockReturnThis(),
                limit: vitest_1.vi.fn().mockReturnThis(),
                get: vitest_1.vi.fn(() => Promise.resolve({
                    docs: [],
                    empty: true,
                    size: 0
                }))
            };
            mockCollection.mockReturnValue(mockEmptyQuery);
            const mockEvent = {};
            await (0, index_1.cleanupExpiredCodes)(mockEvent);
            // Verify no batch operations
            (0, vitest_1.expect)(mockBatch.delete).not.toHaveBeenCalled();
            (0, vitest_1.expect)(mockBatch.commit).not.toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('cleanupFailedEmails', () => {
        (0, vitest_1.it)('should clean up old failed emails', async () => {
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
            await (0, index_1.cleanupFailedEmails)(mockEvent);
            // Verify query was built correctly
            (0, vitest_1.expect)(mockCollection).toHaveBeenCalledWith('emails');
            (0, vitest_1.expect)(mockQuery.where).toHaveBeenCalledWith('delivery.state', '==', 'failed');
            (0, vitest_1.expect)(mockQuery.where).toHaveBeenCalledWith('delivery.failedAt', '<', vitest_1.expect.any(Object));
            // Verify batch operations
            (0, vitest_1.expect)(mockBatch.delete).toHaveBeenCalledTimes(2);
            (0, vitest_1.expect)(mockBatch.commit).toHaveBeenCalledTimes(1);
            // Verify logging
            (0, vitest_1.expect)(logger.info).toHaveBeenCalledWith('Starting failed emails cleanup process', vitest_1.expect.any(Object));
            (0, vitest_1.expect)(logger.info).toHaveBeenCalledWith('Found 2 old failed emails to delete');
            (0, vitest_1.expect)(logger.info).toHaveBeenCalledWith('Failed emails cleanup completed. Deleted 2 old failed emails');
        });
    });
    (0, vitest_1.describe)('manualCleanup', () => {
        let mockRequest;
        (0, vitest_1.beforeEach)(() => {
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
                get: vitest_1.vi.fn()
            };
            mockCollection.mockImplementation((collectionName) => {
                if (collectionName === 'userProfiles') {
                    return {
                        doc: vitest_1.vi.fn(() => mockDoc)
                    };
                }
                if (collectionName === 'users') {
                    return {
                        doc: vitest_1.vi.fn(() => mockDoc)
                    };
                }
                return mockQuery;
            });
            mockDoc.get.mockImplementation((docPath) => {
                if (docPath.includes('userProfiles')) {
                    return Promise.resolve(mockUserProfile);
                }
                if (docPath.includes('users')) {
                    return Promise.resolve(mockUserDoc);
                }
                return Promise.resolve({ exists: false });
            });
            mockRequest = {
                auth: { uid: 'test-admin-uid' },
                data: { collection: 'emails', daysOld: 30, dryRun: true }
            };
        });
        (0, vitest_1.it)('should perform dry run cleanup successfully', async () => {
            mockSnapshot = {
                docs: [
                    { ref: { id: 'doc1' } },
                    { ref: { id: 'doc2' } }
                ],
                empty: false,
                size: 2
            };
            mockQuery.get.mockResolvedValue(mockSnapshot);
            const result = await (0, index_1.manualCleanup)(mockRequest);
            // Verify result
            (0, vitest_1.expect)(result).toEqual({
                success: true,
                message: 'Dry run: Would delete 2 documents from emails',
                wouldDeleteCount: 2,
                dryRun: true
            });
            // Verify no actual deletion in dry run
            (0, vitest_1.expect)(mockBatch.delete).not.toHaveBeenCalled();
            (0, vitest_1.expect)(mockBatch.commit).not.toHaveBeenCalled();
        });
        (0, vitest_1.it)('should perform actual cleanup when dryRun is false', async () => {
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
            const result = await (0, index_1.manualCleanup)(mockRequest);
            // Verify result
            (0, vitest_1.expect)(result).toEqual({
                success: true,
                message: 'Successfully deleted 2 documents from emails',
                deletedCount: 2,
                dryRun: false
            });
            // Verify actual deletion
            (0, vitest_1.expect)(mockBatch.delete).toHaveBeenCalledTimes(2);
            (0, vitest_1.expect)(mockBatch.commit).toHaveBeenCalledTimes(1);
        });
        (0, vitest_1.it)('should reject unauthenticated requests', async () => {
            mockRequest.auth = null;
            await (0, vitest_1.expect)((0, index_1.manualCleanup)(mockRequest)).rejects.toThrow('unauthenticated');
        });
        (0, vitest_1.it)('should reject non-admin users', async () => {
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
                get: vitest_1.vi.fn()
            };
            mockCollection.mockImplementation((collectionName) => {
                if (collectionName === 'userProfiles') {
                    return {
                        doc: vitest_1.vi.fn(() => mockDoc)
                    };
                }
                if (collectionName === 'users') {
                    return {
                        doc: vitest_1.vi.fn(() => mockDoc)
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
            await (0, vitest_1.expect)((0, index_1.manualCleanup)(mockRequest)).rejects.toThrow('forbidden');
        });
        (0, vitest_1.it)('should validate input parameters', async () => {
            // Test missing collection
            mockRequest.data = { daysOld: 30, dryRun: true };
            await (0, vitest_1.expect)((0, index_1.manualCleanup)(mockRequest)).rejects.toThrow('Collection name is required and must be a string');
            // Test invalid collection
            mockRequest.data = { collection: 'invalid_collection', daysOld: 30, dryRun: true };
            await (0, vitest_1.expect)((0, index_1.manualCleanup)(mockRequest)).rejects.toThrow("Collection 'invalid_collection' is not allowed for cleanup");
            // Test invalid daysOld
            mockRequest.data = { collection: 'emails', daysOld: -1, dryRun: true };
            await (0, vitest_1.expect)((0, index_1.manualCleanup)(mockRequest)).rejects.toThrow('daysOld must be a number between 1 and 365');
            // Test invalid dryRun
            mockRequest.data = { collection: 'emails', daysOld: 30, dryRun: 'invalid' };
            await (0, vitest_1.expect)((0, index_1.manualCleanup)(mockRequest)).rejects.toThrow('dryRun must be a boolean');
        });
        (0, vitest_1.it)('should handle different collection types correctly', async () => {
            // Test pending_signups collection
            mockRequest.data = { collection: 'pending_signups', daysOld: 7, dryRun: true };
            mockSnapshot = {
                docs: [{ ref: { id: 'signup1' } }],
                empty: false,
                size: 1
            };
            mockQuery.get.mockResolvedValue(mockSnapshot);
            const result = await (0, index_1.manualCleanup)(mockRequest);
            // Verify query was built for pending_signups
            (0, vitest_1.expect)(mockQuery.where).toHaveBeenCalledWith('expiresAt', '<', vitest_1.expect.any(Number));
            (0, vitest_1.expect)(result.wouldDeleteCount).toBe(1);
        });
    });
    (0, vitest_1.describe)('databaseHealthCheck', () => {
        let mockRequest;
        (0, vitest_1.beforeEach)(() => {
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
                get: vitest_1.vi.fn()
            };
            mockCollection.mockImplementation((collectionName) => {
                if (collectionName === 'userProfiles') {
                    return {
                        doc: vitest_1.vi.fn(() => mockDoc)
                    };
                }
                if (collectionName === 'users') {
                    return {
                        doc: vitest_1.vi.fn(() => mockDoc)
                    };
                }
                return mockQuery;
            });
            mockDoc.get.mockImplementation((docPath) => {
                if (docPath.includes('userProfiles')) {
                    return Promise.resolve(mockUserProfile);
                }
                if (docPath.includes('users')) {
                    return Promise.resolve(mockUserDoc);
                }
                return Promise.resolve({ exists: false });
            });
            mockRequest = {
                auth: { uid: 'test-admin-uid' }
            };
        });
        (0, vitest_1.it)('should generate comprehensive health report', async () => {
            // Mock count queries
            const mockCountQuery = {
                where: vitest_1.vi.fn().mockReturnThis(),
                count: vitest_1.vi.fn(() => ({
                    get: vitest_1.vi.fn(() => Promise.resolve({
                        data: () => ({ count: 10 })
                    }))
                }))
            };
            mockCollection.mockReturnValue(mockCountQuery);
            const result = await (0, index_1.databaseHealthCheck)(mockRequest);
            // Verify result structure
            (0, vitest_1.expect)(result.success).toBe(true);
            (0, vitest_1.expect)(result.healthReport).toHaveProperty('timestamp');
            (0, vitest_1.expect)(result.healthReport).toHaveProperty('collections');
            (0, vitest_1.expect)(result.healthReport).toHaveProperty('summary');
            // Verify collections were checked
            (0, vitest_1.expect)(mockCollection).toHaveBeenCalledWith('emails');
            (0, vitest_1.expect)(mockCollection).toHaveBeenCalledWith('pending_signups');
            (0, vitest_1.expect)(mockCollection).toHaveBeenCalledWith('pending_password_resets');
            // Verify summary structure
            (0, vitest_1.expect)(result.healthReport.summary).toHaveProperty('totalCleanupOpportunity');
            (0, vitest_1.expect)(result.healthReport.summary).toHaveProperty('recommendations');
        });
        (0, vitest_1.it)('should reject non-admin users', async () => {
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
                get: vitest_1.vi.fn()
            };
            mockCollection.mockImplementation((collectionName) => {
                if (collectionName === 'userProfiles') {
                    return {
                        doc: vitest_1.vi.fn(() => mockDoc)
                    };
                }
                if (collectionName === 'users') {
                    return {
                        doc: vitest_1.vi.fn(() => mockDoc)
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
            await (0, vitest_1.expect)((0, index_1.databaseHealthCheck)(mockRequest)).rejects.toThrow('forbidden');
        });
    });
    (0, vitest_1.describe)('Integration Tests', () => {
        (0, vitest_1.it)('should handle batch processing with large datasets', async () => {
            // Test with 1000 documents to ensure proper batching
            const mockDocs = Array(1000).fill(null).map((_, i) => ({ ref: { id: `doc${i}` } }));
            mockSnapshot = {
                docs: mockDocs,
                empty: false,
                size: 1000
            };
            mockQuery.get.mockResolvedValue(mockSnapshot);
            const mockEvent = {};
            await (0, index_1.cleanupOldEmails)(mockEvent);
            // Verify proper batching (1000 docs = 3 batches: 450 + 450 + 100)
            (0, vitest_1.expect)(mockBatch.delete).toHaveBeenCalledTimes(1000);
            (0, vitest_1.expect)(mockBatch.commit).toHaveBeenCalledTimes(3);
        });
        (0, vitest_1.it)('should handle concurrent cleanup operations', async () => {
            // Mock multiple collections being cleaned up
            const mockSignupDocs = Array(100).fill(null).map((_, i) => ({ ref: { id: `signup${i}` } }));
            const mockResetDocs = Array(50).fill(null).map((_, i) => ({ ref: { id: `reset${i}` } }));
            const mockSignupQuery = {
                where: vitest_1.vi.fn().mockReturnThis(),
                limit: vitest_1.vi.fn().mockReturnThis(),
                get: vitest_1.vi.fn(() => Promise.resolve({
                    docs: mockSignupDocs,
                    empty: false,
                    size: 100
                }))
            };
            const mockResetQuery = {
                where: vitest_1.vi.fn().mockReturnThis(),
                limit: vitest_1.vi.fn().mockReturnThis(),
                get: vitest_1.vi.fn(() => Promise.resolve({
                    docs: mockResetDocs,
                    empty: false,
                    size: 50
                }))
            };
            mockCollection.mockImplementation((collectionName) => {
                if (collectionName === 'pending_signups')
                    return mockSignupQuery;
                if (collectionName === 'pending_password_resets')
                    return mockResetQuery;
                return mockQuery;
            });
            const mockEvent = {};
            await (0, index_1.cleanupExpiredCodes)(mockEvent);
            // Verify both collections were processed
            (0, vitest_1.expect)(mockBatch.delete).toHaveBeenCalledTimes(150); // 100 + 50
            (0, vitest_1.expect)(mockBatch.commit).toHaveBeenCalledTimes(2); // One per collection
        });
    });
});
