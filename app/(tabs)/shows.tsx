import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useShows } from '../../src/contexts/ShowsContext.tsx';
import { useRouter } from 'expo-router';
import type { Show } from '../../src/shared/services/firebase/types.ts';
import { Ionicons } from '@expo/vector-icons';
import { ShadowedView, shadowStyle } from 'react-native-fast-shadow';
import { useTheme } from '../../src/contexts/ThemeContext.tsx';
import { lightTheme as appLightTheme, darkTheme as appDarkTheme } from '../../src/styles/theme.ts';
import { useAuth } from '../../src/contexts/AuthContext.tsx';

export default function ShowsScreen() {
  const { shows, loading, error, setSelectedShow } = useShows();
  const router = useRouter();
  const { theme: themeName } = useTheme();
  const currentThemeColors = themeName === 'light' ? appLightTheme.colors : appDarkTheme.colors;
  const styles = getStyles(currentThemeColors);

  const handleShowPress = (show: Show) => {
    setSelectedShow(show);
    console.log('Selected show:', show.name, show.id);
    router.push(`/shows/${show.id}` as any);
  };

  const handleAddNewShow = () => {
    console.log('Navigate to add new show screen');
    router.push('/shows/create' as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={currentThemeColors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
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
            color: currentThemeColors.text === appLightTheme.colors.text ? '#000' : '#FFF',
            offset: [0, 1],
          })]}>
            <TouchableOpacity style={styles.showItem} onPress={() => handleShowPress(item)}>
              <Text style={styles.showName}>{item.name}</Text>
              <Text style={styles.showDetails}>{item.productionCompany || 'No production company'}</Text>
              <Text style={styles.showDetails}>{item.acts?.length || 0} Acts</Text>
            </TouchableOpacity>
          </ShadowedView>
        )}
        ListEmptyComponent={
          <View style={styles.emptyListContainer}>
            <Text style={styles.emptyText}>No shows available.</Text>
            <Text style={styles.emptySubtext}>Tap "+" to create one.</Text>
          </View>
        }
        contentContainerStyle={shows.length === 0 ? styles.listContentWhenEmpty : styles.listContent}
      />
      <ShadowedView style={[styles.fabShadowContainer, shadowStyle({
        radius: 5,
        opacity: 0.3,
        color: currentThemeColors.text === appLightTheme.colors.text ? '#000' : '#FFF',
        offset: [0, 2],
      })]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddNewShow}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={30} color={currentThemeColors.card} />
        </TouchableOpacity>
      </ShadowedView>
    </View>
  );
}

const getStyles = (themeColors: typeof appLightTheme.colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: themeColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background,
  },
  errorText: { 
    fontSize: 16, 
    color: themeColors.error,
    textAlign: 'center', 
    paddingHorizontal: 20,
  },
  showItem: {
    backgroundColor: themeColors.card,
    padding: 15,
    borderRadius: 8,
  },
  showItemShadowContainer: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  showName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.text,
    marginBottom: 4,
  },
  showDetails: {
    fontSize: 14,
    color: themeColors.textSecondary || themeColors.text,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: themeColors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: themeColors.textSecondary || themeColors.text,
    opacity: 0.7,
  },
  listContent: {
    paddingHorizontal: 0,
    paddingVertical: 10,
  },
  listContentWhenEmpty: {
    flex: 1, 
    justifyContent: 'center',
    alignItems: 'center'
  },
  fab: {
    backgroundColor: themeColors.primary,
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
  }
}); 