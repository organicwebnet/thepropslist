import 'expo-router/entry';
import React from 'react';
import { AppRegistry } from 'react-native';
import App from '../../App'; // Fixed path
import { AuthProvider } from '../../contexts/AuthContext';
import { FontProvider } from '../../contexts/FontContext'; // Re-enabled for StyledText compatibility
import { ThemeProvider } from '../../contexts/ThemeContext';
import { FirebaseProvider } from './contexts/FirebaseContext';
// import { useFonts } from '../../shared/hooks/useFonts'; // Assuming font loading hook is separate

// Main application component wrapper
const MainApp = () => {
  // Font loading logic needs to be handled here if using custom fonts
  // const { fontsLoaded, error } = useFonts(); // Commented out

  // if (!fontsLoaded) {
  //   // Render loading state or default font component
  //   return null; // Or a loading indicator
  // }

  // if (error) {
  //   console.error('Error loading fonts:', error);
  //   // Optionally render an error state
  // }

  return (
    <AuthProvider>
      <ThemeProvider>
        <FirebaseProvider>
          <FontProvider>
            <App />
          </FontProvider>
        </FirebaseProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

// Register the main application component
AppRegistry.registerComponent('main', () => MainApp); 
