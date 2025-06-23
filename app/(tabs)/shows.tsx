import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { useShows } from '../../src/contexts/ShowsContext.tsx';
import { useRouter } from 'expo-router';
import type { Show } from '../../src/shared/services/firebase/types.ts';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/contexts/ThemeContext.tsx';
import { lightTheme as appLightTheme, darkTheme as appDarkTheme } from '../../src/styles/theme';
import { useAuth } from '../../src/contexts/AuthContext.tsx';
import LinearGradient from 'react-native-linear-gradient';

const HEADER_HEIGHT = Platform.OS === 'android' ? 120 : 100;

export default function ShowsScreen() {
  const { shows, loading, error, setSelectedShow, selectedShow } = useShows();
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
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={[styles.container, { backgroundColor: 'transparent', flex: 1, paddingTop: HEADER_HEIGHT }]}> 
        <FlatList
          data={shows}
          keyExtractor={(item) => item.id ? String(item.id) : String(item.name)}
          renderItem={({ item }) => (
            <View style={[styles.showItemShadowContainer]}>
              <TouchableOpacity style={styles.showItem} onPress={() => handleShowPress(item)} activeOpacity={0.85}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {item.imageUrl ? (
                    <View style={{ marginRight: 14 }}>
                      <View style={styles.showImageContainer}>
                        <Image source={{ uri: item.imageUrl }} style={styles.showImage} />
                      </View>
                    </View>
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.showName}>{item.name}</Text>
                    <Text style={styles.showDetails}>{item.productionCompany || 'No production company'}</Text>
                    <Text style={styles.showDetails}>{item.acts?.length || 0} Acts</Text>
                    {selectedShow?.id === item.id ? (
                      <Text style={{ color: '#4caf50', fontWeight: 'bold', marginTop: 8 }}>Current Show</Text>
                    ) : (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedShow(item);
                        }}
                        style={{ marginTop: 8, padding: 6, backgroundColor: '#4caf50', borderRadius: 6, alignSelf: 'flex-start' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Set as Current</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              <Text style={styles.emptyText}>No shows available.</Text>
              <Text style={styles.emptySubtext}>Tap "+" to create one.</Text>
            </View>
          }
          contentContainerStyle={shows.length === 0 ? styles.listContentWhenEmpty : styles.listContent}
        />
        <View style={[styles.fabShadowContainer]}>
          <TouchableOpacity
            style={styles.fab}
            onPress={handleAddNewShow}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={30} color={currentThemeColors.card} />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const getStyles = (themeColors: typeof appLightTheme.colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    // backgroundColor: themeColors.background, // removed for gradient
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
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
  },
  showImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#222C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  showImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    resizeMode: 'cover',
  },
}); 