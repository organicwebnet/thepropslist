// Script to set a user as god
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./props-bible-app-1c1cb-firebase-adminsdk-fbsvc-d3f949ec39.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setGodUser() {
  try {
    console.log('🔧 Setting user as god...\n');
    
    // Update the organicwebnet@gmail.com user to have god role
    const userRef = db.collection('userProfiles').doc('cdGLjU3n13gz72vT33KDBWCnDtf2');
    
    await userRef.update({
      role: 'god',
      groups: {
        'system-admin': true
      }
    });
    
    console.log('✅ Successfully updated user to god role!');
    
    // Verify the change
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    console.log(`📧 Email: ${userData.email}`);
    console.log(`👤 Role: ${userData.role}`);
    console.log(`🔧 Groups: ${JSON.stringify(userData.groups)}`);
    
  } catch (error) {
    console.error('❌ Error setting god user:', error);
  }
}

setGodUser();
