import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useShows } from '../../src/contexts/ShowsContext'; // Adjusted path
import { useRouter } from 'expo-router';
import type { Show } from '../../src/types'; // Assuming Show type is here
import { Ionicons } from '@expo/vector-icons'; // Added Ionicons import
import { ShadowedView, shadowStyle } from 'react-native-fast-shadow'; // Added import

// Define colors based on your tailwind config for clarity (can be moved to a central theme/colors file)
const darkThemeColors = {
  bg: '#111827',          // dark-bg
  cardBg: '#1F2937',      // dark-card-bg
  textPrimary: '#F9FAFB', // dark-text-primary
  textSecondary: '#9CA3AF',// dark-text-secondary
  primary: '#3B82F6',     // dark-primary (blue accent)
  border: '#374151',      // dark-border
  // Add any other specific colors from your theme that might be used here
};

export default function ShowsScreen() {
  const { shows, loading, error, setSelectedShow } = useShows();
  const router = useRouter();

  const handleShowPress = (show: Show) => {
    setSelectedShow(show);
    // For now, log or navigate to a generic detail placeholder if it exists
    // Example: router.push(`/show-detail/${show.id}`);
    console.log('Selected show:', show.name);
    // Navigate to a detail screen, e.g., app/shows/[id].tsx if that's the pattern
    // router.push(`/shows/${show.id}`); // This would be outside tabs
  };

  const handleAddNewShow = () => {
    // Navigate to a screen for creating a new show
    // Example: router.push('/(tabs)/shows/new'); or a modal
    console.log('Navigate to add new show screen');
     router.push('/props_shared_details/newShowForm'); // Placeholder, actual route will depend on where the form is
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}> {/* Changed from styles.container to avoid conflict if styles.container has padding */}
        <ActivityIndicator size="large" color={darkThemeColors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}> {/* Changed from styles.container */}
        <Text style={styles.errorText}>Error loading shows: {error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={shows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ShadowedView style={[styles.showItemShadowContainer, shadowStyle({
            radius: 2,
            opacity: 0.2,
            color: '#000',
            offset: [0, 1],
          })]}>
            <TouchableOpacity style={styles.showItem} onPress={() => handleShowPress(item)}>
              <Text style={styles.showName}>{item.name}</Text>
              {/* Add more details like item.productionCompany or number of acts */}
              <Text style={styles.showDetails}>{item.productionCompany || 'No company'}</Text>
              <Text style={styles.showDetails}>{item.acts?.length || 0} Acts</Text>
            </TouchableOpacity>
          </ShadowedView>
        )}
        ListEmptyComponent={
          <View style={styles.emptyListContainer}> {/* Changed from styles.emptyContainer */}
            <Text style={styles.emptyText}>No shows available.</Text>
            <Text style={styles.emptySubtext}>Tap "+" to create one.</Text>
          </View>
        }
        contentContainerStyle={shows.length === 0 ? styles.listContentWhenEmpty : styles.listContent}
      />
      <ShadowedView style={[styles.fabShadowContainer, shadowStyle({
        radius: 5,
        opacity: 0.3,
        color: '#000',
        offset: [0, 2],
      })]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddNewShow}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      </ShadowedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: darkThemeColors.bg, // Use dark background
    // padding: 10, // Padding applied to list container or individual items for more control
  },
  loadingContainer: { // For loading and error states, centered
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkThemeColors.bg,
  },
  errorText: { 
    fontSize: 16, 
    color: darkThemeColors.textSecondary, // Use secondary text color for errors
    textAlign: 'center', 
    paddingHorizontal: 20,
  },
  showItem: {
    backgroundColor: darkThemeColors.cardBg, // Use card background
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16, // Added horizontal margin for card-like appearance
    borderRadius: 8,      // Rounded corners for cards
    // width: '100%', // Removed, marginHorizontal will handle spacing
    // minWidth: 300, 
    // alignSelf: 'stretch',
    // shadowColor: '#000', // Removed
    
    // shadowOpacity: 0.2, // Removed
    // shadowRadius: 2, // Removed
    // elevation: 3, // Removed
  },
  showItemShadowContainer: { // New style for ShadowedView for showItem
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  showName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: darkThemeColors.textPrimary, // Use primary text color
    marginBottom: 4, // Space between name and details
  },
  showDetails: {
    fontSize: 14,
    color: darkThemeColors.textSecondary, // Use secondary text color
  },
  emptyListContainer: { // For the ListEmptyComponent
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: darkThemeColors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: darkThemeColors.textSecondary, // Slightly less prominent than emptyText
    opacity: 0.7,
  },
  listContent: {
    paddingHorizontal: 8, // Give some padding if items don't have horizontal margin
    paddingVertical: 10,
  },
  listContentWhenEmpty: { // Ensures empty message is centered
    flex: 1, 
    justifyContent: 'center',
    alignItems: 'center'
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: darkThemeColors.primary, // Use primary accent color
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    // elevation: 8, // Removed
    // shadowColor: '#000', // Removed
    // shadowRadius: 5, // Removed
    // shadowOpacity: 0.3, // Removed
    
  },
  fabShadowContainer: { // New style for ShadowedView for fab
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
  }
}); 