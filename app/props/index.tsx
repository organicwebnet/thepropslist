import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useProps } from '../../src/contexts/PropsContext'; // Import context hook
import PropCard from '../../src/shared/components/PropCard'; // Import the card component
import { Prop } from '../../src/shared/types/props'; // Import Prop type

export default function PropsScreen() {
  const { props, loading, error, deleteProp } = useProps(); // Get props, loading state, and delete function

  const handleEditProp = (propId: string) => {
    console.log('Edit prop:', propId);
    // Navigate to the edit screen, e.g., using Expo Router
    router.push(`/props/edit/${propId}`); // Assuming an edit route exists
  };

  const handleDeleteProp = async (propId: string) => {
    console.log('Delete prop:', propId);
    // Add confirmation dialog here
    if (confirm('Are you sure you want to delete this prop?')) { // Basic confirmation
      try {
        await deleteProp(propId);
        // Optionally show success message
      } catch (err) {
        console.error("Failed to delete prop:", err);
        // Optionally show error message
        alert(`Failed to delete prop: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading props...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error loading props: {error.message}</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Prop }) => (
    <PropCard
      prop={item}
      onEditPress={handleEditProp}
      onDeletePress={handleDeleteProp}
    />
  );

  return (
    <View style={styles.container} className={Platform.OS === 'web' ? 'min-h-screen' : ''}>
      <View style={styles.header}>
        <Text style={styles.title}>Props List</Text>
        <Link href="/props/new" asChild>
           <Pressable style={styles.addButton}>
             <Text style={styles.addButtonText}>Add New Prop</Text>
           </Pressable>
        </Link>
      </View>

      {props.length === 0 ? (
        <View style={styles.centered}>
           <Text>No props found. Add one!</Text>
        </View>
      ) : (
        <FlatList
          data={props}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          numColumns={1} // Adjust as needed for web layout (could use CSS grid/flex instead of FlatList for web)
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#111827', // Dark background matching theme
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8, // Added padding
  },
  title: {
    fontSize: 28, // Increased size
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
  },
  addButton: {
     backgroundColor: '#10B981', // Emerald-500
     paddingVertical: 10,
     paddingHorizontal: 16,
     borderRadius: 6,
  },
  addButtonText: {
     color: '#FFFFFF',
     fontWeight: 'bold',
     fontSize: 16,
  },
  listContent: {
    paddingBottom: 16,
  },
  errorText: {
    color: '#EF4444', // Red-500
    fontSize: 16,
  }
}); 