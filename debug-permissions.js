// Debug script to test Firestore permissions
const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to set up service account)
const serviceAccount = require('./props-bible-app-1c1cb-firebase-adminsdk-fbsvc-d3f949ec39.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugPermissions() {
  try {
    console.log('🔍 Debugging Firestore permissions...\n');
    
    // Test 1: Check if we can read userProfiles
    console.log('1. Testing userProfiles collection access...');
    const userProfilesSnapshot = await db.collection('userProfiles').limit(5).get();
    console.log(`   ✅ Found ${userProfilesSnapshot.size} user profiles`);
    
    // Test 2: Check if we can read shows
    console.log('2. Testing shows collection access...');
    const showsSnapshot = await db.collection('shows').limit(5).get();
    console.log(`   ✅ Found ${showsSnapshot.size} shows`);
    
    // Test 3: Check if we can read props
    console.log('3. Testing props collection access...');
    const propsSnapshot = await db.collection('props').limit(5).get();
    console.log(`   ✅ Found ${propsSnapshot.size} props`);
    
    // Test 4: Check if we can read todo_boards
    console.log('4. Testing todo_boards collection access...');
    const boardsSnapshot = await db.collection('todo_boards').limit(5).get();
    console.log(`   ✅ Found ${boardsSnapshot.size} task boards`);
    
    // Test 5: Look for god users
    console.log('5. Looking for god users...');
    const godUsersSnapshot = await db.collection('userProfiles').where('role', '==', 'god').get();
    console.log(`   ✅ Found ${godUsersSnapshot.size} god users`);
    
    if (godUsersSnapshot.size > 0) {
      godUsersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - God user: ${data.email} (UID: ${doc.id})`);
      });
    }
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during permission testing:', error);
  }
}

debugPermissions();
