import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function EditPropScreen() {
  const { id } = useLocalSearchParams();
  console.log(`--- Rendering: Native EditPropScreen (app/props/[id]/edit.tsx) for ID: ${id} ---`);
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Native Edit Prop Screen</Text>
      <Text style={styles.text}>Editing Prop ID: {id}</Text>
      <Text style={styles.text}>This is a placeholder for editing props on native.</Text>
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