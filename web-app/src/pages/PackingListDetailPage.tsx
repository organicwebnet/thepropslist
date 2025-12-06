import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import { DigitalPackListService, PackList, PackingContainer } from '../../shared/services/inventory/packListService';
import { DigitalInventoryService, InventoryProp } from '../../shared/services/inventory/inventoryService';
import DashboardLayout from '../PropsBibleHomepage';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, useDraggable } from '@dnd-kit/core';
import { ArrowLeft, Package, Search, AlertCircle, AlertTriangle, X, Image as ImageIcon, Copy, Truck, Tag } from 'lucide-react';
import ContainerTree from '../components/packing/ContainerTree';
import QuickContainerForm from '../components/packing/QuickContainerForm';
import { DEFAULT_DIMENSIONS } from '../constants/containerConstants';
import ConfirmationModal from '../components/ConfirmationModal';

const PackingListDetailPage: React.FC = () => {
  const { service } = useFirebase();
  const { packListId } = useParams<{ packListId: string }>();
  const navigate = useNavigate();
  const [packList, setPackList] = useState<PackList | null>(null);
  const [containers, setContainers] = useState<PackingContainer[]>([]);
  const [propsList, setPropsList] = useState<InventoryProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkPlaceOpen, setBulkPlaceOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [isCreatingContainer, setIsCreatingContainer] = useState(false);
  const [addChildContainerId, setAddChildContainerId] = useState<string | null>(null);
  const [selectedPropContainer, setSelectedPropContainer] = useState<Record<string, string>>({});
  const [movingContainerId, setMovingContainerId] = useState<string | null>(null);
  const [removingContainerId, setRemovingContainerId] = useState<string | null>(null);
  const [recentlyDroppedContainer, setRecentlyDroppedContainer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'props' | 'containers' | 'delivery' | 'labels'>('props');
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copying, setCopying] = useState(false);

  // Initialize prop container assignments (memoised to avoid unnecessary re-renders)
  const propContainerAssignments = useMemo(() => {
    const assignments: Record<string, string> = {};
    containers.forEach(container => {
      container.props.forEach(prop => {
        assignments[prop.propId] = container.id;
      });
    });
    return assignments;
  }, [containers]);

  useEffect(() => {
    setSelectedPropContainer(propContainerAssignments);
  }, [propContainerAssignments]);

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

  // Calculate total weight for a container
  const calculateContainerWeight = (container: PackingContainer) => {
    let totalWeight = 0;
    let weightUnit = 'kg';
    
    container.props.forEach((packedProp: any) => {
      const prop = propsList.find(p => p.id === packedProp.propId);
      if (prop && prop.weight) {
        let weightInKg = prop.weight.value;
        if (prop.weight.unit === 'lb') {
          weightInKg = prop.weight.value * 0.453592;
        }
        totalWeight += weightInKg * packedProp.quantity;
      }
    });
    
    return { totalWeight, weightUnit };
  };

  function generateAlphaCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  const handleAddContainer = async (form: { description?: string; type?: string; length?: string; width?: string; height?: string; unit?: 'cm' | 'in'; location?: string }, parentId: string | null = null) => {
    if (!packListId) {
      setErrorMessage('Cannot create container: packing list ID is missing');
      return;
    }

    setIsCreatingContainer(true);
    setErrorMessage(null);
    
    try {
      const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
      const refCode = generateAlphaCode();
      const parsedLength = form.length ? parseFloat(form.length) : undefined;
      const parsedWidth = form.width ? parseFloat(form.width) : undefined;
      const parsedHeight = form.height ? parseFloat(form.height) : undefined;
      
      const containerToCreate: Omit<PackingContainer, 'id' | 'metadata'> = {
        name: refCode,
        type: form.type || undefined,
        parentId: parentId || null,
        description: form.description || undefined,
        location: form.location || undefined,
        dimensions: (parsedWidth && parsedHeight && parsedLength)
          ? { width: parsedWidth, height: parsedHeight, depth: parsedLength, unit: form.unit || 'cm' }
          : undefined,
        props: [],
        labels: [],
        status: 'empty',
      };

      // Save to Firestore immediately
      await packListService.addContainer(packListId, containerToCreate);
      
      // Refresh from Firestore to get the complete container with metadata
      const refreshed = await packListService.getPackList(packListId);
      setPackList(refreshed);
      setContainers(refreshed.containers || []);
      setAddChildContainerId(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create container';
      setErrorMessage(errorMsg);
      console.error('Failed to create container:', err);
    } finally {
      setIsCreatingContainer(false);
    }
  };

  const handleTemplateClick = async (type: string) => {
    const defaults = DEFAULT_DIMENSIONS[type];
    if (defaults) {
      await handleAddContainer({
        type,
        length: String(defaults.length),
        width: String(defaults.width),
        height: String(defaults.height),
        unit: defaults.unit,
        description: '',
        location: '',
      });
    }
  };

  const handleAddChildContainer = (parentId: string) => {
    setAddChildContainerId(parentId);
  };

  const handleRemoveFromParent = async (containerId: string) => {
    if (!packListId) return;
    setRemovingContainerId(containerId);
    setErrorMessage(null);
    try {
      const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
      await packListService.updateContainer(packListId, containerId, { parentId: null } as any);
      const refreshed = await packListService.getPackList(packListId);
      setPackList(refreshed);
      setContainers(refreshed.containers || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove container from parent';
      setErrorMessage(errorMsg);
      console.error('Failed to remove from parent:', err);
    } finally {
      setRemovingContainerId(null);
    }
  };

  const handleMoveContainer = async (containerId: string, newParentId: string | null) => {
    if (!packListId) return;
    setMovingContainerId(containerId);
    setErrorMessage(null);
    try {
      const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
      await packListService.updateContainer(packListId, containerId, { parentId: newParentId } as any);
      const refreshed = await packListService.getPackList(packListId);
      setPackList(refreshed);
      setContainers(refreshed.containers || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to move container';
      setErrorMessage(errorMsg);
      console.error('Failed to move container:', err);
    } finally {
      setMovingContainerId(null);
    }
  };

  const handleSaveContainer = async (container: PackingContainer) => {
    if (!packListId) return;
    setErrorMessage(null);
    try {
      const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
      const existsRemotely = (packList?.containers || []).some((c) => c.id === container.id);
      if (existsRemotely) {
        await packListService.updateContainer(packListId, container.id, {
          name: container.name,
          type: container.type,
          description: container.description,
          location: container.location,
          props: container.props,
          dimensions: container.dimensions,
          parentId: container.parentId || null,
        } as any);
      } else {
        const { id: _ignore, metadata: _meta, ...toCreate } = container;
        await packListService.addContainer(packListId, toCreate);
      }
      const refreshed = await packListService.getPackList(packListId);
      setPackList(refreshed);
      setContainers(refreshed.containers || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save container';
      setErrorMessage(errorMsg);
      console.error('Failed to save container:', err);
    }
  };

  const handleSelectChange = (containerId: string, checked: boolean) => {
    setSelected(prev => ({ ...prev, [containerId]: checked }));
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

  // Build hierarchical container list for dropdown
  const buildContainerOptions = (parentId: string | null = null, level: number = 0): Array<{ id: string; name: string; level: number }> => {
    const result: Array<{ id: string; name: string; level: number }> = [];
    containers
      .filter(c => c.parentId === parentId)
      .forEach(container => {
        result.push({ id: container.id, name: container.name, level });
        result.push(...buildContainerOptions(container.id, level + 1));
      });
    return result;
  };

  const containerOptions = buildContainerOptions();

  const handleAddPropToContainer = async (propId: string, containerId: string) => {
    if (!packListId) return;
    
    // Clear any previous error messages
    setErrorMessage(null);
    
    try {
      const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
      const inventoryService = new DigitalInventoryService(service, null as any, null as any);
      
      // Find the container to get its name
      const container = containers.find(c => c.id === containerId);
      if (!container) return;
      
      // Add prop to container via service (adds 1 to quantity if already exists)
      await packListService.addPropToContainer(packListId, containerId, propId, 1);
      
      // Update prop location to reflect container assignment
      try {
        await inventoryService.updateLocation(propId, {
          type: 'storage',
          name: container.name,
          details: `Container ${container.name} in packing list ${packList?.name || packListId}`,
        });
        
        // Update prop assignment field
        await service.updateDocument('props', propId, {
          assignment: {
            type: 'box',
            id: containerId,
            name: container.name,
            assignedAt: new Date().toISOString(),
          },
        });
      } catch (locationError) {
        console.warn('Failed to update prop location:', locationError);
        // Don't fail the whole operation if location update fails
      }
      
      // Refresh containers from Firestore
      const refreshed = await packListService.getPackList(packListId);
      setPackList(refreshed);
      setContainers(refreshed.containers || []);
      setSelectedPropContainer(prev => ({ ...prev, [propId]: containerId }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add prop to container';
      setErrorMessage(errorMsg);
      console.error('Failed to add prop to container:', err);
    }
  };

  // Drag-and-drop sensors
  const sensors = useSensors(useSensor(PointerSensor));

  // Drag-and-drop logic for props
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active) return;
    const propId = active.id as string;
    const containerId = over.id as string;
    const containerIdx = containers.findIndex((c) => c.id === containerId);
    if (containerIdx === -1) return;
    
    // Trigger animation
    setRecentlyDroppedContainer(containerId);
    handleAddPropToContainer(propId, containerId);
    
    // Clear animation after 1 second
    setTimeout(() => {
      setRecentlyDroppedContainer(null);
    }, 1000);
  };

  // Draggable prop card component
  function DraggablePropCard({ prop }: { prop: InventoryProp }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: prop.id });
    const currentContainerId = selectedPropContainer[prop.id];
    const currentContainer = currentContainerId ? containers.find(c => c.id === currentContainerId) : null;
    const [imageError, setImageError] = useState(false);
    const imageUrl = prop.images && prop.images.length > 0 ? prop.images[0] : null;
    
    return (
      <div
        ref={setNodeRef}
        {...(isReadOnly ? {} : { ...attributes, ...listeners })}
        className={`bg-white/5 hover:bg-white/10 rounded-lg p-4 text-white shadow-sm transition-colors duration-200 border border-white/10 hover:border-pb-primary/30 ${isDragging ? 'opacity-50' : ''} ${isReadOnly ? 'cursor-default' : 'cursor-grab'}`}
        style={{ userSelect: 'none' }}
      >
        <div className="flex items-start gap-3 mb-2">
          {/* Prop Thumbnail */}
          <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-pb-darker/60 border border-white/10 flex items-center justify-center">
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={prop.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-pb-gray/50" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-base text-white mb-1 truncate">{prop.name}</div>
                <div className="text-sm text-pb-gray/70 mb-2">{prop.category}</div>
                {currentContainer && (
                  <div className="text-xs text-pb-primary mb-2">
                    In: {currentContainer.name}
                  </div>
                )}
              </div>
              <select
                value={currentContainerId || ''}
                onChange={async (e) => {
                  e.stopPropagation();
                  if (e.target.value) {
                    await handleAddPropToContainer(prop.id, e.target.value);
                  } else {
                    // Remove from container
                    if (!packListId) return;
                    
                    // Clear any previous error messages
                    setErrorMessage(null);
                    
                    try {
                      const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
                      const inventoryService = new DigitalInventoryService(service, null as any, null as any);
                      
                      // Find which container the prop is currently in
                      const currentContainer = containers.find(c => 
                        c.props.some(p => p.propId === prop.id)
                      );
                      
                      if (currentContainer) {
                        // Remove prop from container via service
                        // Note: The service might not have a remove method, so we'll need to update the container
                        // by setting the prop quantity to 0 or removing it from the props array
                        const updatedProps = currentContainer.props
                          .filter(p => p.propId !== prop.id)
                          .map(p => ({ propId: p.propId, quantity: p.quantity }));
                        
                        await packListService.updateContainer(packListId, currentContainer.id, {
                          props: updatedProps,
                        } as any);
                        
                        // Clear prop location/assignment
                        try {
                          await inventoryService.updateLocation(prop.id, {
                            type: 'storage',
                            name: 'Unassigned',
                            details: 'Not assigned to any container',
                          });
                          
                          await service.updateDocument('props', prop.id, {
                            assignment: null,
                          });
                        } catch (locationError) {
                          console.warn('Failed to clear prop location:', locationError);
                        }
                      }
                      
                      // Refresh containers
                      const refreshed = await packListService.getPackList(packListId);
                      setPackList(refreshed);
                      setContainers(refreshed.containers || []);
                      setSelectedPropContainer(prev => {
                        const next = { ...prev };
                        delete next[prop.id];
                        return next;
                      });
                    } catch (err) {
                      const errorMsg = err instanceof Error ? err.message : 'Failed to remove prop from container';
                      setErrorMessage(errorMsg);
                      console.error('Failed to remove prop from container:', err);
                    }
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                disabled={isReadOnly}
                className="ml-2 px-2 py-1 text-xs rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Assign to container"
              >
                <option value="">Unassigned</option>
                {containerOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {'  '.repeat(opt.level)}{opt.name}
                  </option>
                ))}
              </select>
            </div>
            {prop.description && <div className="text-sm text-pb-gray/60 mb-2 line-clamp-2">{prop.description}</div>}
            {prop.tags && prop.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {prop.tags.map((tag) => (
                  <span key={tag} className="bg-pb-primary/20 text-pb-primary text-xs px-2 py-1 rounded-full border border-pb-primary/30">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
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

  // Check if list is read-only (shipped or arrived)
  const isReadOnly = useMemo(() => {
    return !!(packList?.shipping?.shippedDate || packList?.shipping?.arrivedDate);
  }, [packList]);

  // Delivery details form state
  const [deliveryForm, setDeliveryForm] = useState({
    mode: packList?.shipping?.mode || 'courier' as 'courier' | 'tour',
    toAddress: packList?.shipping?.toAddress || '',
    fromAddress: packList?.shipping?.fromAddress || '',
    tourLabel: packList?.shipping?.tourLabel || '',
    dispatchDate: packList?.shipping?.dispatchDate ? packList.shipping.dispatchDate.split('T')[0] : '',
    shippedDate: packList?.shipping?.shippedDate ? packList.shipping.shippedDate.split('T')[0] : '',
    expectedDeliveryDate: packList?.shipping?.expectedDeliveryDate ? packList.shipping.expectedDeliveryDate.split('T')[0] : '',
    arrivedDate: packList?.shipping?.arrivedDate ? packList.shipping.arrivedDate.split('T')[0] : '',
    courierName: packList?.shipping?.courierName || '',
    trackingNumber: packList?.shipping?.trackingNumber || '',
  });
  const [savingDelivery, setSavingDelivery] = useState(false);

  // Labels state
  const [labels, setLabels] = useState<any[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);

  // Update delivery form when packList changes
  useEffect(() => {
    if (packList?.shipping) {
      setDeliveryForm({
        mode: packList.shipping.mode || 'courier',
        toAddress: packList.shipping.toAddress || '',
        fromAddress: packList.shipping.fromAddress || '',
        tourLabel: packList.shipping.tourLabel || '',
        dispatchDate: packList.shipping.dispatchDate ? packList.shipping.dispatchDate.split('T')[0] : '',
        shippedDate: packList.shipping.shippedDate ? packList.shipping.shippedDate.split('T')[0] : '',
        expectedDeliveryDate: packList.shipping.expectedDeliveryDate ? packList.shipping.expectedDeliveryDate.split('T')[0] : '',
        arrivedDate: packList.shipping.arrivedDate ? packList.shipping.arrivedDate.split('T')[0] : '',
        courierName: packList.shipping.courierName || '',
        trackingNumber: packList.shipping.trackingNumber || '',
      });
    }
  }, [packList]);

  // Load labels when labels tab is active
  useEffect(() => {
    if (activeTab === 'labels' && packListId && labels.length === 0 && !loadingLabels) {
      loadLabels();
    }
  }, [activeTab, packListId]);

  const loadLabels = async () => {
    if (!packListId) return;
    setLoadingLabels(true);
    try {
      const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
      const generatedLabels = await packListService.generatePackingLabels(packListId);
      setLabels(generatedLabels);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate labels';
      setErrorMessage(errorMsg);
      console.error('Failed to generate labels:', err);
    } finally {
      setLoadingLabels(false);
    }
  };

  const handlePrintLabels = async () => {
    if (labels.length === 0) {
      await loadLabels();
    }
    try {
      const { LabelPrintService } = await import('../../shared/services/pdf/labelPrintService');
      const printer = new LabelPrintService();
      await printer.printLabels(labels);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to print labels';
      setErrorMessage(errorMsg);
      console.error('Failed to print labels:', err);
    }
  };

  const handleSaveDeliveryDetails = async () => {
    if (!packListId) return;
    setSavingDelivery(true);
    setErrorMessage(null);
    try {
      const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
      const inventoryService = new DigitalInventoryService(service, null as any, null as any);
      
      // Check if shippedDate is being set (wasn't set before, but is now)
      const wasShipped = !!packList?.shipping?.shippedDate;
      const isNowShipped = !!deliveryForm.shippedDate;
      const isNewlyShipped = !wasShipped && isNowShipped;
      
      // Check if arrivedDate is being set (wasn't set before, but is now)
      const wasArrived = !!packList?.shipping?.arrivedDate;
      const isNowArrived = !!deliveryForm.arrivedDate;
      const isNewlyArrived = !wasArrived && isNowArrived;
      
      // Convert date strings to ISO format
      const shipping = {
        mode: deliveryForm.mode,
        toAddress: deliveryForm.toAddress || undefined,
        fromAddress: deliveryForm.fromAddress || undefined,
        tourLabel: deliveryForm.tourLabel || undefined,
        dispatchDate: deliveryForm.dispatchDate ? new Date(deliveryForm.dispatchDate).toISOString() : undefined,
        shippedDate: deliveryForm.shippedDate ? new Date(deliveryForm.shippedDate).toISOString() : undefined,
        expectedDeliveryDate: deliveryForm.expectedDeliveryDate ? new Date(deliveryForm.expectedDeliveryDate).toISOString() : undefined,
        arrivedDate: deliveryForm.arrivedDate ? new Date(deliveryForm.arrivedDate).toISOString() : undefined,
        courierName: deliveryForm.courierName || undefined,
        trackingNumber: deliveryForm.trackingNumber || undefined,
      };

      await packListService.updatePackList(packListId, { shipping } as any);
      const refreshed = await packListService.getPackList(packListId);
      setPackList(refreshed);
      
      // Update prop statuses if container was just shipped or arrived
      if (isNewlyShipped || isNewlyArrived) {
        // Get all props in all containers
        const allPropIds = new Set<string>();
        refreshed.containers.forEach(container => {
          container.props.forEach(prop => {
            allPropIds.add(prop.propId);
          });
        });
        
        // Update each prop's status
        for (const propId of allPropIds) {
          try {
            if (isNewlyShipped) {
              // Update to in_transit when shipped
              const propDoc = await service.getDocument('props', propId);
              if (propDoc?.data) {
                const currentStatus = propDoc.data.status;
                // Only update if current status allows transition to in_transit
                // Valid transitions: 'available_in_storage' or 'checked_out' -> 'in_transit'
                if (currentStatus === 'available_in_storage' || currentStatus === 'checked_out') {
                  await service.updateDocument('props', propId, {
                    status: 'in_transit',
                    lastStatusUpdate: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                  
                  // Update location to transit
                  await inventoryService.updateLocation(propId, {
                    type: 'transit',
                    name: `In transit - ${refreshed.name}`,
                    details: `Shipped on ${deliveryForm.shippedDate}`,
                  });
                }
              }
            } else if (isNewlyArrived) {
              // Update to available_in_storage when arrived
              await service.updateDocument('props', propId, {
                status: 'available_in_storage',
                lastStatusUpdate: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              
              // Update location back to storage (container)
              const container = refreshed.containers.find(c => 
                c.props.some(p => p.propId === propId)
              );
              if (container) {
                await inventoryService.updateLocation(propId, {
                  type: 'storage',
                  name: container.name,
                  details: `Arrived - Container ${container.name} in packing list ${refreshed.name}`,
                });
              }
            }
          } catch (propError) {
            console.warn(`Failed to update prop ${propId} status:`, propError);
            // Continue with other props even if one fails
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save delivery details';
      setErrorMessage(errorMsg);
      console.error('Failed to save delivery details:', err);
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleCopyList = async () => {
    if (!packList || !packListId) return;
    setCopying(true);
    setErrorMessage(null);
    try {
      const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
      
      // Create new list with copied data
      const newListData = {
        name: `${packList.name} (Copy)`,
        description: packList.description,
        showId: packList.showId,
        ownerId: packList.ownerId,
        containers: packList.containers.map(c => {
          const { id, metadata, ...containerData } = c;
          return containerData as Omit<PackingContainer, 'id' | 'metadata'>;
        }),
        status: 'draft',
        labels: [],
        shipping: packList.shipping ? {
          mode: packList.shipping.mode,
          toAddress: packList.shipping.toAddress,
          fromAddress: packList.shipping.fromAddress,
          tourLabel: packList.shipping.tourLabel,
          // Clear dates but keep addresses
          dispatchDate: undefined,
          shippedDate: undefined,
          expectedDeliveryDate: undefined,
          arrivedDate: undefined,
          courierName: undefined,
          trackingNumber: undefined,
        } : undefined,
      };

      const newListId = await packListService.createPackList(newListData as any);
      setCopyModalOpen(false);
      navigate(`/packing-lists/${newListId}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to copy packing list';
      setErrorMessage(errorMsg);
      console.error('Failed to copy packing list:', err);
    } finally {
      setCopying(false);
    }
  };

  // Calculate statistics
  const rootContainers = containers.filter(c => !c.parentId);
  const nestedContainers = containers.filter(c => c.parentId);
  const totalPropsPacked = containers.reduce((sum, c) => sum + c.props.length, 0);
  const emptyContainers = containers.filter(c => c.props.length === 0);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Error Message Banner */}
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 text-sm">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-300 transition-colors"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
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
            {isReadOnly && (
              <button
                onClick={() => setCopyModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg transition-colors"
                title="Copy this packing list to create an editable version"
              >
                <Copy className="w-4 h-4" />
                Copy List
              </button>
            )}
          </div>
          <p className="text-pb-gray/70">Organize props into containers for efficient packing and shipping</p>
          
          {/* Read-only Banner */}
          {isReadOnly && (
            <div className="mt-4 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-yellow-400 text-sm font-medium">This packing list is read-only</p>
                <p className="text-yellow-300/70 text-xs mt-1">
                  {packList.shipping?.arrivedDate 
                    ? 'This list has arrived and cannot be edited. Copy it to create an editable version.'
                    : 'This list has been shipped and cannot be edited. Copy it to create an editable version.'}
                </p>
              </div>
            </div>
          )}
          
          {/* Statistics */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {containers.length} total container{containers.length !== 1 ? 's' : ''} ({rootContainers.length} root, {nestedContainers.length} nested)
            </div>
            <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
              {totalPropsPacked} prop{totalPropsPacked !== 1 ? 's' : ''} packed
            </div>
            <div className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              {emptyContainers.length} empty container{emptyContainers.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-white/10">
          <nav className="flex space-x-1" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('props')}
              className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'props'
                  ? 'bg-pb-darker/60 text-white border-b-2 border-pb-primary'
                  : 'text-pb-gray/70 hover:text-white hover:bg-pb-darker/40'
              }`}
              disabled={isReadOnly && activeTab !== 'props'}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Props
              </div>
            </button>
            <button
              onClick={() => setActiveTab('containers')}
              className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'containers'
                  ? 'bg-pb-darker/60 text-white border-b-2 border-pb-primary'
                  : 'text-pb-gray/70 hover:text-white hover:bg-pb-darker/40'
              }`}
              disabled={isReadOnly && activeTab !== 'containers'}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Containers
              </div>
            </button>
            <button
              onClick={() => setActiveTab('delivery')}
              className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'delivery'
                  ? 'bg-pb-darker/60 text-white border-b-2 border-pb-primary'
                  : 'text-pb-gray/70 hover:text-white hover:bg-pb-darker/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Delivery Details
              </div>
            </button>
            <button
              onClick={() => setActiveTab('labels')}
              className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'labels'
                  ? 'bg-pb-darker/60 text-white border-b-2 border-pb-primary'
                  : 'text-pb-gray/70 hover:text-white hover:bg-pb-darker/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Labels
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'props' && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="bg-pb-darker/40 rounded-lg border border-white/10 p-6">
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
                  disabled={isReadOnly}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
                {filteredProps.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <Package className="w-12 h-12 text-pb-gray/50 mx-auto mb-3" />
                    <p className="text-pb-gray/70">No props found</p>
                    <p className="text-pb-gray/50 text-sm">Try adjusting your search terms</p>
                  </div>
                ) : (
                  filteredProps.map((prop) => (
                    <DraggablePropCard key={prop.id} prop={prop} />
                  ))
                )}
              </div>
            </div>
          </DndContext>
        )}

        {activeTab === 'containers' && (
          <div className="space-y-6">
            {/* Bulk Actions */}
            {Object.values(selected).filter(Boolean).length > 0 && !isReadOnly && (
              <div className="bg-pb-darker/40 rounded-lg p-6 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Bulk Actions</h3>
                    <p className="text-pb-gray/70 text-sm">
                      {Object.values(selected).filter(Boolean).length} item{Object.values(selected).filter(Boolean).length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      className="px-4 py-2 rounded-lg bg-pb-primary hover:bg-pb-secondary text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={() => setBulkPlaceOpen(true)}
                    >
                      Place Selected Items
                    </button>
                    <button
                      className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={bulkSaving}
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
            )}

            {/* Container Creation Zone */}
            {!isReadOnly && (
              <>
                <QuickContainerForm
                  onSubmit={(form) => handleAddContainer(form, addChildContainerId)}
                  onTemplateClick={handleTemplateClick}
                  containerCount={containers.length}
                  isCreating={isCreatingContainer}
                />

                {/* Add Child Container Form (if active) */}
                {addChildContainerId && (
                  <div className="bg-pb-darker/40 rounded-lg border border-pb-primary/30 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">Add Child Container</h3>
                        <span className="text-sm text-pb-gray/70">
                          (Inside: {containers.find(c => c.id === addChildContainerId)?.name || addChildContainerId})
                        </span>
                      </div>
                      <button
                        onClick={() => setAddChildContainerId(null)}
                        className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <QuickContainerForm
                      onSubmit={(form) => handleAddContainer(form, addChildContainerId)}
                      onTemplateClick={async (type) => {
                        const defaults = DEFAULT_DIMENSIONS[type];
                        if (defaults) {
                          await handleAddContainer({
                            type,
                            length: String(defaults.length),
                            width: String(defaults.width),
                            height: String(defaults.height),
                            unit: defaults.unit,
                            description: '',
                            location: '',
                          }, addChildContainerId);
                        }
                      }}
                      containerCount={containers.length}
                      isCreating={isCreatingContainer}
                    />
                  </div>
                )}
              </>
            )}

            {/* Container Hierarchy View */}
            <div className="bg-pb-darker/40 rounded-lg border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-purple-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Container Hierarchy</h2>
              </div>
              <ContainerTree
                containers={containers}
                packListId={packListId!}
                propsList={propsList}
                calculateContainerWeight={calculateContainerWeight}
                onAddChildContainer={handleAddChildContainer}
                onRemoveFromParent={handleRemoveFromParent}
                onMoveContainer={handleMoveContainer}
                selected={selected}
                onSelectChange={handleSelectChange}
                onSaveContainer={handleSaveContainer}
                service={service}
                packList={packList}
                movingContainerId={movingContainerId}
                removingContainerId={removingContainerId}
                recentlyDroppedContainer={recentlyDroppedContainer}
              />
            </div>
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="bg-pb-darker/40 rounded-lg border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Truck className="w-4 h-4 text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Delivery Details</h2>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSaveDeliveryDetails(); }} className="space-y-6">
              {/* Shipping Mode */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Shipping Mode</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      value="courier"
                      checked={deliveryForm.mode === 'courier'}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, mode: e.target.value as 'courier' | 'tour' })}
                      disabled={isReadOnly}
                      className="w-4 h-4 text-pb-primary focus:ring-pb-primary disabled:opacity-50"
                    />
                    <span className="text-white">Courier</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      value="tour"
                      checked={deliveryForm.mode === 'tour'}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, mode: e.target.value as 'courier' | 'tour' })}
                      disabled={isReadOnly}
                      className="w-4 h-4 text-pb-primary focus:ring-pb-primary disabled:opacity-50"
                    />
                    <span className="text-white">Tour</span>
                  </label>
                </div>
              </div>

              {/* Courier-specific fields */}
              {deliveryForm.mode === 'courier' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">From Address</label>
                    <textarea
                      value={deliveryForm.fromAddress}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, fromAddress: e.target.value })}
                      disabled={isReadOnly}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Enter sender address..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">To Address</label>
                    <textarea
                      value={deliveryForm.toAddress}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, toAddress: e.target.value })}
                      disabled={isReadOnly}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Enter recipient address..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Courier Name</label>
                    <input
                      type="text"
                      value={deliveryForm.courierName}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, courierName: e.target.value })}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="e.g., DHL, FedEx, UPS"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Tracking Number</label>
                    <input
                      type="text"
                      value={deliveryForm.trackingNumber}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, trackingNumber: e.target.value })}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Enter tracking number"
                    />
                  </div>
                </>
              )}

              {/* Tour-specific fields */}
              {deliveryForm.mode === 'tour' && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Tour Label</label>
                  <input
                    type="text"
                    value={deliveryForm.tourLabel}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, tourLabel: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="e.g., Tour 2024, UK Tour"
                  />
                </div>
              )}

              {/* Date fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Dispatch Date</label>
                  <input
                    type="date"
                    value={deliveryForm.dispatchDate}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, dispatchDate: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Shipped Date</label>
                  <input
                    type="date"
                    value={deliveryForm.shippedDate}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, shippedDate: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={deliveryForm.expectedDeliveryDate}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, expectedDeliveryDate: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Arrived Date</label>
                  <input
                    type="date"
                    value={deliveryForm.arrivedDate}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, arrivedDate: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {!isReadOnly && (
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      if (packList?.shipping) {
                        setDeliveryForm({
                          mode: packList.shipping.mode || 'courier',
                          toAddress: packList.shipping.toAddress || '',
                          fromAddress: packList.shipping.fromAddress || '',
                          tourLabel: packList.shipping.tourLabel || '',
                          dispatchDate: packList.shipping.dispatchDate ? packList.shipping.dispatchDate.split('T')[0] : '',
                          shippedDate: packList.shipping.shippedDate ? packList.shipping.shippedDate.split('T')[0] : '',
                          expectedDeliveryDate: packList.shipping.expectedDeliveryDate ? packList.shipping.expectedDeliveryDate.split('T')[0] : '',
                          arrivedDate: packList.shipping.arrivedDate ? packList.shipping.arrivedDate.split('T')[0] : '',
                          courierName: packList.shipping.courierName || '',
                          trackingNumber: packList.shipping.trackingNumber || '',
                        });
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={savingDelivery}
                    className="px-4 py-2 rounded-lg bg-pb-primary hover:bg-pb-secondary text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingDelivery ? 'Saving...' : 'Save Delivery Details'}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {activeTab === 'labels' && (
          <div className="bg-pb-darker/40 rounded-lg border border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Tag className="w-4 h-4 text-purple-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Packing Labels</h2>
              </div>
              <button
                onClick={handlePrintLabels}
                disabled={loadingLabels || labels.length === 0}
                className="px-4 py-2 rounded-lg bg-pb-primary hover:bg-pb-secondary text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Tag className="w-4 h-4" />
                Print Labels
              </button>
            </div>

            {loadingLabels ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pb-primary mx-auto mb-4"></div>
                  <p className="text-pb-gray/70">Generating labels...</p>
                </div>
              </div>
            ) : labels.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="w-12 h-12 text-pb-gray/50 mx-auto mb-3" />
                <p className="text-pb-gray/70 mb-2">No labels generated yet</p>
                <button
                  onClick={loadLabels}
                  className="px-4 py-2 rounded-lg bg-pb-primary hover:bg-pb-secondary text-white transition-colors"
                >
                  Generate Labels
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {labels.map((label) => (
                  <div
                    key={label.id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="text-center">
                      <div className="font-semibold text-white mb-2">{label.containerName}</div>
                      <div className="text-sm text-pb-gray/70 mb-3">
                        {label.propCount} prop{label.propCount !== 1 ? 's' : ''} · {label.containerStatus}
                      </div>
                      {label.qrCode && (
                        <div className="mb-3 flex justify-center">
                          <img src={label.qrCode} alt="QR Code" className="w-32 h-32 bg-white p-2 rounded" />
                        </div>
                      )}
                      {label.labels && label.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-center mb-2">
                          {label.labels.map((tag: string, idx: number) => (
                            <span key={idx} className="bg-pb-primary/20 text-pb-primary text-xs px-2 py-1 rounded-full border border-pb-primary/30">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {label.url && (
                        <div className="text-xs text-pb-gray/50 break-all">{label.url}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Copy Confirmation Modal */}
        <ConfirmationModal
          isOpen={copyModalOpen}
          title="Copy Packing List"
          message={`Create a copy of "${packList.name}"? The copy will be editable and all shipping dates will be cleared.`}
          confirmText="Copy"
          cancelText="Cancel"
          onConfirm={handleCopyList}
          onCancel={() => setCopyModalOpen(false)}
          isLoading={copying}
        />

        {/* Bulk Place modal */}
        {bulkPlaceOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setBulkPlaceOpen(false)}>
            <div className="bg-pb-darker/90 border border-pb-primary/30 rounded-xl shadow-xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-lg text-white">Place selected on…</div>
                <button className="text-gray-300 hover:text-white" onClick={() => setBulkPlaceOpen(false)}>✕</button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {containers.filter(c => !selected[c.id]).length === 0 && (
                  <div className="text-gray-400">No other containers available.</div>
                )}
                {containers.filter(c => !selected[c.id]).map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                    <div>
                      <div className="font-medium text-white">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.type || 'container'} · {p.id}</div>
                    </div>
                    <button
                      className="px-3 py-1.5 rounded-lg bg-pb-primary text-white hover:bg-pb-secondary transition disabled:opacity-60 disabled:cursor-not-allowed"
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
                <div className="text-sm mb-2 text-white">Quick create parent:</div>
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
