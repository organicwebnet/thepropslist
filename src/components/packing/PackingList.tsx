import { useState, useEffect } from 'react';
import { ActivityIndicator, Text, View, Button, StyleSheet } from 'react-native'; // Correct import for ActivityIndicator and Button
// Import PackingBox/PackedProp from correct sub-directory
import { PackingBox, PackedProp } from '../../types/packing.ts'; 
import { Show } from '../../shared/services/firebase/types.ts'; // Changed import path
import { Prop } from '../../shared/types/props.ts'; // Import correct Prop type
import { PackingBoxCard } from './PackingBoxCard.tsx';
import { PropSelector } from './PropSelector.tsx';
import { X, Clock, HandCoins, Package, PackageOpen } from 'lucide-react'; 
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
  const [isSpareBox, setIsSpareBox] = useState(false);
  const [spareProps, setSpareProps] = useState<Set<string>>(new Set());

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
          // Assuming PackedProp has propId and quantity
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
      isFragile: isFragile(prop), // Reuse existing isFragile logic
      isSpare: spareProps.has(prop.instanceId) || isSpareBox // Mark as spare if in spare set or if box is spare box
    }));

    if (editingBoxId) {
      // --- Update Existing Box ---
      try {
        await onUpdateBox(editingBoxId, { name: currentBoxName, props: packedProps, isSpareBox });
      } catch (error) {
        // TODO: Add user feedback for error
        return; // Don't clear form on error
      }
    } else {
      // --- Create New Box ---
      // Use act/scene from the first prop instance if available (as before)
      const firstProp = selectedProps[0];
      try {
        await onCreateBox(packedProps, firstProp?.act ?? 0, firstProp?.scene ?? 0, isSpareBox);
      } catch (error) {
         // TODO: Add user feedback for error
        return; // Don't clear form on error
      }
    }

    // Reset form and editing state on success
    setSelectedProps([]);
    setCurrentBoxName('');
    setEditingBoxId(null);
    setIsSpareBox(false);
    setSpareProps(new Set());
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
    setIsSpareBox(box.isSpareBox ?? false);

    // Find the corresponding PropInstance objects for the props in the box
    const propsToSelect: PropInstance[] = [];
    const sparePropsSet = new Set<string>();
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
          // Mark as spare if the packed prop is marked as spare
          if (packedProp.isSpare) {
            sparePropsSet.add(instanceId);
          }
        } else {
          // Could not find matching instance for packed prop
        }
      }
    });
    setSelectedProps(propsToSelect);
    setSpareProps(sparePropsSet);
  };

  // --- Add handler for Cancel Edit ---
  const handleCancelEdit = () => {
    setEditingBoxId(null);
    setCurrentBoxName('');
    setSelectedProps([]);
  };

  const styles = StyleSheet.create({
    selectedPropsSummary: {
      padding: 10,
      backgroundColor: '#f0f0f0',
      borderTopWidth: 1,
      borderTopColor: '#ccc',
      alignItems: 'center',
    },
    summaryText: {
      fontSize: 14,
      color: '#333',
      marginBottom: 5,
    },
    heavyText: {
      color: 'red',
      fontWeight: 'bold',
    },
  });

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
                    <div className="text-xs text-gray-500 mt-1">Weight: {propInstance.weight} {propInstance.weightUnit}</div>
                 )}
              </div>
              {renderSourceIcon(propInstance)} 
            </button>
          ))}
          {availablePropInstances.length === 0 && (
            <p className="text-gray-400 italic text-center py-4">No available props match the current filter.</p>
          )}
        </div>
      </div>

      {/* Column 2: Create/Edit Box Form */}
      <div className="space-y-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 sticky top-6">
          <h2 className="text-xl font-semibold text-gray-200 mb-4 flex items-center">
             {editingBoxId ? <PackageOpen className="mr-2 h-5 w-5"/> : <Package className="mr-2 h-5 w-5"/>}
             {editingBoxId ? 'Edit Box' : 'Create New Box'}
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Box Name
            </label>
            <input
              type="text"
              value={currentBoxName}
              onChange={(e) => setCurrentBoxName(e.target.value)}
              placeholder={isSpareBox ? "Box A" : "e.g., Act 1 Scene 2 - Hand Props"}
              className="w-full bg-[#0D0D0D] border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-transparent transition-colors"
            />
            <label className="flex items-center gap-2 mt-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={isSpareBox}
                onChange={(e) => {
                  setIsSpareBox(e.target.checked);
                  if (e.target.checked && !currentBoxName) {
                    // Auto-suggest "Box A" or next available letter
                    const existingSpareBoxes = boxes.filter(b => b.isSpareBox || (b.name && /^Box [A-Z]$/i.test(b.name)));
                    const usedLetters = new Set(existingSpareBoxes.map(b => {
                      const match = b.name?.match(/^Box ([A-Z])$/i);
                      return match ? match[1].toUpperCase() : null;
                    }).filter(Boolean));
                    
                    let nextLetter = 'A';
                    for (let i = 0; i < 26; i++) {
                      const letter = String.fromCharCode(65 + i);
                      if (!usedLetters.has(letter)) {
                        nextLetter = letter;
                        break;
                      }
                    }
                    setCurrentBoxName(`Box ${nextLetter}`);
                  }
                }}
                className="rounded"
              />
              <span>Mark as spare box (typically Box A)</span>
            </label>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {selectedProps.map((propInstance) => (
              <div key={propInstance.instanceId} className="flex items-center justify-between bg-[#0D0D0D] p-3 rounded">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {propInstance.images?.[0]?.url ? (
                    <img
                      src={propInstance.images[0].url}
                      alt={propInstance.name ?? 'Prop Image'}
                      className="w-10 h-10 rounded object-cover bg-black flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl text-gray-400">
                        {(propInstance?.name?.[0] ?? 'P').toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="text-sm flex-1 min-w-0">
                    <div className="font-medium text-gray-200 truncate">{propInstance?.name ?? 'Unnamed Prop'}</div>
                    <div className="text-xs text-gray-400">
                      {typeof propInstance?.weight === 'number' && `${propInstance.weight} ${propInstance.weightUnit}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isSpareBox && (
                    <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={spareProps.has(propInstance.instanceId)}
                        onChange={(e) => {
                          const newSpareProps = new Set(spareProps);
                          if (e.target.checked) {
                            newSpareProps.add(propInstance.instanceId);
                          } else {
                            newSpareProps.delete(propInstance.instanceId);
                          }
                          setSpareProps(newSpareProps);
                        }}
                        className="rounded"
                      />
                      <span>Spare</span>
                    </label>
                  )}
                  {isSpareBox && (
                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">Spare</span>
                  )}
                  <button onClick={() => handleRemoveProp(propInstance.instanceId)} className="text-gray-500 hover:text-red-500 ml-2">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
            {selectedProps.length === 0 && (
                 <p className="text-gray-400 italic text-center py-4">No props selected for this box.</p>
            )}
          </div>

          <View style={styles.selectedPropsSummary}>
            <Text style={styles.summaryText}>Total Items: {selectedProps.length}</Text>
            <Text style={styles.summaryText}>
              Estimated Weight: {totalWeight.toFixed(2)} kg {isBoxHeavy && <Text style={styles.heavyText}>(Heavy)</Text>}
            </Text>
          </View>

          <div className="flex gap-4">
            {editingBoxId && (
              <button
                onClick={handleCancelEdit}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                 Cancel Edit
               </button>
            )}
            <button
              onClick={handleSaveBox}
              disabled={selectedProps.length === 0 || !currentBoxName}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
               <Package className="h-5 w-5 text-gray-300" />{editingBoxId ? 'Update Box' : 'Create Box'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Column 3: Packed Boxes List (Moved out of column 2) */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-200">Packed Boxes</h2>
        {boxes.length === 0 ? (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 text-center">
            <p className="text-gray-400 italic">No boxes packed yet for this show.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            {boxes.map(box => (
              <PackingBoxCard 
                key={box.id} 
                box={{...box, showId: show.id}} // Pass showId down
                onEdit={handleEditBox} 
                onDelete={onDeleteBox} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
