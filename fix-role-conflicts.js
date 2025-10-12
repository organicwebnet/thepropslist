// Script to fix role conflicts in the database
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./props-bible-app-1c1cb-firebase-adminsdk-fbsvc-d3f949ec39.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixRoleConflicts() {
  try {
    console.log('🔧 Fixing role conflicts in database...\n');
    
    const userProfilesSnapshot = await db.collection('userProfiles').get();
    
    for (const doc of userProfilesSnapshot.docs) {
      const data = doc.data();
      const currentRole = data.role;
      
      // Fix hyphenated roles to use underscores
      if (currentRole === 'props-supervisor') {
        await doc.ref.update({
          role: 'props_supervisor'
        });
        console.log(`✅ Updated ${data.email}: ${currentRole} → props_supervisor`);
      } else if (currentRole === 'props-carpenter') {
        await doc.ref.update({
          role: 'props_supervisor' // Treat carpenter as supervisor for now
        });
        console.log(`✅ Updated ${data.email}: ${currentRole} → props_supervisor`);
      } else {
        console.log(`ℹ️  ${data.email}: ${currentRole} (no change needed)`);
      }
    }
    
    console.log('\n✅ Role conflicts fixed!');
    
  } catch (error) {
    console.error('❌ Error fixing role conflicts:', error);
  }
}

fixRoleConflicts();
