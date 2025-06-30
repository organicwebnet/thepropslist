import React from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { ShowList } from '../../src/components/ShowList.tsx';
import { useShows } from '../../src/contexts/ShowsContext.tsx';
import ShowForm from '../../src/components/ShowForm.tsx';
import type { Show } from '../../src/shared/services/firebase/types.ts';

// Basic structure mirroring app/(tabs)/shows.tsx web part, but simpler root
export default function WebShowsScreen() {
  const { shows, selectedShow, setSelectedShow, loading: showsLoading, error: showsError } = useShows();
  
  // Basic loading/error handling
  if (showsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (showsError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error loading shows: {showsError.message}</Text>
      </View>
    );
  }

  // Placeholder handlers - replace with actual logic if needed
  const handleCreateShowWeb = (formData: Show) => console.log('Create Show (Web):', formData);
  const handleUpdateShowWeb = (id: string, formData: Show) => console.log('Update Show (Web):', id, formData);
  const handleDeleteShowWeb = (id: string) => console.log('Delete Show (Web):', id);

  return (
    <View style={styles.container}>
      {/* Column 1: Show List */}
      <View style={styles.column}>
        <ScrollView style={{ flex: 1 }}>
          <ShowList
            shows={shows}
            selectedShowId={selectedShow?.id}
            onSelect={(show: Show) => setSelectedShow(show)}
          />
        </ScrollView>
      </View>

      {/* Column 2: Show Form */}
      <View style={styles.column}>
         <ScrollView style={{ flex: 1 }}>
           
          <ShowForm
            mode={selectedShow ? 'edit' : 'create'}
            initialData={selectedShow ?? undefined}
            onSubmit={selectedShow
              ? (formData: Show) => handleUpdateShowWeb(selectedShow.id, formData)
              : handleCreateShowWeb
            }
            onCancel={selectedShow ? () => setSelectedShow(null) : undefined}
            // onDelete={selectedShow ? () => handleDeleteShowWeb(selectedShow.id) : undefined} // Assuming ShowForm might have a delete button
          />
          
         </ScrollView>
         {/* <Text style={{color: 'white'}}>ShowForm Column (Commented Out)</Text> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row', // Keep the row layout
    backgroundColor: '#1F1F1F', // Match theme
  },
  column: {
    flex: 1, // Each column takes half the space
    padding: 10, // Add some padding within columns
    // Add border if desired: borderRightWidth: 1, borderColor: '#333'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
  },
  errorText: {
    color: 'red',
  }
}); 
