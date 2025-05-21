import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Platform, Alert } from 'react-native';
import { Stack, useRouter, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProps } from '@/contexts/PropsContext';
import { useShows } from '@/contexts/ShowsContext';
import type { Prop } from '@/shared/types/props';
import { ShadowedView, shadowStyle } from 'react-native-fast-shadow';
import PropCard from '@/shared/components/PropCard';

// Native screen component for the Props tab
export default function PropsTabScreen() {
  const { props, loading, error } = useProps();
  const { selectedShow } = useShows();
  const router = useRouter();

  const handleAddProp = () => {
    if (!selectedShow?.id) {
        Alert.alert("No Show Selected", "Please select a show first before adding a prop."); 
        return;
    }
    router.push({ pathname: '/props_shared_details/new', params: { showId: selectedShow.id, entityType: 'prop' } });
  };

  const handleViewPropDetails = (propId: string) => {
    router.push(`/propsTab/${propId}`);
  };
 
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFFFFF" />
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
  
  if (!selectedShow) {
       return (
         <View style={styles.centered}>
            <Text style={styles.infoText}>Please select a show to view props.</Text>
         </View>
       );
  }

  const filteredProps = props.filter((p: Prop) => p.showId === selectedShow.id);
 
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: selectedShow ? `${selectedShow.name} - Props` : 'Props',
          // headerRight: () => ( // If you need a header button, define it here
          //   <TouchableOpacity onPress={handleAddProp} style={{ marginRight: 15 }}>
          //     <Ionicons name="add-circle-outline" size={28} color={"#FFFFFF"} />
          //   </TouchableOpacity>
          // ),
        }} 
      />
      <FlatList
        data={filteredProps}
        keyExtractor={(item: Prop) => item.id}
        renderItem={({ item }: { item: Prop }) => (
          // Restore PropCard usage
          // Note: The PropCard component itself will need to handle cases
          // where item.primaryImageUrl might be undefined or not a valid URI.
          // Our logging inside PropCard should help debug this.
          <PropCard 
            prop={item} 
            // Dummy handlers for now, connect them properly later if needed for this screen
            onEditPress={() => router.push(`/props_shared_details/${item.id}?showId=${selectedShow?.id}&entityType=prop&formType=editPropForm`)} 
            onDeletePress={() => Alert.alert("Delete", `Placeholder for deleting ${item.name}`)} 
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.centeredListContent}>
            <Text style={styles.infoText}>No props found for {selectedShow.name}.</Text>
          </View>
        )}
        contentContainerStyle={filteredProps.length === 0 ? styles.centeredListContent : styles.listPadding}
      />

      <ShadowedView style={[styles.fabShadowContainer, shadowStyle({
        radius: 4, // Adjusted for consistency
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827', // dark-bg
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#111827', 
  },
  centeredListContent: {
    flexGrow: 1, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  listPadding: { 
    paddingHorizontal: 8,
    paddingBottom: 80, // Ensure space for FAB
    paddingTop: 10,
  },
  errorText: {
    color: '#EF4444', 
    fontSize: 16,
    textAlign: 'center',
  },
  infoText: {
      color: '#9CA3AF', 
      fontSize: 16,
      textAlign: 'center',
  },
  propItem: {
    backgroundColor: '#1F2937', // dark-card-bg
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16, 
    borderRadius: 8,
    // Shadow for propItem can be added via ShadowedView if needed,
    // or platform-specific elevation/shadow props.
    // For react-native-fast-shadow, wrap with <ShadowedView>
  },
  // propItemShadowContainer: { // If using ShadowedView for each card
  //   marginVertical: 8,
  //   marginHorizontal: 16,
  //   borderRadius: 8,
  // },
  propName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F9FAFB', // dark-text-primary
    marginBottom: 4,
  },
   propDescription: {
      fontSize: 14,
      color: '#9CA3AF', // dark-text-secondary
      marginTop: 4,
   },
  fab: {
    // Position will be handled by ShadowedView container
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6', // dark-primary
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabShadowContainer: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    right: 20, // Adjusted for better placement
    bottom: 20, // Adjusted for better placement
  },
}); 