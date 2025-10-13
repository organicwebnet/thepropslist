import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Image as ImageIcon } from 'lucide-react';
import DashboardLayout from '../PropsBibleHomepage';
import { useFirebase } from '../contexts/FirebaseContext';
import { DigitalPackListService, PackList, PackingContainer } from '../../shared/services/inventory/packListService';
import { DigitalInventoryService, InventoryProp } from '../../shared/services/inventory/inventoryService';
import { getSymbolUrl, symbolLabel } from '../utils/transport';
import SubFootnote from '../components/SubFootnote';

const ContainerDetailPage: React.FC = () => {
  const { service } = useFirebase();
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

  const findProp = (id: string) => propsList.find((p) => p.id === id);
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

  if (loading) return <DashboardLayout><div className="max-w-7xl mx-auto p-8 text-gray-400">Loading...</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="max-w-7xl mx-auto p-8 text-red-500">{error}</div></DashboardLayout>;
  if (!container) return <DashboardLayout><div className="max-w-7xl mx-auto p-8">Container not found.</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center gap-4 mb-6">
          <button className="btn btn-secondary" onClick={() => navigate(`/packing-lists/${packListId}`)}>&larr; Back</button>
          <h1 className="text-2xl font-bold">Container: {container.name}</h1>
          {container.type && <span className="text-sm text-gray-400">({container.type})</span>}
          <span className="flex-1" />
          <button className="btn btn-primary" onClick={() => setLabelOpen(true)} title="Print label">Print Label</button>
          <button
            className="btn btn-error"
            onClick={async () => {
              if (!packListId || !containerId) return;
              const serviceInst = new DigitalPackListService(service, null as any, null as any, window.location.origin);
              await serviceInst.removeContainer(packListId, containerId);
              navigate(`/packing-lists/${packListId}`);
            }}
          >
            Delete Container
          </button>
        </div>
        <SubFootnote features={["Custom packing labels", "Bulk print", "Shipping templates"]} />

        <div className="bg-gray-900 rounded-xl shadow p-4 mb-6">
          <h2 className="font-semibold mb-2 text-lg">Details</h2>
          <div className="text-sm text-gray-300">
            <div className="mb-4 p-3 rounded-lg bg-gray-800/60 border border-gray-700 flex items-center gap-3">
              <div className="text-white font-semibold shrink-0">Placement</div>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-gray-400">Placed on:</span>
                {container.parentId ? (
                  <span className="px-2 py-1 rounded-lg bg-gray-900 border border-gray-700 text-white truncate max-w-[40ch]">
                    {(() => {
                      const p = availableParents.find(p => p.id === container.parentId);
                      return p ? `${p.name}${p.type ? ` (${p.type})` : ''}` : `#${container.parentId}`;
                    })()}
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-lg bg-gray-900 border border-gray-800 text-gray-400">None</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded-lg bg-pb-primary text-white hover:bg-pb-accent transition"
                  onClick={() => setParentSelecting(true)}
                >
                  {container.parentId ? 'Change' : 'Set parent'}
                </button>
                {container.parentId && (
                  <button
                    className="px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={savingParent}
                    onClick={async () => {
                      if (!packListId || !container) return;
                      setSavingParent(true);
                      try {
                        const pls = new DigitalPackListService(service, null as any, null as any, window.location.origin);
                        await pls.updateContainer(packListId, container.id, { parentId: null });
                        const refreshed = await pls.getPackList(packListId);
                        setPackList(refreshed);
                        const updated = (refreshed.containers || []).find((x) => x.id === container.id) || null;
                        setContainer(updated);
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
            {container.dimensions && (
              <div>
                Dimensions: {container.dimensions.depth}×{container.dimensions.width}
                {typeof container.dimensions.height === 'number' && container.dimensions.height > 0 ? (
                  <>×{container.dimensions.height}</>
                ) : null} {container.dimensions.unit}
              </div>
            )}
            {container.currentWeight?.value !== undefined && (
              <div className="mt-1">Recorded Weight: {container.currentWeight.value} {container.currentWeight.unit}</div>
            )}
            {container.maxWeight?.value !== undefined && (
              <div className="mt-1">Max Capacity: {container.maxWeight.value} {container.maxWeight.unit}</div>
            )}
            {computeEstimatedContentsWeightKg() > 0 && (
              <div className="mt-1 text-gray-400">Estimated contents weight: {computeEstimatedContentsWeightKg()} kg</div>
            )}
            {container.description && (
              <div className="mt-1 text-gray-400">{container.description}</div>
            )}
            <div className="mt-3 flex flex-wrap gap-3 items-center">
              {computeSymbols().map((s) => (
                <div key={s.key} className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1">
                  {s.url ? <img src={s.url} alt={s.label} title={s.label} className="w-6 h-6 object-contain" /> : null}
                  <span className="text-xs text-gray-200">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl shadow p-4">
          <h2 className="font-semibold mb-2 text-lg">Props in this container</h2>
          {container.props.length === 0 ? (
            <div className="text-gray-400">No props in this container.</div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {container.props.map((p) => {
                const prop = findProp(p.propId);
                const img = getPropImageUrl(prop);
                return (
                  <li key={p.propId} className="py-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {img ? (
                        <img src={img} alt={prop?.name || 'Prop'} className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center text-xs text-gray-300">No Image</div>
                      )}
                      <div className="text-white">
                        {prop ? (
                          <Link to={`/props/${prop.id}`} className="text-indigo-300 hover:underline">{prop.name}</Link>
                        ) : (
                          <span>Unknown Prop</span>
                        )}
                        <span className="text-xs text-gray-400 ml-2">Qty: {p.quantity}</span>
                      </div>
                    </div>
                    {prop?.category && (
                      <span className="text-xs text-gray-500 mr-3">{prop.category}</span>
                    )}
                    <button
                      className={`btn btn-sm btn-error ${removing[p.propId] ? 'btn-disabled' : ''}`}
                      onClick={async () => {
                        if (!packListId) return;
                        setRemoving((prev) => ({ ...prev, [p.propId]: true }));
                        try {
                          const serviceInst = new DigitalPackListService(service, null as any, null as any, window.location.origin);
                          await serviceInst.removePropFromContainer(packListId, container.id, p.propId);
                          // When removed, set prop status to on-hold
                          try { await service.updateDocument('props', p.propId, { status: 'on-hold', lastStatusUpdate: new Date().toISOString() }); } catch (err) { /* ignore */ }
                          const refreshed = await serviceInst.getPackList(packListId);
                          const updated = (refreshed.containers || []).find((x) => x.id === container.id) || null;
                          setContainer(updated);
                        } finally {
                          setRemoving((prev) => ({ ...prev, [p.propId]: false }));
                        }
                      }}
                      disabled={!!removing[p.propId]}
                    >
                      {removing[p.propId] ? 'Removing...' : 'Remove'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {childContainers.length > 0 && (
          <div className="bg-gray-900 rounded-xl shadow p-4 mt-6">
            <h2 className="font-semibold mb-2 text-lg">Containers on this {container.type || 'pallet'}</h2>
            <ul className="divide-y divide-gray-800">
              {childContainers.map((ch: any) => (
                <li key={ch.id} className="py-2 flex items-center justify-between">
                  <div className="text-white">
                    {ch.name} {ch.type && <span className="text-xs text-gray-400">({ch.type})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/packing-lists/${packListId}/containers/${ch.id}`} className="text-xs text-pb-primary underline">Open</Link>
                    <button
                      className="btn btn-sm bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={!!updatingChild[ch.id]}
                      onClick={async () => {
                        if (!packListId) return;
                        setUpdatingChild(prev => ({ ...prev, [ch.id]: true }));
                        try {
                          const pls = new DigitalPackListService(service, null as any, null as any, window.location.origin);
                          await pls.updateContainer(packListId, ch.id, { parentId: null } as any);
                          const refreshed = await pls.getPackList(packListId);
                          setPackList(refreshed);
                        } finally {
                          setUpdatingChild(prev => ({ ...prev, [ch.id]: false }));
                        }
                      }}
                    >
                      Remove from here
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-gray-900 rounded-xl shadow p-4 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Add Props to this container</h2>
            <button className="text-sm text-indigo-300 hover:text-indigo-200" onClick={() => setAddOpen(!addOpen)}>
              {addOpen ? 'Collapse' : 'Expand'}
            </button>
          </div>
          {addOpen && (
            <>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search props by name, category, or tag..."
                className="input input-bordered bg-gray-800 text-white mb-3 w-full"
              />
              <ul className="divide-y divide-gray-800">
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
                      <li key={p.id} className="py-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {img ? (
                            <img src={img} alt={p.name} className="w-8 h-8 rounded object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center">
                              <ImageIcon className="text-gray-400" size={14} />
                            </div>
                          )}
                          <div className="text-white">
                            <span className="font-medium">{p.name}</span>
                            {p.category && <span className="text-xs text-gray-400 ml-2">{p.category}</span>}
                          </div>
                        </div>
                        <button
                          className={`btn btn-sm btn-primary ${adding[p.id] ? 'btn-disabled' : ''}`}
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
                            } finally {
                              setAdding((prev) => ({ ...prev, [p.id]: false }));
                            }
                          }}
                          disabled={!!adding[p.id]}
                        >
                          {adding[p.id] ? 'Adding...' : 'Add'}
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </>
          )}
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
                          await pls.updateContainer(packListId, container.id, { parentId: p.id });
                          const refreshed = await pls.getPackList(packListId);
                          setPackList(refreshed);
                          const updated = (refreshed.containers || []).find((x) => x.id === container.id) || null;
                          setContainer(updated);
                          setParentSelecting(false);
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
                          await pls.updateContainer(packListId, container.id, { parentId: newId });
                          const refreshed2 = await pls.getPackList(packListId);
                          setPackList(refreshed2);
                          const updated = (refreshed2.containers || []).find((x) => x.id === container.id) || null;
                          setContainer(updated);
                          setParentSelecting(false);
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


