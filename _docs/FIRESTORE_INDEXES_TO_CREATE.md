# Required Firestore Indexes for Garbage Collection

The garbage collection system requires the following composite indexes to be created in Firestore. Click the links below to create them automatically:

## 🔗 **Index Creation Links**

### 1. **Emails Collection - Old Processed Emails**
**Purpose**: For `cleanupOldEmails` function
**Fields**: `processed` (Ascending), `processingAt` (Ascending)

**Create Index**: https://console.firebase.google.com/v1/r/project/props-bible-app-1c1cb/firestore/indexes?create_composite=ClRwcm9qZWN0cy9wcm9wcy1iaWJsZS1hcHAtMWMxY2IvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2VtYWlscy9pbmRleGVzL18QARoNCglwcm9jZXNzZWQQARoQCgxwcm9jZXNzaW5nQXQQARoMCghfX25hbWVfXxAB

### 2. **Emails Collection - Failed Emails**
**Purpose**: For `cleanupFailedEmails` function  
**Fields**: `delivery.state` (Ascending), `delivery.failedAt` (Ascending)

**Create Index**: https://console.firebase.google.com/v1/r/project/props-bible-app-1c1cb/firestore/indexes?create_composite=ClRwcm9qZWN0cy9wcm9wcy1iaWJsZS1hcHAtMWMxY2IvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2VtYWlscy9pbmRleGVzL18QARoQCgxkZWxpdmVyeS5zdGF0ZRABGhQKDGRlbGl2ZXJ5LmZhaWxlZEF0EAEaDAoIX19uYW1lX18QAQ

### 3. **Pending Signups Collection - Expired Codes**
**Purpose**: For `cleanupExpiredCodes` function
**Fields**: `expiresAt` (Ascending)

**Create Index**: https://console.firebase.google.com/v1/r/project/props-bible-app-1c1cb/firestore/indexes?create_composite=ClRwcm9qZWN0cy9wcm9wcy1iaWJsZS1hcHAtMWMxY2IvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3BlbmRpbmdfc2lnbnVwcy9pbmRleGVzL18QARoOCgpleHBpcmVzQXQQARoMCghfX25hbWVfXxAB

### 4. **Pending Password Resets Collection - Expired Codes**
**Purpose**: For `cleanupExpiredCodes` function
**Fields**: `expiresAt` (Ascending)

**Create Index**: https://console.firebase.google.com/v1/r/project/props-bible-app-1c1cb/firestore/indexes?create_composite=ClRwcm9qZWN0cy9wcm9wcy1iaWJsZS1hcHAtMWMxY2IvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3BlbmRpbmdfcGFzc3dvcmRfcmVzZXRzL2luZGV4ZXMvXxABGg4KCmV4cGlyZXNBdBABGgwKCF9fbmFtZV9fEAE

### 5. **Notifications Collection - User Notifications**
**Purpose**: For notifications widget to query user notifications
**Fields**: `userId` (Ascending), `createdAt` (Descending)

**Create Index**: Go to [Firebase Console > Firestore > Indexes](https://console.firebase.google.com/project/props-bible-app-1c1cb/firestore/indexes) and create:
- Collection ID: `notifications`
- Fields: `userId` (Ascending), `createdAt` (Descending)
- Query scope: Collection

### 6. **Notifications Collection - Unread Notifications**
**Purpose**: For notifications widget to query unread notifications
**Fields**: `userId` (Ascending), `read` (Ascending), `createdAt` (Descending)

**Create Index**: Go to [Firebase Console > Firestore > Indexes](https://console.firebase.google.com/project/props-bible-app-1c1cb/firestore/indexes) and create:
- Collection ID: `notifications`
- Fields: `userId` (Ascending), `read` (Ascending), `createdAt` (Descending)
- Query scope: Collection

## 📋 **Manual Creation Steps**

If the links don't work, you can create the indexes manually:

1. Go to [Firebase Console > Firestore > Indexes](https://console.firebase.google.com/project/props-bible-app-1c1cb/firestore/indexes)
2. Click "Create Index"
3. For each index, set:
   - **Collection ID**: The collection name (emails, pending_signups, pending_password_resets)
   - **Fields**: Add the fields as specified above
   - **Query scope**: Collection

## ✅ **Verification**

After creating the indexes, you can verify they're working by:

1. **Running the health check**:
   ```bash
   node scripts/database-maintenance.js health-check
   ```

2. **Testing manual cleanup** (dry run):
   ```bash
   node scripts/database-maintenance.js cleanup emails --days=30 --dry-run
   ```

3. **Checking the Firebase Console** for index status (should show "Enabled")

## 🚨 **Important Notes**

- Index creation can take several minutes to complete
- The functions will show "FAILED_PRECONDITION" errors until indexes are created
- Once indexes are created, all cleanup functions will work automatically
- The scheduled functions will start running on their schedules immediately after deployment

## 📊 **Expected Results**

After indexes are created:
- ✅ `cleanupOldEmails` will run daily at 2:00 AM UTC
- ✅ `cleanupExpiredCodes` will run every 6 hours  
- ✅ `cleanupFailedEmails` will run weekly on Sunday at 3:00 AM UTC
- ✅ `manualCleanup` and `databaseHealthCheck` will be available for admin use

