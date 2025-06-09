import React, { useEffect, useState, useCallback, useContext } from 'react';
import { useRouter, usePathname, useFocusEffect } from 'expo-router';
import { Platform, FlatList, Alert } from 'react-native';
import { ShowsContext } from '../../../src/contexts/ShowsContext.tsx';
import { useProps } from '../../../src/contexts/PropsContext.tsx';
import type { Prop, PropCategory } from '../../../src/shared/types/props.ts';
import { propCategories } from '../../../src/shared/types/props.ts';
import type { Show, Act, Scene } from '../../../src/shared/services/firebase/types.ts';
import { PlusCircle, FileDown, FileText, CopyX } from 'lucide-react';
import type { Show as SharedShow } from '../../../src/shared/types/props.ts';
import { WebPropCard } from '../../../src/platforms/web/components/WebPropCard.tsx';
import { PropLifecycleStatus, lifecycleStatusLabels } from '../../../src/types/lifecycle.ts';

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
  // Platform check at the beginning
  if (Platform.OS !== 'web') {
    console.error("[app/(web)/props/index.tsx] This WEB-ONLY page was reached on NATIVE. This should not happen. Check navigation.");
    return (
      <div style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <p style={{color: 'red', textAlign: 'center', padding: 20}}>
          Critical Error: Web page (WebPropsListPage) rendered on native platform. Please report this bug.
        </p>
      </div>
    );
  }

  const pathname = usePathname();
  console.log(`--- Rendering: app/(web)/props/index.tsx (Pathname: ${pathname}) ---`);

  // Get state and functions from context
  const { props: contextProps, loading, error: contextError, deleteProp: contextDeleteProp } = useProps();
  const { selectedShow } = useContext(ShowsContext) ?? {};
  
  console.log(`[WebPropsListPage Render] selectedShow ID: ${selectedShow?.id}, Context loading: ${loading}, Context error: ${contextError?.message}, Context props count: ${contextProps.length}`);
  
  const router = useRouter();
  
  // Local state for filters ONLY
  const [componentError, setComponentError] = useState<string | null>(null);
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
    setComponentError(null);
    try {
      await contextDeleteProp(id);
      console.log(`Prop ${id} deleted via context`);
    } catch (err) {
      console.error('Failed to delete prop via context:', err);
      setComponentError('Failed to delete prop. Please try again.');
    }
  }, [contextDeleteProp]);

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
    if (!selectedShow || propsForFiltering.length === 0) {
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
    const dataRows = propsForFiltering.map(data => {
        if (!data) return '';
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
  const filteredProps = propsForFiltering.filter((data, index) => {
    
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

    return true;
  });
  // Log the result of filtering
  console.log(`WebPropsListPage Render: Filtered props count: ${filteredProps.length} (Raw count: ${propsForFiltering.length})`);

  // Final Render Check Log using context state
  console.log(`[WebPropsListPage Final Render Check] loading: ${loading}, contextError: ${contextError?.message}, componentError: ${componentError}, contextProps.length: ${contextProps.length}, filteredProps.length: ${filteredProps.length}`);

  // Restore the original return statement
  return (
    <div className="flex-1 bg-gray-900 text-white p-4">
      {/* Header Section */}
      <div className="mb-6 flex-row justify-between items-center flex-wrap gap-y-4">
        <h2 className="text-2xl font-bold text-gray-100">
          Props for: {selectedShow?.name || 'Loading...'}
        </h2>
        {/* Action Buttons */}
        <div className="flex-row flex-wrap gap-2">
           <button
             onClick={handleGoToPDFPreview}
             disabled={!selectedShow}
             className="appearance-none border-none bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-opacity-50 flex flex-row items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <FileText size={18} />
             <span>Export PDF</span>
           </button>
           <button
             onClick={handleExportCSV}
             disabled={!selectedShow || filteredProps.length === 0}
             className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 flex flex-row items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
           >
              <FileDown size={18} />
             <span>Export CSV</span>
           </button>
          {/* Add New Prop Button */}
          <button
            onClick={handleAddNew}
            disabled={!selectedShow}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 flex flex-row items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusCircle size={18} />
            <span>Add New Prop</span>
          </button>
           {/* Additional Action Buttons (Placeholder) */}
           <button
            onClick={handleDuplicates}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-50 flex flex-row items-center gap-1"
          >
            <CopyX size={18} />
            <span>Find Duplicates</span>
          </button>
        </div>
      </div>

      {/* Filter Section - ADDED */}
      <div className="mb-6 p-4 bg-gray-800 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
          {/* Search Input */}
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="searchInput" className="block text-sm font-medium text-gray-300 mb-1">Search</label>
            <input
              id="searchInput"
              type="text"
              className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <select
              id="categoryFilter"
              className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as PropCategory | 'All')}
            >
              <option value="All">All Categories</option>
              {propCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-300 mb-1">Status</label>
            <select
              id="statusFilter"
              className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as PropLifecycleStatus | 'All')}
            >
              {Object.entries(statusDisplayMap).map(([value, label]) => (
                 <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Act Filter */}
          {selectedShow && availableActs.length > 0 && (
            <div className="flex-1 min-w-[150px]">
              <label htmlFor="actFilter" className="block text-sm font-medium text-gray-300 mb-1">Act</label>
              <select
                id="actFilter"
                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={selectedAct === 'All' ? 'All' : String(selectedAct)}
                onChange={(e) => setSelectedAct(e.target.value === 'All' ? 'All' : Number(e.target.value))}
              >
                <option value="All">All Acts</option>
                {availableActs.map((act: Act) => (
                  <option key={act.id} value={String(act.id)}>{act.name || `Act ${act.id}`}</option>
                ))}
              </select>
            </div>
          )}

          {/* Scene Filter */}
          {selectedShow && selectedAct !== 'All' && availableScenes.length > 0 && (
            <div className="flex-1 min-w-[150px]">
              <label htmlFor="sceneFilter" className="block text-sm font-medium text-gray-300 mb-1">Scene</label>
              <select
                id="sceneFilter"
                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={selectedScene === 'All' ? 'All' : String(selectedScene)}
                onChange={(e) => setSelectedScene(e.target.value === 'All' ? 'All' : Number(e.target.value))}
              >
                <option value="All">All Scenes</option>
                {availableScenes.map((scene: Scene) => (
                  <option key={scene.id} value={String(scene.id)}>{scene.name || `Scene ${scene.id}`}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
      {/* End Filter Section */}

      {/* Loading and Error States */}
      {loading && <p className="text-center my-6 text-lg">Loading props...</p>}
      {contextError && <p className="text-red-400 text-center my-4">Error loading props: {contextError.message}</p>}
      {componentError && <p className="text-red-400 text-center my-4">{componentError}</p>}

      {/* Props List or Empty State */}
      {!loading && filteredProps.length === 0 && (
        <div className="text-center py-10">
          <p className="text-xl text-gray-400">No props found matching your criteria.</p>
          {selectedShow && (
            <p className="text-gray-500 mt-2">Try adjusting filters or adding a new prop to "{selectedShow.name}".</p>
          )}
        </div>
      )}

      {!loading && filteredProps.length > 0 && (
        <FlatList
          data={filteredProps}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WebPropCard 
              prop={item} 
              onDelete={() => handleDelete(item.id)}
            />
          )}
          className="space-y-4"
        />
      )}
    </div>
  );
} 