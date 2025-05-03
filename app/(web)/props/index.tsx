import React, { useEffect, useState, useCallback, useContext } from 'react';
import { useRouter, usePathname, useFocusEffect } from 'expo-router';
import { View, Text, FlatList, ActivityIndicator, Alert, Button, TextInput, TouchableOpacity } from 'react-native'; // Simplified imports
import { useFirebase } from '@/contexts/FirebaseContext';
import { ShowsContext } from '@/contexts/ShowsContext'; // Import ShowsContext
import type { Prop, PropCategory } from '@/shared/types/props';
import { propCategories } from '@/shared/types/props';
import { PlusCircle, FileDown, FileText, CopyX } from 'lucide-react'; // Import icons
import type { FirebaseDocument } from '@/shared/services/firebase/types';
import { WebPropCard } from '../../../src/platforms/web/components/WebPropCard';
import { PropLifecycleStatus, lifecycleStatusLabels } from '@/types/lifecycle'; // Import lifecycle types/labels
import type { Show } from '@/types'; // Import Show type

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

  // Restore state, hooks, effects, handlers
  const { service } = useFirebase();
  const showsContext = useContext(ShowsContext); // Use ShowsContext
  const selectedShow = showsContext?.selectedShow;
  console.log(`[WebPropsListPage Render] selectedShow ID from context: ${selectedShow?.id ?? 'null/undefined'}`);
  const router = useRouter();
  const [props, setProps] = useState<FirebaseDocument<Prop>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PropLifecycleStatus | 'All'>('All');
  const [selectedAct, setSelectedAct] = useState<number | 'All'>('All');
  const [selectedScene, setSelectedScene] = useState<number | 'All'>('All');

  useFocusEffect(
    useCallback(() => {
      // This runs when the screen comes into focus
      console.log(`[WebPropsListPage FocusEffect] Screen focused. Pathname: ${pathname}. SelectedShow ID: ${selectedShow?.id ?? 'null/undefined'}`);
      // Optional: Trigger data refresh if needed when screen focuses
      // fetchData(); // Be careful with this to avoid infinite loops

      return () => {
        // This runs when the screen goes out of focus
        console.log(`[WebPropsListPage FocusEffect] Screen blurred. Pathname: ${pathname}`);
      };
    }, [pathname, selectedShow]) // Re-run effect if pathname or selectedShow changes while focused
  );

  useEffect(() => {
    console.log(`[WebPropsListPage Mount/Update Effect] Running effect. SelectedShow ID: ${selectedShow?.id ?? 'null/undefined'}. Pathname: ${pathname}`);
    if (!service || !selectedShow) { 
      console.log("[WebPropsListPage Effect] No service or selectedShow, returning early.");
      setLoading(false);
      setProps([]);
      return;
    }

    console.log(`[WebPropsListPage Effect] Setting up listener for showId: ${selectedShow.id}`);
    setLoading(true);
    const unsubscribe = service.listenToCollection<Prop>(
      'props', // Collection path
      (documents) => { // Callback for when data arrives
        console.log(`[WebPropsListPage Effect Callback] Listener received ${documents.length} props for showId: ${selectedShow.id}`);
        setProps(documents); // Directly set the received documents
        setError(null);
        setLoading(false);
      },
      (err) => { // Error callback
        console.error(`[WebPropsListPage Effect Error] Listener error for showId: ${selectedShow.id}`, err);
        setError('Failed to load props. Please try again later.');
        setLoading(false);
      },
      // Pass the query options object
      { where: [['showId', '==', selectedShow.id]] }
    );

    return () => {
        console.log(`[WebPropsListPage Effect Cleanup] Cleaning up listener for showId: ${selectedShow?.id ?? 'Cleanup occurred after show became null?'}`);
        unsubscribe();
    };
  }, [service, selectedShow, pathname]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this prop?')) {
      return;
    }
    try {
      if (!service?.deleteDocument) {
        throw new Error("Delete function not available on service.");
      }
      await service.deleteDocument('props', id);
      console.log(`Prop ${id} deleted`);
    } catch (err) {
      console.error('Failed to delete prop:', err);
      setError('Failed to delete prop. Please try again.');
    }
  }, [service]);

  const handleEdit = (id: string) => {
    router.push(`/props/${id}` as any);
  };

  const handleAddNew = () => {
    if (!selectedShow || !selectedShow.id) {
      // Prevent navigation if no show is selected
      console.error("Cannot add new prop: No show selected.");
      setError("Please select a show before adding a prop."); // Or use Alert
      return;
    }
    // Correctly navigate with showId as a query parameter
    // Using the (web) group path
    router.push({ 
      pathname: '/(web)/props/new', 
      params: { showId: selectedShow.id } 
    });
  };

  // --- Placeholder Handlers for New Buttons ---
  const handleDuplicates = () => {
    alert('Duplicate prop detection/handling not implemented yet.');
  };

  const handleExportCSV = () => {
    if (!selectedShow || filteredProps.length === 0) {
      alert('No props to export.');
      return;
    }

    // Define headers for the CSV file
    const headers = [
      'ID', 'Name', 'Category', 'Status', 'Description', 'Quantity',
      'Act', 'Scene', 'Storage Location', 'Current Location', 'Condition',
      'Source', 'Source Details', 'Price', 'Materials', 'Last Modified'
      // Add more headers as needed based on PropFormData fields
    ];
    
    // Function to safely format a cell value for CSV
    const formatCsvCell = (value: any): string => {
      const stringValue = value === null || typeof value === 'undefined' ? '' : String(value);
      // Escape double quotes by doubling them and enclose in quotes if it contains comma, quote, or newline
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Create header row
    const headerRow = headers.map(formatCsvCell).join(',');

    // Create data rows from filteredProps
    const dataRows = filteredProps.map(propDoc => {
      const data = propDoc.data;
      if (!data) return ''; // Skip if data is missing (shouldn't happen with filtered)
      
      const row = [
        propDoc.id,
        data.name,
        data.category,
        data.status,
        data.description,
        data.quantity,
        data.act,
        data.scene,
        data.location, // Storage location
        data.currentLocation, // Current location
        data.condition,
        data.source,
        data.sourceDetails,
        data.price,
        (data.materials || []).join('; '), // Join materials array
        data.lastModifiedAt ? formatDateTime(data.lastModifiedAt) : '' // Format date
        // Add other data fields corresponding to headers
      ];
      return row.map(formatCsvCell).join(',');
    }).filter(row => row).join('\n'); // Filter out potential empty rows and join with newline

    const csvContent = `${headerRow}\n${dataRows}`;
    
    // Create Blob and trigger download
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      // Generate filename based on show name, replacing spaces
      const filename = `props-export-${selectedShow.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') || 'show'}.csv`;
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Clean up the object URL
      console.log(`CSV export triggered for ${filteredProps.length} props.`);
    } catch (error) {
      console.error("Error during CSV export:", error);
      alert("An error occurred while preparing the CSV file.");
    }
  };

  const handleGoToPDFPreview = () => {
    if (!selectedShow || !selectedShow.id) {
      setError("Please select a show first.");
      return;
    }
    // Navigate to a (currently non-existent) PDF preview route
    router.push({
      pathname: '/(web)/props/pdf-preview' as any,
      params: { showId: selectedShow.id }
    });
  };
  // --- End Placeholder Handlers ---

  // Calculate available acts and scenes for dropdowns
  const availableActs = selectedShow?.acts || [];
  const availableScenes =
    selectedAct === "All"
      ? []
      : availableActs.find((act) => act.id === selectedAct)?.scenes || [];

  // Combined filtering logic
  const filteredProps = props.filter((propDoc, index) => {
    const data = propDoc.data;
    
    // Log the first prop document being filtered
    if (index === 0) {
      console.log("Filtering propDoc:", JSON.stringify(propDoc, null, 2));
      console.log("Extracted data:", JSON.stringify(data, null, 2));
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
  console.log(`WebPropsListPage Render: Filtered props count: ${filteredProps.length} (Raw count: ${props.length})`);

  // Restore the original return statement
  return (
    <View className="flex-1 bg-gray-900 text-white p-4">
      {/* Header Section */}
      <View className="mb-6 flex-row justify-between items-center flex-wrap gap-y-4">
        <Text className="text-2xl font-bold text-gray-100">
          Props for: {selectedShow ? selectedShow.name : 'Loading...'}
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
                {availableActs.map((act) => (
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
                {availableScenes.map((scene) => (
                    <option key={scene.id} value={scene.id}>{scene.name || `Scene ${scene.id}`}</option>
                ))}
            </select>
        </View>
      </View>

      {/* Loading / Error / Content Section */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FBBF24" />
          <Text className="text-gray-400 mt-2">Loading props...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-red-500">Error: {error}</Text>
        </View>
      ) : filteredProps.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-400">No props found matching the current filters.</Text>
        </View>
      ) : (
        <View className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProps.map((propDoc) => (
            <WebPropCard
              key={propDoc.id}
              prop={{ ...propDoc.data!, id: propDoc.id }}
              onEdit={() => handleEdit(propDoc.id)}
              onDelete={() => handleDelete(propDoc.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
} 