# Mobile Firebase Services

This directory contains the mobile-specific implementations of Firebase services, optimized for React Native and Expo.

## MobileFirebaseService

The `MobileFirebaseService` class provides a mobile-optimized implementation of Firebase services, including authentication, Firestore, storage, and offline capabilities.

### Features

- Automatic offline persistence
- Type-safe document and collection operations
- Batch and transaction support
- Real-time listeners for documents and collections
- Storage operations with proper reference handling

### Usage

```typescript
import { MobileFirebaseService } from './MobileFirebaseService';

// Initialize the service
const firebaseConfig = {
  apiKey: 'your-api-key',
  // ... other config options
};

const service = new MobileFirebaseService(app);
await service.initialize(firebaseConfig);

// Listen to document changes
const unsubscribe = service.listenToDocument<UserData>(
  'users/123',
  (data) => {
    if (data) {
      console.log('User data:', data);
    }
  }
);

// Listen to collection changes with filters
service.listenToCollection<TaskData>(
  'tasks',
  (tasks) => {
    console.log('Tasks:', tasks);
  },
  {
    where: [['userId', '==', 'user123']],
    orderBy: [['createdAt', 'desc']],
    limit: 10
  }
);

// Run a transaction
await service.runTransaction(async (transaction) => {
  // Transaction operations
});

// Use batch operations
const batch = service.batch();
// Batch operations
await batch.commit();
```

### Error Handling

The service includes comprehensive error handling:
- Firebase-specific errors are preserved
- Network errors are properly handled
- Type-safe error propagation

## MobileOfflineSync

The `MobileOfflineSync` class provides offline capabilities for the mobile app, managing data synchronization and operation queueing.

### Features

- Automatic network state monitoring
- Operation queueing
- Persistent storage of pending operations
- Automatic retry mechanism
- Status tracking and reporting

### Usage

```typescript
import { MobileOfflineSync } from './MobileOfflineSync';

const offlineSync = new MobileOfflineSync();

// Enable sync
await offlineSync.enableSync();

// Queue an operation
await offlineSync.queueOperation({
  id: 'op123',
  type: 'set',
  path: 'users/123',
  data: { name: 'John' },
  execute: async () => {
    // Operation implementation
  }
});

// Check sync status
const status = await offlineSync.getSyncStatus();
console.log('Sync enabled:', status.isEnabled);
console.log('Online:', status.isOnline);
console.log('Pending operations:', status.pendingOperations);

// Check queue status
const queueStatus = await offlineSync.getQueueStatus();
console.log('Pending:', queueStatus.pending);
console.log('Processing:', queueStatus.processing);
console.log('Last processed:', queueStatus.lastProcessed);
```

### Storage Operations

The offline sync service provides low-level storage operations:

```typescript
// Store data
await offlineSync.setItem('key', value);

// Retrieve data
const value = await offlineSync.getItem('key');

// Remove data
await offlineSync.removeItem('key');

// Clear all data
await offlineSync.clear();
```

## Testing

Both services include comprehensive test coverage. Run tests using:

```bash
npm test
```

The test files can be found in the `__tests__` directory:
- `MobileFirebaseService.test.ts`
- `MobileOfflineSync.test.ts`

## Error Handling Strategy

1. **Network Errors**
   - Automatically queue operations when offline
   - Retry failed operations when back online
   - Preserve operation order

2. **Firebase Errors**
   - Preserve original Firebase error types
   - Add context when needed
   - Proper error propagation

3. **Storage Errors**
   - Handle AsyncStorage failures
   - Provide fallback mechanisms
   - Clear error messages

## Best Practices

1. **Document Operations**
   - Always use type parameters for better type safety
   - Unsubscribe from listeners when no longer needed
   - Handle null cases in callbacks

2. **Collection Operations**
   - Use appropriate filters to minimize data transfer
   - Consider pagination for large collections
   - Handle empty results appropriately

3. **Offline Operations**
   - Enable sync as early as possible
   - Monitor queue status for pending operations
   - Handle conflicts appropriately

4. **Error Handling**
   - Always catch and handle errors appropriately
   - Provide meaningful error messages
   - Consider retry strategies for transient failures 