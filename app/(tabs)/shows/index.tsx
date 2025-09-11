import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, SafeAreaView, TouchableOpacity } from 'react-native';
import { useShows } from '../../../src/contexts/ShowsContext';
import { useRouter } from 'expo-router';
import { ShowList } from '../../../src/components/ShowList';
import type { Show } from '../../../src/shared/services/firebase/types';
import type { ShowFormData } from '../../../src/types/index';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../src/contexts/AuthContext';
import LinearGradient from 'react-native-linear-gradient';
import { ScrollView } from 'react-native';

export default function ShowsScreen() {
  const { shows, loading, error, setSelectedShow, selectedShow, deleteShow, updateShow } = useShows();
  const { user } = useAuth();
  const router = useRouter();

  const handleShowSelect = (show: Show) => {
    setSelectedShow(show);
    // Navigate to show detail page
    router.navigate(`/(tabs)/shows/${show.id}`);
  };

  const handleShowDelete = (showId: string) => {
    Alert.alert(
      'Delete Show',
      'Are you sure you want to delete this show? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteShow(showId)
        },
      ]
    );
  };

  const handleShowEdit = async (showId: string, data: ShowFormData) => {
    try {
      await updateShow(showId, data);
    } catch (error) {
      Alert.alert('Error', 'Failed to update show');
    }
  };

  const handleAddNewShow = () => {
    router.navigate('/(tabs)/shows/create');
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading shows...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient
        colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
        locations={[0, 0.2, 0.5, 0.8, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error loading shows: {error.message}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Shows</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddNewShow}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          <ShowList
            shows={shows}
            onDelete={handleShowDelete}
            onSelect={handleShowSelect}
            selectedShowId={selectedShow?.id || undefined}
            currentUserEmail={user?.email || undefined}
          />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#c084fc',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
}); 