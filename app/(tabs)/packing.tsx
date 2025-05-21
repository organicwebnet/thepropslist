import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ShadowedView, shadowStyle } from 'react-native-fast-shadow';

import { useShows } from '../../src/contexts/ShowsContext';
import { usePacking } from '../../src/hooks/usePacking';
import { PackingBox } from '../../src/types/packing';

// Define colors based on your tailwind config for clarity (same as _layout.tsx)
const darkThemeColors = {
  background: '#111827', // gray-900
  cardBg: '#1F2937',      // gray-800
  textPrimary: '#F9FAFB',  // gray-50
  textSecondary: '#9CA3AF',// gray-400
  primary: '#3B82F6',     // blue-500
  border: '#374151',      // gray-700
  error: '#EF4444',       // red-500
};

export default function PackingScreen() {
  const router = useRouter();
  const { selectedShow, loading: showsLoading, error: showsError } = useShows();
  
  // Get boxes using usePacking hook if a show is selected
  const { boxes, loading: boxesLoading, error: packingError } = usePacking(selectedShow?.id);

  const loading = showsLoading || (selectedShow && boxesLoading); // Only consider boxesLoading if a show is selected
  const error = showsError || packingError;

  const handleViewBoxDetails = (boxId: string) => {
    if (!selectedShow) return;
    router.push(`/props_shared_details/${boxId}?entityType=box&showId=${selectedShow.id}`);
  };

  const handleCreateNewBox = () => {
    if (!selectedShow) return;
    // Navigate to a new screen for creating a box (e.g., app/packing/createBox.tsx)
    // This screen will need to be created.
    router.push(`/packing/createBox?showId=${selectedShow.id}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={darkThemeColors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
      </View>
    );
  }

  if (!selectedShow) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>Please select a show first from the Shows tab.</Text>
      </View>
    );
  }

  if (!boxes || boxes.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>No packing boxes found for this show.</Text>
          <Text style={styles.messageTextSm}>You can create one using the '+' button.</Text>
        </View>
        <ShadowedView style={[styles.fabShadowContainer, shadowStyle({
          radius: 4,
          opacity: 0.3,
          color: '#000',
          offset: [0, 2],
        })]}>
          <TouchableOpacity style={styles.fab} onPress={handleCreateNewBox}>
            <Ionicons name="add" size={30} color={darkThemeColors.textPrimary} />
          </TouchableOpacity>
        </ShadowedView>
      </View>
    );
  }

  const renderBoxItem = ({ item }: { item: PackingBox }) => (
    <TouchableOpacity 
      style={styles.boxItem} 
      onPress={() => handleViewBoxDetails(item.id)}
    >
      <Ionicons name="cube-outline" size={24} color={darkThemeColors.primary} style={styles.boxIcon} />
      <View style={styles.boxTextContainer}>
        <Text style={styles.boxName}>{item.name || 'Unnamed Box'}</Text>
        {item.description && <Text style={styles.boxDescription}>{item.description}</Text>}
        <Text style={styles.boxInfo}>
          Status: {item.status || 'N/A'} 
          {item.props && item.props.length > 0 ? ` | Items: ${item.props.reduce((acc, p) => acc + (p.quantity || 0), 0)}` : ' | Empty'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={darkThemeColors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={boxes}
        renderItem={renderBoxItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
      />
      <ShadowedView style={[styles.fabShadowContainer, shadowStyle({
        radius: 4,
        opacity: 0.3,
        color: '#000',
        offset: [0, 2],
      })]}>
        <TouchableOpacity style={styles.fab} onPress={handleCreateNewBox}>
          <Ionicons name="add" size={30} color={darkThemeColors.textPrimary} />
        </TouchableOpacity>
      </ShadowedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkThemeColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkThemeColors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkThemeColors.background,
    padding: 20,
  },
  errorText: {
    color: darkThemeColors.error,
    fontSize: 16,
    textAlign: 'center',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
     backgroundColor: darkThemeColors.background,
  },
  messageText: {
    color: darkThemeColors.textPrimary,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
   messageTextSm: {
    color: darkThemeColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  listContentContainer: {
    padding: 10,
  },
  boxItem: {
    backgroundColor: darkThemeColors.cardBg,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: darkThemeColors.border,
  },
  boxIcon: {
    marginRight: 15,
  },
  boxTextContainer: {
    flex: 1,
  },
  boxName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: darkThemeColors.textPrimary,
  },
  boxDescription: {
    fontSize: 14,
    color: darkThemeColors.textSecondary,
    marginTop: 2,
  },
  boxInfo: {
    fontSize: 12,
    color: darkThemeColors.textSecondary,
    marginTop: 5,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: darkThemeColors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabShadowContainer: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
  },
}); 