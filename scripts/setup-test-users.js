#!/usr/bin/env node

/**
 * Setup Test Users Script
 * 
 * This script:
 * 1. Wipes all users except the god user and their associated data
 * 2. Creates test users with different subscription levels
 * 3. Logs all user details and login credentials
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'props-bible-app-1c1cb-firebase-adminsdk-fbsvc-d3f949ec39.json'));

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'props-bible-app-1c1cb'
});

const db = getFirestore();
const auth = getAuth();
const storage = getStorage();

// Test user configuration
const TEST_PASSWORD = 'TestUser123!'; // Meets password policy requirements
const TEST_USERS = [
  {
    email: 'organicwebnet+freeuser@gmail.com',
    displayName: 'Free Test User',
    plan: 'free',
    subscriptionStatus: 'active',
    role: 'user'
  },
  {
    email: 'organicwebnet+starteruser@gmail.com',
    displayName: 'Starter Test User',
    plan: 'starter',
    subscriptionStatus: 'active',
    role: 'user'
  },
  {
    email: 'organicwebnet+standarduser@gmail.com',
    displayName: 'Standard Test User',
    plan: 'standard',
    subscriptionStatus: 'active',
    role: 'user'
  },
  {
    email: 'organicwebnet+prouser@gmail.com',
    displayName: 'Pro Test User',
    plan: 'pro',
    subscriptionStatus: 'active',
    role: 'user'
  },
  {
    email: 'organicwebnet+addons@gmail.com',
    displayName: 'Addons Test User',
    plan: 'standard',
    subscriptionStatus: 'active',
    role: 'user',
    addons: true
  }
];

async function getGodUserId() {
  console.log('🔍 Finding god user...');
  
  const userProfilesSnapshot = await db.collection('userProfiles').get();
  
  for (const doc of userProfilesSnapshot.docs) {
    const data = doc.data();
    if (data.role && data.role.toLowerCase() === 'god') {
      console.log(`✅ God user found: ${data.email} (${doc.id})`);
      return doc.id;
    }
  }
  
  throw new Error('❌ God user not found!');
}

// Helper function to delete files in parallel with retry logic
async function deleteFileWithRetry(file, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await file.delete();
      return true;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Helper function to delete files in parallel with concurrency control
async function deleteFilesInParallel(files, concurrency = 10) {
  const results = { deleted: 0, failed: 0, errors: [] };
  
  // Process files in chunks to control concurrency
  for (let i = 0; i < files.length; i += concurrency) {
    const chunk = files.slice(i, i + concurrency);
    
    const promises = chunk.map(async (file) => {
      try {
        await deleteFileWithRetry(file);
        results.deleted++;
        return { success: true, name: file.name };
      } catch (error) {
        results.failed++;
        const errorMsg = `Failed to delete ${file.name}: ${error.message}`;
        results.errors.push(errorMsg);
        return { success: false, name: file.name, error: errorMsg };
      }
    });
    
    const chunkResults = await Promise.all(promises);
    
    // Log successful deletions
    chunkResults
      .filter(result => result.success)
      .forEach(result => console.log(`   ✅ Deleted storage file: ${result.name}`));
    
    // Log failed deletions
    chunkResults
      .filter(result => !result.success)
      .forEach(result => console.log(`   ⚠️  ${result.error}`));
  }
  
  return results;
}

async function cleanupUserStorageFiles(userIdsToDelete) {
  console.log('\n🗂️  Cleaning up Firebase Storage files...');
  
  if (userIdsToDelete.length === 0) {
    console.log('   ℹ️  No users to clean up storage for');
    return;
  }
  
  try {
    const bucket = storage.bucket();
    const allFilesToDelete = [];
    
    // Collect all files to delete
    for (const userId of userIdsToDelete) {
      // Clean up profile images (both casing variations)
      const profileImagePaths = [
        `profile_images/${userId}`,
        `profileImages/${userId}`
      ];
      
      for (const imagePath of profileImagePaths) {
        try {
          const file = bucket.file(imagePath);
          const [exists] = await file.exists();
          
          if (exists) {
            allFilesToDelete.push(file);
          }
        } catch (error) {
          console.log(`   ⚠️  Could not check ${imagePath}: ${error.message}`);
        }
      }
      
      // Clean up any other user-specific storage files
      try {
        const [files] = await bucket.getFiles({
          prefix: `users/${userId}/`,
          maxResults: 1000
        });
        
        allFilesToDelete.push(...files);
      } catch (error) {
        // This is expected if the prefix doesn't exist
        console.log(`   ℹ️  No user-specific storage files found for ${userId}`);
      }
    }
    
    console.log(`   📋 Found ${allFilesToDelete.length} storage files to delete`);
    
    if (allFilesToDelete.length === 0) {
      console.log('   ℹ️  No storage files found to delete');
      return;
    }
    
    // Delete files in parallel
    const results = await deleteFilesInParallel(allFilesToDelete, 10);
    
    console.log(`📊 Storage cleanup results:`);
    console.log(`   ✅ Successfully deleted: ${results.deleted} files`);
    console.log(`   ❌ Failed to delete: ${results.failed} files`);
    
    if (results.errors.length > 0) {
      console.log(`   ⚠️  Errors encountered:`);
      results.errors.forEach(error => console.log(`      - ${error}`));
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up storage files:', error.message);
    throw error;
  }
}

async function wipeAllDataExceptGod(godUserId) {
  console.log('\n🧹 Wiping all data except god user...');
  
  try {
    // Get all collections that might contain user data
    const collections = [
      'userProfiles',
      'shows',
      'props',
      'todo_boards',
      'invitations',
      'feedback',
      'emails',
      'tasks',
      'packingBoxes',
      'packLists',
      'packs',
      'locations',
      'labels',
      'shopping_items',
      'requests',
      'requests_private',
      'pending_signups',
      'pending_password_resets'
    ];
    
    let totalDeleted = 0;
    const userIdsToDelete = new Set();
    
    // First pass: collect user IDs that will be deleted
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Skip if this is god user data
        if (doc.id === godUserId || data.uid === godUserId || data.ownerId === godUserId) {
          continue;
        }
        
        // Collect user IDs for storage cleanup
        if (doc.id === collectionName || data.uid) {
          userIdsToDelete.add(doc.id);
        }
        if (data.uid && data.uid !== godUserId) {
          userIdsToDelete.add(data.uid);
        }
        if (data.ownerId && data.ownerId !== godUserId) {
          userIdsToDelete.add(data.ownerId);
        }
      }
    }
    
    // Clean up Firebase Storage files for users that will be deleted
    if (userIdsToDelete.size > 0) {
      await cleanupUserStorageFiles(Array.from(userIdsToDelete));
    }
    
    // Second pass: delete Firestore documents
    for (const collectionName of collections) {
      console.log(`   - Processing ${collectionName} collection...`);
      
      const snapshot = await db.collection(collectionName).get();
      
      if (snapshot.empty) {
        console.log(`     ✅ ${collectionName} is already empty`);
        continue;
      }
      
      let deletedInCollection = 0;
      const batchSize = 500;
      
      // Delete in batches
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = db.batch();
        const batchDocs = snapshot.docs.slice(i, i + batchSize);
        
        for (const doc of batchDocs) {
          const data = doc.data();
          
          // Skip if this is god user data
          if (doc.id === godUserId || data.uid === godUserId || data.ownerId === godUserId) {
            console.log(`     ⏭️  Preserving god user data: ${doc.id}`);
            continue;
          }
          
          batch.delete(doc.ref);
          deletedInCollection++;
        }
        
        if (deletedInCollection > 0) {
          await batch.commit();
        }
      }
      
      console.log(`     ✅ Deleted ${deletedInCollection} documents from ${collectionName}`);
      totalDeleted += deletedInCollection;
    }
    
    console.log(`\n📊 Total documents deleted: ${totalDeleted}`);
    
    // Also clean up Firebase Auth users (except god user)
    console.log('\n🔐 Cleaning up Firebase Auth users...');
    
    const listUsersResult = await auth.listUsers();
    let authUsersDeleted = 0;
    const authUserIdsToDelete = [];
    
    for (const userRecord of listUsersResult.users) {
      if (userRecord.uid === godUserId) {
        console.log(`   ⏭️  Preserving god user in Auth: ${userRecord.email}`);
        continue;
      }
      
      authUserIdsToDelete.push(userRecord.uid);
    }
    
    // Clean up storage files for auth users that will be deleted
    if (authUserIdsToDelete.length > 0) {
      await cleanupUserStorageFiles(authUserIdsToDelete);
    }
    
    // Now delete the auth users
    for (const userRecord of listUsersResult.users) {
      if (userRecord.uid === godUserId) {
        continue;
      }
      
      await auth.deleteUser(userRecord.uid);
      authUsersDeleted++;
      console.log(`   ✅ Deleted auth user: ${userRecord.email}`);
    }
    
    console.log(`📊 Total auth users deleted: ${authUsersDeleted}`);
    
  } catch (error) {
    console.error('❌ Error wiping data:', error.message);
    throw error;
  }
}

async function createTestUser(userConfig) {
  console.log(`\n👤 Creating test user: ${userConfig.email}`);
  
  try {
    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email: userConfig.email,
      password: TEST_PASSWORD,
      displayName: userConfig.displayName,
      emailVerified: true
    });
    
    console.log(`   ✅ Auth user created: ${userRecord.uid}`);
    
    // Create user profile in Firestore
    const userProfileData = {
      uid: userRecord.uid,
      email: userConfig.email,
      displayName: userConfig.displayName,
      role: userConfig.role,
      plan: userConfig.plan,
      subscriptionStatus: userConfig.subscriptionStatus,
      groups: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null,
      themePreference: 'light',
      notifications: true,
      defaultView: 'grid',
      organizations: [],
      onboardingCompleted: false,
      lastStripeEventTs: Date.now(),
      savedSenderAddresses: [],
      savedDeliveryAddresses: []
    };
    
    // Add addons flag if specified
    if (userConfig.addons) {
      userProfileData.addons = true;
    }
    
    await db.collection('userProfiles').doc(userRecord.uid).set(userProfileData);
    
    console.log(`   ✅ User profile created in Firestore`);
    
    return {
      uid: userRecord.uid,
      email: userConfig.email,
      displayName: userConfig.displayName,
      plan: userConfig.plan,
      subscriptionStatus: userConfig.subscriptionStatus,
      addons: userConfig.addons || false
    };
    
  } catch (error) {
    console.error(`   ❌ Error creating user ${userConfig.email}:`, error.message);
    throw error;
  }
}

async function createTestUsers() {
  console.log('\n🚀 Creating test users...');
  
  const createdUsers = [];
  
  for (const userConfig of TEST_USERS) {
    try {
      const user = await createTestUser(userConfig);
      createdUsers.push(user);
    } catch (error) {
      console.error(`Failed to create user ${userConfig.email}:`, error.message);
      // Continue with other users
    }
  }
  
  return createdUsers;
}

async function generateTestUsersDocument(createdUsers) {
  console.log('\n📝 Generating test users documentation...');
  
  const content = `# Test Users Documentation

This document contains the login credentials and details for all test users created for testing the subscription model.

## Login Credentials

**Password for all users:** \`${TEST_PASSWORD}\`

## Test Users

${createdUsers.map((user, index) => `
### ${index + 1}. ${user.displayName}

- **Email:** \`${user.email}\`
- **Password:** \`${TEST_PASSWORD}\`
- **Plan:** \`${user.plan}\`
- **Subscription Status:** \`${user.subscriptionStatus}\`
- **User ID:** \`${user.uid}\`
- **Addons Enabled:** ${user.addons ? 'Yes' : 'No'}

**Purpose:** Testing ${user.plan} subscription level${user.addons ? ' with addons' : ''}
`).join('')}

## God User (Preserved)

- **Email:** \`organicwebnet@gmail.com\`
- **Role:** \`god\`
- **Purpose:** Admin access and system management

## Testing Scenarios

### 1. Free User Testing
- Test free plan limitations
- Verify upgrade prompts
- Test basic functionality

### 2. Starter User Testing
- Test starter plan features
- Verify plan-specific functionality
- Test upgrade/downgrade flows

### 3. Standard User Testing
- Test standard plan features
- Verify advanced functionality
- Test addon integration

### 4. Pro User Testing
- Test pro plan features
- Verify premium functionality
- Test all advanced features

### 5. Addons Testing
- Test addon functionality
- Verify addon-specific features
- Test addon purchase flows

## Database State

- **Total Users:** ${createdUsers.length + 1} (including god user)
- **Collections Cleaned:** All user data wiped except god user
- **Test Data:** Fresh test users with proper subscription levels

## Notes

- All test users have verified email addresses
- All users are created with active subscription status
- God user data and permissions are preserved
- Database is clean and ready for testing

---
*Generated on: ${new Date().toISOString()}*
`;

  const filePath = path.join(__dirname, '..', 'testusers.md');
  fs.writeFileSync(filePath, content);
  
  console.log(`✅ Test users documentation created: ${filePath}`);
}

async function verifySetup() {
  console.log('\n🔍 Verifying setup...');
  
  try {
    // Check userProfiles collection
    const userProfilesSnapshot = await db.collection('userProfiles').get();
    console.log(`   - UserProfiles collection: ${userProfilesSnapshot.size} users`);
    
    // Check Firebase Auth users
    const listUsersResult = await auth.listUsers();
    console.log(`   - Firebase Auth users: ${listUsersResult.users.length} users`);
    
    // Verify god user is still there
    let godUserFound = false;
    for (const doc of userProfilesSnapshot.docs) {
      const data = doc.data();
      if (data.role && data.role.toLowerCase() === 'god') {
        godUserFound = true;
        console.log(`   ✅ God user preserved: ${data.email}`);
        break;
      }
    }
    
    if (!godUserFound) {
      throw new Error('❌ God user not found after setup!');
    }
    
    // Count test users
    const testUsers = userProfilesSnapshot.docs.filter(doc => {
      const data = doc.data();
      return data.email && data.email.includes('+');
    });
    
    console.log(`   ✅ Test users created: ${testUsers.length}`);
    
    console.log('\n🎉 Setup verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Setting up Test Users');
  console.log('========================\n');
  
  try {
    // Step 1: Find god user
    const godUserId = await getGodUserId();
    
    // Step 2: Wipe all data except god user
    await wipeAllDataExceptGod(godUserId);
    
    // Step 3: Create test users
    const createdUsers = await createTestUsers();
    
    // Step 4: Generate documentation
    await generateTestUsersDocument(createdUsers);
    
    // Step 5: Verify setup
    await verifySetup();
    
    console.log('\n🎉 Test users setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   ✅ Database cleaned (except god user)`);
    console.log(`   ✅ ${createdUsers.length} test users created`);
    console.log(`   ✅ Test users documentation generated`);
    console.log(`   ✅ All users ready for testing`);
    
    console.log('\n📖 Check testusers.md for login credentials and user details');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
main().catch(console.error);
