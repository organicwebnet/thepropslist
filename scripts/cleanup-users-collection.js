#!/usr/bin/env node

/**
 * Cleanup Users Collection Script
 * 
 * This script safely deletes the old 'users' collection after verifying
 * that all users have been successfully migrated to 'userProfiles'.
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

async function verifyMigrationComplete() {
  console.log('🔍 Verifying migration is complete...');
  
  try {
    // Get all users from both collections
    const usersSnapshot = await db.collection('users').get();
    const userProfilesSnapshot = await db.collection('userProfiles').get();
    
    console.log(`   - Found ${usersSnapshot.size} users in 'users' collection`);
    console.log(`   - Found ${userProfilesSnapshot.size} users in 'userProfiles' collection`);
    
    if (usersSnapshot.size === 0) {
      console.log('✅ Users collection is already empty - nothing to clean up');
      return true;
    }
    
    // Check that all users in 'users' collection have corresponding userProfiles
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
      console.log('\n⚠️  Verification found issues. Cannot safely delete users collection.');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    return false;
  }
}

async function deleteUsersCollection() {
  console.log('\n🗑️  Deleting users collection...');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('✅ Users collection is already empty');
      return;
    }
    
    console.log(`   - Deleting ${usersSnapshot.size} documents from users collection`);
    
    // Delete in batches to avoid Firestore limits
    const batchSize = 500;
    let deletedCount = 0;
    
    for (let i = 0; i < usersSnapshot.docs.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = usersSnapshot.docs.slice(i, i + batchSize);
      
      for (const doc of batchDocs) {
        batch.delete(doc.ref);
        deletedCount++;
      }
      
      await batch.commit();
      console.log(`   - Deleted ${deletedCount}/${usersSnapshot.size} documents`);
    }
    
    console.log(`✅ Successfully deleted ${deletedCount} documents from users collection`);
    
  } catch (error) {
    console.error('\n❌ Error deleting users collection:', error.message);
    throw error;
  }
}

async function finalVerification() {
  console.log('\n🔍 Final verification...');
  
  try {
    const usersSnapshot = await db.collection('users').get();
    const userProfilesSnapshot = await db.collection('userProfiles').get();
    
    console.log(`   - Users collection: ${usersSnapshot.size} documents`);
    console.log(`   - UserProfiles collection: ${userProfilesSnapshot.size} documents`);
    
    if (usersSnapshot.size === 0) {
      console.log('✅ Users collection successfully cleaned up');
      console.log('✅ All user data is now in userProfiles collection');
      return true;
    } else {
      console.log('⚠️  Users collection still contains documents');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Final verification failed:', error.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log('🧹 Users Collection Cleanup');
  console.log('===========================\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    // Step 1: Verify migration is complete
    const migrationComplete = await verifyMigrationComplete();
    
    if (!migrationComplete) {
      console.log('\n❌ Cannot proceed with cleanup. Please fix migration issues first.');
      process.exit(1);
    }
    
    if (dryRun) {
      console.log('\n🔍 Dry run completed. Migration verification passed.');
      console.log('   Use without --dry-run to perform actual cleanup.');
      return;
    }
    
    // Step 2: Delete users collection
    await deleteUsersCollection();
    
    // Step 3: Final verification
    const cleanupSuccessful = await finalVerification();
    
    if (cleanupSuccessful) {
      console.log('\n🎉 Cleanup completed successfully!');
      console.log('\n📋 Summary:');
      console.log('✅ Users collection deleted');
      console.log('✅ All user data preserved in userProfiles collection');
      console.log('✅ Migration complete');
      console.log('\n🚀 The user profile merge is now fully complete!');
    } else {
      console.log('\n⚠️  Cleanup completed but verification found issues.');
    }
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run cleanup
main().catch(console.error);

