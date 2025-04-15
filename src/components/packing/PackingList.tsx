import { useState, useEffect } from 'react';
import { PackingBox, Prop, Show, PackedProp } from '../../types';
import { PackingBoxCard } from './PackingBoxCard';
import { PropSelector } from './PropSelector';
import { X, Clock, HandCoins } from 'lucide-react';

// Interface for a single instance of a prop
interface PropInstance extends Prop {
  instanceId: string; // Unique ID for this instance of the prop
  isPacked: boolean;
}

interface PackingListProps {
  show: Show;
  boxes: PackingBox[];
  props: Prop[];
  isLoading?: boolean;
  onCreateBox: (props: Prop[], act: number, scene: number) => void;
  onUpdateBox: (boxId: string, updates: Partial<PackingBox>) => Promise<void>;
  onDeleteBox: (boxId: string) => Promise<void>;
}

export function PackingList({
  show,
  boxes,
  props,
  isLoading = false,
  onCreateBox,
  onUpdateBox,
  onDeleteBox,
}: PackingListProps) {
  const [currentBoxName, setCurrentBoxName] = useState('');
  const [selectedProps, setSelectedProps] = useState<PropInstance[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  // Create prop instances based on quantities
  const [propInstances, setPropInstances] = useState<PropInstance[]>([]);

  // Initialize prop instances when props change
  useEffect(() => {
    const instances: PropInstance[] = [];
    props.forEach(prop => {
      const quantity = prop.quantity || 1;
      for (let i = 0; i < quantity; i++) {
        instances.push({
          ...prop,
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
        box.props?.forEach(prop => {
          for (let i = 0; i < (prop.quantity || 1); i++) {
            packedPropIds.add(`${prop.propId}-${i}`);
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

  const handleCreateBox = async () => {
    if (selectedProps.length === 0 || !currentBoxName) return;

    const firstProp = selectedProps[0];
    const packedProps: PackedProp[] = selectedProps.map(prop => ({
      propId: prop.id,
      name: prop.name,
      quantity: 1,
      weight: prop.weight || 0,
      weightUnit: prop.weightUnit,
      isFragile: isFragile(prop)
    }));

    await onCreateBox(selectedProps, firstProp.act, firstProp.scene);
    setSelectedProps([]);
    setCurrentBoxName('');
  };

  // Calculate total weight of selected props
  const totalWeight = selectedProps.reduce((total, prop) => {
    if (typeof prop.weight !== 'number') return total;
    const weight = prop.weightUnit === 'kg' ? prop.weight : prop.weight * 0.453592; // Convert lb to kg
    return total + weight;
  }, 0);

  // Check if a prop is fragile based on handling instructions
  const isFragile = (prop: Prop) => {
    return prop.handlingInstructions?.toLowerCase().includes('fragile') || false;
  };

  const isBoxHeavy = totalWeight > 23; // Standard lifting limit

  // Filter out packed props from the available list
  const availablePropInstances = propInstances.filter(instance => !instance.isPacked);

  // Helper function to render the source icon and tooltip
  const renderSourceIcon = (prop: PropInstance) => {
    if (prop.source === 'rented') {
      return (
        <div className="absolute top-2 right-2 bg-yellow-500/20 p-1.5 rounded-full" title="Rented Item">
          <Clock className="h-4 w-4 text-yellow-500" />
        </div>
      );
    } else if (prop.source === 'borrowed') {
      return (
        <div className="absolute top-2 right-2 bg-blue-500/20 p-1.5 rounded-full" title="Borrowed Item">
          <HandCoins className="h-4 w-4 text-blue-500" />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left column - Props list */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-200">Available Props</h2>
        <div className="grid grid-cols-1 gap-4">
          {availablePropInstances.map((propInstance) => (
            <button
              key={propInstance.instanceId}
              onClick={() => handleAddProp(propInstance)}
              disabled={selectedProps.some(p => p.instanceId === propInstance.instanceId)}
              className={`
                relative flex items-center p-4 rounded-lg text-left
                ${selectedProps.some(p => p.instanceId === propInstance.instanceId)
                  ? 'bg-blue-600/20 border-2 border-blue-400'
                  : 'bg-[#1A1A1A] border border-gray-700 hover:border-gray-500'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200
              `}
            >
              {renderSourceIcon(propInstance)}
              <div className="flex items-center gap-4 w-full">
                {propInstance.imageUrl ? (
                  <img
                    src={propInstance.imageUrl}
                    alt={propInstance.name}
                    className="w-16 h-16 rounded object-cover bg-black"
                  />
                ) : (
                  <div className="w-16 h-16 rounded bg-gray-800 flex items-center justify-center">
                    <span className="text-2xl text-gray-400">
                      {propInstance.name[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium text-gray-200">{propInstance.name}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    Act {propInstance.act}, Scene {propInstance.scene} • {propInstance.category}
                  </div>
                  <div className="text-sm text-gray-400">
                    {typeof propInstance.weight === 'number' && `${propInstance.weight} ${propInstance.weightUnit}`}
                    {isFragile(propInstance) && ' • Fragile'}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right column - Current box */}
      <div className="lg:sticky lg:top-8 space-y-6">
        <div className="bg-[#1A1A1A] border border-gray-700 rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-200">Current Box</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Box Name
            </label>
            <input
              type="text"
              value={currentBoxName}
              onChange={(e) => setCurrentBoxName(e.target.value)}
              placeholder="Enter a name for this box..."
              className="w-full bg-[#0A0A0A] border border-gray-700 rounded-lg px-4 py-2 text-gray-200 placeholder-gray-500"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Selected Props ({selectedProps.length})</span>
              <span>
                Total Weight: {totalWeight.toFixed(1)} kg
                {isBoxHeavy && (
                  <span className="ml-2 text-yellow-500 font-medium">(Heavy)</span>
                )}
              </span>
            </div>
            
            <div className="space-y-2">
              {selectedProps.map((propInstance) => (
                <div
                  key={propInstance.instanceId}
                  className="relative flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg"
                >
                  {renderSourceIcon(propInstance)}
                  <div className="flex items-center gap-3">
                    {propInstance.imageUrl ? (
                      <img
                        src={propInstance.imageUrl}
                        alt={propInstance.name}
                        className="w-10 h-10 rounded object-cover bg-black"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center">
                        <span className="text-xl text-gray-400">
                          {propInstance.name[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-200">{propInstance.name}</div>
                      <div className="text-xs text-gray-400">
                        {typeof propInstance.weight === 'number' && `${propInstance.weight} ${propInstance.weightUnit}`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveProp(propInstance.instanceId)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <button
              onClick={handleCreateBox}
              disabled={selectedProps.length === 0 || !currentBoxName || isCreating}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating Box...' : 'Create Box'}
            </button>
          </div>
        </div>

        {/* Existing boxes */}
        {boxes.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-200">Created Boxes</h3>
            <div className="space-y-4">
              {boxes.map((box) => (
                <PackingBoxCard
                  key={box.id}
                  box={box}
                  onUpdate={onUpdateBox}
                  onDelete={onDeleteBox}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 