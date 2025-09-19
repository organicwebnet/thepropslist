import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import { DigitalPackListService, PackList, PackingContainer } from '../../shared/services/inventory/packListService';
import { DigitalInventoryService, InventoryProp } from '../../shared/services/inventory/inventoryService';
import DashboardLayout from '../PropsBibleHomepage';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

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
  const [formError, setFormError] = useState<string | null>(null);
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
        className={`bg-gray-800 rounded p-3 text-white shadow-sm cursor-grab ${isDragging ? 'opacity-50' : ''}`}
        style={{ userSelect: 'none' }}
      >
        <div className="font-bold text-base">{prop.name}</div>
        <div className="text-xs text-gray-400 mb-1">{prop.category}</div>
        {prop.description && <div className="text-xs text-gray-500 mb-1">{prop.description}</div>}
        {prop.tags && prop.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {prop.tags.map((tag) => (
              <span key={tag} className="bg-gray-700 text-xs px-2 py-0.5 rounded-full">{tag}</span>
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
        className={`border-2 border-dashed rounded-xl p-6 min-h-[100px] flex flex-col justify-start items-start transition-colors mt-2 ${isOver ? 'border-indigo-400 bg-indigo-950/30' : 'border-indigo-500'}`}
        style={{ background: '#22242a' }}
      >
        {children}
      </div>
    );
  }

  if (loading) return <DashboardLayout><div className="max-w-7xl mx-auto p-8 text-gray-400">Loading...</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="max-w-7xl mx-auto p-8 text-red-500">{error}</div></DashboardLayout>;
  if (!packList) return <DashboardLayout><div className="max-w-7xl mx-auto p-8">Packing list not found.</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center gap-4 mb-6">
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>&larr; Back</button>
          <h1 className="text-2xl font-bold">Packing List: {packList.name}</h1>
        </div>
        {/* Bulk actions bar */}
        <div className="bg-gray-900 rounded-xl border border-pb-primary/20 p-3 mb-4 flex items-center gap-3">
          <div className="text-sm text-white font-medium">Bulk actions</div>
          <div className="text-xs text-gray-400">Selected: {Object.values(selected).filter(Boolean).length}</div>
          <button
            className="ml-auto px-3 py-2 rounded-lg bg-pb-primary text-white hover:bg-pb-accent transition disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={Object.values(selected).filter(Boolean).length === 0}
            onClick={() => setBulkPlaceOpen(true)}
          >
            Place on…
          </button>
          <button
            className="px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
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
            Clear parent
          </button>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-8 items-start">
            {/* Left Panel: Props List */}
            <div className="w-1/2 bg-gray-900 rounded-xl shadow p-4 flex flex-col max-h-[75vh]">
            <h2 className="font-semibold mb-4 text-lg">Props for this Show</h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search props by name, category, or tag..."
              className="input input-bordered bg-gray-800 text-white mb-4 w-full"
            />
            <div className="overflow-y-auto flex-1">
                {filteredProps.length === 0 ? (
                  <div className="text-gray-400">No props found.</div>
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
            <div className="w-1/2 flex flex-col gap-4">
            {/* Add Container Form */}
            <div className="bg-gray-900 rounded-xl shadow p-4 mb-2">
              <h2 className="font-semibold mb-2 text-lg">Add Package/Lift</h2>
              <form onSubmit={handleAddContainer} className="flex flex-col gap-2">
                <select
                  name="type"
                  value={containerForm.type}
                  onChange={handleContainerFormChange}
                  className="input input-bordered bg-gray-800 text-white"
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
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    name="length"
                    value={containerForm.length || ''}
                    onChange={handleContainerFormChange}
                    placeholder="Length"
                    className="input input-bordered bg-gray-800 text-white"
                  />
                  <input
                    type="number"
                    step="0.01"
                    name="width"
                    value={containerForm.width || ''}
                    onChange={handleContainerFormChange}
                    placeholder="Width"
                    className="input input-bordered bg-gray-800 text-white"
                  />
                  <input
                    type="number"
                    step="0.01"
                    name="height"
                    value={containerForm.height || ''}
                    onChange={handleContainerFormChange}
                    placeholder="Height"
                    className="input input-bordered bg-gray-800 text-white"
                  />
                </div>
                <select
                  name="unit"
                  value={containerForm.unit || 'cm'}
                  onChange={handleContainerFormChange}
                  className="input input-bordered bg-gray-800 text-white"
                >
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                </select>
                <textarea
                  name="description"
                  value={containerForm.description}
                  onChange={handleContainerFormChange}
                  placeholder="Description (optional)"
                  className="input input-bordered bg-gray-800 text-white min-h-[32px]"
                />
                <button type="submit" className="btn btn-primary mt-2">Add Container</button>
              </form>
            </div>
            {/* Containers List */}
            <div className="bg-gray-900 rounded-xl shadow p-4 flex-1 overflow-y-auto">
              <h2 className="font-semibold mb-2 text-lg">Containers</h2>
              {containers.length === 0 ? (
                <div className="text-gray-400">No containers yet.</div>
              ) : (
                <ul className="divide-y divide-gray-800">
                  {containers.map((container) => (
                    <li key={container.id} className="py-2">
                      <div
                        className="font-medium text-white mb-1 flex items-center gap-2 rounded-xl border border-gray-700 bg-[#23272f] px-4 py-3"
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          checked={!!selected[container.id]}
                          onChange={(e) => setSelected(prev => ({ ...prev, [container.id]: e.target.checked }))}
                          title="Select for bulk actions"
                        />
                        <span className="text-white font-medium">{container.name}</span>
                        {container.type && <span className="text-xs text-gray-400">({container.type})</span>}
                        {container.parentId && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-lg bg-gray-800/70 border border-gray-600 text-gray-100">on: {(() => {
                            const p = containers.find(c => c.id === container.parentId);
                            return p ? (p.name + (p.type ? ` (${p.type})` : '')) : container.parentId;
                          })()}</span>
                        )}
                        <Link
                          to={`/packing-lists/${packListId}/containers/${container.id}`}
                          className="ml-auto text-xs text-pb-primary underline"
                        >
                          Details & Label
                        </Link>
                        <button
                          className="btn btn-sm btn-primary ml-2"
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
                              setFormError((err as Error)?.message || 'Failed to save container');
                            }
                          }}
                        >
                          Save Container
                        </button>
                      </div>
                      {container.description && <div className="text-xs text-gray-400 mb-1">{container.description}</div>}
                      <div className="rounded-xl border border-indigo-500/60 bg-indigo-950/30 p-3">
                        <div className="font-semibold text-xs text-gray-300 mb-1">Props in this container:</div>
                        <DroppableContainer container={container}>
                        {container.props.length === 0 ? (
                          <div className="text-xs text-gray-500">Drag props here to add them to the container.</div>
                        ) : (
                          <ul className="list-disc list-inside text-xs text-gray-200 w-full">
                            {container.props.map((p) => {
                              const prop = propsList.find((pr) => pr.id === p.propId);
                              return (
                                <li key={p.propId} className="flex items-center justify-between py-1">
                                  <span>{prop ? prop.name : 'Unknown prop'} (Qty: {p.quantity})</span>
                                  <button
                                    className="ml-2 text-red-400 hover:text-red-600 text-xs px-2 py-0.5 rounded"
                                    onClick={() => handleRemoveProp(container.id, p.propId)}
                                  >Remove</button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        </DroppableContainer>
                      </div>
                    </li>
                  ))}
                </ul>
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