import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProps } from '@/contexts/PropsContext.tsx';
import { useShows } from '@/contexts/ShowsContext.tsx';
import type { Prop } from '@/shared/types/props.ts';
import { ShadowedView, shadowStyle } from 'react-native-fast-shadow';

// Native screen component for the Props tab
export default function PropsTabScreen() {
  // --- Remove Platform Check ---
  // if (Platform.OS === 'web') {
  //   console.warn("[PropsTabScreen] Attempted to render native tab screen on web. Redirecting...");
  //   return <Redirect href="/props" />; 
  // }
  // --- End Remove Platform Check ---

  const { props, loading, error } = useProps();
  const { selectedShow } = useShows();
  const router = useRouter();

  const handleAddProp = () => {
    if (!selectedShow?.id) {
        alert("Please select a show first."); 
        return;
    }
    // Navigate to the shared add prop screen (adjust path if needed)
    // router.push({ pathname: '/props_shared_details/add', params: { showId: selectedShow.id } });
    router.push({ pathname: '/props/create', params: { showId: selectedShow.id } } as any);
  };

  const handleViewPropDetails = (propId: string) => {
    // Navigate to the detail screen within the (tabs)/propsTab group
    router.push(`/propsTab/${propId}`);
  };

  // --- Loading State --- 
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  // --- Error State --- 
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error loading props: {error.message}</Text>
      </View>
    );
  }
  
  // --- No Show Selected State --- 
  if (!selectedShow) {
       return (
         <View style={styles.centered}>
            <Text style={styles.infoText}>Please select a show to view props.</Text>
            {/* Optional: Button to navigate to shows tab */}
            {/* <Button title="Select Show" onPress={() => router.push('/(tabs)/shows')} /> */}
         </View>
       );
  }

  // --- Filter Props for Selected Show --- 
  // Assuming props context fetches all props across shows
  const filteredProps = props.filter((p: Prop) => p.showId === selectedShow.id);

  // --- Render Prop List --- 
  return (
    <View style={styles.container}>
      <FlatList
        data={filteredProps}
        keyExtractor={(item: Prop) => item.id}
        renderItem={({ item }: { item: Prop }) => (
          <TouchableOpacity 
            style={styles.propItem}
            onPress={() => handleViewPropDetails(item.id)}
          >
            <Text style={styles.propName}>{item.name}</Text>
            <Text style={styles.propDescription}>{item.description || 'No description'}</Text>
            {/* Add other relevant details like status, location etc. */}
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={styles.centered}>
            <Text style={styles.infoText}>No props found for {selectedShow.name}.</Text>
          </View>
        )}
        contentContainerStyle={filteredProps.length === 0 ? { flex: 1 } : {}}
      />

      {/* --- Add Prop FAB --- */}
      <ShadowedView style={[styles.fabShadowContainer, shadowStyle({
        radius: 4,
        opacity: 0.3,
        color: '#000',
        offset: [0, 2],
      })]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddProp}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      </ShadowedView>
    </View>
  );
}

// --- Styles --- 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F1F1F', 
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1F1F1F', 
  },
  errorText: {
    color: '#EF4444', // Red color for errors
    fontSize: 16,
    textAlign: 'center',
  },
  infoText: {
      color: '#9CA3AF', // Lighter gray for info
      fontSize: 16,
      textAlign: 'center',
  },
  propItem: {
    backgroundColor: '#2C2C2E', 
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#4B5563', // Darker separator
  },
  propName: {
    fontSize: 17,
    fontWeight: '500', // Medium weight
    color: '#FFFFFF',
    marginBottom: 4,
  },
   propDescription: {
      fontSize: 14,
      color: '#9CA3AF', 
   },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF', 
    justifyContent: 'center',
    alignItems: 'center',
    right: 16,
    bottom: 16,
  },
  fabShadowContainer: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    right: 16,
    bottom: 16,
  },
}); 