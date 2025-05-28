import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useRouter, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext.tsx';
import { useFirebase } from '../../src/contexts/FirebaseContext.tsx';
import { Prop } from '../../src/shared/types/props.ts';
import PropCard from '../../src/shared/components/PropCard/index.tsx';
import { useTheme } from '../../src/contexts/ThemeContext.tsx';
import { lightTheme, darkTheme } from '../../src/theme.ts';
import { PlusCircle } from 'lucide-react-native';

export default function PropsListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { service, isInitialized, error: firebaseError } = useFirebase();
  const { showId: contextShowId } = useLocalSearchParams<{ showId?: string }>();
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { theme: themeName } = useTheme();
  const currentThemeColors = themeName === 'dark' ? darkTheme.colors : lightTheme.colors;

  const fetchProps = useCallback(async (currentShowId?: string) => {
    if (!user || !currentShowId || !isInitialized || !service) {
      setProps([]);
      setLoading(false);
      if (isInitialized && !service) {
        setError("Firebase service is not available.");
      }
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetchedDocs = await service.getPropsByShowId(currentShowId);
      const propsData = fetchedDocs.map(doc => doc.data).filter((data): data is Prop => !!data);
      setProps(propsData);
    } catch (err: any) {
      console.error("Error fetching props:", err);
      setError(err.message || 'Failed to fetch props.');
      Alert.alert("Error", "Could not fetch props. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, service, isInitialized]);

  useEffect(() => {
    if (firebaseError && typeof firebaseError.message === 'string') {
      setError(firebaseError.message);
      setLoading(false);
      return;
    }
    if (isInitialized && contextShowId) {
      fetchProps(contextShowId);
    } else if (isInitialized) {
      setProps([]);
      setLoading(false);
    }
  }, [contextShowId, fetchProps, isInitialized, firebaseError]);

  useFocusEffect(
    useCallback(() => {
      if (isInitialized && contextShowId) {
        fetchProps(contextShowId);
      }
      return () => {
      };
    }, [contextShowId, fetchProps, isInitialized])
  );

  const onRefresh = useCallback(() => {
    if (isInitialized && contextShowId) {
      setRefreshing(true);
      fetchProps(contextShowId);
    } else {
      setRefreshing(false);
    }
  }, [contextShowId, fetchProps, isInitialized]);

  const handleAddProp = () => {
    if (!isInitialized || !contextShowId) {
      Alert.alert("Cannot Add Prop", "Firebase not ready or no show selected.");
      return;
    }
    router.push({ pathname: '/props/create', params: { showId: contextShowId } } as any);
  };

  const handleDeleteProp = async (propId: string) => {
    if (!isInitialized || !service || !user || !contextShowId) {
      Alert.alert("Cannot Delete Prop", "Operation prerequisites not met.");
      return;
    }
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this prop?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await service.deleteDocument(`users/${user.uid}/shows/${contextShowId}/props`, propId);
              setProps(prevProps => prevProps.filter(p => p.id !== propId));
              Alert.alert("Success", "Prop deleted successfully.");
            } catch (err) {
              console.error("Error deleting prop:", err);
              Alert.alert("Error", "Failed to delete prop.");
            }
          },
        },
      ]
    );
  };

  if (!isInitialized && !firebaseError) {
    return (
      <View style={[styles.container, { backgroundColor: currentThemeColors.background }, styles.centered]}>
        <ActivityIndicator size="large" color={currentThemeColors.primary} />
        <Text style={{ color: currentThemeColors.text, marginTop: 10 }}>Initializing Firebase...</Text>
      </View>
    );
  }
  
  if (firebaseError && typeof firebaseError.message === 'string') {
    return (
      <View style={[styles.container, { backgroundColor: currentThemeColors.background }, styles.centered]}>
        <Text style={{ color: currentThemeColors.error }}>Firebase Error: {firebaseError.message}</Text>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: currentThemeColors.background }, styles.centered]}>
        <ActivityIndicator size="large" color={currentThemeColors.primary} />
      </View>
    );
  }

  if (error && error !== (firebaseError ? firebaseError.message : null)) {
    return (
      <View style={[styles.container, { backgroundColor: currentThemeColors.background }, styles.centered]}>
        <Text style={{ color: currentThemeColors.error }}>Error: {error}</Text>
        <TouchableOpacity onPress={() => fetchProps(contextShowId)} style={[styles.button, { backgroundColor: currentThemeColors.primary }]}>
          <Text style={{ color: currentThemeColors.buttonText }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  if (!contextShowId) {
     return (
      <View style={[styles.container, { backgroundColor: currentThemeColors.background }, styles.centered]}>
        <Stack.Screen options={{ title: "Props" }} />
        <Text style={{ color: currentThemeColors.text, textAlign: 'center', marginBottom: 20 }}>
          Please select a show from the 'Shows' tab to view its props.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <Stack.Screen 
        options={{ 
          title: props.length > 0 ? `Props for Show` : "Props",
          headerRight: () => (
            <TouchableOpacity onPress={handleAddProp} style={{ marginRight: 15 }}>
              <PlusCircle size={28} color={currentThemeColors.primary} />
            </TouchableOpacity>
          ),
        }} 
      />
      {props.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ color: currentThemeColors.text, fontSize: 16, textAlign: 'center' }}>
            No props found for this show.
          </Text>
          <TouchableOpacity onPress={handleAddProp} style={[styles.button, { backgroundColor: currentThemeColors.primary, marginTop: 20 }]}>
            <Text style={{ color: currentThemeColors.buttonText }}>Add First Prop</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={props}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PropCard 
              prop={item} 
            />
          )}
          contentContainerStyle={styles.listContentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[currentThemeColors.primary]}
              tintColor={currentThemeColors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContentContainer: {
    paddingBottom: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
}); 