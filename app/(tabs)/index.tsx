import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// import { Redirect } from 'expo-router'; // No longer needed

// Temporarily hardcode colors
const darkThemeColors = {
  bg: '#111827',
  textPrimary: '#F9FAFB',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkThemeColors.bg,
  },
  text: {
    color: darkThemeColors.textPrimary,
    fontSize: 20,
  }
});

const HomeScreen = () => {
  console.log("--- Rendering: HomeScreen (SIMPLIFIED) ---");
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Simplified Home Screen</Text>
    </View>
  );
};

export default HomeScreen; 