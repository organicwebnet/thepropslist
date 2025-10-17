import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import { DigitalPackListService, PackList } from '../../shared/services/inventory/packListService';
import { DigitalInventoryService, InventoryProp } from '../../shared/services/inventory/inventoryService';
import DashboardLayout from '../PropsBibleHomepage';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { ArrowLeft, Package, Box, Search, Plus, AlertCircle } from 'lucide-react';
// import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const PackingListDetailPage: React.FC = () => {
  const { service } = useFirebase();
  const { packListId } = useParams<{ packListId: string }>();
  const navigate = useNavigate();
  const [packList, setPackList] = useState<PackList | null>(null);
  const [containers, setContainers] = useState<Array<{ id: string; name: string; type?: string; parentId?: string | null; description?: string; props: { propId: string; quantity: number }[]; dimensions?: { width: number; height: number; depth: number; unit: 'cm' | 'in' } }>>([]);
  const [propsList, setPropsList] = useState<InventoryProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerForm, setContainerForm] = useState<{ description?: string; type?: string; length?: string; width?: string; height?: string; unit?: 'cm' | 'in' }>({ description: '', type: '', length: '', width: '', height: '', unit: 'cm' });
  const [_formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkPlaceOpen, setBulkPlaceOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    if (!packListId) return;
    setLoading(true);
    const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
    const inventoryService = new DigitalInventoryService(service, null as any, null as any);
    packListService.getPackList(packListId)
      .then((pl) => {
        setPackList(pl);
        setContainers(pl.containers || []);
        return pl.showId;
      })
      .then((showId) => {
        if (!showId) return [];
        return inventoryService.listProps().then((allProps) => allProps.filter((prop) => prop.showId === showId));
      })
      .then((filteredProps) => {
        setPropsList(filteredProps);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [packListId, service]);

  const DEFAULT_DIMENSIONS: Record<string, { length: number; width: number; height: number; unit: 'cm' | 'in' }> = {
    'Cardboard Box': { length: 60, width: 40, height: 40, unit: 'cm' },
    'Pallet': { length: 120, width: 100, height: 150, unit: 'cm' },
    'Flight Case': { length: 80, width: 60, height: 50, unit: 'cm' },
    'Custom Case': { length: 100, width: 60, height: 60, unit: 'cm' },
    'Crate': { length: 100, width: 80, height: 80, unit: 'cm' },
    'Tote': { length: 60, width: 40, height: 30, unit: 'cm' },
    'Trunk': { length: 90, width: 50, height: 50, unit: 'cm' },
  };

  // Calculate total weight for a container
  const calculateContainerWeight = (container: any) => {
    let totalWeight = 0;
    let weightUnit = 'kg';
    
    container.props.forEach((packedProp: any) => {
      const prop = propsList.find(p => p.id === packedProp.propId);
      if (prop && prop.weight) {
        // Convert to kg for consistent calculation
        let weightInKg = prop.weight.value;
        if (prop.weight.unit === 'lb') {
          weightInKg = prop.weight.value * 0.453592;
        }
        // InventoryProp only supports 'kg' and 'lb', so no need for 'g' and 'oz' conversions
        
        totalWeight += weightInKg * packedProp.quantity;
      }
    });
    
    return { totalWeight, weightUnit };
  };

  const handleContainerFormChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'type') {
      const defaults = DEFAULT_DIMENSIONS[value as keyof typeof DEFAULT_DIMENSIONS];
      if (defaults) {
        setContainerForm({
          ...containerForm,
          type: value,
          length: String(defaults.length),
          width: String(defaults.width),
          height: String(defaults.height),
          unit: defaults.unit,
        });
        return;
      }
    }
    setContainerForm({ ...containerForm, [name]: value });
  };

  function generateAlphaCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  const handleAddContainer = (e: React.FormEvent) => {
    e.preventDefault();
    const refCode = generateAlphaCode();
    const parsedLength = containerForm.length ? parseFloat(containerForm.length) : undefined;
    const parsedWidth = containerForm.width ? parseFloat(containerForm.width) : undefined;
    const parsedHeight = containerForm.height ? parseFloat(containerForm.height) : undefined;
    setContainers([
      ...containers,
      {
        id: refCode,
        name: refCode,
        type: containerForm.type || '',
        parentId: null,
        description: containerForm.description || '',
        dimensions: (parsedWidth && parsedHeight && parsedLength)
          ? { width: parsedWidth, height: parsedHeight, depth: parsedLength, unit: containerForm.unit || 'cm' }
          : undefined,
        props: [],
      },
    ]);
    setContainerForm({ description: '', type: '', length: '', width: '', height: '', unit: 'cm' });
  };

  // Compute unpacked props (not in any container)
  const packedPropIds = containers.flatMap((c) => c.props.map((p) => p.propId));
  const unpackedProps = propsList.filter((p) => !packedPropIds.includes(p.id));
  const filteredProps = unpackedProps.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.tags && p.tags.some((tag) => tag.toLowerCase().includes(q)))
    );
  });

  // Drag-and-drop sensors
  const sensors = useSensors(useSensor(PointerSensor));

  // Drag-and-drop logic for multiple containers
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active) return;
    const propId = active.id as string;
    const containerId = over.id as string;
    const containerIdx = containers.findIndex((c) => c.id === containerId);
    if (containerIdx === -1) return;
    // Remove prop from any container it's in
    const newContainers = containers.map((c) => ({ ...c, props: c.props.filter((p) => p.propId !== propId) }));
    // Add prop to the target container
    newContainers[containerIdx].props.push({ propId, quantity: 1 });
    setContainers(newContainers);
  };
  // Remove prop from container
  const handleRemoveProp = (containerId: string, propId: string) => {
    setContainers(containers.map((c) =>
      c.id === containerId
        ? { ...c, props: c.props.filter((p) => p.propId !== propId) }
        : c
    ));
  };

  // Draggable prop card component
  function DraggablePropCard({ prop }: { prop: InventoryProp }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: prop.id });
    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={`bg-white/5 hover:bg-white/10 rounded-lg p-4 text-white shadow-sm cursor-grab transition-colors duration-200 border border-white/10 hover:border-pb-primary/30 ${isDragging ? 'opacity-50' : ''}`}
        style={{ userSelect: 'none' }}
      >
        <div className="font-semibold text-base text-white mb-1">{prop.name}</div>
        <div className="text-sm text-pb-gray/70 mb-2">{prop.category}</div>
        {prop.description && <div className="text-sm text-pb-gray/60 mb-2 line-clamp-2">{prop.description}</div>}
        {prop.tags && prop.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {prop.tags.map((tag) => (
              <span key={tag} className="bg-pb-primary/20 text-pb-primary text-xs px-2 py-1 rounded-full border border-pb-primary/30">{tag}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Droppable container drop zone
  function DroppableContainer({ container, children }: { container: any; children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: container.id });
    return (
      <div
        ref={setNodeRef}
        id={container.id}
        className={`border-2 border-dashed rounded-lg p-4 min-h-[120px] flex flex-col justify-start items-start transition-all duration-200 mt-3 ${isOver ? 'border-pb-primary bg-pb-primary/10' : 'border-pb-gray/30 bg-white/5'}`}
      >
        {children}
      </div>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pb-primary mx-auto mb-4"></div>
            <p className="text-pb-gray/70">Loading packing list...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Error Loading Packing List</h1>
            <p className="text-pb-gray/70 mb-4">{error}</p>
            <button
              onClick={() => navigate('/packing-lists')}
              className="px-4 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg transition-colors"
            >
              Back to Packing Lists
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!packList) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Package className="w-16 h-16 text-pb-gray/50 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Packing List Not Found</h1>
            <p className="text-pb-gray/70 mb-4">The requested packing list could not be found.</p>
            <button
              onClick={() => navigate('/packing-lists')}
              className="px-4 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg transition-colors"
            >
              Back to Packing Lists
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate('/packing-lists')}
              className="p-2 hover:bg-pb-darker/40 rounded-lg transition-colors"
              title="Back to Packing Lists"
            >
              <ArrowLeft className="w-5 h-5 text-pb-gray/70 hover:text-white" />
            </button>
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Packing List: {packList.name}</h1>
          </div>
          <p className="text-pb-gray/70">Organize props into containers for efficient packing and shipping</p>
        </div>
        {/* Bulk Actions */}
        <div className="bg-pb-darker/40 rounded-lg p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Bulk Actions</h3>
              <p className="text-pb-gray/70 text-sm">
                {Object.values(selected).filter(Boolean).length} items selected
              </p>
            </div>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 rounded-lg bg-pb-primary hover:bg-pb-secondary text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={Object.values(selected).filter(Boolean).length === 0}
                onClick={() => setBulkPlaceOpen(true)}
              >
                Place Selected Items
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={Object.values(selected).filter(Boolean).length === 0 || bulkSaving}
                onClick={async () => {
                  if (!packListId) return;
                  setBulkSaving(true);
                  try {
                    const svc = new DigitalPackListService(service, null as any, null as any, window.location.origin);
                    const ids = Object.keys(selected).filter(id => selected[id]);
                    for (const id of ids) {
                      await svc.updateContainer(packListId, id, { parentId: null } as any);
                    }
                    const refreshed = await svc.getPackList(packListId);
                    setPackList(refreshed);
                    setContainers(refreshed.containers || []);
                  } finally {
                    setBulkSaving(false);
                  }
                }}
              >
                {bulkSaving ? 'Processing...' : 'Clear Parent'}
              </button>
            </div>
          </div>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-6 items-start">
            {/* Left Panel: Props List */}
            <div className="w-1/2 bg-pb-darker/40 rounded-lg border border-white/10 p-6 flex flex-col max-h-[75vh]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-green-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Props for this Show</h2>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pb-gray/50 w-4 h-4" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search props by name, category, or tag..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                />
              </div>
              <div className="overflow-y-auto flex-1">
                {filteredProps.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-pb-gray/50 mx-auto mb-3" />
                    <p className="text-pb-gray/70">No props found</p>
                    <p className="text-pb-gray/50 text-sm">Try adjusting your search terms</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredProps.map((prop) => (
                      <DraggablePropCard key={prop.id} prop={prop} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Right Panel: Add Container Form and Containers List */}
            <div className="w-1/2 flex flex-col gap-6">
            {/* Add Container Form */}
            <div className="bg-pb-darker/40 rounded-lg border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Add Package/Lift</h2>
              </div>
              <form onSubmit={handleAddContainer} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Container Type</label>
                  <select
                    name="type"
                    value={containerForm.type}
                    onChange={handleContainerFormChange}
                    className="w-full px-4 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                  >
                    <option value="">Select type...</option>
                    <option value="Cardboard Box">Cardboard Box</option>
                    <option value="Pallet">Pallet</option>
                    <option value="Flight Case">Flight Case</option>
                    <option value="Custom Case">Custom Case</option>
                    <option value="Crate">Crate</option>
                    <option value="Tote">Tote</option>
                    <option value="Trunk">Trunk</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Dimensions</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="number"
                      step="0.01"
                      name="length"
                      value={containerForm.length || ''}
                      onChange={handleContainerFormChange}
                      placeholder="Length"
                      className="px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                    />
                    <input
                      type="number"
                      step="0.01"
                      name="width"
                      value={containerForm.width || ''}
                      onChange={handleContainerFormChange}
                      placeholder="Width"
                      className="px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                    />
                    <input
                      type="number"
                      step="0.01"
                      name="height"
                      value={containerForm.height || ''}
                      onChange={handleContainerFormChange}
                      placeholder="Height"
                      className="px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Unit</label>
                  <select
                    name="unit"
                    value={containerForm.unit || 'cm'}
                    onChange={handleContainerFormChange}
                    className="w-full px-4 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                  >
                    <option value="cm">cm</option>
                    <option value="in">in</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Description (optional)</label>
                  <textarea
                    name="description"
                    value={containerForm.description}
                    onChange={handleContainerFormChange}
                    placeholder="Enter container description..."
                    className="w-full px-4 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 min-h-[80px] resize-none"
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full px-4 py-2 rounded-lg bg-pb-primary hover:bg-pb-secondary text-white font-medium transition-colors"
                >
                  Add Container
                </button>
              </form>
            </div>
            {/* Containers List */}
            <div className="bg-pb-darker/40 rounded-lg border border-white/10 p-6 flex-1 overflow-y-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Box className="w-4 h-4 text-purple-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Containers</h2>
              </div>
              {containers.length === 0 ? (
                <div className="text-center py-8">
                  <Box className="w-12 h-12 text-pb-gray/50 mx-auto mb-3" />
                  <p className="text-pb-gray/70">No containers yet</p>
                  <p className="text-pb-gray/50 text-sm">Add your first container above</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {containers.map((container) => (
                    <div key={container.id} className="bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 p-4 transition-colors duration-200">
                      <div className="flex items-center gap-3 mb-3">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-white/20 bg-pb-darker/60 text-pb-primary focus:ring-pb-primary/50"
                          checked={!!selected[container.id]}
                          onChange={(e) => setSelected(prev => ({ ...prev, [container.id]: e.target.checked }))}
                          title="Select for bulk actions"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white">{container.name}</span>
                            {container.type && <span className="text-sm text-pb-gray/70">({container.type})</span>}
                          </div>
                          {container.parentId && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                on: {(() => {
                                  const p = containers.find(c => c.id === container.parentId);
                                  return p ? (p.name + (p.type ? ` (${p.type})` : '')) : container.parentId;
                                })()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Link
                            to={`/packing-lists/${packListId}/containers/${container.id}`}
                            className="px-3 py-1 text-xs bg-pb-primary/20 text-pb-primary rounded-lg border border-pb-primary/30 hover:bg-pb-primary/30 transition-colors"
                          >
                            Details & Label
                          </Link>
                          <button
                            className="px-3 py-1 text-xs bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 hover:bg-green-500/30 transition-colors"
                            onClick={async () => {
                              if (!packListId) return;
                              try {
                                const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
                                const existsRemotely = (packList?.containers || []).some((c) => c.id === container.id);
                                if (existsRemotely) {
                                  await packListService.updateContainer(packListId, container.id, {
                                    name: container.name,
                                    type: container.type,
                                    description: container.description,
                                    props: container.props,
                                    dimensions: container.dimensions,
                                    parentId: container.parentId || null,
                                  });
                                } else {
                                  const { id: _ignore, ...toCreate } = container as any;
                                  await packListService.addContainer(packListId, toCreate);
                                }
                                const refreshed = await packListService.getPackList(packListId);
                                setPackList(refreshed);
                                setContainers(refreshed.containers || []);
                              } catch (err) {
                                console.error('Failed to save container:', err);
                              }
                            }}
                          >
                            Save Container
                          </button>
                        </div>
                      </div>
                      {container.description && (
                        <div className="text-sm text-pb-gray/70 mb-2 p-2 bg-white/5 rounded border border-white/10">
                          {container.description}
                        </div>
                      )}
                      {container.dimensions && (
                        <div className="text-sm text-pb-gray/70 mb-3">
                          <span className="font-medium">Dimensions:</span> {container.dimensions.width} × {container.dimensions.height} × {container.dimensions.depth} {container.dimensions.unit}
                        </div>
                      )}
                      <div className="bg-white/5 rounded-lg border border-white/10 p-3">
                        <div className="flex justify-between items-center mb-3">
                          <div className="font-medium text-sm text-white">Props in this container</div>
                          {container.props.length > 0 && (
                            <div className="text-sm text-pb-primary font-medium">
                              Total Weight: {(() => {
                                const { totalWeight } = calculateContainerWeight(container);
                                return totalWeight > 0 ? `${totalWeight.toFixed(1)} kg` : 'No weight data';
                              })()}
                            </div>
                          )}
                        </div>
                        <DroppableContainer container={container}>
                        {container.props.length === 0 ? (
                          <div className="text-center py-4">
                            <Package className="w-8 h-8 text-pb-gray/50 mx-auto mb-2" />
                            <div className="text-sm text-pb-gray/70">Drag props here to add them to the container</div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {container.props.map((p) => {
                              const prop = propsList.find((pr) => pr.id === p.propId);
                              const propWeight = prop && prop.weight ? `${prop.weight.value} ${prop.weight.unit}` : 'No weight';
                              return (
                                <div key={p.propId} className="bg-white/5 rounded-lg p-3 border border-white/10">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="font-medium text-white text-sm">
                                        {prop ? prop.name : 'Unknown prop'} (Qty: {p.quantity})
                                      </div>
                                      <div className="text-xs text-pb-gray/70 mt-1">
                                        <div>Weight: {propWeight}</div>
                                        {prop && prop.dimensions && (
                                          <div>
                                            Size: {prop.dimensions.width || '?'} × {prop.dimensions.height || '?'} × {prop.dimensions.depth || '?'} {prop.dimensions.unit || 'cm'}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      className="ml-3 px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded border border-red-500/30 hover:bg-red-500/30 transition-colors"
                                      onClick={() => handleRemoveProp(container.id, p.propId)}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        </DroppableContainer>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>
        </DndContext>
        {/* Bulk Place modal */}
        {bulkPlaceOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
            <div className="bg-gray-900 text-white rounded-xl shadow-xl w-full max-w-lg p-5 border border-pb-primary/30">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-lg">Place selected on…</div>
                <button className="text-gray-300 hover:text-white" onClick={() => setBulkPlaceOpen(false)}>✕</button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {containers.filter(c => !selected[c.id]).length === 0 && (
                  <div className="text-gray-400">No other containers available.</div>
                )}
                {containers.filter(c => !selected[c.id]).map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-gray-800/70 rounded-lg px-3 py-2 border border-gray-700">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.type || 'container'} · {p.id}</div>
                    </div>
                    <button
                      className="px-3 py-1.5 rounded-lg bg-pb-primary text-white hover:bg-pb-accent transition disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={bulkSaving}
                      onClick={async () => {
                        if (!packListId) return;
                        setBulkSaving(true);
                        try {
                          const svc = new DigitalPackListService(service, null as any, null as any, window.location.origin);
                          const ids = Object.keys(selected).filter(id => selected[id]);
                          for (const id of ids) {
                            await svc.updateContainer(packListId, id, { parentId: p.id } as any);
                          }
                          const refreshed = await svc.getPackList(packListId);
                          setPackList(refreshed);
                          setContainers(refreshed.containers || []);
                          setBulkPlaceOpen(false);
                        } finally {
                          setBulkSaving(false);
                        }
                      }}
                    >
                      Place here
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="text-sm mb-2">Quick create parent:</div>
                <div className="flex gap-2">
                  {['pallet','skip','crate'].map(t => (
                    <button
                      key={t}
                      className="px-3 py-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={bulkSaving}
                      onClick={async () => {
                        if (!packListId) return;
                        setBulkSaving(true);
                        try {
                          const svc = new DigitalPackListService(service, null as any, null as any, window.location.origin);
                          const newId = await svc.addContainer(packListId, {
                            name: `${t.charAt(0).toUpperCase()+t.slice(1)} ${String((containers||[]).filter(c=>c.type===t).length+1)}`,
                            type: t,
                            labels: [],
                            props: [],
                            status: 'empty'
                          } as any);
                          const ids = Object.keys(selected).filter(id => selected[id]);
                          for (const id of ids) {
                            await svc.updateContainer(packListId, id, { parentId: newId } as any);
                          }
                          const refreshed = await svc.getPackList(packListId);
                          setPackList(refreshed);
                          setContainers(refreshed.containers || []);
                          setBulkPlaceOpen(false);
                        } finally {
                          setBulkSaving(false);
                        }
                      }}
                    >
                      {t.charAt(0).toUpperCase()+t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PackingListDetailPage; 