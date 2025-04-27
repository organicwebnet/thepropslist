import React, { useEffect, useState, useCallback, useContext } from 'react';
import { useRouter } from 'expo-router';
import { View, Text } from 'react-native'; // Simplified imports
import { useFirebase } from '@/contexts/FirebaseContext';
import { ShowsContext } from '@/contexts/ShowsContext'; // Import ShowsContext
import type { Prop, PropCategory } from '@/shared/types/props';
import { propCategories } from '@/shared/types/props';
import type { FirebaseDocument } from '@/shared/services/firebase/types';
import { WebPropCard } from '../../../src/platforms/web/components/WebPropCard';
import { PropLifecycleStatus, lifecycleStatusLabels } from '@/types/lifecycle'; // Import lifecycle types/labels
import type { Show } from '@/types'; // Import Show type

export default function WebPropsListPage() {
  console.log("--- Rendering: app/(web)/props/index.tsx (Restored) ---");

  // Restore state, hooks, effects, handlers
  const { service } = useFirebase();
  const showsContext = useContext(ShowsContext); // Use ShowsContext
  const selectedShow = showsContext?.selectedShow; // Get selected show
  const router = useRouter();
  const [props, setProps] = useState<FirebaseDocument<Prop>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PropLifecycleStatus | 'All'>('All');
  const [selectedAct, setSelectedAct] = useState<number | 'All'>('All');
  const [selectedScene, setSelectedScene] = useState<number | 'All'>('All');

  useEffect(() => {
    console.log("WebPropsListPage Effect: Attempting to fetch for showId:", selectedShow?.id);
    if (!service || !selectedShow) { 
      setLoading(false);
      setProps([]);
      return;
    }

    setLoading(true);
    const unsubscribe = service.listenToCollection<Prop>(
      'props', // Collection path
      (documents) => { // Callback for when data arrives
        // Documents received should now be pre-filtered by Firestore
        console.log("WebPropsListPage Effect: Filtered props received from listener:", documents);
        setProps(documents); // Directly set the received documents
        setError(null);
        setLoading(false);
      },
      (err) => { // Error callback
        console.error('Failed to fetch props:', err);
        setError('Failed to load props. Please try again later.');
        setLoading(false);
      },
      // Pass the query options object
      { where: [['showId', '==', selectedShow.id]] }
    );

    return () => unsubscribe();
  }, [service, selectedShow]);

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
    router.push('/props/new');
  };

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
    <div className="p-4 md:p-6 bg-gray-900 min-h-screen text-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Props List ({selectedShow?.name || 'No Show Selected'})</h1>
        <button 
          onClick={handleAddNew}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
        >
          Add New Prop
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
         {/* Search Input */}
        <div>
          <label htmlFor="search-filter" className="block text-sm font-medium text-gray-300 mb-1">Search:</label>
          <input
            type="text"
            id="search-filter"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name or description..."
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
        </div>

        {/* Category Filter */}
        <div>
          <label htmlFor="category-filter" className="block text-sm font-medium text-gray-300 mb-1">Category:</label>
          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          >
             <option value="All">All Categories</option>
             {propCategories.map(category => (<option key={category} value={category}>{category}</option>))
             }
          </select>
        </div>

         {/* Status Filter */}
         <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-300 mb-1">Status:</label>
          <select
            id="status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as PropLifecycleStatus | 'All')}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          >
            <option value="All">All Statuses</option>
            {Object.entries(lifecycleStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Act Filter */}
        <div>
          <label htmlFor="act-filter" className="block text-sm font-medium text-gray-300 mb-1">Act:</label>
          <select
            id="act-filter"
            value={selectedAct}
            onChange={(e) => {
              const actId = e.target.value === 'All' ? 'All' : parseInt(e.target.value);
              setSelectedAct(actId);
              setSelectedScene('All'); // Reset scene when act changes
            }}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            disabled={!selectedShow} // Disable if no show selected
          >
            <option value="All">All Acts</option>
            {availableActs.map(act => (
              <option key={act.id} value={act.id}>{act.name || `Act ${act.id}`}</option>
            ))}
          </select>
        </div>

        {/* Scene Filter */}
        <div>
          <label htmlFor="scene-filter" className="block text-sm font-medium text-gray-300 mb-1">Scene:</label>
          <select
            id="scene-filter"
            value={selectedScene}
            onChange={(e) => {
              const sceneId = e.target.value === 'All' ? 'All' : parseInt(e.target.value);
              setSelectedScene(sceneId);
            }}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            disabled={selectedAct === 'All'} // Disable if no act selected
          >
            <option value="All">All Scenes</option>
             {availableScenes.map(scene => (
              <option key={scene.id} value={scene.id}>{scene.name || `Scene ${scene.id}`}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-10">
          <p>Loading props...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-10 text-red-500">
          <p>Error: {error}</p>
        </div>
      )}

      {!loading && !error && filteredProps.length === 0 && (
         <div className="text-center py-10 text-gray-500">
           <p>{selectedCategory === 'All' && searchTerm === '' && selectedStatus === 'All' && selectedAct === 'All' && selectedScene === 'All' 
                ? 'No props found for this show. Add your first prop!' 
                : `No props found matching the current filters.`}
           </p>
         </div>
      )}

      {!loading && !error && filteredProps.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProps.map((propDoc) => (
            <WebPropCard 
              key={propDoc.id} 
              prop={{ ...propDoc.data, id: propDoc.id } as Prop}
              onEdit={handleEdit}
              onDelete={handleDelete} 
            />
          ))}
        </div>
      )}
    </div>
  );
} 