#!/usr/bin/env node

/**
 * Check God User Script
 * 
 * This script verifies that the god user is safe and properly preserved
 * in the unified userProfiles collection.
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

async function checkGodUser() {
  console.log('🔍 Checking for god user in userProfiles collection...');
  console.log('====================================================\n');
  
  try {
    // Get all userProfiles and look for god user
    const userProfilesSnapshot = await db.collection('userProfiles').get();
    
    let godUserFound = false;
    let godUserData = null;
    let adminUsers = [];
    let systemAdmins = [];
    
    userProfilesSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Check for god user
      if (data.role && data.role.toLowerCase() === 'god') {
        godUserFound = true;
        godUserData = { id: doc.id, ...data };
      }
      
      // Check for other admin users
      if (data.role && (data.role.toLowerCase().includes('admin') || data.role.toLowerCase().includes('god'))) {
        adminUsers.push({ id: doc.id, role: data.role, email: data.email });
      }
      
      // Check for system-admin group
      if (data.groups && data.groups['system-admin']) {
        systemAdmins.push({ id: doc.id, email: data.email, groups: data.groups });
      }
    });
    
    if (godUserFound) {
      console.log('✅ God user found and preserved!');
      console.log('   - ID:', godUserData.id);
      console.log('   - Email:', godUserData.email);
      console.log('   - Role:', godUserData.role);
      console.log('   - Display Name:', godUserData.displayName);
      console.log('   - Groups:', godUserData.groups);
      console.log('   - Plan:', godUserData.plan);
      console.log('   - Created At:', godUserData.createdAt);
      console.log('   - Last Login:', godUserData.lastLogin);
      console.log('   - Onboarding Completed:', godUserData.onboardingCompleted);
    } else {
      console.log('❌ God user not found in userProfiles collection!');
    }
    
    console.log('\n📊 Admin Users Summary:');
    console.log(`   - Total users in userProfiles: ${userProfilesSnapshot.size}`);
    console.log(`   - God users: ${godUserFound ? 1 : 0}`);
    console.log(`   - Admin role users: ${adminUsers.length}`);
    console.log(`   - System-admin group users: ${systemAdmins.length}`);
    
    if (adminUsers.length > 0) {
      console.log('\n👑 Admin Role Users:');
      adminUsers.forEach(user => {
        console.log(`   - ${user.role}: ${user.email} (${user.id})`);
      });
    }
    
    if (systemAdmins.length > 0) {
      console.log('\n🔧 System Admin Users:');
      systemAdmins.forEach(user => {
        console.log(`   - ${user.email} (${user.id})`);
        console.log(`     Groups: ${JSON.stringify(user.groups)}`);
      });
    }
    
    // Test god user permissions
    if (godUserFound) {
      console.log('\n🧪 Testing god user permissions...');
      
      const isGod = String(godUserData.role || '').toLowerCase() === 'god';
      const isSystemAdmin = !!(godUserData.groups && godUserData.groups['system-admin'] === true);
      
      console.log(`   - Is God: ${isGod}`);
      console.log(`   - Is System Admin: ${isSystemAdmin}`);
      console.log(`   - Can access admin functions: ${isGod || isSystemAdmin}`);
      
      if (isGod || isSystemAdmin) {
        console.log('✅ God user has proper admin permissions');
      } else {
        console.log('⚠️  God user may not have proper admin permissions');
      }
    }
    
    console.log('\n🎯 Conclusion:');
    if (godUserFound) {
      console.log('✅ God user is SAFE and properly preserved in userProfiles collection');
      console.log('✅ All admin permissions are intact');
      console.log('✅ Migration was successful for the god user');
    } else {
      console.log('❌ God user is MISSING - this is a critical issue!');
      console.log('❌ Please check the migration logs and restore the god user');
    }
    
  } catch (error) {
    console.error('\n❌ Error checking god user:', error.message);
    throw error;
  }
}

// Run check
checkGodUser().catch(console.error);

