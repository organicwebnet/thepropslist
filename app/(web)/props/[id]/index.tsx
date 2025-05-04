import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';
import { useFirebase } from '@/contexts/FirebaseContext';
import type { Prop } from '@/shared/types/props';
import { PropLifecycleStatus, PropStatusUpdate as PropStatusUpdateType, MaintenanceRecord as MaintenanceRecordType } from '@/types/lifecycle';
import { Pencil, Trash2, ArrowLeft, Wrench, History, ClipboardList } from 'lucide-react';

// Import Lifecycle Components
import { PropStatusUpdate } from '@/components/lifecycle/PropStatusUpdate';
import { StatusHistory } from '@/components/lifecycle/StatusHistory';
import { MaintenanceRecordForm } from '@/components/lifecycle/MaintenanceRecordForm';
import { MaintenanceHistory } from '@/components/lifecycle/MaintenanceHistory';

// Helper to format dates (Example)
const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (e) {
    return 'Invalid Date';
  }
};

// Helper to check if the source is a valid structure for RN <Image>
function isValidImageSource(source: any): source is { uri: string } {
  return typeof source === 'object' && source !== null && typeof source.uri === 'string';
}

// Extend Prop type locally for state (adjust actual type definition later)
interface PropWithHistory extends Prop {
  statusHistory?: PropStatusUpdateType[];
  maintenanceHistory?: MaintenanceRecordType[];
  isModified?: boolean;
  modificationDetails?: string;
  modifiedAt?: string | null;
}

export default function WebPropDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { service: firebaseService } = useFirebase();
  const [prop, setProp] = useState<PropWithHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [activeTab, setActiveTab] = useState('Details');

  // Fetch prop data - This might need adjustment to fetch history arrays
  const fetchPropData = useCallback(() => {
     if (!id || !firebaseService?.getDocument) {
      setError('Required information missing.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setImageError(false);
    firebaseService.getDocument<Prop>('props', id)
      .then(propDoc => {
        if (propDoc) { 
          // TODO: Fetch history data separately or ensure it's part of the propDoc
          const fetchedProp: PropWithHistory = {
             id: propDoc.id, 
             ...propDoc.data,
             // Placeholder - replace with actual fetched history
             statusHistory: [], 
             maintenanceHistory: [] 
            } as PropWithHistory;
          setProp(fetchedProp);
        } else {
          setError('Prop not found.');
        }
      })
      .catch(err => {
        console.error("Error fetching prop details:", err);
        setError('Failed to load prop details.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, firebaseService]);

  useEffect(() => {
    fetchPropData();
  }, [fetchPropData]);

  // --- Handlers --- 
  const handleStatusUpdate = useCallback(async (newStatus: PropLifecycleStatus, notes: string, notifyTeam: boolean, damageImages?: File[]) => {
    if (!prop || !id || !firebaseService?.updateDocument) return;
    console.log("Attempting status update:", { newStatus, notes, notifyTeam, damageImages });
    // TODO: Implement actual update logic
    // 1. Create status update record
    const updateRecord: Omit<PropStatusUpdateType, 'id'> = {
        date: new Date().toISOString(),
        previousStatus: prop.status as PropLifecycleStatus, 
        newStatus: newStatus,
        notes: notes,
        createdAt: new Date().toISOString(),
        updatedBy: 'web-user-placeholder',
        notified: notifyTeam ? [/* Add relevant emails/IDs */] : [],
        damageImageUrls: [] 
    };
    // 2. Update prop document: update status field and add record to statusHistory subcollection/array
    try {
        // Example: Update prop status and add to history array (adjust based on your data model)
        await firebaseService.updateDocument('props', id, { 
            status: newStatus, 
            statusHistory: [...(prop.statusHistory || []), updateRecord] // Append to history
        });
        alert('Status updated successfully!');
        fetchPropData(); // Re-fetch data to show update
    } catch (err) {
        console.error("Error in handleStatusUpdate:", err);
        alert("Failed to update status.");
        throw err; // Re-throw to inform the component
    }
  }, [prop, id, firebaseService, fetchPropData]);

  const handleAddMaintenanceRecord = useCallback(async (recordData: Omit<MaintenanceRecordType, 'id' | 'createdAt' | 'createdBy'>) => {
     if (!prop || !id || !firebaseService?.updateDocument) return;
     console.log("Adding maintenance record:", recordData);
     // TODO: Implement actual add logic
     const newRecord: MaintenanceRecordType = {
         ...recordData,
         id: `maint_${Date.now()}`, // Simple temporary ID generation
         createdAt: new Date().toISOString(),
         createdBy: 'web-user-placeholder' // Replace with actual user ID
     };
     try {
         // Example: Add record to history array (adjust based on your data model)
         await firebaseService.updateDocument('props', id, { 
            maintenanceHistory: [...(prop.maintenanceHistory || []), newRecord] // Append to history
        });
         alert('Maintenance record added successfully!');
         fetchPropData(); // Re-fetch data to show update
     } catch (err) {
         console.error("Error in handleAddMaintenanceRecord:", err);
         alert("Failed to add maintenance record.");
         throw err; // Re-throw to inform the component
     }
  }, [prop, id, firebaseService, fetchPropData]);

  const handleDelete = async () => {
    if (!id || !firebaseService?.deleteDocument) {
      alert('Error: Cannot delete prop. Service unavailable.'); // Use browser alert
      return;
    }

    if (window.confirm('Are you sure you want to delete this prop?')) { // Use browser confirm
        try {
          await firebaseService.deleteDocument('props', id);
          console.log('Prop deleted:', id);
          alert('Success: Prop deleted successfully.');
          // Navigate back to the list after deletion
          router.push('/props'); // Navigate to web props list
        } catch (err) {
          console.error('Error deleting prop:', err);
          alert('Error: Failed to delete prop.');
        }
    }
  };

  // Edit is handled by linking to the existing edit page

  const renderImage = () => {
    const primaryImageUrl = prop?.images && prop.images.length > 0 ? prop.images[0]?.url : null;
    
    if (imageError || !primaryImageUrl) {
      return (
        <View className="w-full h-64 bg-gray-700 flex justify-center items-center rounded-md mb-4">
          <Text className="text-gray-400 text-5xl font-bold">{prop?.name?.[0]?.toUpperCase()}</Text>
        </View>
      );
    }
    const imageSource = { uri: primaryImageUrl };
    if (isValidImageSource(imageSource)) {
        // Use web Image styling if needed via className
        return (
          <Image
            source={imageSource} 
            className="w-full h-64 object-contain rounded-md bg-gray-800 mb-4" // Basic web image styling
            onError={() => setImageError(true)}
          />
        );
    } else {
         return (
            <View className="w-full h-64 bg-gray-700 flex justify-center items-center rounded-md mb-4">
                <Text className="text-gray-400 text-5xl font-bold">{prop?.name?.[0]?.toUpperCase()}</Text>
            </View>
         );
    }
  };

  if (loading) {
    return <View className="flex-1 justify-center items-center bg-gray-900"><ActivityIndicator size="large" color="#FFFFFF" /></View>;
  }

  if (error) {
    return <View className="flex-1 justify-center items-center bg-gray-900 p-5"><Text className="text-red-500 text-lg">{error}</Text></View>;
  }

  if (!prop) {
    return <View className="flex-1 justify-center items-center bg-gray-900 p-5"><Text className="text-gray-400 text-lg">Prop data unavailable.</Text></View>;
  }

  // --- Main Layout --- 
  return (
    <ScrollView className="flex-1 bg-gray-900 text-white">
      <View className="p-4 md:p-6">
        {/* Back Link */}
        <Link href="/props" className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-4">
          <ArrowLeft size={16} className="mr-1" />
          Back to Props
        </Link>

        {/* Image Area */}
        {renderImage()}

        {/* Title and Actions */}
        <View className="flex flex-row justify-between items-center mb-4">
            {/* Title and Act/Scene Info */}
            <View> 
                <Text className="text-3xl font-bold text-gray-100">{prop.name}</Text>
                {/* Display Act/Scene if available */}
                {(prop.act || prop.scene) && (
                    <Text className="text-sm text-gray-400 mt-1">
                        {prop.act ? `Act ${prop.act}` : ''}{prop.act && prop.scene ? ', ' : ''}{prop.scene ? `Scene ${prop.scene}` : ''}
                    </Text>
                )}
            </View>
            {/* Action Buttons */}
            <View className="flex flex-row gap-3">
                <Link href={`/props/${id}/edit`} asChild>
                    <TouchableOpacity className="p-2 rounded-full hover:bg-gray-700"> 
                        <Pencil size={20} className="text-blue-400" />
                    </TouchableOpacity>
                </Link>
                <TouchableOpacity onPress={handleDelete} className="p-2 rounded-full hover:bg-gray-700"> 
                    <Trash2 size={20} className="text-red-500" />
                </TouchableOpacity>
            </View>
        </View>

        {/* Tab Navigation */}
        <View className="flex flex-row border-b border-gray-700 mb-6">
          <TabButton label="Details" activeTab={activeTab} setActiveTab={setActiveTab} icon={ClipboardList} />
          <TabButton label="Status Updates" activeTab={activeTab} setActiveTab={setActiveTab} icon={History} />
          <TabButton label="Maintenance Records" activeTab={activeTab} setActiveTab={setActiveTab} icon={Wrench} />
        </View>

        {/* Tab Content */} 
        <View>
          {activeTab === 'Details' && (
            <View className="flex flex-row gap-6"> {/* Main row for two columns */} 
              {/* Left Column: Main Details */}
              <View className="flex-grow space-y-6"> {/* space-y adds vertical gap */} 
                {/* Basic Info & Source Info (Combined Section) */}
                <View className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <View>
                    <Text className="text-lg font-semibold text-gray-200 mb-2">Basic Information</Text>
                    <DetailItem label="Category" value={prop.category} />
                    <DetailItem label="Quantity" value={prop.quantity?.toString()} />
                    <DetailItem label="Price" value={prop.price ? `£${prop.price.toFixed(2)}` : 'N/A'} />
                  </View>
                  <View>
                     <Text className="text-lg font-semibold text-gray-200 mb-2">Source Information</Text>
                     <DetailItem label="Source" value={prop.source} />
                     {/* <DetailItem label="Source Details" value={prop.sourceDetails} /> */} 
                     <Text className="text-lg font-semibold text-gray-200 mt-4 mb-2">Transport Information</Text>
                     {/* <DetailItem label="Shipping Crate" value={prop.shippingCrateDetails} /> */}
                     {/* <DetailItem label="Transport Notes" value={prop.transportNotes} /> */}
                  </View>
                </View>

                {/* Physical Properties */} 
                <View>
                  <Text className="text-lg font-semibold text-gray-200 mb-2">Physical Properties</Text>
                  {/* <DetailItem label="Dimensions" value={prop.dimensions} /> */}
                  <DetailItem label="Weight" value={prop.weight} />
                  {/* Add Materials if exists */} 
                </View>

                {/* Usage Info */} 
                <View>
                  <Text className="text-lg font-semibold text-gray-200 mb-2">Usage Information</Text>
                  {/* <DetailItem label="Scene Usage" value={prop.sceneUsage} /> */}
                  {/* <DetailItem label="Usage Instructions" value={prop.usageInstructions} /> */}
                  {/* <DetailItem label="Maintenance Notes" value={prop.maintenanceNotes} /> */}
                  {/* <DetailItem label="Safety Notes" value={prop.safetyNotes} /> */}
                </View>

                {/* Setup Info */} 
                <View>
                  <Text className="text-lg font-semibold text-gray-200 mb-2">Setup Information</Text>
                  {/* <DetailItem label="Setup Duration" value={prop.setupDuration} /> */}
                  {/* <DetailItem label="Setup Instructions" value={prop.setupInstructions} /> */}
                  {/* Add Setup Video Player Here */} 
                </View>
              </View>

              {/* Right Column: Modified Prop Box (Conditional) */}
              {prop.isModified && ( 
                <View className="w-1/3 flex-shrink-0"> {/* Adjust width as needed */} 
                  <View className="border border-red-500/50 bg-red-900/20 p-4 rounded-md">
                      <Text className="text-red-400 font-bold mb-2">Modified Prop</Text>
                      <Text className="text-red-300/90 text-sm mb-2">{prop.modificationDetails}</Text>
                      <Text className="text-xs text-red-400/80 mt-1">Modified on: {formatDate(prop.modifiedAt)}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {activeTab === 'Status Updates' && (
            <View className="space-y-6">
               {/* Use existing components */}
               <PropStatusUpdate 
                  currentStatus={prop.status as PropLifecycleStatus} // Cast current status
                  onStatusUpdate={handleStatusUpdate} 
                  // Pass optional email props if available/needed
               />
               <StatusHistory history={prop.statusHistory || []} />
            </View>
          )}

          {activeTab === 'Maintenance Records' && (
             <View className="space-y-6">
                {/* Use existing components */} 
                <MaintenanceRecordForm onSubmit={handleAddMaintenanceRecord} />
                <MaintenanceHistory records={prop.maintenanceHistory || []} />
             </View>
          )}
        </View>

      </View>
    </ScrollView>
  );
}

// Helper component for displaying detail items
const DetailItem = ({ label, value }: { label: string; value: string | number | undefined | null }) => {
  if (value === null || typeof value === 'undefined' || value === '') return null; // Don't render if value is empty
  return (
    <View className="mb-2">
      <Text className="text-sm font-medium text-gray-400">{label}</Text>
      <Text className="text-base text-gray-100">{String(value)}</Text>
    </View>
  );
};

// TabButton component
const TabButton = ({ label, activeTab, setActiveTab, icon: Icon }: {
    label: string;
    activeTab: string;
    setActiveTab: (label: string) => void;
    icon: React.ElementType; // Accept icon component
}) => {
    const isActive = activeTab === label;
    return (
        <TouchableOpacity 
            onPress={() => setActiveTab(label)} 
            className={`flex flex-row items-center gap-2 py-2 px-4 ${isActive ? 'border-b-2 border-blue-500' : ''}`}
        >
            <Icon size={16} className={isActive ? 'text-white' : 'text-gray-400'} />
            <Text className={`text-base ${isActive ? 'text-white' : 'text-gray-400'}`}>{label}</Text>
        </TouchableOpacity>
    );
}; 