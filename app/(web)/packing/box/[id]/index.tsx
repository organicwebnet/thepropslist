import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useLocalSearchParams, Stack, useRouter, Link } from 'expo-router';
import { usePacking } from '@/hooks/usePacking.ts';
import type { PackingBox, PackedProp } from '@/types/packing.ts';
import { useProps } from '@/contexts/PropsContext.tsx';
import { type Prop } from '@/shared/types/props.ts';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Pencil, Box, AlertTriangle, CheckCircle, PackageCheck, PackageX, ArrowLeft, Save, Loader2, X } from 'lucide-react';
import PropCard from '@/shared/components/PropCard/index.tsx';

// Reuse status styles logic (consider moving to a shared location later)
type StatusStyle = { bg: string; text: string; icon: React.ElementType };
const statusStyles: Record<string, StatusStyle> = {
  draft: { bg: 'bg-gray-700/30', text: 'text-gray-400', icon: Pencil },
  packed: { bg: 'bg-blue-700/30', text: 'text-blue-300', icon: PackageCheck },
  shipped: { bg: 'bg-purple-700/30', text: 'text-purple-300', icon: Box }, 
  delivered: { bg: 'bg-green-700/30', text: 'text-green-300', icon: CheckCircle },
  cancelled: { bg: 'bg-red-700/30', text: 'text-red-300', icon: PackageX },
  unknown: { bg: 'bg-yellow-700/30', text: 'text-yellow-300', icon: AlertTriangle },
};

// Helper to format date safely
const formatUpdateTime = (updatedAt: any): string => {
  if (updatedAt && updatedAt instanceof Timestamp) {
    try { return formatDistanceToNow(updatedAt.toDate(), { addSuffix: true }); } catch { return "Invalid date"; }
  } else if (updatedAt instanceof Date) {
    try { return formatDistanceToNow(updatedAt, { addSuffix: true }); } catch { return "Invalid date"; }
  } else if (typeof updatedAt === 'string') {
    try {
      const date = new Date(updatedAt);
      if (!isNaN(date.getTime())) return formatDistanceToNow(date, { addSuffix: true });
      else return "Invalid date string";
    } catch { return "Invalid date format"; }
  }
  return 'Not available';
};

export default function BoxDetailPage() {
  const { id: boxId, showId } = useLocalSearchParams<{ id: string, showId: string }>();
  const router = useRouter();
  const { boxes, loading: loadingBoxes, error: packingError, operations } = usePacking(showId);
  const { props: allProps, loading: loadingProps, error: propsError } = useProps();
  const [box, setBox] = useState<PackingBox | null>(null);
  const [boxPropsData, setBoxPropsData] = useState<Prop[]>([]);
  const [noteContent, setNoteContent] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false); // State for note editing mode

  useEffect(() => {
    const currentLoading = loadingBoxes || loadingProps;
    setLoading(currentLoading);
    setError(packingError?.message || propsError?.message || null);

    if (!showId) {
        setError('Show ID is missing. Cannot load box data.');
        setLoading(false);
        return; // Stop processing if showId is missing
    }

    if (!currentLoading && boxId && showId && boxes.length > 0 && allProps.length > 0) {
      const foundBox = boxes.find((b: PackingBox) => b.id === boxId);
      if (foundBox) {
        setBox(foundBox);
        setNoteContent(foundBox.notes || '');
        const packedPropIds = new Set(foundBox.props?.map((p: PackedProp) => p.propId) || []);
        const filteredProps = allProps.filter((p: Prop) => packedPropIds.has(p.id));
        setBoxPropsData(filteredProps);

      } else {
        setError(`Box with ID ${boxId} not found in show ${showId}.`);
      }
    } else if (!currentLoading && boxId && showId) {
       const foundBox = boxes.find((b: PackingBox) => b.id === boxId);
       if (!foundBox) {
         setError(`Box with ID ${boxId} not found in show ${showId}.`);
       }
    }
  }, [boxId, showId, boxes, allProps, loadingBoxes, loadingProps, packingError, propsError]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <Stack.Screen options={{ title: 'Loading Box...' }} />
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center p-5 bg-gray-900">
        <Stack.Screen options={{ title: 'Error' }} />
        <Text className="text-red-500 text-lg text-center">{error}</Text>
        <button onClick={() => router.back()} className="mt-4 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700">
          Go Back
        </button>
      </View>
    );
  }

  if (!box) {
    return (
      <View className="flex-1 justify-center items-center p-5 bg-gray-900">
        <Stack.Screen options={{ title: 'Box Not Found' }} />
        <Text className="text-gray-400 text-lg">Box data could not be loaded.</Text>
        <button onClick={() => router.back()} className="mt-4 py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700">
          Go Back
        </button>
      </View>
    );
  }

  const status = box.status ?? 'unknown';
  const currentStatusStyle = statusStyles[status] || statusStyles.unknown;
  const StatusIcon = currentStatusStyle.icon;
  const timeAgo = formatUpdateTime(box.updatedAt);
  const totalWeightKg = box.props?.reduce((sum: number, p: PackedProp) => sum + (p.weight || 0), 0) ?? 0;

  // Function to handle saving the note
  const handleSaveNote = async () => {
    if (!box) return;
    setIsSavingNote(true);
    try {
      await operations.updateBox(box.id, { notes: noteContent });
      setIsEditingNotes(false); // Exit edit mode on successful save
    } catch (err) {
      console.error("Error saving note:", err);
      setError('Failed to save note. Please try again.'); // Show error to user
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    // Wrap content in ScrollView if it might overflow
    <ScrollView className="flex-1 bg-gray-900">
      <View className="p-4 md:p-6">
        <Stack.Screen options={{ title: `Box: ${box.name || boxId}` }} />
        
        {/* Back Button */}
         <button onClick={() => router.back()} className="mb-4 inline-flex items-center text-blue-400 hover:text-blue-300">
           <ArrowLeft size={16} className="mr-1" />
           Back to Packing List
         </button>
        
        {/* Box Header Info */}
         <View className="mb-6 bg-gray-800 p-4 rounded-lg border border-gray-700">
           <View className="flex flex-row justify-between items-start mb-2">
              <h1 className="text-2xl font-bold text-gray-100 mr-4">{box.name || 'Unnamed Box'}</h1>
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${currentStatusStyle.bg} ${currentStatusStyle.text}`}>
                <StatusIcon className="h-3 w-3 mr-1.5" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </div>
            </View>
            {box.description && <Text className="text-gray-400 mb-3 text-sm">{box.description}</Text>}
            <View className="flex flex-row justify-between items-center text-xs text-gray-500 border-t border-gray-700 pt-2">
               <span>Total Weight: {totalWeightKg.toFixed(1)} kg</span>
               <div className="flex items-center gap-3">
                 <span>Last Updated: {timeAgo}</span>
                 <Link
                   href={{ 
                     pathname: `/packing/label/${boxId}` as any,
                     params: { showId } 
                   }}
                   className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors"
                 >
                   Print Label
                 </Link>
               </div>
            </View>
         </View>
  
        {/* --- Notes Section --- */}
        <View className="mb-6 bg-gray-800 p-4 rounded-lg border border-gray-700">
           <View className="flex flex-row justify-between items-center mb-2">
             <Text className="text-lg font-semibold text-gray-200">Notes</Text>
             {!isEditingNotes && (
                <button 
                  onClick={() => setIsEditingNotes(true)}
                  className="p-1.5 rounded-md text-gray-400 hover:text-blue-400 hover:bg-blue-900/30 transition-colors duration-150"
                  aria-label="Edit Notes"
                >
                  <Pencil size={16} />
                </button>
             )}
           </View>
           
           {isEditingNotes ? (
              <View>
                <TextInput
                  value={noteContent}
                  onChangeText={setNoteContent}
                  multiline
                  numberOfLines={4} // Suggest a minimum height
                  placeholder="Enter notes here..."
                  placeholderTextColor="#6b7280" // gray-500
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-gray-100 text-sm mb-3 h-24 align-top"
                  textAlignVertical="top" // For RN native multiline alignment
                />
                <View className="flex flex-row justify-end items-center gap-3">
                  <button 
                    onClick={() => { setNoteContent(box?.notes || ''); setIsEditingNotes(false); }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-400 hover:bg-red-900/30 transition-colors duration-150"
                    aria-label="Cancel Edit"
                  >
                    <X size={18}/>
                  </button>
                  <button
                    onClick={handleSaveNote}
                    disabled={isSavingNote}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingNote ? (
                      <><Loader2 size={14} className="animate-spin"/> Saving...</>
                    ) : (
                      <><Save size={14}/> Save</>
                    )}
                  </button>
                </View>
              </View>
           ) : (
              <Text className={`text-sm ${noteContent ? 'text-gray-300' : 'text-gray-500 italic'}`}>
                {noteContent || 'No notes added yet.'}
              </Text>
           )}
        </View>
  
        {/* Props List Section */}
        <View className="mb-6">
           <Text className="text-lg font-semibold text-gray-200 mb-3">Props ({boxPropsData.length || 0} items)</Text>
           {boxPropsData.length > 0 ? (
             <View className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {boxPropsData.map(prop => (
                 // Using Link as wrapper for navigation
                 <Link key={prop.id} href={`/props/${prop.id}`} asChild>
                   {/* Pass data to PropCard - Adjust props as needed based on PropCard definition */}
                   <PropCard 
                     prop={prop} 
                     // Assuming PropCard accepts an optional onPress or similar
                     // If not, the Link wrapper handles navigation
                   />
                 </Link>
               ))}
             </View>
           ) : (
             <View className="bg-gray-800 p-4 rounded-lg border border-gray-700">
               <Text className="text-gray-400 italic text-center">No props found in this box.</Text>
             </View>
           )}
        </View>
  
      </View>
    </ScrollView>
  );
} 