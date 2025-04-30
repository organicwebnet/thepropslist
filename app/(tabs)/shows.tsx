import React from 'react';
import { View, Pressable, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ShowList } from '../../src/components/ShowList';
import { useShows } from '../../src/contexts/ShowsContext';

export default function ShowsScreen() {
  const { shows, selectedShow, setSelectedShow } = useShows();
  const router = useRouter();

  const handleAddShow = () => {
    router.push('/shows/new' as any);
  };

  return (
    <View style={styles.container}>
      <ShowList
        shows={shows}
        selectedShowId={selectedShow?.id}
        onSelect={(show) => setSelectedShow(show)}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddShow}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F1F1F',
  },
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    right: 20,
    bottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
}); 