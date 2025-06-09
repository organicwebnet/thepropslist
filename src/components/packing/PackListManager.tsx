import React, { useState, useEffect, useCallback } from 'react';
import { PackList, PackingContainer, PackListService } from '../../shared/services/inventory/packListService.ts';
import { InventoryService, InventoryProp } from '../../shared/services/inventory/inventoryService.ts';
import { ContainerLabels } from './ContainerLabels.tsx';
import { PackedProp } from '../../types/packing.ts';
import { PlusCircle, Trash2, Edit3, Save, PackagePlus, ChevronDown, ChevronUp, AlertTriangle, Printer, Download } from 'lucide-react';

interface PackListManagerProps {
  packListService: PackListService;
  inventoryService: InventoryService;
  showId?: string;
}

export const PackListManager: React.FC<PackListManagerProps> = ({
  packListService,
  inventoryService,
  showId
}) => {
  const [packLists, setPackLists] = useState<PackList[]>([]);
  const [selectedPackList, setSelectedPackList] = useState<PackList | null>(null);
  const [availableProps, setAvailableProps] = useState<InventoryProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPackLists();
    loadAvailableProps();
  }, [showId]);

  const loadPackLists = async () => {
    try {
      const lists = await packListService.listPackLists({ showId });
      setPackLists(lists);
      setError(null);
    } catch (err) {
      setError('Failed to load pack lists');
    }
  };

  const loadAvailableProps = async () => {
    try {
      const props = await inventoryService.listProps({ status: ['available'] });
      setAvailableProps(props);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePackList = async () => {
    try {
      const newPackList: Omit<PackList, 'id' | 'metadata'> = {
        name: 'New Pack List',
        description: '',
        showId,
        containers: [],
        status: 'draft',
        labels: []
      };

      const id = await packListService.createPackList(newPackList);
      await loadPackLists();
      const created = packLists.find(list => list.id === id);
      if (created) {
        setSelectedPackList(created);
      }
    } catch (err) {
      setError('Failed to create pack list');
    }
  };

  const handleAddContainer = async () => {
    if (!selectedPackList) return;

    try {
      const newContainer: Omit<PackingContainer, 'id' | 'metadata'> = {
        name: 'New Container',
        description: '',
        props: [],
        labels: [],
        status: 'empty'
      };

      await packListService.addContainer(selectedPackList.id, newContainer);
      await loadPackLists();
      const updated = packLists.find(list => list.id === selectedPackList.id);
      if (updated) {
        setSelectedPackList(updated);
      }
    } catch (err) {
      setError('Failed to add container');
    }
  };

  const handleAddPropToContainer = async (
    containerId: string,
    propId: string,
    quantity = 1
  ) => {
    if (!selectedPackList) return;

    try {
      await packListService.addPropToContainer(
        selectedPackList.id,
        containerId,
        propId,
        quantity
      );
      await loadPackLists();
      const updated = packLists.find(list => list.id === selectedPackList.id);
      if (updated) {
        setSelectedPackList(updated);
      }
    } catch (err) {
      setError('Failed to add prop to container');
    }
  };

  const handleRemovePropFromContainer = async (
    containerId: string,
    propId: string
  ) => {
    if (!selectedPackList) return;

    try {
      await packListService.removePropFromContainer(
        selectedPackList.id,
        containerId,
        propId
      );
      await loadPackLists();
      const updated = packLists.find(list => list.id === selectedPackList.id);
      if (updated) {
        setSelectedPackList(updated);
      }
    } catch (err) {
      setError('Failed to remove prop from container');
    }
  };

  const handleUpdateContainerLabels = async (
    containerId: string,
    labels: string[]
  ) => {
    if (!selectedPackList) return;

    try {
      await packListService.updateContainer(
        selectedPackList.id,
        containerId,
        { labels }
      );
      await loadPackLists();
      const updated = packLists.find(list => list.id === selectedPackList.id);
      if (updated) {
        setSelectedPackList(updated);
      }
    } catch (err) {
      setError('Failed to update container labels');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pack Lists</h1>
        <button
          onClick={handleCreatePackList}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create Pack List
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pack Lists Sidebar */}
        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-4">Available Pack Lists</h2>
          <div className="space-y-2">
            {packLists.map(list => (
              <div
                key={list.id}
                className={`p-2 rounded cursor-pointer ${
                  selectedPackList?.id === list.id
                    ? 'bg-blue-100'
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setSelectedPackList(list)}
              >
                <div className="font-medium">{list.name}</div>
                <div className="text-sm text-gray-600">
                  {list.containers.length} containers • {list.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Pack List Details */}
        {selectedPackList && (
          <div className="border rounded p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{selectedPackList.name}</h2>
              <button
                onClick={handleAddContainer}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Add Container
              </button>
            </div>

            <div className="space-y-4">
              {selectedPackList.containers.map((container: PackingContainer) => (
                <div key={container.id} className="border rounded p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{container.name}</h3>
                    <span className="text-sm text-gray-600">
                      {container.props.length} props • {container.status}
                    </span>
                  </div>

                  {/* Container Labels */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Labels</h4>
                    <ContainerLabels
                      container={container}
                      onUpdateLabels={(labels: string[]) => handleUpdateContainerLabels(container.id, labels)}
                    />
                  </div>

                  {/* Container Props */}
                  <div className="space-y-2">
                    {container.props.map((prop: PackingContainer['props'][number]) => {
                      const propDetails = availableProps.find(p => p.id === prop.propId);
                      return (
                        <div
                          key={prop.propId}
                          className="flex justify-between items-center bg-gray-50 p-2 rounded"
                        >
                          <div>
                            <span className="font-medium">
                              {propDetails?.name || 'Unknown Prop'}
                            </span>
                            <span className="text-sm text-gray-600 ml-2">
                              x{prop.quantity}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              handleRemovePropFromContainer(container.id, prop.propId)
                            }
                            className="text-red-500 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Prop to Container */}
                  <div className="mt-4">
                    <select
                      className="w-full p-2 border rounded"
                      onChange={e =>
                        handleAddPropToContainer(container.id, e.target.value)
                      }
                      value=""
                    >
                      <option value="">Add a prop...</option>
                      {availableProps
                        .filter(
                          prop =>
                            !container.props.some(p => p.propId === prop.id)
                        )
                        .map(prop => (
                          <option key={prop.id} value={prop.id}>
                            {prop.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 