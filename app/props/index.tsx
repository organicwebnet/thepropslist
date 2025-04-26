import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function PropsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Props List</Text>
      <Text>This is the main props screen.</Text>
      <Link href="/props/new" style={styles.link}>
        Add New Prop
      </Link>
      {/* List of props will go here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  link: {
    marginTop: 16,
    paddingVertical: 8,
    color: 'blue',
  },
}); 