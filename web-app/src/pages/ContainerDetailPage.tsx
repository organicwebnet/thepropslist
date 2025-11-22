import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Image as ImageIcon, ArrowLeft, Box, Package, Search, Plus, AlertCircle, Printer, Trash2, MessageSquare, ExternalLink, Copy } from 'lucide-react';
import DashboardLayout from '../PropsBibleHomepage';
import { useFirebase } from '../contexts/FirebaseContext';
import { useWebAuth } from '../contexts/WebAuthContext';
import { DigitalPackListService, PackList, PackingContainer, ContainerComment, ContainerActivity } from '../../shared/services/inventory/packListService';
import { DigitalInventoryService, InventoryProp } from '../../shared/services/inventory/inventoryService';
import { getSymbolUrl, symbolLabel } from '../utils/transport';
import SubFootnote from '../components/SubFootnote';
import { useContextMenu } from '../hooks/useContextMenu';
import { ContextMenu, ContextMenuItem } from '../components/ContextMenu';

const ContainerDetailPage: React.FC = () => {
  const { service } = useFirebase();
  const { user, userProfile } = useWebAuth();
  const navigate = useNavigate();
  const { packListId, containerId } = useParams<{ packListId: string; containerId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [container, setContainer] = useState<PackingContainer | null>(null);
  const [packList, setPackList] = useState<PackList | null>(null);
  const [propsList, setPropsList] = useState<InventoryProp[]>([]);
  const [removing, setRemoving] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [showName, setShowName] = useState<string>('');
  const [toAddress, setToAddress] = useState<string>('');
  const [fromAddress, setFromAddress] = useState<string>('');
  const [shippingMode, setShippingMode] = useState<'courier'|'tour'>('courier');
  const [tourLabel, setTourLabel] = useState<string>('');
  const [propsSupervisor, setPropsSupervisor] = useState<string>('Props Supervisor');
  const [parentSelecting, setParentSelecting] = useState(false);
  const [availableParents, setAvailableParents] = useState<PackingContainer[]>([]);
  const [savingParent, setSavingParent] = useState(false);
  const [updatingChild, setUpdatingChild] = useState<Record<string, boolean>>({});
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationValue, setLocationValue] = useState<string>('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [userInfoMap, setUserInfoMap] = useState<Map<string, { displayName: string; email?: string }>>(new Map());
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  
  // Contextual menu for prop items
  const propContextMenu = useContextMenu({
    longPressDelay: 500,
    onClose: () => setSelectedPropId(null),
  });

  useEffect(() => {
    if (!packListId || !containerId) return;
    const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
    const inventoryService = new DigitalInventoryService(service, null as any, null as any);
    setLoading(true);
    packListService.getPackList(packListId)
      .then(async (pl: PackList) => {
        setPackList(pl);
        const c = (pl.containers || []).find((x) => x.id === containerId) || null;
        setContainer(c);
        setLocationValue(c?.location || '');
        try {
          if (pl.showId) {
            const showDoc = await service.getDocument<any>('shows', pl.showId);
            const sdata = showDoc?.data || {};
            setShowName(sdata?.name || '');
            // Resolve props supervisor name
            let supervisorName: string | undefined;
            try {
              const collabs = Array.isArray(sdata?.collaborators) ? sdata.collaborators : [];
              const sup = collabs.find((c: any) => c?.role === 'props_supervisor');
              if (sup?.name) supervisorName = String(sup.name);
            } catch (err) { /* ignore */ }
            // Fallback: find in team map by role and fetch profile name
            if (!supervisorName && sdata?.team && typeof sdata.team === 'object') {
              try {
                const entries = Object.entries(sdata.team as Record<string, string>);
                const found = entries.find(([, role]) => role === 'props_supervisor');
                const uid = found?.[0];
                if (uid) {
                  const prof = await service.getDocument<any>('userProfiles', uid);
                  supervisorName = prof?.data?.displayName || prof?.data?.name || undefined;
                }
            } catch {
              // noop
            }
            }
            if (supervisorName) setPropsSupervisor(supervisorName);
            // If later we store addresses on the show, use them
            const to = sdata?.shippingToAddress as string | undefined;
            const from = sdata?.shippingFromAddress as string | undefined;
            if (typeof to === 'string' && to.trim()) setToAddress(to.trim());
            if (typeof from === 'string' && from.trim()) setFromAddress(from.trim());
          }
        } catch (err) { /* ignore */ }

        // Read addresses from pack list shipping config if present
        try {
          const ship = (pl as any)?.shipping as { mode?: 'courier'|'tour'; toAddress?: string; fromAddress?: string; tourLabel?: string } | undefined;
          if (ship?.mode) setShippingMode(ship.mode);
          if (ship?.toAddress) setToAddress(ship.toAddress);
          if (ship?.fromAddress) setFromAddress(ship.fromAddress);
          if (ship?.tourLabel) setTourLabel(ship.tourLabel);
        } catch (err) { /* ignore */ }
        const allProps = await inventoryService.listProps();
        setPropsList(allProps);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [packListId, containerId, service]);

  useEffect(() => {
    if (!packList || !container) return;
    setAvailableParents((packList.containers || []).filter(c => c.id !== container.id));
  }, [packList, container]);

  // Fetch user info for comments and activity log
  useEffect(() => {
    if (!container || !service) return;
    const userIds = new Set<string>();
    (container.comments || []).forEach(c => userIds.add(c.userId));
    (container.activityLog || []).forEach(a => userIds.add(a.userId));
    
    if (userIds.size === 0) return;
    
    const fetchUserInfo = async () => {
      const userMap = new Map<string, { displayName: string; email?: string }>();
      await Promise.all(
        Array.from(userIds).map(async (uid) => {
          try {
            const userDoc = await service.getDocument('userProfiles', uid);
            if (userDoc && userDoc.data) {
              userMap.set(uid, {
                displayName: userDoc.data.displayName || userDoc.data.name || userDoc.data.email || 'Unknown User',
                email: userDoc.data.email
              });
            } else {
              userMap.set(uid, { displayName: 'Unknown User' });
            }
          } catch (error) {
            console.error(`Error fetching user profile for ${uid}:`, error);
            userMap.set(uid, { displayName: 'Unknown User' });
          }
        })
      );
      setUserInfoMap(userMap);
    };
    
    fetchUserInfo();
  }, [container, service]);

  // Helper function to create activity log entry
  const createActivity = (type: string, details?: any): ContainerActivity => {
    const userName = userProfile?.displayName || user?.displayName || user?.email || 'Unknown User';
    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      userId: user?.uid || '',
      userName,
      timestamp: new Date().toISOString(),
      details
    };
  };

  // Helper function to add activity and update container
  // containerOverride: optional container to use instead of state (fixes race condition with async state updates)
  const addActivity = async (activity: ContainerActivity, containerOverride?: PackingContainer | null) => {
    const containerToUse = containerOverride ?? container;
    if (!packListId || !containerToUse) return;
    const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
    const currentActivities = containerToUse.activityLog || [];
      await packListService.updateContainer(packListId, containerToUse.id, {
        activityLog: [...currentActivities, activity]
      } as Partial<Omit<PackingContainer, 'id' | 'metadata'>>);
    const refreshed = await packListService.getPackList(packListId);
    setPackList(refreshed);
    const updated = (refreshed.containers || []).find((x) => x.id === containerToUse.id) || null;
    setContainer(updated);
  };

  // Constants for validation
  const MAX_COMMENT_LENGTH = 2000;

  // Helper function to sanitize comment text
  const sanitizeComment = (text: string): string => {
    // Remove control characters and trim
    return text
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .trim();
  };

  // Helper function to add comment
  const handleAddComment = async () => {
    setCommentError(null);
    
    if (!user || !packListId || !container || addingComment) {
      setCommentError('Unable to add comment. Please refresh the page.');
      return;
    }

    const trimmed = sanitizeComment(newComment);
    
    // Validation
    if (!trimmed || trimmed.length === 0) {
      setCommentError('Comment cannot be empty.');
      return;
    }
    
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      setCommentError(`Comment must be less than ${MAX_COMMENT_LENGTH} characters. Currently ${trimmed.length} characters.`);
      return;
    }

    setAddingComment(true);
    try {
      const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
      const userName = userProfile?.displayName || user.displayName || user.email || 'Unknown User';
      const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'U';
      const comment: ContainerComment = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: user.uid,
        userName,
        userAvatarInitials: userInitials,
        text: trimmed.substring(0, MAX_COMMENT_LENGTH),
        createdAt: new Date().toISOString()
      };
      const currentComments = container.comments || [];
      await packListService.updateContainer(packListId, container.id, {
        comments: [...currentComments, comment]
      } as Partial<Omit<PackingContainer, 'id' | 'metadata'>>);
      const refreshed = await packListService.getPackList(packListId);
      setPackList(refreshed);
      const updated = (refreshed.containers || []).find((x) => x.id === container.id) || null;
      setContainer(updated);
      setNewComment('');
      setCommentError(null);
    } catch (err) {
      console.error('Failed to add comment:', err);
      setCommentError('Failed to add comment. Please try again.');
    } finally {
      setAddingComment(false);
    }
  };

  // Combined comments and activity log, sorted by date
  const combinedLog = useMemo(() => {
    if (!container) return [];
    const items: Array<ContainerComment | ContainerActivity> = [];
    (container.comments || []).forEach(c => items.push(c));
    (container.activityLog || []).forEach(a => items.push(a));
    return items.sort((a, b) => {
      const dateA = (a as ContainerComment).createdAt || (a as ContainerActivity).timestamp;
      const dateB = (b as ContainerComment).createdAt || (b as ContainerActivity).timestamp;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [container]);

  const findProp = (id: string) => propsList.find((p) => p.id === id);
  
  // Shared function to remove prop from container
  const handleRemovePropFromContainer = useCallback(async (propId: string) => {
    if (!packListId || !container) return;
    
    setRemoving((prev) => ({ ...prev, [propId]: true }));
    try {
      const serviceInst = new DigitalPackListService(service, null as any, null as any, window.location.origin);
      const propToRemove = findProp(propId);
      await serviceInst.removePropFromContainer(packListId, container.id, propId);
      // When removed, set prop status to on-hold
      try { 
        await service.updateDocument('props', propId, { status: 'on-hold', lastStatusUpdate: new Date().toISOString() }); 
      } catch (err) { 
        console.warn('Failed to update prop status:', err);
      }
      const refreshed = await serviceInst.getPackList(packListId);
      const updated = (refreshed.containers || []).find((x) => x.id === container.id) || null;
      setContainer(updated);
      setPackList(refreshed);
      // Track activity
      if (updated) {
        const activity = createActivity('Prop removed', { 
          propId, 
          propName: propToRemove?.name || 'Unknown prop', 
          quantity: container.props.find(p => p.propId === propId)?.quantity || 1 
        });
        await addActivity(activity, updated);
      }
    } catch (err) {
      console.error('Failed to remove prop from container:', err);
      alert('Failed to remove prop from container. Please try again.');
    } finally {
      setRemoving((prev) => ({ ...prev, [propId]: false }));
    }
  }, [packListId, container, service, createActivity, addActivity]);

  // Memoized handlers for each prop item to prevent recreation on every render
  const getPropContextMenuHandlers = useCallback((propId: string) => {
    return {
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        setSelectedPropId(propId);
        propContextMenu.handleContextMenu(e);
      },
      onTouchStart: (e: React.TouchEvent) => {
        setSelectedPropId(propId);
        propContextMenu.longPressHandlers.onTouchStart(e);
      },
      onTouchMove: propContextMenu.longPressHandlers.onTouchMove,
      onTouchEnd: propContextMenu.longPressHandlers.onTouchEnd,
      onTouchCancel: propContextMenu.longPressHandlers.onTouchCancel,
    };
  }, [propContextMenu]);
  
  const getPropImageUrl = (prop?: InventoryProp): string => {
    if (!prop) return '';
    const imagesAny = prop.images as unknown as any[] | undefined;
    if (Array.isArray(imagesAny) && imagesAny.length > 0) {
      const main = (imagesAny.find?.((x: any) => x && (x.isMain || x.primary)) ?? imagesAny[0]);
      const candidate = typeof main === 'string' ? main : (main?.url || main?.downloadURL || '');
      if (typeof candidate === 'string') return candidate;
    }
    const legacy = (prop as any).imageUrl;
    return typeof legacy === 'string' ? legacy : '';
  };
  const computeEstimatedContentsWeightKg = (): number => {
    if (!container) return 0;
    let totalKg = 0;
    for (const p of container.props) {
      const prop = findProp(p.propId);
      if (!prop?.weight?.value) continue;
      const qty = p.quantity || 0;
      const value = prop.weight.value;
      const unit = prop.weight.unit || 'kg';
      const kg = unit === 'lb' ? value * 0.45359237 : value;
      totalKg += kg * qty;
    }
    return Math.round(totalKg * 100) / 100;
  };

  const computeSymbols = () => {
    const items: { key: string; label: string; url?: string }[] = [];
    let anyFragile = false, anyUp = false, anyDry = false, anyNoTilt = false, anyBattery = false;
    for (const cp of (container?.props || [])) {
      const prop = findProp(cp.propId) as any;
      if (!prop) continue;
      if (prop.fragile) anyFragile = true;
      if (prop.thisWayUp) anyUp = true;
      if (prop.keepDry) anyDry = true;
      if (prop.doNotTilt) anyNoTilt = true;
      if (prop.batteryHazard) anyBattery = true;
    }
    const totalKg = computeEstimatedContentsWeightKg();
    const heavy = totalKg >= 15;
    const twoPerson = totalKg >= 25;
    if (anyFragile) items.push({ key: 'fragile', label: symbolLabel('fragile'), url: getSymbolUrl('fragile') });
    if (anyFragile) items.push({ key: 'handleWithCare', label: symbolLabel('handleWithCare'), url: getSymbolUrl('handleWithCare') });
    if (anyUp) items.push({ key: 'thisWayUp', label: symbolLabel('thisWayUp'), url: getSymbolUrl('thisWayUp') });
    if (anyDry) items.push({ key: 'keepDry', label: symbolLabel('keepDry'), url: getSymbolUrl('keepDry') });
    if (anyNoTilt) items.push({ key: 'doNotTilt', label: symbolLabel('doNotTilt'), url: getSymbolUrl('doNotTilt') });
    if (twoPerson) items.push({ key: 'twoPersonLift', label: symbolLabel('twoPersonLift'), url: getSymbolUrl('twoPersonLift') });
    else if (heavy) items.push({ key: 'heavy', label: symbolLabel('heavy'), url: getSymbolUrl('heavy') });
    if (totalKg > 0) items.push({ key: 'contentsWeight', label: symbolLabel('contentsWeight', totalKg), url: getSymbolUrl('contentsWeight') });
    if (anyBattery) items.push({ key: 'batteryHazard', label: symbolLabel('batteryHazard'), url: getSymbolUrl('batteryHazard') });
    if (items.length === 0) {
      items.push({ key: 'handleWithCare', label: symbolLabel('handleWithCare'), url: getSymbolUrl('handleWithCare') });
    }
    return items;
  };

  const containerPosition = useMemo(() => {
    if (!packList || !container) return { index: 0, total: 0 };
    const list = packList.containers || [];
    const idx = Math.max(0, list.findIndex((c) => c.id === container.id));
    return { index: idx + 1, total: list.length };
  }, [packList, container]);

  const childContainers = useMemo(() => {
    if (!packList || !container) return [] as PackingContainer[];
    return (packList.containers || []).filter(c => (c as any).parentId === container.id) as any;
  }, [packList, container]);

  const qrUrl = useMemo(() => {
    const publicUrl = `https://thepropslist.uk/c/${container?.id || ''}`;
    // External QR image for simplicity; can be swapped to local generator later
    const src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(publicUrl)}`;
    return { publicUrl, src };
  }, [container?.id]);

  // no top contents list for QR panel per spec

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pb-primary mx-auto mb-4"></div>
            <p className="text-pb-gray/70">Loading container details...</p>
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
            <h1 className="text-2xl font-bold text-white mb-2">Error Loading Container</h1>
            <p className="text-pb-gray/70 mb-4">{error}</p>
            <button
              onClick={() => navigate(`/packing-lists/${packListId}`)}
              className="px-4 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg transition-colors"
            >
              Back to Packing List
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!container) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Box className="w-16 h-16 text-pb-gray/50 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Container Not Found</h1>
            <p className="text-pb-gray/70 mb-4">The requested container could not be found.</p>
            <button
              onClick={() => navigate(`/packing-lists/${packListId}`)}
              className="px-4 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg transition-colors"
            >
              Back to Packing List
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
              onClick={() => navigate(`/packing-lists/${packListId}`)}
              className="p-2 hover:bg-pb-darker/40 rounded-lg transition-colors"
              title="Back to Packing List"
            >
              <ArrowLeft className="w-5 h-5 text-pb-gray/70 hover:text-white" />
            </button>
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <Box className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Container: {container.name}</h1>
            {container.type && <span className="text-lg text-pb-gray/70">({container.type})</span>}
          </div>
          <p className="text-pb-gray/70">Manage container details, props, and generate shipping labels</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button 
            className="px-4 py-2 rounded-lg bg-pb-primary hover:bg-pb-secondary text-white font-medium transition-colors flex items-center gap-2"
            onClick={() => setLabelOpen(true)} 
            title="Print label"
          >
            <Printer className="w-4 h-4" />
            Print Label
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors flex items-center gap-2"
            onClick={async () => {
              if (!packListId || !containerId || !container) return;
              if (!confirm(`Are you sure you want to delete container "${container.name}"? This action cannot be undone.`)) {
                return;
              }
              try {
                const serviceInst = new DigitalPackListService(service, null as any, null as any, window.location.origin);
                // Track activity on parent container before deletion (if parent exists)
                if (container.parentId && packList) {
                  const parentContainer = (packList.containers || []).find((c) => c.id === container.parentId);
                  if (parentContainer) {
                    const activity = createActivity('Child container deleted', {
                      childId: container.id,
                      childName: container.name,
                      parentId: container.parentId,
                      parentName: parentContainer.name
                    });
                    const currentActivities = parentContainer.activityLog || [];
                    await serviceInst.updateContainer(packListId, container.parentId, {
                      activityLog: [...currentActivities, activity]
                    } as Partial<Omit<PackingContainer, 'id' | 'metadata'>>);
                  }
                }
                await serviceInst.removeContainer(packListId, containerId);
                navigate(`/packing-lists/${packListId}`);
              } catch (err) {
                console.error('Failed to delete container:', err);
                alert('Failed to delete container. Please try again.');
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
            Delete Container
          </button>
        </div>
        <SubFootnote features={["Custom packing labels", "Bulk print", "Shipping templates"]} />

        <div className="bg-pb-darker/40 rounded-lg border border-white/10 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Container Details</h2>
          </div>
          
          <div className="space-y-4">
            {/* Placement Section */}
            <div className="bg-white/5 rounded-lg border border-white/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-white">Placement</div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 text-sm rounded-lg bg-pb-primary/20 text-pb-primary border border-pb-primary/30 hover:bg-pb-primary/30 transition-colors"
                    onClick={() => setParentSelecting(true)}
                  >
                    {container.parentId ? 'Change' : 'Set parent'}
                  </button>
                  {container.parentId && (
                    <button
                      className="px-3 py-1.5 text-sm rounded-lg bg-gray-600/20 text-gray-400 border border-gray-600/30 hover:bg-gray-600/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={savingParent}
                      onClick={async () => {
                        if (!packListId || !container) return;
                        setSavingParent(true);
                        try {
                          const pls = new DigitalPackListService(service, null as any, null as any, window.location.origin);
                          const oldParentId = container.parentId;
                          await pls.updateContainer(packListId, container.id, { parentId: null });
                          const refreshed = await pls.getPackList(packListId);
                          setPackList(refreshed);
                          const updated = (refreshed.containers || []).find((x) => x.id === container.id) || null;
                          setContainer(updated);
                          // Track activity
                          if (updated && oldParentId) {
                            const activity = createActivity('Parent container removed', { oldParentId });
                            await addActivity(activity, updated);
                          }
                        } finally {
                          setSavingParent(false);
                        }
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-pb-gray/70">Placed on:</span>
                {container.parentId ? (
                  <span className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {(() => {
                      const p = availableParents.find(p => p.id === container.parentId);
                      return p ? `${p.name}${p.type ? ` (${p.type})` : ''}` : `#${container.parentId}`;
                    })()}
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-lg bg-gray-500/20 text-gray-400 border border-gray-500/30">None</span>
                )}
              </div>
            </div>
            {/* Location Section */}
            <div className="bg-white/5 rounded-lg border border-white/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium text-white">Location</div>
                <button
                  className="px-3 py-1.5 text-sm rounded-lg bg-pb-primary/20 text-pb-primary border border-pb-primary/30 hover:bg-pb-primary/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  onClick={() => {
                    setEditingLocation(true);
                    setLocationValue(container.location || '');
                  }}
                  disabled={editingLocation || savingLocation}
                >
                  {editingLocation ? 'Editing...' : container.location ? 'Change' : 'Set location'}
                </button>
              </div>
              {editingLocation ? (
                <div className="space-y-2">
                  {locationError && (
                    <div className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                      {locationError}
                    </div>
                  )}
                  <input
                    type="text"
                    value={locationValue}
                    onChange={(e) => setLocationValue(e.target.value)}
                    placeholder="e.g., Warehouse A, Room 101, Storage Unit 5"
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1.5 text-sm rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={savingLocation}
                      onClick={async () => {
                        if (!packListId || !container) return;
                        setSavingLocation(true);
                        try {
                          const pls = new DigitalPackListService(service, null as any, null as any, window.location.origin);
                          const oldLocation = container.location;
                          await pls.updateContainer(packListId, container.id, { location: locationValue || undefined });
                          const refreshed = await pls.getPackList(packListId);
                          setPackList(refreshed);
                          const updated = (refreshed.containers || []).find((x) => x.id === container.id) || null;
                          setContainer(updated);
                          setLocationValue(updated?.location || '');
                          setEditingLocation(false);
                          // Track activity
                          if (updated && oldLocation !== updated.location) {
                            const activity = createActivity('Location updated', { oldLocation: oldLocation || 'None', newLocation: updated.location || 'None' });
                            await addActivity(activity, updated);
                          }
                        } catch (err) {
                          console.error('Failed to update location:', err);
                          setLocationError('Failed to update location. Please try again.');
                          setTimeout(() => setLocationError(null), 5000);
                        } finally {
                          setSavingLocation(false);
                        }
                      }}
                    >
                      Save
                    </button>
                    <button
                      className="px-3 py-1.5 text-sm rounded-lg bg-gray-600/20 text-gray-400 border border-gray-600/30 hover:bg-gray-600/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={savingLocation}
                      onClick={() => {
                        setEditingLocation(false);
                        setLocationValue(container.location || '');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-pb-gray/70">Current location:</span>
                  {container.location ? (
                    <span className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30">
                      📍 {container.location}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-lg bg-gray-500/20 text-gray-400 border border-gray-500/30">Not set</span>
                  )}
                </div>
              )}
            </div>
            {/* Container Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {container.dimensions && (
                <div className="bg-white/5 rounded-lg border border-white/10 p-3">
                  <div className="text-sm font-medium text-white mb-1">Dimensions</div>
                  <div className="text-sm text-pb-gray/70">
                    {container.dimensions.depth}×{container.dimensions.width}
                    {typeof container.dimensions.height === 'number' && container.dimensions.height > 0 ? (
                      <>×{container.dimensions.height}</>
                    ) : null} {container.dimensions.unit}
                  </div>
                </div>
              )}
              {container.currentWeight?.value !== undefined && (
                <div className="bg-white/5 rounded-lg border border-white/10 p-3">
                  <div className="text-sm font-medium text-white mb-1">Recorded Weight</div>
                  <div className="text-sm text-pb-gray/70">{container.currentWeight.value} {container.currentWeight.unit}</div>
                </div>
              )}
              {container.maxWeight?.value !== undefined && (
                <div className="bg-white/5 rounded-lg border border-white/10 p-3">
                  <div className="text-sm font-medium text-white mb-1">Max Capacity</div>
                  <div className="text-sm text-pb-gray/70">{container.maxWeight.value} {container.maxWeight.unit}</div>
                </div>
              )}
              {computeEstimatedContentsWeightKg() > 0 && (
                <div className="bg-white/5 rounded-lg border border-white/10 p-3">
                  <div className="text-sm font-medium text-white mb-1">Estimated Contents Weight</div>
                  <div className="text-sm text-pb-gray/70">{computeEstimatedContentsWeightKg()} kg</div>
                </div>
              )}
            </div>
            
            {container.description && (
              <div className="bg-white/5 rounded-lg border border-white/10 p-3">
                <div className="text-sm font-medium text-white mb-1">Description</div>
                <div className="text-sm text-pb-gray/70">{container.description}</div>
              </div>
            )}
            
            {/* Symbols */}
            <div className="bg-white/5 rounded-lg border border-white/10 p-3">
              <div className="text-sm font-medium text-white mb-2">Handling Symbols</div>
              <div className="flex flex-wrap gap-2">
                {computeSymbols().map((s) => (
                  <div key={s.key} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 border border-white/20">
                    {s.url ? <img src={s.url} alt={s.label} title={s.label} className="w-5 h-5 object-contain" /> : null}
                    <span className="text-xs text-white font-medium">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-pb-darker/40 rounded-lg border border-white/10 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Package className="w-4 h-4 text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Props in this container</h2>
          </div>
          {container.props.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-pb-gray/50 mx-auto mb-3" />
              <p className="text-pb-gray/70">No props in this container</p>
              <p className="text-pb-gray/50 text-sm">Add props using the section below</p>
            </div>
          ) : (
            <div className="space-y-3">
              {container.props.map((p) => {
                const prop = findProp(p.propId);
                const img = getPropImageUrl(prop);
                
                const handlers = getPropContextMenuHandlers(p.propId);
                
                return (
                  <div
                    key={p.propId}
                    className="bg-white/5 rounded-lg border border-white/10 p-4"
                    {...handlers}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {img ? (
                          <img src={img} alt={prop?.name || 'Prop'} className="w-12 h-12 rounded-lg object-cover border border-white/20" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                            <ImageIcon className="w-5 h-5 text-pb-gray/50" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-white">
                            {prop ? (
                              <Link to={`/props/${prop.id}`} className="text-pb-primary hover:text-pb-secondary transition-colors">{prop.name}</Link>
                            ) : (
                              <span>Unknown Prop</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-pb-gray/70">
                            <span>Qty: {p.quantity}</span>
                            {prop?.category && <span>• {prop.category}</span>}
                          </div>
                        </div>
                      </div>
                      <button
                        className={`px-3 py-1.5 text-sm rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${removing[p.propId] ? 'opacity-60 cursor-not-allowed' : ''}`}
                        onClick={() => handleRemovePropFromContainer(p.propId)}
                        disabled={!!removing[p.propId]}
                      >
                        {removing[p.propId] ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Context Menu for Prop Items */}
        {selectedPropId && (() => {
          const p = container.props.find(p => p.propId === selectedPropId);
          // Edge case: prop was deleted while menu is open
          if (!p) {
            propContextMenu.handleClose();
            return null;
          }
          const prop = findProp(p.propId);
          
          const handleCopyPropName = async () => {
            if (!prop?.name) return;
            try {
              await navigator.clipboard.writeText(prop.name);
              // Could add toast notification here for better UX
            } catch (err) {
              console.error('Failed to copy to clipboard:', err);
              alert('Failed to copy prop name to clipboard. Please try again.');
            }
          };

          const handleViewProp = () => {
            if (!prop?.id) return;
            try {
              navigate(`/props/${prop.id}`);
            } catch (err) {
              console.error('Failed to navigate to prop:', err);
              alert('Failed to open prop page. Please try again.');
            }
          };

          const menuItems: ContextMenuItem[] = [
            {
              label: 'View Prop',
              icon: <ExternalLink className="w-4 h-4" />,
              onClick: handleViewProp,
              disabled: !prop?.id,
            },
            {
              label: 'Copy Name',
              icon: <Copy className="w-4 h-4" />,
              onClick: handleCopyPropName,
              disabled: !prop?.name,
            },
            { separator: true },
            {
              label: 'Remove from Container',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: () => handleRemovePropFromContainer(p.propId),
              disabled: !!removing[p.propId],
              danger: true,
            },
          ];

          return (
            <ContextMenu
              isOpen={propContextMenu.isOpen}
              position={propContextMenu.position}
              items={menuItems}
              onClose={propContextMenu.handleClose}
            />
          );
        })()}

        {childContainers.length > 0 && (
          <div className="bg-pb-darker/40 rounded-lg border border-white/10 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Box className="w-4 h-4 text-orange-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Containers on this {container.type || 'pallet'}</h2>
            </div>
            <div className="space-y-3">
              {childContainers.map((ch: any) => (
                <div key={ch.id} className="bg-white/5 rounded-lg border border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{ch.name}</div>
                      {ch.type && <div className="text-sm text-pb-gray/70">({ch.type})</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link 
                        to={`/packing-lists/${packListId}/containers/${ch.id}`} 
                        className="px-3 py-1.5 text-sm rounded-lg bg-pb-primary/20 text-pb-primary border border-pb-primary/30 hover:bg-pb-primary/30 transition-colors"
                      >
                        Open
                      </Link>
                      <button
                        className="px-3 py-1.5 text-sm rounded-lg bg-gray-600/20 text-gray-400 border border-gray-600/30 hover:bg-gray-600/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={!!updatingChild[ch.id]}
                        onClick={async () => {
                          if (!packListId) return;
                          setUpdatingChild(prev => ({ ...prev, [ch.id]: true }));
                          try {
                            const pls = new DigitalPackListService(service, null as any, null as any, window.location.origin);
                            await pls.updateContainer(packListId, ch.id, { parentId: null });
                            const refreshed = await pls.getPackList(packListId);
                            setPackList(refreshed);
                            // Track activity on child container
                            const childContainer = (refreshed.containers || []).find((x) => x.id === ch.id);
                            if (childContainer) {
                              const activity = createActivity('Child container removed from parent', { 
                                childId: ch.id, 
                                childName: ch.name,
                                parentId: container.id,
                                parentName: container.name
                              });
                              const currentActivities = childContainer.activityLog || [];
                              await pls.updateContainer(packListId, ch.id, {
                                activityLog: [...currentActivities, activity]
                              } as Partial<Omit<PackingContainer, 'id' | 'metadata'>>);
                            }
                            // Also track on parent container
                            // Use refreshed parent container to avoid race condition with async state update
                            const refreshedParent = (refreshed.containers || []).find((x) => x.id === container.id);
                            if (refreshedParent) {
                              const activity = createActivity('Child container removed', { 
                                childId: ch.id, 
                                childName: ch.name 
                              });
                              await addActivity(activity, refreshedParent);
                            }
                          } finally {
                            setUpdatingChild(prev => ({ ...prev, [ch.id]: false }));
                          }
                        }}
                      >
                        {updatingChild[ch.id] ? 'Removing...' : 'Remove from here'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-pb-darker/40 rounded-lg border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Plus className="w-4 h-4 text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Add Props to this container</h2>
            </div>
            <button 
              className="px-3 py-1.5 text-sm rounded-lg bg-pb-primary/20 text-pb-primary border border-pb-primary/30 hover:bg-pb-primary/30 transition-colors"
              onClick={() => setAddOpen(!addOpen)}
            >
              {addOpen ? 'Collapse' : 'Expand'}
            </button>
          </div>
          {addOpen && (
            <>
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
              <div className="space-y-3">
                {propsList
                  .filter((p) => !container.props.some((cp) => cp.propId === p.id))
                  .filter((p) => {
                    const q = search.toLowerCase();
                    return (
                      p.name.toLowerCase().includes(q) ||
                      (p.category && p.category.toLowerCase().includes(q)) ||
                      (Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(q)))
                    );
                  })
                  .slice(0, 50)
                  .map((p) => {
                    const img = getPropImageUrl(p);
                    return (
                      <div key={p.id} className="bg-white/5 rounded-lg border border-white/10 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {img ? (
                              <img src={img} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-white/20" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                                <ImageIcon className="w-4 h-4 text-pb-gray/50" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-white">{p.name}</div>
                              {p.category && <div className="text-sm text-pb-gray/70">{p.category}</div>}
                            </div>
                          </div>
                          <button
                            className={`px-3 py-1.5 text-sm rounded-lg bg-pb-primary/20 text-pb-primary border border-pb-primary/30 hover:bg-pb-primary/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${adding[p.id] ? 'opacity-60 cursor-not-allowed' : ''}`}
                            onClick={async () => {
                              if (!packListId) return;
                              setAdding((prev) => ({ ...prev, [p.id]: true }));
                              try {
                                const serviceInst = new DigitalPackListService(service, null as any, null as any, window.location.origin);
                                await serviceInst.addPropToContainer(packListId, container.id, p.id, 1);
                                const inventoryService = new DigitalInventoryService(service, null as any, null as any);
                                await inventoryService.updateLocation(p.id, { type: 'storage', name: container.name, details: `Container ${container.name}` });
                                try { 
                                  await service.updateDocument('props', p.id, { status: 'in-container', lastStatusUpdate: new Date().toISOString() }); 
                                } catch (error) {
                                  console.warn('Failed to update prop status:', error);
                                }
                                const refreshed = await serviceInst.getPackList(packListId);
                                const updated = (refreshed.containers || []).find((x) => x.id === container.id) || null;
                                setContainer(updated);
                                setPackList(refreshed);
                                // Track activity
                                if (updated) {
                                  const activity = createActivity('Prop added', { propId: p.id, propName: p.name, quantity: 1 });
                                  await addActivity(activity, updated);
                                }
                              } finally {
                                setAdding((prev) => ({ ...prev, [p.id]: false }));
                              }
                            }}
                            disabled={!!adding[p.id]}
                          >
                            {adding[p.id] ? 'Adding...' : 'Add'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>

        {/* Comments and Activity Log */}
        <div className="bg-pb-darker/40 rounded-lg border border-white/10 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Comments & Activity</h2>
          </div>

          {/* Add Comment Section */}
          <div className="mb-6">
            <div className="flex gap-2">
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => {
                    setNewComment(e.target.value);
                    setCommentError(null);
                  }}
                  placeholder="Add a comment..."
                  className={`w-full px-4 py-2 rounded-lg border bg-pb-darker/60 text-white placeholder-pb-gray/50 focus:outline-none focus:ring-2 min-h-[80px] resize-none ${
                    commentError 
                      ? 'border-red-500/50 focus:ring-red-500/50' 
                      : 'border-white/10 focus:ring-pb-primary/50'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <div className="flex items-center justify-between mt-1">
                  <div className="flex-1">
                    {commentError && (
                      <p className="text-xs text-red-400 mt-1">{commentError}</p>
                    )}
                  </div>
                  <p className={`text-xs ${newComment.length > MAX_COMMENT_LENGTH ? 'text-red-400' : 'text-pb-gray/50'}`}>
                    {newComment.length}/{MAX_COMMENT_LENGTH}
                  </p>
                </div>
              </div>
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || addingComment || !!commentError}
                className="px-4 py-2 rounded-lg bg-pb-primary hover:bg-pb-secondary text-white font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 self-start"
              >
                {addingComment ? 'Adding...' : 'Add Comment'}
              </button>
            </div>
            <p className="text-xs text-pb-gray/50 mt-2">Press Ctrl+Enter (or Cmd+Enter on Mac) to submit</p>
          </div>

          {/* Comments and Activity List */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {combinedLog.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-pb-gray/50 mx-auto mb-3" />
                <p className="text-pb-gray/70">No comments or activity yet</p>
                <p className="text-pb-gray/50 text-sm">Add a comment above to get started</p>
              </div>
            ) : (
              combinedLog.map((item) => {
                const isComment = 'createdAt' in item;
                const userInfo = userInfoMap.get(item.userId) || { displayName: item.userName || 'Unknown User' };
                const initials = isComment ? (item.userAvatarInitials || userInfo.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) || 'U') : 'A';
                const date = isComment ? item.createdAt : item.timestamp;
                
                return (
                  <div key={item.id} className="bg-white/5 rounded-lg border border-white/10 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-pb-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-pb-primary">{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white text-sm">
                            {userInfo.displayName}
                          </span>
                          {!isComment && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-pb-primary/20 text-pb-primary border border-pb-primary/30">
                              Activity
                            </span>
                          )}
                          <span className="text-xs text-pb-gray/50">
                            {new Date(date).toLocaleString()}
                          </span>
                        </div>
                        {isComment ? (
                          <p className="text-sm text-white/90 leading-relaxed">{item.text}</p>
                        ) : (
                          <div>
                            <p className="text-sm text-pb-primary/90 leading-relaxed font-medium">{item.type}</p>
                            {item.details && (
                              <div className="text-xs text-pb-gray/70 mt-1 space-y-1">
                                {typeof item.details === 'object' ? (
                                  Object.entries(item.details).map(([key, value]) => (
                                    <div key={key}>
                                      <span className="font-medium">{key}:</span> {String(value)}
                                    </div>
                                  ))
                                ) : (
                                  <div>{String(item.details)}</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Print Label Modal & Print Area */}
        {parentSelecting && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
            <div className="bg-gray-900 text-white rounded-xl shadow-xl w-full max-w-lg p-5 border border-pb-primary/30">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-lg">Place this container on…</div>
                <button className="text-gray-300 hover:text-white" onClick={() => setParentSelecting(false)}>✕</button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {availableParents.length === 0 && (
                  <div className="text-gray-400">No other containers available as parent.</div>
                )}
                {availableParents.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-gray-800/70 rounded-lg px-3 py-2 border border-gray-700">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.type || 'container'} · {p.id}</div>
                    </div>
                    <button
                      className="px-3 py-1.5 rounded-lg bg-pb-primary text-white hover:bg-pb-accent transition disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={savingParent}
                      onClick={async () => {
                        if (!packListId || !container) return;
                        setSavingParent(true);
                        try {
                          const pls = new DigitalPackListService(service, null as any, null as any, window.location.origin);
                          const oldParentId = container.parentId;
                          await pls.updateContainer(packListId, container.id, { parentId: p.id });
                          const refreshed = await pls.getPackList(packListId);
                          setPackList(refreshed);
                          const updated = (refreshed.containers || []).find((x) => x.id === container.id) || null;
                          setContainer(updated);
                          setParentSelecting(false);
                          // Track activity
                          if (updated) {
                            const activity = createActivity('Parent container changed', { oldParentId: oldParentId || 'None', newParentId: p.id, newParentName: p.name });
                            await addActivity(activity, updated);
                          }
                        } finally {
                          setSavingParent(false);
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
                      disabled={savingParent}
                      onClick={async () => {
                        if (!packListId || !packList || !container) return;
                        setSavingParent(true);
                        try {
                          const pls = new DigitalPackListService(service, null as any, null as any, window.location.origin);
                          const newId = await pls.addContainer(packListId, {
                            name: `${t.charAt(0).toUpperCase()+t.slice(1)} ${String((packList.containers||[]).filter(c=>c.type===t).length+1)}`,
                            type: t,
                            labels: [],
                            props: [],
                            status: 'empty'
                          } as any);
                          const refreshed = await pls.getPackList(packListId);
                          setPackList(refreshed);
                          const newParent = (refreshed.containers || []).find((c) => c.id === newId);
                          await pls.updateContainer(packListId, container.id, { parentId: newId });
                          const refreshed2 = await pls.getPackList(packListId);
                          setPackList(refreshed2);
                          const updated = (refreshed2.containers || []).find((x) => x.id === container.id) || null;
                          setContainer(updated);
                          // Track activity for parent creation and assignment
                          // Pass updated container to avoid race condition with async state update
                          if (updated) {
                            const activity = createActivity('Parent container created and assigned', {
                              parentId: newId,
                              parentName: newParent?.name || 'New parent',
                              parentType: t
                            });
                            await addActivity(activity, updated);
                          }
                          setParentSelecting(false);
                        } catch (err) {
                          console.error('Failed to create parent container:', err);
                          alert('Failed to create parent container. Please try again.');
                        } finally {
                          setSavingParent(false);
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
        {labelOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
            <div className="bg-white text-black rounded-lg shadow-xl w-[860px] max-w-[95vw] p-5 relative">
              <button className="absolute right-3 top-3 text-gray-600" onClick={() => setLabelOpen(false)}>✕</button>
              <div className="mb-3 flex items-center justify-between">
                <div className="font-bold text-lg">Packing Label preview</div>
                <div className="text-sm text-gray-600">Print to A6/A5; scale to fit</div>
              </div>
              <style>{`
                @media print {
                  body * { visibility: hidden; }
                  .print-area, .print-area * { visibility: visible; }
                  .print-area { position: absolute; left: 0; top: 0; width: 100%; }
                }
              `}</style>
              <div className="print-area">
                <div className="border-4 border-black rounded-md p-3" style={{ width: 720 }}>
                  {/* Row 1: Logo + TO */}
                  <div className="flex border-b-2 border-black">
                    <div className="w-[140px] h-[120px] border-r-2 border-black flex items-center justify-center p-2">
                      {/* Logo (replaceable for paid plans) */}
                      <img src={'https://thepropslist.uk/logo.png'} alt="Logo" className="max-w-full max-h-full" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      <div className="text-3xl font-black" style={{ display: 'none' }}>TPL</div>
                    </div>
                    <div className="flex-1 p-2">
                      <div className="text-xs font-bold">{shippingMode === 'courier' ? 'TO:' : 'TOUR:'}</div>
                      <div className="text-xl font-extrabold">{showName || 'Show'}</div>
                      <div className="text-base mt-1 whitespace-pre-line">
                        {shippingMode === 'courier'
                          ? (toAddress && toAddress.trim().length > 0
                              ? toAddress
                              : `For the attention of Props Supervisor${propsSupervisor ? `: ${propsSupervisor}` : ''}`)
                          : (tourLabel || '')}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Banner */}
                  <div className="text-center text-2xl tracking-[0.25em] font-extrabold py-2 border-b-2 border-black">CONTAINS PROPS</div>

                  {/* Row 3: FROM (optional, courier only) */}
                  {shippingMode === 'courier' && fromAddress && (
                    <div className="flex border-b-2 border-black">
                      <div className="w-[120px] p-2 text-xs font-bold border-r-2 border-black">FROM:</div>
                      <div className="flex-1 p-2 whitespace-pre-line">{fromAddress}</div>
                    </div>
                  )}

                  {/* Row 4: Lot / Ref */}
                  <div className="flex border-b-2 border-black">
                    <div className="flex-1 flex">
                      <div className="w-[140px] p-2 text-xs font-bold border-r-2 border-black">LOT NUMBER:</div>
                      <div className="flex-1 p-2 font-semibold">{containerPosition.index} of {containerPosition.total}</div>
                    </div>
                    <div className="flex-1 flex border-l-2 border-black">
                      <div className="w-[140px] p-2 text-xs font-bold border-r-2 border-black">REF NUMBER:</div>
                      <div className="flex-1 p-2 font-semibold">{container?.name || container?.id}</div>
                    </div>
                  </div>

                  {/* Row 5: Ship Date / Weight */}
                  <div className="flex border-b-2 border-black">
                    <div className="flex-1 flex">
                      <div className="w-[140px] p-2 text-xs font-bold border-r-2 border-black">SHIP DATE:</div>
                      <div className="flex-1 p-2">{new Date().toLocaleDateString()}</div>
                    </div>
                    <div className="flex-1 flex border-l-2 border-black">
                      <div className="w-[140px] p-2 text-xs font-bold border-r-2 border-black">WEIGHT & DIMENSIONS:</div>
                      <div className="flex-1 p-2">
                        {computeEstimatedContentsWeightKg() > 0 ? `${computeEstimatedContentsWeightKg()} kg (est.)` : '—'}
                        {container?.dimensions ? (
                          <span className="ml-2 text-xs text-gray-700"> · {container.dimensions.depth}×{container.dimensions.width}{typeof container.dimensions.height === 'number' ? `×${container.dimensions.height}` : ''} {container.dimensions.unit}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Row 6: Symbols + QR (Contains) */}
                  <div className="flex border-b-2 border-black">
                    <div className="w-1/2 p-2 border-r-2 border-black">
                      <div className="flex gap-2 flex-wrap">
                        {computeSymbols().map((s) => (
                          <div key={s.key} className="border border-black rounded px-1 py-1 flex items-center gap-1">
                            {s.url ? <img src={s.url} alt={s.label} className="h-8 w-8 object-contain" /> : null}
                            <span className="text-xs font-semibold">{s.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="w-1/2 p-2 flex border-l-0">
                      <div className="w-[120px] text-xs font-bold pr-2">Contains:</div>
                      <div className="flex-1 flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <img src={qrUrl.src} alt="QR" className="w-[160px] h-[160px]" />
                          <div className="text-[11px] mt-1 break-all text-center" style={{ maxWidth: 160 }}>{qrUrl.publicUrl}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 7: Delivery instruction */}
                  <div className="flex">
                    <div className="w-[180px] p-2 text-xs font-bold border-r-2 border-black">Delivery instruction:</div>
                    <div className="flex-1 p-2 text-sm">&nbsp;</div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button className="btn" onClick={() => setLabelOpen(false)}>Close</button>
              <button className="btn btn-primary" onClick={() => { try { window.print(); } catch (err) { /* ignore */ } }}>Print</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ContainerDetailPage;


