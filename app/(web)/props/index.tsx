import React, { useEffect, useState, useCallback, useContext } from 'react';
import { useRouter, usePathname, useFocusEffect } from 'expo-router';
import { View, Text, FlatList, ActivityIndicator, Alert, Button, TextInput, TouchableOpacity } from 'react-native'; // Simplified imports
import { ShowsContext } from '@/contexts/ShowsContext'; // Import ShowsContext
import { useProps } from '@/contexts/PropsContext'; // Import useProps hook
import type { Prop, PropCategory } from '@/shared/types/props';
import { propCategories } from '@/shared/types/props';
import { PlusCircle, FileDown, FileText, CopyX } from 'lucide-react'; // Import icons
import type { Show, Act, Scene } from '@/types'; // Import Show, Act, Scene types
import { WebPropCard } from '../../../src/platforms/web/components/WebPropCard';
import { PropLifecycleStatus, lifecycleStatusLabels } from '@/types/lifecycle'; // Import lifecycle types/labels

// --- Helper Function for Date Formatting ---
const formatDateTime = (isoString: string | undefined): string => {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    // Basic format, adjust as needed (e.g., use locale, add time)
    return date.toLocaleDateString(); 
  } catch (error) {
    console.error("Error formatting date:", isoString, error);
    return 'Invalid Date';
  }
};
// --- End Helper Function ---

// Map enum values to display names
const statusDisplayMap: Record<PropLifecycleStatus | 'All', string> = {
  All: 'All Statuses',
  ...lifecycleStatusLabels
};

export default function WebPropsListPage() {
  const pathname = usePathname(); // Get current pathname
  console.log(`--- Rendering: app/(web)/props/index.tsx (Pathname: ${pathname}) ---`);

  // Get state and functions from context
  const { props: contextProps, loading, error: contextError, deleteProp: contextDeleteProp } = useProps();
  const { selectedShow } = useContext(ShowsContext) ?? {}; // Add default empty object and nullish coalescing for safety
  
  console.log(`[WebPropsListPage Render] selectedShow ID: ${selectedShow?.id}, Context loading: ${loading}, Context error: ${contextError?.message}, Context props count: ${contextProps.length}`);
  
  const router = useRouter();
  
  // Local state for filters ONLY
  const [componentError, setComponentError] = useState<string | null>(null); // Local error state for component-specific errors (e.g., delete)
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PropLifecycleStatus | 'All'>('All');
  const [selectedAct, setSelectedAct] = useState<number | 'All'>('All');
  const [selectedScene, setSelectedScene] = useState<number | 'All'>('All');

  // Map context props (Prop[]) to FirebaseDocument<Prop>[] if needed by WebPropCard,
  // OR update WebPropCard to accept Prop[] directly.
  // For now, let's assume WebPropCard needs FirebaseDocument structure.
  // If contextProps structure is different, this mapping needs adjustment.
  const propsForFiltering: Prop[] = contextProps;

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this prop?')) return;
    setComponentError(null); // Clear local error
    try {
      await contextDeleteProp(id); // Use delete function from context
      console.log(`Prop ${id} deleted via context`);
    } catch (err) {
      console.error('Failed to delete prop via context:', err);
      setComponentError('Failed to delete prop. Please try again.'); // Set local error
    }
  }, [contextDeleteProp]);

  const handleEdit = (id: string) => {
    // Navigation remains the same
    router.push({ pathname: '/props/[id]/edit', params: { id } });
  };

  const handleAddNew = () => {
    if (!selectedShow || !selectedShow.id) {
      console.error("Cannot add new prop: No show selected.");
      setComponentError("Please select a show before adding a prop.");
      return;
    }
    // Navigation remains the same
    router.push({ pathname: '/props/new', params: { showId: selectedShow.id } });
  };

  // --- Placeholder Handlers for New Buttons ---
  const handleDuplicates = () => {
    alert('Duplicate prop detection/handling not implemented yet.');
  };

  const handleExportCSV = () => {
    if (!selectedShow || propsForFiltering.length === 0) { // Use direct props
      alert('No props to export.');
      return;
    }
    const headers = [
      'ID', 'Name', 'Category', 'Status', 'Description', 'Quantity',
      'Act', 'Scene', 'Storage Location', 'Current Location', 'Condition',
      'Source', 'Source Details', 'Price', 'Materials', 'Last Modified'
    ];
    const formatCsvCell = (value: any): string => {
      const stringValue = value === null || typeof value === 'undefined' ? '' : String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };
    const headerRow = headers.map(formatCsvCell).join(',');
    const dataRows = propsForFiltering.map(data => { // Map directly from Prop
        if (!data) return ''; // Should not happen if contextProps is filtered properly upstream, but safe check
        const row = [
            data.id,
            data.name,
            data.category,
            data.status,
            data.description,
            data.quantity,
            data.act,
            data.scene,
            data.location,
            data.currentLocation,
            data.condition,
            data.source,
            data.sourceDetails,
            data.price,
            (data.materials || []).join('; '),
            data.lastModifiedAt ? formatDateTime(data.lastModifiedAt as any) : ''
        ];
        return row.map(formatCsvCell).join(',');
    }).filter(row => row).join('\n');
    const csvContent = `${headerRow}\n${dataRows}`;
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const filename = `props-export-${selectedShow?.name?.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'show'}.csv`;
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); 
      console.log(`CSV export triggered for ${propsForFiltering.length} props.`);
    } catch (csvError) {
      console.error("Error during CSV export:", csvError);
      setComponentError("An error occurred while preparing the CSV file.");
    }
  };

  const handleGoToPDFPreview = () => {
    if (!selectedShow || !selectedShow.id) {
      setComponentError("Please select a show first.");
      return;
    }
    router.push({
      pathname: '/props/pdf-preview',
      params: { showId: selectedShow.id }
    });
  };
  // --- End Placeholder Handlers ---

  // Calculate available acts and scenes for dropdowns
  const availableActs = selectedShow?.acts || [];
  const availableScenes =
    selectedAct === "All"
      ? []
      : availableActs.find((act: Act) => act.id === selectedAct)?.scenes || [];

  // Combined filtering logic
  const filteredProps = propsForFiltering.filter((data, index) => { // Filter directly on Prop data
    
    // Log the first prop document being filtered
    if (index === 0) {
      console.log("Filtering data:", JSON.stringify(data, null, 2));
      console.log("Current Filters:", {
        selectedCategory,
        selectedStatus,
        selectedAct,
        selectedScene,
        searchTerm
      });
    }

    if (!data) return false;

    // Category Filter
    if (selectedCategory !== 'All' && data.category !== selectedCategory) {
      return false;
    }
    // Status Filter
    if (selectedStatus !== 'All' && data.status !== selectedStatus) {
      return false;
    }
    // Act Filter
    if (selectedAct !== 'All' && !data.isMultiScene && data.act !== selectedAct) {
       return false;
    }
    // Scene Filter
    if (selectedScene !== 'All' && !data.isMultiScene && data.scene !== selectedScene) {
      return false;
    }
    // Search Term Filter (Name or Description)
    if (searchTerm &&
        !data.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(data.description || '').toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    return true; // Include prop if all filters pass
  });
  // Log the result of filtering
  console.log(`WebPropsListPage Render: Filtered props count: ${filteredProps.length} (Raw count: ${propsForFiltering.length})`);

  // Final Render Check Log using context state
  console.log(`[WebPropsListPage Final Render Check] loading: ${loading}, contextError: ${contextError?.message}, componentError: ${componentError}, contextProps.length: ${contextProps.length}, filteredProps.length: ${filteredProps.length}`);

  // Restore the original return statement
  return (
    <View className="flex-1 bg-gray-900 text-white p-4">
      {/* Header Section */}
      <View className="mb-6 flex-row justify-between items-center flex-wrap gap-y-4">
        <Text className="text-2xl font-bold text-gray-100">
          Props for: {selectedShow?.name || 'Loading...'}
        </Text>
        {/* Action Buttons - Restored styled buttons with icons */}
        <View className="flex-row flex-wrap gap-2">
           <TouchableOpacity
             onPress={handleGoToPDFPreview}
             disabled={!selectedShow}
             className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex flex-row items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <FileText size={18} />
             <span>Export PDF</span>
           </TouchableOpacity>
           <TouchableOpacity
             onPress={handleExportCSV}
             disabled={!selectedShow || filteredProps.length === 0}
             className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 flex flex-row items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
           >
              <FileDown size={18} />
             <span>Export CSV</span>
           </TouchableOpacity>
            <TouchableOpacity
             onPress={handleDuplicates}
             disabled={!selectedShow}
             className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 flex flex-row items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
           >
              <CopyX size={18} />
             <span>Duplicates</span>
           </TouchableOpacity>
           <TouchableOpacity
             onPress={handleAddNew}
             disabled={!selectedShow}
             className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 flex flex-row items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle size={18} />
             <span>Add New Prop</span>
           </TouchableOpacity>
        </View>
      </View>

      {/* Filter Section */}
      <View className="mb-4 p-4 bg-gray-800 rounded-lg grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
         {/* Search Input */}
        <View>
            <Text className="block text-sm font-medium text-gray-300 mb-1">Search</Text>
            <TextInput
                className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
                placeholder="Search by name, description..."
                value={searchTerm}
                onChangeText={setSearchTerm}
            />
        </View>

        {/* Category Dropdown */}
        <View>
            <Text className="block text-sm font-medium text-gray-300 mb-1">Category</Text>
            <select
                className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
            >
                <option value="All">All Categories</option>
                {propCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>
        </View>
         {/* Status Dropdown */}
        <View>
            <Text className="block text-sm font-medium text-gray-300 mb-1">Status</Text>
            <select
                className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as PropLifecycleStatus | 'All')}
            >
                {Object.entries(statusDisplayMap).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
            </select>
        </View>
        {/* Act Dropdown */}
        <View>
            <Text className="block text-sm font-medium text-gray-300 mb-1">Act</Text>
            <select
                className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                value={String(selectedAct)}
                onChange={(e) => setSelectedAct(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                disabled={availableActs.length === 0}
            >
                <option value="All">All Acts</option>
                {availableActs.map((act: Act) => (
                    <option key={act.id} value={act.id}>{act.name || `Act ${act.id}`}</option>
                ))}
            </select>
        </View>
        {/* Scene Dropdown */}
        <View>
            <Text className="block text-sm font-medium text-gray-300 mb-1">Scene</Text>
            <select
                className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
                value={String(selectedScene)}
                onChange={(e) => setSelectedScene(e.target.value === 'All' ? 'All' : Number(e.target.value))}
                disabled={selectedAct === 'All' || availableScenes.length === 0}
            >
                <option value="All">All Scenes</option>
                {availableScenes.map((scene: Scene) => (
                    <option key={scene.id} value={scene.id}>{scene.name || `Scene ${scene.id}`}</option>
                ))}
            </select>
        </View>
      </View>

      {/* Display component-specific errors (e.g., from delete) */}
      {componentError && (
          <View className="mb-4 p-3 bg-red-900 border border-red-700 rounded">
              <Text className="text-red-400">{componentError}</Text>
          </View>
      )}
      
      {/* Loading / Error / Content Section - Uses context state */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FBBF24" />
          <Text className="text-gray-400 mt-2">Loading props...</Text>
        </View>
      ) : contextError ? ( // Use contextError
        <View className="flex-1 justify-center items-center">
          <Text className="text-red-500">Error loading props: {contextError.message}</Text>
        </View>
      ) : filteredProps.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-400">No props found matching the current filters.</Text>
        </View>
      ) : (
        <View className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProps.map((prop) => (
            <WebPropCard
              key={prop.id}
              prop={prop}
              onEdit={() => handleEdit(prop.id)}
              onDelete={() => handleDelete(prop.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
} 