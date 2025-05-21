import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AddPropScreen() {
  console.log("--- Rendering: Native AddPropScreen (app/props/add.tsx) ---");
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Native Add Prop Screen</Text>
      <Text style={styles.text}>This is a placeholder for adding props on native.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    textAlign: 'center',
    marginBottom: 10,
  },
}); 