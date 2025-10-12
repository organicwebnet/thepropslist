// Debug script to check all users and their roles
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./props-bible-app-1c1cb-firebase-adminsdk-fbsvc-d3f949ec39.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugUsers() {
  try {
    console.log('🔍 Checking all users and their roles...\n');
    
    const userProfilesSnapshot = await db.collection('userProfiles').get();
    console.log(`Found ${userProfilesSnapshot.size} user profiles:\n`);
    
    userProfilesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`📧 Email: ${data.email || 'No email'}`);
      console.log(`🆔 UID: ${doc.id}`);
      console.log(`👤 Role: ${data.role || 'No role set'}`);
      console.log(`📅 Created: ${data.createdAt || 'No date'}`);
      console.log(`🏢 Organizations: ${JSON.stringify(data.organizations || [])}`);
      console.log(`🔧 Groups: ${JSON.stringify(data.groups || {})}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error during user checking:', error);
  }
}

debugUsers();
