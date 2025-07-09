import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const [containers, setContainers] = useState<Array<{ id: string; name: string; type?: string; description?: string; props: { propId: string; quantity: number }[] }>>([]);
  const [propsList, setPropsList] = useState<InventoryProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerForm, setContainerForm] = useState<{ description?: string; type?: string }>({ description: '', type: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

  const handleContainerFormChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>) => {
    setContainerForm({ ...containerForm, [e.target.name]: e.target.value });
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
    setContainers([
      ...containers,
      {
        id: refCode,
        name: refCode,
        type: containerForm.type || '',
        description: containerForm.description || '',
        props: [],
      },
    ]);
    setContainerForm({ description: '', type: '' });
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
    let newContainers = containers.map((c) => ({ ...c, props: c.props.filter((p) => p.propId !== propId) }));
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {filteredProps.length === 0 ? (
                  <div className="text-gray-400">No props found.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredProps.map((prop) => (
                      <DraggablePropCard key={prop.id} prop={prop} />
                    ))}
                  </div>
                )}
              </DndContext>
            </div>
          </div>
          {/* Right Panel: Add Container Form and Containers List */}
          <div className="w-1/2 flex flex-col gap-4 max-h-[75vh]">
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
                        className="font-medium text-white mb-1 flex items-center gap-2"
                        style={{ background: '#23272f', borderRadius: 6, padding: 6 }}
                      >
                        {container.name}
                        {container.type && <span className="text-xs text-gray-400">({container.type})</span>}
                      </div>
                      {container.description && <div className="text-xs text-gray-400 mb-1">{container.description}</div>}
                      <DroppableContainer container={container}>
                        <div className="font-semibold text-xs text-gray-300 mb-1">Props in this container:</div>
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
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PackingListDetailPage; 