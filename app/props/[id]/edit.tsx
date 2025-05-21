import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert, SafeAreaView, Button } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { useShows } from '@/contexts/ShowsContext';
import type { Prop, PropFormData } from '@/shared/types/props';
import { NativePropForm } from '@/components/NativePropForm';

export default function EditPropScreenMobile() {
  const router = useRouter();
  const { id: propId } = useLocalSearchParams<{ id: string }>();
  const { service: firebaseService, isInitialized: firebaseInitialized } = useFirebase();
  const { user } = useAuth();
  // const { getShowById } = useShows(); // Removed if not used
  const showsContext = useShows(); // Or assign to a variable if other parts of useShows are needed

  const [propData, setPropData] = useState<Prop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!propId || !firebaseService?.getDocument) {
        if (isMounted) {
          setError('Failed to load data: Invalid Prop ID or service unavailable.');
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const propDoc = await firebaseService.getDocument<Prop>('props', propId);
        if (propDoc?.data) {
          if (isMounted) {
            setPropData(propDoc.data);
          }
        } else {
          if (isMounted) setError('Prop not found.');
        }
      } catch (err) {
        console.error("Error fetching prop data for edit (Mobile):", err);
        if (isMounted) setError('Failed to load prop data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (firebaseInitialized) {
      fetchData();
    } else {
        // If firebase is not yet initialized, wait for it (or handle appropriately)
        // This basic version will just show loading until firebaseInitialized is true.
        // More sophisticated apps might use a listener on firebaseInitialized.
    }

    return () => { isMounted = false; };
  }, [propId, firebaseInitialized, firebaseService]);

  const handleUpdateProp = useCallback(async (formDataFromNativeForm: PropFormData): Promise<boolean> => {
    if (!user || !firebaseService?.updateDocument || !propId || !propData) {
      console.error("Update Prop Error: Critical information missing.", { user, firebaseService, propId, propData });
      Alert.alert('Error', 'Could not update prop. Essential information missing.');
      return false;
    }

    try {
      const now = new Date().toISOString();
      
      const baseData: Partial<Prop> = { ...propData }; 

      const updatePayload: Partial<Prop> = {
        ...baseData,
        name: formDataFromNativeForm.name,
        description: formDataFromNativeForm.description,
        category: formDataFromNativeForm.category,
        price: Number(formDataFromNativeForm.price) || 0,
        quantity: Number(formDataFromNativeForm.quantity) || 1,
        length: formDataFromNativeForm.length ? Number(formDataFromNativeForm.length) : undefined,
        width: formDataFromNativeForm.width ? Number(formDataFromNativeForm.width) : undefined,
        height: formDataFromNativeForm.height ? Number(formDataFromNativeForm.height) : undefined,
        depth: formDataFromNativeForm.depth ? Number(formDataFromNativeForm.depth) : undefined,
        unit: formDataFromNativeForm.unit,
        weight: formDataFromNativeForm.weight ? Number(formDataFromNativeForm.weight) : undefined,
        weightUnit: formDataFromNativeForm.weightUnit,
        travelWeight: formDataFromNativeForm.travelWeight ? Number(formDataFromNativeForm.travelWeight) : undefined,
        source: formDataFromNativeForm.source,
        sourceDetails: formDataFromNativeForm.sourceDetails,
        purchaseUrl: formDataFromNativeForm.purchaseUrl,
        rentalDueDate: formDataFromNativeForm.rentalDueDate,
        act: formDataFromNativeForm.act ? Number(formDataFromNativeForm.act) : undefined,
        scene: formDataFromNativeForm.scene ? Number(formDataFromNativeForm.scene) : undefined,
        sceneName: formDataFromNativeForm.sceneName,
        isMultiScene: formDataFromNativeForm.isMultiScene,
        isConsumable: formDataFromNativeForm.isConsumable,
        imageUrl: formDataFromNativeForm.imageUrl,
        usageInstructions: formDataFromNativeForm.usageInstructions,
        maintenanceNotes: formDataFromNativeForm.maintenanceNotes,
        safetyNotes: formDataFromNativeForm.safetyNotes,
        handlingInstructions: formDataFromNativeForm.handlingInstructions,
        requiresPreShowSetup: formDataFromNativeForm.requiresPreShowSetup,
        preShowSetupDuration: formDataFromNativeForm.preShowSetupDuration ? Number(formDataFromNativeForm.preShowSetupDuration) : undefined,
        preShowSetupNotes: formDataFromNativeForm.preShowSetupNotes,
        preShowSetupVideo: formDataFromNativeForm.preShowSetupVideo, 
        hasOwnShippingCrate: formDataFromNativeForm.hasOwnShippingCrate,
        shippingCrateDetails: formDataFromNativeForm.shippingCrateDetails,
        requiresSpecialTransport: formDataFromNativeForm.requiresSpecialTransport,
        transportNotes: formDataFromNativeForm.transportNotes,
        status: formDataFromNativeForm.status,
        location: formDataFromNativeForm.location,
        currentLocation: formDataFromNativeForm.currentLocation,
        notes: formDataFromNativeForm.notes,
        tags: formDataFromNativeForm.tags,
        materials: formDataFromNativeForm.materials,
        statusHistory: propData.statusHistory,
        maintenanceHistory: propData.maintenanceHistory,
        condition: formDataFromNativeForm.condition,
        purchaseDate: formDataFromNativeForm.purchaseDate,
        lastModifiedAt: formDataFromNativeForm.lastModifiedAt,
        isRented: formDataFromNativeForm.isRented,
        rentalSource: formDataFromNativeForm.rentalSource,
        rentalReferenceNumber: formDataFromNativeForm.rentalReferenceNumber,
        travelsUnboxed: formDataFromNativeForm.travelsUnboxed,
        statusNotes: formDataFromNativeForm.statusNotes,
        lastStatusUpdate: formDataFromNativeForm.lastStatusUpdate,
        lastInspectionDate: formDataFromNativeForm.lastInspectionDate,
        nextInspectionDue: formDataFromNativeForm.nextInspectionDue,
        lastMaintenanceDate: formDataFromNativeForm.lastMaintenanceDate,
        nextMaintenanceDue: formDataFromNativeForm.nextMaintenanceDue,
        expectedReturnDate: formDataFromNativeForm.expectedReturnDate,
        replacementCost: formDataFromNativeForm.replacementCost ? Number(formDataFromNativeForm.replacementCost) : undefined,
        replacementLeadTime: formDataFromNativeForm.replacementLeadTime ? Number(formDataFromNativeForm.replacementLeadTime) : undefined,
        repairEstimate: formDataFromNativeForm.repairEstimate ? Number(formDataFromNativeForm.repairEstimate) : undefined,
        repairPriority: formDataFromNativeForm.repairPriority,
        subcategory: formDataFromNativeForm.subcategory,
        customFields: formDataFromNativeForm.customFields,
        manufacturer: formDataFromNativeForm.manufacturer,
        model: formDataFromNativeForm.model,
        serialNumber: formDataFromNativeForm.serialNumber,
        barcode: formDataFromNativeForm.barcode,
        warranty: formDataFromNativeForm.warranty,
        color: formDataFromNativeForm.color,
        period: formDataFromNativeForm.period,
        style: formDataFromNativeForm.style,
        sceneNotes: formDataFromNativeForm.sceneNotes,
        usageNotes: formDataFromNativeForm.usageNotes,
        handedness: formDataFromNativeForm.handedness,
        isBreakable: formDataFromNativeForm.isBreakable,
        isHazardous: formDataFromNativeForm.isHazardous,
        storageRequirements: formDataFromNativeForm.storageRequirements,
        returnDueDate: formDataFromNativeForm.returnDueDate,
        availabilityStatus: formDataFromNativeForm.availabilityStatus,
        publicNotes: formDataFromNativeForm.publicNotes,
        userId: propData.userId,
        showId: propData.showId,
        createdAt: propData.createdAt, 
        updatedAt: now,
      };

      delete (updatePayload as any).id; 

      await firebaseService.updateDocument('props', propId, updatePayload);
      console.log("Mobile Prop updated successfully, ID:", propId);
      Alert.alert('Success', 'Prop updated successfully!');
      return true;
    } catch (err) {
      console.error('Error updating prop (Mobile):', err);
      let errorMessage = 'Failed to update prop. Please try again.';
      if (err instanceof Error) errorMessage = err.message;
      Alert.alert('Update Error', errorMessage);
      setError(errorMessage);
      return false;
    }
  }, [user, firebaseService, propId, propData, router]);

  if (loading || !firebaseInitialized && !propData) {
    return (
      <View style={styles.centeredContainer}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color="#9CA3AF" />
        <Text style={styles.loadingText}>Loading Prop Data for Edit...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}> 
        <View style={styles.centeredContainer}>
          <Stack.Screen options={{ title: 'Error' }} />
          <Text style={styles.errorTextHeader}>Error Loading Prop</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Go Back" onPress={() => router.back()} color="#3B82F6"/>
        </View>
      </SafeAreaView>
    );
  }

  if (!propData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredContainer}>
          <Stack.Screen options={{ title: 'Prop Not Found' }} />
          <Text style={styles.errorTextHeader}>Prop Not Found</Text>
          <Text style={styles.errorText}>Could not load the prop data. It may have been deleted.</Text>
          <Button title="Go Back" onPress={() => router.back()} color="#3B82F6"/>
        </View>
      </SafeAreaView>
    );
  }

  const initialFormData: PropFormData = {
      ...(propData as Omit<Prop, 'id'>),
      act: propData.act ? Number(propData.act) : undefined,
      scene: propData.scene ? Number(propData.scene) : undefined,
      quantity: propData.quantity ? Number(propData.quantity) : 1,
      price: propData.price ? Number(propData.price) : 0,
      length: propData.length ? Number(propData.length) : undefined,
      width: propData.width ? Number(propData.width) : undefined,
      height: propData.height ? Number(propData.height) : undefined,
      depth: propData.depth ? Number(propData.depth) : undefined,
      weight: propData.weight ? Number(propData.weight) : undefined,
      travelWeight: propData.travelWeight ? Number(propData.travelWeight) : undefined,
      preShowSetupDuration: propData.preShowSetupDuration ? Number(propData.preShowSetupDuration) : undefined,
      replacementCost: propData.replacementCost ? Number(propData.replacementCost) : undefined,
      replacementLeadTime: propData.replacementLeadTime ? Number(propData.replacementLeadTime) : undefined,
      repairEstimate: propData.repairEstimate ? Number(propData.repairEstimate) : undefined,
      tags: propData.tags || [],
      isConsumable: propData.isConsumable ?? false,
      isMultiScene: propData.isMultiScene ?? false,
      requiresPreShowSetup: propData.requiresPreShowSetup ?? false,
      hasOwnShippingCrate: propData.hasOwnShippingCrate ?? false,
      requiresSpecialTransport: propData.requiresSpecialTransport ?? false,
      hasBeenModified: (propData as any).hasBeenModified ?? ((propData as any).modificationDetails ? true : false),
      isRented: propData.isRented ?? false,
      travelsUnboxed: propData.travelsUnboxed ?? false,
      isBreakable: propData.isBreakable ?? false,
      isHazardous: propData.isHazardous ?? false,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: `Edit: ${propData.name}` }} />
        <Text style={styles.headerTitle}>Edit: {propData.name}</Text>
        <NativePropForm
            initialData={initialFormData} 
            onFormSubmit={handleUpdateProp}
            submitButtonText="Save Changes"
        />
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#111827',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#111827',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F9FAFB', 
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#D1D5DB',
  },
  errorTextHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F87171',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 15,
    color: '#FCA5A5',
    textAlign: 'center',
    marginBottom: 20,
  },
}); 