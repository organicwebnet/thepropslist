import React from 'react';
import { View, ScrollView, Pressable, Platform, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ShowList } from '../../src/components/ShowList';
import { useShows } from '../../src/contexts/ShowsContext';
import ShowForm from '../../src/components/ShowForm';

export default function ShowsScreen() {
  const { shows, selectedShow, setSelectedShow, loading: showsLoading, error: showsError } = useShows();
  const router = useRouter();

  const handleAddShowMobile = () => {
    router.push('/shows/new' as any);
  };

  const handleCreateShowWeb = async (formData: any /* TODO: Use Show type */) => {
    console.log('Creating show (Web):', formData);
    // TODO: Call actual create function (e.g., addShow from context/service)
    try {
        // await addShow(formData); // Example call - Commented out
        setSelectedShow(null); // Clear selection/form after create
    } catch (err) {
        console.error("Error creating show:", err);
        // TODO: Show error message to user
    }
  };

  const handleUpdateShowWeb = async (showId: string, formData: any /* TODO: Use Show type */) => {
    console.log(`Updating show ${showId} (Web):`, formData);
    // TODO: Call actual update function (e.g., updateShow from context/service)
    try {
        // await updateShow(showId, formData); // Example call - Commented out
        // Optionally refetch or rely on context update
    } catch (err) {
        console.error("Error updating show:", err);
        // TODO: Show error message to user
    }
  };

  const handleDeleteShowWeb = async (showId: string) => {
     console.log(`Deleting show ${showId} (Web):`);
     // TODO: Call actual delete function (e.g., deleteShow from context/service)
     try {
         // await deleteShow(showId); // Example call - Commented out
         setSelectedShow(null); // Clear selection if deleted show was selected
     } catch (err) {
         console.error("Error deleting show:", err);
     }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <View style={styles.webListColumn}>
          <ScrollView style={{ flex: 1 }}>
            <ShowList
              shows={shows}
              selectedShowId={selectedShow?.id}
              onSelect={(show) => setSelectedShow(show)}
            />
          </ScrollView>
        </View>
        
        <View style={styles.webFormColumn}>
          <ScrollView style={{ flex: 1 }}>
            <ShowForm
              mode={selectedShow ? 'edit' : 'create'}
              initialData={selectedShow ?? undefined}
              onSubmit={selectedShow 
                ? (formData) => handleUpdateShowWeb(selectedShow.id, formData)
                : handleCreateShowWeb
              }
              onCancel={selectedShow ? () => setSelectedShow(null) : undefined}
            />
          </ScrollView>
        </View>
      </View>
    );
  } else {
    return (
      <View style={styles.container}>
        <ShowList
          shows={shows}
          selectedShowId={selectedShow?.id}
          onSelect={(show) => setSelectedShow(show)}
        />
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddShowMobile}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F1F1F',
  },
  webContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1F1F1F',
  },
  webListColumn: {
    flex: 1,
    borderRightWidth: 1,
    borderColor: '#333',
  },
  webFormColumn: {
    flex: 1,
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