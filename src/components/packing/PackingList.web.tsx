import { useState, useEffect } from 'react';
import { ActivityIndicator, Text, View, Button } from 'react-native'; // Correct import for ActivityIndicator and Button
// Import PackingBox/PackedProp from correct sub-directory
import { PackingBox, PackedProp } from '../../types/packing.ts'; 
import { Show } from '../../types/index.ts'; // Keep Show from main types
import { Prop } from '../../shared/types/props.ts'; // Import correct Prop type
import { PackingBoxCard } from './PackingBoxCard.tsx';
import { PropSelector } from './PropSelector.tsx';
import { X, Clock, HandCoins, Package, PackageOpen, AlertTriangle } from 'lucide-react'; 
import { Timestamp } from 'firebase/firestore';
// Add import for PackingContainer used in casting
import { PackingContainer } from '../../shared/services/inventory/packListService.ts';

// Define PropInstance based on the imported Prop type
interface PropInstance extends Prop { // Extend the imported Prop type
  instanceId: string; 
  isPacked: boolean;
}

// REMOVED Local Prop interface definition (Lines 64-114 originally)

interface PackingListProps {
  show: Show;
  boxes: PackingBox[]; // Uses type from packing
  props: Prop[]; 
  isLoading?: boolean;
  onCreateBox: (props: PackedProp[], act: number, scene: number) => void; // Uses type from packing
  onUpdateBox: (boxId: string, updates: Partial<PackingBox>) => Promise<void>; // Uses type from packing
  onDeleteBox: (boxId: string) => Promise<void>;
}

export function PackingList({
  show,
  boxes, // Now PackingBox[] from packing
  props, 
  isLoading = false,
  onCreateBox,
  onUpdateBox, // Now expects Partial<PackingBox> from packing
  onDeleteBox,
}: PackingListProps) {
  const [currentBoxName, setCurrentBoxName] = useState('');
  const [selectedProps, setSelectedProps] = useState<PropInstance[]>([]); 
  const [propInstances, setPropInstances] = useState<PropInstance[]>([]); 
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);

  useEffect(() => {
    const instances: PropInstance[] = [];
    // props here uses the imported Prop type
    props.forEach(prop => { 
      const quantity = prop.quantity || 1;
      for (let i = 0; i < quantity; i++) {
        instances.push({
          ...prop, // Spread properties from imported Prop
          instanceId: `${prop.id}-${i}`,
          isPacked: false
        });
      }
    });
    setPropInstances(instances);
  }, [props]);

  // Update prop instances when boxes change to mark packed items
  useEffect(() => {
    setPropInstances(prevInstances => {
      const packedPropIds = new Set<string>();
      boxes.forEach(box => {
        box.props?.forEach((packedProp: PackedProp) => {
          for (let i = 0; i < (packedProp.quantity || 1); i++) {
            packedPropIds.add(`${packedProp.propId}-${i}`);
          }
        });
      });

      return prevInstances.map(instance => ({
        ...instance,
        isPacked: packedPropIds.has(instance.instanceId)
      }));
    });
  }, [boxes]);

  const handleAddProp = (propInstance: PropInstance) => {
    if (!selectedProps.some(p => p.instanceId === propInstance.instanceId)) {
      setSelectedProps([...selectedProps, propInstance]);
    }
  };

  const handleRemoveProp = (instanceId: string) => {
    setSelectedProps(selectedProps.filter(p => p.instanceId !== instanceId));
  };

  // --- Combined Handler for Create/Update ---
  const handleSaveBox = async () => {
    if (selectedProps.length === 0 || !currentBoxName) return;

    // Map selected PropInstances back to PackedProp format
    const packedProps: PackedProp[] = selectedProps.map(prop => ({
      propId: prop.id,
      name: prop.name ?? 'Unnamed Prop',
      quantity: 1, // Assuming quantity 1 per instance for now
      weight: prop.weight ?? 0,
      weightUnit: prop.weightUnit ?? 'lb',
      isFragile: isFragile(prop) // Reuse existing isFragile logic
    }));

    if (editingBoxId) {
      // --- Update Existing Box ---
      try {
        await onUpdateBox(editingBoxId, { name: currentBoxName, props: packedProps });
      } catch (error) {
        console.error(`Error updating box ${editingBoxId}:`, error);
        // TODO: Add user feedback for error
        return; // Don't clear form on error
      }
    } else {
      // --- Create New Box ---
      // Use act/scene from the first prop instance if available (as before)
      const firstProp = selectedProps[0];
      try {
        await onCreateBox(packedProps, firstProp?.act ?? 0, firstProp?.scene ?? 0);
      } catch (error) {
        console.error(`Error creating box ${currentBoxName}:`, error);
         // TODO: Add user feedback for error
        return; // Don't clear form on error
      }
    }

    // Reset form and editing state on success
    setSelectedProps([]);
    setCurrentBoxName('');
    setEditingBoxId(null);
  };

  // Calculate total weight of selected props
  const totalWeight = selectedProps.reduce((total, prop) => {
    if (typeof prop?.weight !== 'number') return total;
    const weight = prop.weightUnit === 'kg' ? prop.weight : prop.weight * 0.453592;
    return total + weight;
  }, 0);

  // Check if a prop is fragile based on available fields in imported Prop type
  const isFragile = (prop: PropInstance) => {
    const fragileKeywords = ['fragile', 'delicate', 'breakable', 'glass'];
    // Check description or notes, as handlingInstructions is not directly on Prop
    return fragileKeywords.some(keyword => 
      prop.description?.toLowerCase().includes(keyword) ||
      prop.notes?.toLowerCase().includes(keyword) ||
      prop.tags?.includes('fragile') // Example: Check tags if used
    );
  };

  const isBoxHeavy = totalWeight > 23; // Standard lifting limit

  // Filter out packed props from the available list
  const availablePropInstances = propInstances.filter(instance => !instance.isPacked);

  // Helper function to render the source icon and tooltip
  const renderSourceIcon = (prop: PropInstance) => {
    // Source values now align with PropSource from shared/types/props
    if (prop?.source === 'rented') {
      return (
        <div className="absolute top-2 right-2 bg-yellow-500/20 p-1.5 rounded-full" title="Rented Item">
          <Clock className="h-4 w-4 text-yellow-500" />
        </div>
      );
    } else if (prop?.source === 'borrowed') {
      return (
        <div className="absolute top-2 right-2 bg-blue-500/20 p-1.5 rounded-full" title="Borrowed Item">
          <HandCoins className="h-4 w-4 text-blue-500" />
        </div>
      );
    }
    // Add cases for 'bought', 'made', 'owned', 'created' if needed
    return null;
  };

  // --- Update handler for Edit Box ---
  const handleEditBox = (box: PackingBox) => {
    // Editing box
    setEditingBoxId(box.id);
    setCurrentBoxName(box.name ?? '');

    // Find the corresponding PropInstance objects for the props in the box
    const propsToSelect: PropInstance[] = [];
    box.props?.forEach((packedProp: PackedProp) => {
      const matchingInstances = propInstances.filter(inst => inst.id === packedProp.propId);
      for (let i = 0; i < (packedProp.quantity || 1); i++) {
        const instanceId = `${packedProp.propId}-${i}`;
        // Find the specific instance
        const instanceToAdd = matchingInstances.find(inst => inst.instanceId === instanceId);
        if (instanceToAdd) {
          // Only add if not already selected (handles potential duplicates if logic is complex)
          if (!propsToSelect.some(p => p.instanceId === instanceId)) {
             propsToSelect.push(instanceToAdd);
          }
        } else {
          // Could not find matching instance for packed prop
        }
      }
    });
    setSelectedProps(propsToSelect);
  };

  // --- Add handler for Cancel Edit ---
  const handleCancelEdit = () => {
    setEditingBoxId(null);
    setCurrentBoxName('');
    setSelectedProps([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Column 1: Available Props */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-200">Available Props</h2>
        <div className="grid grid-cols-1 gap-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {availablePropInstances.map((propInstance) => (
            <button
              key={propInstance.instanceId}
              onClick={() => handleAddProp(propInstance)}
              disabled={selectedProps.some(p => p.instanceId === propInstance.instanceId)}
              className={`
                relative flex items-center p-4 rounded-lg text-left
                ${
                  selectedProps.some(p => p.instanceId === propInstance.instanceId)
                    ? 'bg-blue-600/20 border-2 border-blue-400'
                    : 'bg-blue-950 border border-gray-700 hover:border-gray-600'
                }
                disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150
              `}
            >
              {propInstance.images?.[0]?.url ? (
                <img 
                  src={propInstance.images[0].url}
                  alt={propInstance.name}
                  className="w-12 h-12 rounded-md object-cover mr-4 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-md bg-gray-700 flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-xl font-bold text-gray-400">{propInstance.name[0]?.toUpperCase()}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                 <div className="font-medium text-gray-200 truncate">{propInstance?.name ?? 'Unnamed Prop'}</div>
                 <div className="text-sm text-gray-400 truncate">{propInstance?.category ?? 'No Category'}</div>
                 {propInstance.weight && (
                  <div className="text-xs text-gray-500">
                    Weight: {propInstance.weight} {propInstance.weightUnit}
                  </div>
                )}
                {isFragile(propInstance) && (
                  <div className="mt-1 px-2 py-0.5 inline-block bg-red-500/20 text-red-400 text-xs rounded-full">
                    Fragile
                  </div>
                )}
              </div>
              {renderSourceIcon(propInstance)}
            </button>
          ))}
        </div>
      </div>

      {/* Column 2: Selected Props & Box Creation */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-200">{editingBoxId ? 'Edit Box' : 'Create New Box'}</h2>
        <div className="p-6 bg-gray-800 rounded-lg shadow-lg">
          <input
            type="text"
            value={currentBoxName}
            onChange={(e) => setCurrentBoxName(e.target.value)}
            placeholder="Enter Box Name"
            className="w-full p-3 mb-4 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar mb-4">
            {selectedProps.length === 0 && (
              <p className="text-gray-500 text-center py-4">No props selected yet.</p>
            )}
            {selectedProps.map((prop) => (
              <div 
                key={prop.instanceId} 
                className="flex items-center justify-between p-3 bg-gray-700/50 rounded-md"
              >
                <div className="flex items-center min-w-0">
                  {prop.images?.[0]?.url ? (
                    <img 
                      src={prop.images[0].url} 
                      alt={prop.name} 
                      className="w-8 h-8 rounded-md object-cover mr-3 flex-shrink-0" 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-gray-600 flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-sm font-bold text-gray-300">{prop.name[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  <span className="text-gray-300 truncate" title={prop.name}>{prop.name}</span>
                </div>
                <button 
                  onClick={() => handleRemoveProp(prop.instanceId)}
                  className="p-1 text-red-400 hover:text-red-300"
                  title="Remove Prop"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          {selectedProps.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700 space-y-2 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span>{selectedProps.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Approx. Weight:</span>
                <span>{totalWeight.toFixed(2)} kg</span>
              </div>
              {isBoxHeavy && (
                <div className="text-center text-yellow-400 font-semibold p-2 bg-yellow-500/10 rounded-md">
                  This box may be heavy. Consider splitting.
                </div>
              )}
            </div>
          )}
          
          <div className="mt-6 flex space-x-3">
            <button
              onClick={handleSaveBox}
              disabled={selectedProps.length === 0 || !currentBoxName}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              {editingBoxId ? 'Update Box' : 'Create Box'}
            </button>
            {editingBoxId && (
              <button
                onClick={handleCancelEdit}
                className="bg-gray-600 hover:bg-gray-500 text-gray-200 font-semibold py-3 px-4 rounded-md transition-colors duration-150"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Column 3: Existing Boxes */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-200">Packed Boxes for {show?.name ?? 'Current Show'}</h2>
        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <ActivityIndicator size="large" color="#3B82F6" /> {/* Blue color for loading */}
          </div>
        )}
        {!isLoading && boxes.length === 0 && (
          <div className="text-center py-10 px-6 bg-gray-800 rounded-lg">
            <Package className="mx-auto h-12 w-12 text-gray-500" />
            <h3 className="mt-2 text-lg font-medium text-gray-300">No Boxes Packed Yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start selecting props and create your first packing box for this show.
            </p>
          </div>
        )}
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {boxes.map((box: PackingBox) => ( // Explicitly type box if not inferred
            <PackingBoxCard 
              key={box.id} 
              box={box} // Remove the cast to PackingContainer
              onEdit={() => handleEditBox(box)} 
              onDelete={() => onDeleteBox(box.id)} 
            />
          ))}
        </div>
      </div>
    </div>
  );
} 
