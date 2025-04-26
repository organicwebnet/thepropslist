// Simple startup script to ensure hostname is properly configured
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure .expo directory exists
const expoDir = path.join(__dirname, '.expo');
if (!fs.existsSync(expoDir)) {
  fs.mkdirSync(expoDir);
}

// Set environment variables to fix hostname issues
process.env.EXPO_DEVTOOLS_LISTEN_ADDRESS = 'localhost';
process.env.REACT_NATIVE_PACKAGER_HOSTNAME = 'localhost';

// Start the Expo development server
console.log('Starting Expo with custom hostname configuration...');
exec('npx expo start --localhost --clear', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(stdout);
}); 