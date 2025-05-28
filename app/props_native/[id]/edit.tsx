import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert, SafeAreaView, Button } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useFirebase } from '../../../src/contexts/FirebaseContext.tsx';
import { useAuth } from '../../../src/contexts/AuthContext.tsx';
import { useShows } from '../../../src/contexts/ShowsContext.tsx';
import { useProps } from '../../../src/contexts/PropsContext.tsx';
import type { Prop, PropFormData } from '../../../src/shared/types/props.ts';
import { NativePropForm } from '../../../src/components/NativePropForm.tsx';

export default function EditPropScreenMobile() {
  console.log("Currently rendering: EditPropScreenMobile"); // DEBUG LOG
  const router = useRouter();
  const { id: propId } = useLocalSearchParams<{ id: string }>();
  const { service: firebaseService, isInitialized: firebaseInitialized } = useFirebase();
  const { user } = useAuth();
  const showsContext = useShows();
  const { updateProp, loading: propsUpdating, error: propsUpdateError } = useProps();

  const [initialPropData, setInitialPropData] = useState<PropFormData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!propId || !firebaseService?.getDocument) {
        if (isMounted) {
          setFetchError('Failed to load data: Invalid Prop ID or service unavailable.');
          setLoadingData(false);
        }
        return;
      }
      setLoadingData(true);
      setFetchError(null);
      try {
        const propDoc = await firebaseService.getDocument<Prop>('props', propId);
        if (propDoc?.data) {
          if (isMounted) {
            setInitialPropData(propDoc.data as PropFormData);
          }
        } else {
          if (isMounted) setFetchError('Prop not found.');
        }
      } catch (err) {
        console.error("Error fetching prop data for edit (Mobile):", err);
        if (isMounted) setFetchError('Failed to load prop data.');
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };

    if (firebaseInitialized) {
      fetchData();
    }
    return () => { isMounted = false; };
  }, [propId, firebaseInitialized, firebaseService]);

  const handleFormSubmit = useCallback(async (formDataFromNativeForm: PropFormData): Promise<boolean> => {
    if (!propId) {
      Alert.alert('Error', 'Prop ID is missing. Cannot update.');
      return false;
    }
    setIsSubmitting(true);
    try {
      await updateProp(propId, formDataFromNativeForm);
      Alert.alert('Success', 'Prop updated successfully!');
      router.replace({ pathname: `/props_shared_details/${propId}` as any, params: { entityType: 'prop' } });
      return true;
    } catch (err: any) {
      console.error('Error updating prop (Mobile):', err);
      Alert.alert('Update Error', err.message || 'Failed to update prop. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [propId, updateProp, router]);

  const isLoading = loadingData || isSubmitting || propsUpdating;

  if (isLoading && !initialPropData) {
    return (
      <View style={styles.centeredContainer}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color="#9CA3AF" />
        <Text style={styles.loadingText}>Loading Prop Data...</Text>
      </View>
    );
  }

  if (fetchError && !initialPropData) {
    return (
      <SafeAreaView style={styles.safeArea}> 
        <View style={styles.centeredContainer}>
          <Stack.Screen options={{ title: 'Error' }} />
          <Text style={styles.errorTextHeader}>Error Loading Prop</Text>
          <Text style={styles.errorText}>{fetchError}</Text>
          <Button title="Go Back" onPress={() => router.back()} color="#3B82F6"/>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!initialPropData) {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.centeredContainer}>
                <Stack.Screen options={{ title: 'Error' }} />
                <Text style={styles.errorText}>Prop data could not be loaded.</Text>
                <Button title="Go Back" onPress={() => router.back()} color="#3B82F6"/>
            </View>
        </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={{ color: 'lime', fontSize: 18, fontWeight: 'bold', textAlign: 'center', padding: 10, backgroundColor: 'black' }}>
        DEBUG: MOBILE EDIT SCREEN ACTIVE
      </Text>
      <Stack.Screen options={{ title: `Edit Prop: ${initialPropData?.name || ''}` }} />
      <NativePropForm
        initialData={initialPropData}
        onFormSubmit={handleFormSubmit}
        submitButtonText="Save Changes"
      />
      {isSubmitting && (
        <View style={styles.submissionOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={{color: '#FFFFFF', marginTop: 10}}>Saving Changes...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111827',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#111827',
  },
  loadingText: {
    marginTop: 10,
    color: '#9CA3AF',
    fontSize: 16,
  },
  errorTextHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F87171',
    marginBottom: 10,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  submissionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
}); 