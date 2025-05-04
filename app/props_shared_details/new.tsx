// This file will be renamed to add.tsx
// Content remains the same for now.
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { PropForm } from '@/components/PropForm';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { useShows } from '@/contexts/ShowsContext';
import type { Prop, PropFormData, Show } from '@/shared/types/props';

export default function AddPropScreen() {
  const router = useRouter();
  const { service: firebaseService, isInitialized: firebaseInitialized } = useFirebase();
  const { user } = useAuth();
  const { showId } = useLocalSearchParams<{ showId?: string }>();
  const { getShowById } = useShows();
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [isLoadingShow, setIsLoadingShow] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (showId && firebaseInitialized) {
      const fetchShow = async () => {
        setIsLoadingShow(true);
        const showData = await getShowById(showId);
        if (showData) {
          setSelectedShow(showData);
        } else {
          console.error(`Add Prop Error: Show with ID ${showId} not found.`);
          Alert.alert('Error', 'Could not find the specified show.');
          if (router.canGoBack()) router.back();
        }
        setIsLoadingShow(false);
      };
      fetchShow();
    } else if (firebaseInitialized) {
       console.error("Add Prop Error: Show ID missing from route parameters.");
       Alert.alert('Error', 'Show ID is missing. Cannot add prop.');
       if (router.canGoBack()) router.back();
       setIsLoadingShow(false);
    }
  }, [showId, firebaseInitialized, getShowById, router]);

  const handleAddNewProp = async (formData: PropFormData): Promise<void> => {
    if (!user || !firebaseInitialized || !firebaseService?.addDocument || !showId || !selectedShow) {
       console.error("Add Prop Error: User, Service, Show ID, or Show Data missing.", { userId: user?.uid, firebaseInitialized, showId, selectedShowExists: !!selectedShow });
       Alert.alert('Error', 'Could not add prop. Missing required context.');
       return;
    }
    
    setIsSubmitting(true);
    try {
      const propDataToAdd: Omit<Prop, 'id'> = {
        ...formData,
        act: formData.act ? Number(formData.act) : undefined,
        scene: formData.scene ? Number(formData.scene) : undefined,
        quantity: Number(formData.quantity) || 1,
        price: Number(formData.price) || 0,
        length: formData.length ? Number(formData.length) : undefined,
        width: formData.width ? Number(formData.width) : undefined,
        height: formData.height ? Number(formData.height) : undefined,
        depth: formData.depth ? Number(formData.depth) : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        userId: user.uid,
        showId: showId,
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(), 
      };
      const docRef = await firebaseService.addDocument('props', propDataToAdd);
      console.log("Prop added with ID:", docRef.id);
      Alert.alert('Success', 'Prop added successfully!');
      if (router.canGoBack()) router.back();
    } catch (error) {
      console.error('Error adding prop:', error);
      Alert.alert('Error', 'Failed to add prop.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!firebaseInitialized || isLoadingShow) {
    return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ title: 'Add New Prop' }} />
            <View style={styles.container}><Text style={styles.text}>Loading Show Info...</Text></View>
        </SafeAreaView>
    );
  }

  if (!selectedShow) {
      return (
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ title: 'Error' }} />
            <View style={styles.container}><Text style={styles.text}>Error loading show data.</Text></View>
        </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: `Add Prop to ${selectedShow.name}` }} />
      <PropForm 
          onSubmit={handleAddNewProp}
          show={selectedShow}
          mode="create"
          disabled={isSubmitting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
}); 