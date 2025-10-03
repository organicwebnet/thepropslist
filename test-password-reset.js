// Test script for password reset functionality
const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBQJQJQJQJQJQJQJQJQJQJQJQJQJQJQJQ",
  authDomain: "props-bible-app-1c1cb.firebaseapp.com",
  projectId: "props-bible-app-1c1cb",
  storageBucket: "props-bible-app-1c1cb.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

async function testPasswordReset() {
  try {
    console.log('🧪 Testing password reset functionality...');
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const functions = getFunctions(app);
    
    // Get the password reset function
    const sendCustomPasswordReset = httpsCallable(functions, 'sendCustomPasswordResetEmailV2');
    
    // Test with a valid email
    console.log('📧 Sending password reset email to test@example.com...');
    const result = await sendCustomPasswordReset({ 
      email: 'test@example.com',
      locale: 'en'
    });
    
    console.log('✅ Success!', result.data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
  }
}

testPasswordReset();
