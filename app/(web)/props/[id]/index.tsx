import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';
import { useFirebase } from '@/contexts/FirebaseContext';
import type { Prop } from '@/shared/types/props';
import { PropLifecycleStatus, PropStatusUpdate as PropStatusUpdateType, MaintenanceRecord as MaintenanceRecordType } from '@/types/lifecycle';
import { Pencil, Trash2, ArrowLeft, Wrench, History, ClipboardList, CheckCircle, XCircle, FileText, Video as VideoIcon } from 'lucide-react';

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
  rentalSource?: string;
  rentalReferenceNumber?: string;
  travelsUnboxed?: boolean;
  statusNotes?: string;
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
            <View className="md:grid md:grid-cols-2 md:gap-x-8 lg:gap-x-12 space-y-6 md:space-y-0">
              
              {/* --- Left Column --- */}
              <View className="space-y-6">
                {/* Basic Details Section */}
                <View>
                  <Text className="text-xl font-semibold text-gray-200 mb-3">Basic Details</Text>
                  <View className="space-y-3 bg-gray-800 p-4 rounded-md">
                    <DetailItem label="Description" value={prop.description} />
                    <DetailItem label="Category" value={prop.category} />
                    <DetailItem label="Quantity" value={prop.quantity?.toString()} />
                    <DetailItem label="Condition" value={prop.condition} />
                    <DetailItem label="Last Modified" value={formatDate(prop.lastModifiedAt)} />
                  </View>
                </View>
  
                {/* Source & Acquisition Section */}
                <View>
                  <Text className="text-xl font-semibold text-gray-200 mb-3">Source & Acquisition</Text>
                  <View className="space-y-3 bg-gray-800 p-4 rounded-md">
                    <DetailItem label="Source" value={prop.source} />
                    {prop.sourceDetails && <DetailItem label="Source Details" value={prop.sourceDetails} />}
                    {prop.purchaseUrl && <DetailItem label="Purchase URL" value={<a href={prop.purchaseUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{prop.purchaseUrl}</a>} />}
                    {prop.source === 'rented' && (
                      <>
                        <DetailItem label="Rental Source" value={prop.rentalSource} />
                        <DetailItem label="Rental Due Date" value={formatDate(prop.rentalDueDate)} />
                        <DetailItem label="Reference Number" value={prop.rentalReferenceNumber} />
                      </>
                    )}
                    <DetailItem label="Price/Value" value={prop.price ? `€${prop.price.toFixed(2)}` : 'N/A'} /> 
                    <DetailItem label="Purchase Date" value={formatDate(prop.purchaseDate)} />
                  </View>
                </View>
                
                {/* Location Section */}
                <View>
                  <Text className="text-xl font-semibold text-gray-200 mb-3">Location</Text>
                  <View className="space-y-3 bg-gray-800 p-4 rounded-md">
                    <DetailItem label="Storage Location" value={prop.location} />
                    <DetailItem label="Current Location" value={prop.currentLocation} />
                  </View>
                </View>

                {/* Notes & Instructions Section - MOVED HERE */}
                <View>
                  <Text className="text-xl font-semibold text-gray-200 mb-3">Notes & Instructions</Text>
                  <View className="space-y-4 bg-gray-800 p-4 rounded-md">
                    {prop.usageInstructions && <DetailItem label="Usage Instructions" value={prop.usageInstructions} />}
                    {prop.maintenanceNotes && <DetailItem label="Maintenance Notes" value={prop.maintenanceNotes} />}
                    {prop.safetyNotes && <DetailItem label="Safety Notes" value={prop.safetyNotes} />}
                    {prop.modificationDetails && <DetailItem label="Modification Details" value={prop.modificationDetails} />}
                    {prop.statusNotes && <DetailItem label="Status Notes" value={prop.statusNotes} />}
                    {prop.requiresPreShowSetup && (
                      <>
                        <DetailItem label="Pre-Show Setup Notes" value={prop.preShowSetupNotes} />
                        <DetailItem label="Setup Duration" value={prop.preShowSetupDuration ? `${prop.preShowSetupDuration} mins` : 'N/A'} />
                        {prop.preShowSetupVideo && <DetailItem label="Setup Video" value={<a href={prop.preShowSetupVideo} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{prop.preShowSetupVideo}</a>} />}
                      </>
                    )}
                    {prop.notes && <DetailItem label="General Notes" value={prop.notes} />}
                  </View>
                </View>

              </View>

              {/* --- Right Column --- */}
              <View className="space-y-6">
                {/* Dimensions & Weight Section */}
                <View>
                  <Text className="text-xl font-semibold text-gray-200 mb-3">Dimensions & Weight</Text>
                  <View className="bg-gray-800 p-4 rounded-md grid grid-cols-2 gap-x-4 gap-y-3">
                    <DetailItem label="Length" value={prop.length ? `${prop.length} ${prop.unit || ''}` : 'N/A'} />
                    <DetailItem label="Width" value={prop.width ? `${prop.width} ${prop.unit || ''}` : 'N/A'} />
                    <DetailItem label="Height" value={prop.height ? `${prop.height} ${prop.unit || ''}` : 'N/A'} />
                    <DetailItem label="Depth" value={prop.depth ? `${prop.depth} ${prop.unit || ''}` : 'N/A'} />
                    <DetailItem label="Weight" value={prop.weight ? `${prop.weight} ${prop.weightUnit || ''}` : 'N/A'} />
                    <DetailItem label="Travel Weight" value={prop.travelWeight ? `${prop.travelWeight} ${prop.weightUnit || ''}` : 'N/A'} />
                    <DetailItem label="Materials" value={prop.materials?.join(', ')} />
                  </View>
                </View>
  
                {/* Handling & Flags Section */}
                <View>
                  <Text className="text-xl font-semibold text-gray-200 mb-3">Handling & Flags</Text>
                  <View className="bg-gray-800 p-4 rounded-md grid grid-cols-2 gap-x-4 gap-y-3">
                    <FlagItem label="Multi-Scene" value={prop.isMultiScene ?? false} />
                    <FlagItem label="Consumable" value={prop.isConsumable ?? false} />
                    <FlagItem label="Breakable/Fragile" value={prop.isBreakable ?? false} />
                    <FlagItem label="Hazardous Material" value={prop.isHazardous ?? false} />
                    <FlagItem label="Modified" value={prop.hasBeenModified ?? false} />
                    <FlagItem label="Requires Pre-Show Setup" value={prop.requiresPreShowSetup ?? false} />
                    <FlagItem label="Has Own Shipping Crate" value={prop.hasOwnShippingCrate ?? false} />
                    <FlagItem label="Requires Special Transport" value={prop.requiresSpecialTransport ?? false} />
                    <FlagItem label="Travels Unboxed" value={prop.travelsUnboxed ?? false} />
                  </View>
                </View>
  
                {/* Assets Section */}
                <View>
                  <Text className="text-xl font-semibold text-gray-200 mb-3">Assets</Text>
                  <View className="space-y-3 bg-gray-800 p-4 rounded-md">
                    {prop.digitalAssets && prop.digitalAssets.length > 0 && (
                      <View>
                         <Text className="text-md font-medium text-gray-300 mb-2">Digital Assets:</Text>
                         <ul className="space-y-1">
                            {prop.digitalAssets.map(asset => (
                               <li key={asset.id} className="flex items-center gap-2">
                                  <FileText size={16} className="text-gray-400 flex-shrink-0" />
                                  <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{asset.name || asset.url}</a> 
                                  <span className="text-xs text-gray-500">({asset.type})</span>
                               </li>
                            ))}
                         </ul>
                      </View>
                    )}
                    {prop.videos && prop.videos.length > 0 && (
                      <View>
                         <Text className="text-md font-medium text-gray-300 mb-2">Video Links:</Text>
                         <ul className="space-y-1">
                            {prop.videos.map(video => (
                               <li key={video.id} className="flex items-center gap-2">
                                  <VideoIcon size={16} className="text-gray-400 flex-shrink-0" />
                                  <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{video.name || video.url}</a>
                               </li>
                            ))}
                         </ul>
                      </View>
                    )}
                    {(!prop.digitalAssets || prop.digitalAssets.length === 0) && (!prop.videos || prop.videos.length === 0) && (
                      <Text className="text-gray-400 italic">No digital assets or video links attached.</Text>
                    )}
                  </View>
                </View>
              </View> 
              {/* End Right Column */}

            </View>
          )}

          {activeTab === 'Status Updates' && (
            <View className="space-y-6 mx-auto w-[800px]">
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
             <View className="space-y-6  mx-auto w-[800px]">
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
const DetailItem = ({ label, value }: { label: string; value: React.ReactNode | string | number | undefined | null }): JSX.Element | null => {
  if (value === undefined || value === null || value === '') {
    return null; // Don't render if value is not provided
  }
  return (
    // Use flex-row, justify-start to place label and value next to each other
    <View className="flex flex-row justify-start items-center gap-4">
      <Text className="text-sm font-medium text-blue-300 flex-shrink-0">{label}:</Text> 
      {typeof value === 'string' || typeof value === 'number' ? (
         <Text className="text-base text-gray-100 break-words">{value}</Text>
      ) : (
         // Render React nodes directly
         <View>{value}</View>
      )}
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
      className={`flex-1 items-center py-3 px-2 border-b-2 flex-row justify-center gap-2 ${
        isActive
          ? 'border-blue-500 text-blue-500'
          : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
      }`}
    >
      <Icon size={16} className={isActive ? 'text-blue-500' : 'text-gray-400'} />
      <Text 
         className={`text-sm font-medium ${isActive ? 'text-blue-500' : 'text-gray-400 hover:text-gray-200'}`}
       >
         {label}
       </Text>
    </TouchableOpacity>
  );
};

// FlagItem component
const FlagItem = ({ label, value }: { label: string; value: boolean }): JSX.Element => {
  return (
    <View className="flex flex-row items-center gap-2">
      {value ? (
        <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
      ) : (
        <XCircle size={16} className="text-red-500 flex-shrink-0" />
      )}
      <Text className="text-base text-gray-100">{label}</Text>
    </View>
  );
}; 