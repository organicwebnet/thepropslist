import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Image as ImageIcon } from 'lucide-react';
import DashboardLayout from '../PropsBibleHomepage';
import { useFirebase } from '../contexts/FirebaseContext';
import { DigitalPackListService, PackList, PackingContainer } from '../../shared/services/inventory/packListService';
import { DigitalInventoryService, InventoryProp } from '../../shared/services/inventory/inventoryService';

const ContainerDetailPage: React.FC = () => {
  const { service } = useFirebase();
  const navigate = useNavigate();
  const { packListId, containerId } = useParams<{ packListId: string; containerId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [container, setContainer] = useState<PackingContainer | null>(null);
  const [propsList, setPropsList] = useState<InventoryProp[]>([]);
  const [removing, setRemoving] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!packListId || !containerId) return;
    const packListService = new DigitalPackListService(service, null as any, null as any, window.location.origin);
    const inventoryService = new DigitalInventoryService(service, null as any, null as any);
    setLoading(true);
    packListService.getPackList(packListId)
      .then((pl: PackList) => {
        const c = (pl.containers || []).find((x) => x.id === containerId) || null;
        setContainer(c);
        return inventoryService.listProps();
      })
      .then((allProps) => {
        setPropsList(allProps);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [packListId, containerId, service]);

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

  if (loading) return <DashboardLayout><div className="max-w-7xl mx-auto p-8 text-gray-400">Loading...</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="max-w-7xl mx-auto p-8 text-red-500">{error}</div></DashboardLayout>;
  if (!container) return <DashboardLayout><div className="max-w-7xl mx-auto p-8">Container not found.</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center gap-4 mb-6">
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>&larr; Back</button>
          <h1 className="text-2xl font-bold">Container: {container.name}</h1>
          {container.type && <span className="text-sm text-gray-400">({container.type})</span>}
          <span className="flex-1" />
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

        <div className="bg-gray-900 rounded-xl shadow p-4 mb-6">
          <h2 className="font-semibold mb-2 text-lg">Details</h2>
          <div className="text-sm text-gray-300">
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
                          try { await service.updateDocument('props', p.propId, { status: 'on-hold', lastStatusUpdate: new Date().toISOString() }); } catch {}
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

        <div className="bg-gray-900 rounded-xl shadow p-4 mt-6">
          <h2 className="font-semibold mb-2 text-lg">Add Props to this container</h2>
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
                          // Also set prop status to "in-container"
                          try { await service.updateDocument('props', p.id, { status: 'in-container', lastStatusUpdate: new Date().toISOString() }); } catch {}
                          const refreshed = await serviceInst.getPackList(packListId);
                          const updated = (refreshed.containers || []).find((x) => x.id === container.id) || null;
                          setContainer(updated);
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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ContainerDetailPage;


