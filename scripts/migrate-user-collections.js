#!/usr/bin/env node

/**
 * User Collections Migration Script
 * 
 * This script migrates data from the 'users' collection to the 'userProfiles' collection,
 * merging the data and resolving conflicts. After migration, all code should use only
 * the 'userProfiles' collection.
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '..', 'props-bible-app-1c1cb-firebase-adminsdk-fbsvc-d3f949ec39.json'));

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'props-bible-app-1c1cb'
});

const db = getFirestore();

function mergeUserData(usersData, userProfilesData, userId) {
  // Helper function to remove undefined values
  const removeUndefined = (obj) => {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  };
  
  // Merge data with userProfiles taking precedence for conflicts
  const mergedData = {
    // Core identity
    uid: usersData.uid || userId,
    email: userProfilesData.email || usersData.email || `user-${userId}@example.com`,
    displayName: usersData.displayName,
    ...(usersData.photoURL && { photoURL: usersData.photoURL }),
    
    // Basic profile
    role: userProfilesData.role || usersData.role,
    ...(userProfilesData.jobTitle && { jobTitle: userProfilesData.jobTitle }),
    createdAt: usersData.createdAt,
    updatedAt: new Date(),
    lastLogin: usersData.lastLogin,
    
    // Preferences (resolve conflicts - userProfiles takes precedence)
    themePreference: userProfilesData.themePreference || usersData.preferences?.theme || 'light',
    ...(userProfilesData.fontPreference && { fontPreference: userProfilesData.fontPreference }),
    notifications: usersData.preferences?.notifications ?? true,
    defaultView: usersData.preferences?.defaultView || 'grid',
    
    // Organizations & Groups
    organizations: usersData.organizations || [],
    groups: userProfilesData.groups || {},
    
    // Subscription & Billing
    plan: userProfilesData.plan || 'free',
    subscriptionStatus: userProfilesData.subscriptionStatus || 'inactive',
    lastStripeEventTs: userProfilesData.lastStripeEventTs || Date.now(),
    
    // Permissions
    ...(userProfilesData.permissions && { permissions: userProfilesData.permissions }),
    
    // Onboarding
    onboardingCompleted: usersData.onboardingCompleted || false,
    
    // Addresses
    savedSenderAddresses: userProfilesData.savedSenderAddresses || [],
    savedDeliveryAddresses: userProfilesData.savedDeliveryAddresses || []
  };
  
  return removeUndefined(mergedData);
}

async function migrateUserCollections() {
  console.log('🚀 Starting User Collections Migration');
  console.log('=====================================\n');
  
  try {
    // Get all users from both collections
    console.log('📊 Fetching data from both collections...');
    const usersSnapshot = await db.collection('users').get();
    const userProfilesSnapshot = await db.collection('userProfiles').get();
    
    console.log(`   - Found ${usersSnapshot.size} users in 'users' collection`);
    console.log(`   - Found ${userProfilesSnapshot.size} users in 'userProfiles' collection`);
    
    // Create maps for easy lookup
    const usersMap = new Map();
    const userProfilesMap = new Map();
    
    usersSnapshot.forEach(doc => {
      usersMap.set(doc.id, doc.data());
    });
    
    userProfilesSnapshot.forEach(doc => {
      userProfilesMap.set(doc.id, doc.data());
    });
    
    // Get all unique user IDs
    const allUserIds = new Set([...usersMap.keys(), ...userProfilesMap.keys()]);
    console.log(`   - Total unique users: ${allUserIds.size}`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    console.log('\n🔄 Starting migration...');
    
    for (const userId of allUserIds) {
      try {
        const usersData = usersMap.get(userId) || {};
        const userProfilesData = userProfilesMap.get(userId) || {};
        
        // Skip if userProfiles already has all the data we need
        if (Object.keys(userProfilesData).length > 0 && 
            userProfilesData.uid && 
            userProfilesData.email && 
            userProfilesData.role) {
          console.log(`   ⏭️  Skipping ${userId} - already has complete userProfiles data`);
          skippedCount++;
          continue;
        }
        
        // Merge the data
        const mergedData = mergeUserData(usersData, userProfilesData, userId);
        
        // Write to userProfiles collection
        await db.collection('userProfiles').doc(userId).set(mergedData, { merge: true });
        
        console.log(`   ✅ Migrated ${userId}`);
        migratedCount++;
        
      } catch (error) {
        console.error(`   ❌ Error migrating ${userId}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migratedCount} users`);
    console.log(`   ⏭️  Skipped (already complete): ${skippedCount} users`);
    console.log(`   ❌ Errors: ${errorCount} users`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some users failed to migrate. Please review the errors above.');
    } else {
      console.log('\n🎉 Migration completed successfully!');
    }
    
    return { migratedCount, skippedCount, errorCount };
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  try {
    // Check that all users in 'users' collection have corresponding userProfiles
    const usersSnapshot = await db.collection('users').get();
    const userProfilesSnapshot = await db.collection('userProfiles').get();
    
    const usersMap = new Map();
    const userProfilesMap = new Map();
    
    usersSnapshot.forEach(doc => {
      usersMap.set(doc.id, doc.data());
    });
    
    userProfilesSnapshot.forEach(doc => {
      userProfilesMap.set(doc.id, doc.data());
    });
    
    let missingCount = 0;
    let incompleteCount = 0;
    
    for (const [userId, usersData] of usersMap) {
      const userProfilesData = userProfilesMap.get(userId);
      
      if (!userProfilesData) {
        console.log(`   ❌ Missing userProfiles for user: ${userId}`);
        missingCount++;
      } else {
        // Check if userProfiles has essential fields
        const hasEssentialFields = userProfilesData.uid && 
                                  userProfilesData.email && 
                                  userProfilesData.role &&
                                  userProfilesData.createdAt;
        
        if (!hasEssentialFields) {
          console.log(`   ⚠️  Incomplete userProfiles for user: ${userId}`);
          console.log(`       - uid: ${!!userProfilesData.uid}`);
          console.log(`       - email: ${!!userProfilesData.email}`);
          console.log(`       - role: ${!!userProfilesData.role}`);
          console.log(`       - createdAt: ${!!userProfilesData.createdAt}`);
          incompleteCount++;
        }
      }
    }
    
    console.log(`\n📊 Verification Results:`);
    console.log(`   ✅ Complete userProfiles: ${userProfilesMap.size - missingCount - incompleteCount}`);
    console.log(`   ❌ Missing userProfiles: ${missingCount}`);
    console.log(`   ⚠️  Incomplete userProfiles: ${incompleteCount}`);
    
    if (missingCount === 0 && incompleteCount === 0) {
      console.log('\n🎉 Verification passed! All users have complete userProfiles.');
      return true;
    } else {
      console.log('\n⚠️  Verification found issues. Please review before proceeding.');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    if (!dryRun) {
      const result = await migrateUserCollections();
      const verified = await verifyMigration();
      
      if (verified) {
        console.log('\n✅ Migration completed and verified successfully!');
        console.log('\n📋 Next steps:');
        console.log('   1. Update all code references to use only userProfiles collection');
        console.log('   2. Remove fallback logic from functions');
        console.log('   3. Test the updated code');
        console.log('   4. Delete the users collection (optional)');
      } else {
        console.log('\n⚠️  Migration completed but verification found issues.');
        console.log('   Please review and fix issues before proceeding.');
      }
    } else {
      console.log('🔍 Dry run completed. Use without --dry-run to perform actual migration.');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
main().catch(console.error);
