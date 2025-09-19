import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import DashboardLayout from '../PropsBibleHomepage';
import { motion } from 'framer-motion';
import { useShowSelection } from '../contexts/ShowSelectionContext';
import { Prop, PropFormData, propCategories, PropCategory, PropImage, DigitalAsset } from '../../shared/types/props';
import { Plus, UploadCloud, Trash2 } from 'lucide-react';
import { ImageUpload } from '../components/ImageUpload';
import { DigitalAssetForm } from '../components/DigitalAssetForm';
import ImportPropsModal from '../components/ImportPropsModal';

const initialForm: PropFormData = {
  name: '',
  price: 0,
  description: '',
  category: propCategories[0],
  quantity: 1,
  source: 'bought',
  status: 'available_in_storage',
  images: [],
  digitalAssets: [],
  // Extended fields mirrored from mobile create form
  purchaseUrl: '',
  location: '',
  tags: '',
  usageAssets: [],
  maintenanceAssets: [],
  otherAssets: [],
  showId: '',
} as any;

const AddPropPage: React.FC = () => {
  const { service: firebaseService } = useFirebase();
  const { currentShowId } = useShowSelection();
  const [form, setForm] = useState<PropFormData>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [showOptions, setShowOptions] = useState<{ id: string; name: string }[]>([]);
  const [actOptions, setActOptions] = useState<{ id: string; name: string }[]>([]);
  const [sceneOptions, setSceneOptions] = useState<{ id: string; name: string }[]>([]);
  const [actsList, setActsList] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [statusTouched, setStatusTouched] = useState(false);
  const [makers, setMakers] = useState<{ id: string; name: string }[]>([]);
  const [hireCompanies, setHireCompanies] = useState<{ id: string; name: string }[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [showImportNudge, setShowImportNudge] = useState(() => localStorage.getItem('hideImportNudge') !== '1');

  // Fetch shows for assignment
  useEffect(() => {
    firebaseService.getDocuments('shows').then(docs => {
      setShowOptions(docs.map(doc => ({ id: doc.id, name: doc.data.name })));
    }).catch(() => undefined);
  }, [firebaseService]);

  // Fetch acts/scenes from the show document (with fallback) when show changes
  useEffect(() => {
    if (!form.showId) { setActOptions([]); setSceneOptions([]); setActsList([]); return; }
    (async () => {
      try {
        const showDoc = await firebaseService.getDocument<any>('shows', form.showId as string);
        const rawActs = showDoc?.data?.acts || [];
        const acts = (Array.isArray(rawActs) ? rawActs : []).map((a: any, idx: number) => ({
          id: String(a?.id ?? a?.name ?? idx),
          name: a?.name ?? a?.title ?? `Act ${idx + 1}`,
          scenes: Array.isArray(a?.scenes) ? a.scenes : [],
        }));
        setActsList(acts);
        setActOptions(acts.map(a => ({ id: a.id, name: a.name })));
        // preload scenes based on current act if set
        const chosenAct = acts.find(a => String(a.id) === String(form.act));
        const chosenScenes = (chosenAct?.scenes || []).map((s: any, i: number) => ({ id: String(s?.id ?? s?.name ?? i), name: s?.name ?? s?.title ?? String(s) }));
        setSceneOptions(chosenScenes);
      } catch {
        // fallback to flat collections
        try {
          const actDocs = await firebaseService.getDocuments('acts', { where: [['showId', '==', form.showId]] });
          setActOptions(actDocs.map((doc: any) => ({ id: doc.id, name: doc.data.name })));
        } catch { setActOptions([]); }
        try {
          const sceneDocs = await firebaseService.getDocuments('scenes', { where: [['showId', '==', form.showId]] });
          setSceneOptions(sceneDocs.map((doc: any) => ({ id: doc.id, name: doc.data.name })));
        } catch { setSceneOptions([]); }
      }
    })();
  }, [firebaseService, form.showId]);

  const handleActChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setForm(prev => ({ ...(prev as any), act: value, sceneName: '' } as any));
    const chosenAct = actsList.find(a => String(a.id) === String(value));
    if (chosenAct && Array.isArray(chosenAct.scenes)) {
      const normalizedScenes = chosenAct.scenes.map((s: any, i: number) => ({ id: String(s?.id ?? s?.name ?? i), name: s?.name ?? s?.title ?? String(s) }));
      setSceneOptions(normalizedScenes);
    } else {
      try {
        const sceneDocs = await firebaseService.getDocuments('scenes', { where: [['showId', '==', form.showId as string]] });
        setSceneOptions(sceneDocs.map((doc: any) => ({ id: doc.id, name: doc.data.name ?? doc.data.title })));
      } catch { setSceneOptions([]); }
    }
  };

  // Prefill selected show if available
  useEffect(() => {
    if (currentShowId && !form.showId) {
      setForm(prev => ({ ...prev, showId: currentShowId }));
    }
  }, [currentShowId, form.showId]);

  // Autofocus name on mount
  useEffect(() => { nameInputRef.current?.focus(); }, []);

  // Optionally load makers and hire companies for selectors
  useEffect(() => {
    (async () => {
      try {
        const m = await firebaseService.getDocuments('makers');
        setMakers(m.map((d: any) => ({ id: d.id, name: d.data?.name || 'Maker' })));
      } catch {}
      try {
        const h = await firebaseService.getDocuments('hire_companies');
        setHireCompanies(h.map((d: any) => ({ id: d.id, name: d.data?.name || 'Hire Company' })));
      } catch {}
    })();
  }, [firebaseService]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const castValue: any = (type === 'number') ? Number(value) : value;
    setForm(prev => {
      const next: any = { ...(prev as any), [name]: castValue };
      if (name === 'source' && !statusTouched) {
        const autoStatus: Record<string, string> = {
          bought: 'awaiting-delivery',
          made: 'to-be-made',
          hired: 'awaiting-delivery',
          borrowed: 'awaiting-delivery',
          donated: 'part-of-the-show',
        };
        next.status = autoStatus[String(castValue)] || next.status;
      }
      return next as any;
    });
  };

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setForm(prev => ({ ...(prev as any), [name]: checked } as any));
  };

  // TODO: Implement image and digital asset upload logic

  const handleSubmit = async (e: React.FormEvent, addAnother?: boolean) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Persist new maker / hire company if user typed a new one
      let payload: any = { ...form };
      if (form.source === 'made') {
        const makerName = (form as any).makerName?.trim();
        if (!((form as any).makerId) && makerName) {
          try {
            const newId = await firebaseService.addDocument('makers', { name: makerName });
            payload.makerId = newId;
            setMakers(prev => [...prev, { id: String(newId), name: makerName }]);
          } catch {}
        }
      }
      if (form.source === 'hired') {
        const hireCompanyName = (form as any).hireCompanyName?.trim();
        if (!((form as any).hireCompanyId) && hireCompanyName) {
          try {
            const newId = await firebaseService.addDocument('hire_companies', { name: hireCompanyName });
            payload.hireCompanyId = newId;
            setHireCompanies(prev => [...prev, { id: String(newId), name: hireCompanyName }]);
          } catch {}
        }
      }

      await firebaseService.addDocument('props', payload);
      setSaving(false);
      if (addAnother) {
        const { category, showId } = form;
        setForm({ ...initialForm, category, showId } as any);
        nameInputRef.current?.focus();
      } else {
        navigate('/props');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add prop.');
      setSaving(false);
    }
  };

  const [addAnother, setAddAnother] = useState(false);

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen w-full max-w-6xl mx-auto p-6">
        <div className="mb-4 flex justify-end">
          <Link to="/props" className="inline-flex items-center px-4 py-2 rounded-lg bg-pb-primary hover:bg-pb-accent text-white font-semibold shadow transition">
            View Props List
          </Link>
        </div>
        {showImportNudge && (
          <div className="mb-4 p-4 rounded-lg border border-pb-primary/30 bg-pb-darker/50 flex items-center justify-between">
            <div className="text-white">Have a spreadsheet already? Import props and fill in details later.</div>
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded-lg bg-pb-primary text-white hover:bg-pb-accent" onClick={() => setImportOpen(true)}>Import Props</button>
              <button className="px-3 py-2 rounded-lg border border-pb-primary/30 text-white hover:bg-white/10" onClick={() => { localStorage.setItem('hideImportNudge', '1'); setShowImportNudge(false); }}>Dismiss</button>
            </div>
          </div>
        )}
        <motion.form
          onSubmit={(e) => handleSubmit(e)}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') { handleSubmit(e); } }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-pb-darker/60 rounded-xl shadow-lg p-8 space-y-6"
        >
          <h1 className="text-2xl font-bold text-white mb-4">Add Prop</h1>
          {error && <div className="text-red-500 mb-2">{error}</div>}
          {/* Primary image uploader at the top (profile-like) */}
          <div>
            <label className="block text-pb-gray mb-2 font-medium">Photos</label>
            <ImageUpload
              onImagesChange={imgs => setForm(prev => ({ ...prev, images: imgs }))}
              currentImages={form.images || []}
              disabled={saving}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Name *</label>
              <input ref={nameInputRef} name="name" value={form.name} onChange={handleChange} required className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-pb-gray mb-1 font-medium">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
            </div>
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Act</label>
              <select name="act" value={form.act || ''} onChange={handleActChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                <option value="">Select Act</option>
                {actOptions.map(act => <option key={act.id} value={act.id}>{act.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Scene</label>
              <select name="sceneName" value={form.sceneName || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                <option value="">Select Scene</option>
                {sceneOptions.map(scene => <option key={scene.id} value={scene.name}>{scene.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Price</label>
              <input name="price" type="number" min={0} step="0.01" value={form.price || 0} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
            </div>
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Quantity *</label>
              <input name="quantity" type="number" min={1} value={form.quantity} onChange={handleChange} required className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
            </div>
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Source</label>
              <select name="source" value={form.source || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                <option value="bought">bought</option>
                <option value="made">made</option>
                <option value="hired">hired</option>
                <option value="borrowed">borrowed</option>
                <option value="donated">donated</option>
              </select>
            </div>
            
            {/* Source-specific details */}
            {form.source === 'bought' && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-pb-gray">
                    <input type="radio" name="retailerType" checked={!!(form as any).isOnlineRetailer} onChange={() => setForm(prev => ({ ...(prev as any), isOnlineRetailer: true }))} />
                    Online retailer
                  </label>
                  <label className="inline-flex items-center gap-2 text-pb-gray">
                    <input type="radio" name="retailerType" checked={!((form as any).isOnlineRetailer)} onChange={() => setForm(prev => ({ ...(prev as any), isOnlineRetailer: false }))} />
                    Physical store
                  </label>
                </div>
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Retailer / Store Name</label>
                  <input name="retailerName" value={(form as any).retailerName || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                </div>
                {(form as any).isOnlineRetailer && (
                  <div>
                    <label className="block text-pb-gray mb-1 font-medium">Purchase URL</label>
                    <input name="purchaseUrl" value={(form as any).purchaseUrl || ''} onChange={handleChange} placeholder="https://" className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                  </div>
                )}
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Estimated Delivery Date</label>
                  <input type="date" name="estimatedDeliveryDate" value={(form as any).estimatedDeliveryDate || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                </div>
              </div>
            )}
            {form.source === 'made' && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Maker</label>
                  <select name="makerId" value={(form as any).makerId || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                    <option value="">Select maker</option>
                    {makers.map(m => (<option key={m.id} value={m.id}>{m.name}</option>))}
                  </select>
                  <div className="mt-2">
                    <input name="makerName" value={(form as any).makerName || ''} onChange={handleChange} placeholder="Or add new maker" className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Estimated Delivery Date</label>
                  <input type="date" name="estimatedDeliveryDate" value={(form as any).estimatedDeliveryDate || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                </div>
              </div>
            )}
            {form.source === 'hired' && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Hire Company</label>
                  <select name="hireCompanyId" value={(form as any).hireCompanyId || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                    <option value="">Select hire company</option>
                    {hireCompanies.map(h => (<option key={h.id} value={h.id}>{h.name}</option>))}
                  </select>
                  <div className="mt-2">
                    <input name="hireCompanyName" value={(form as any).hireCompanyName || ''} onChange={handleChange} placeholder="Or add new company" className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Order Number</label>
                  <input name="hireOrderNumber" value={(form as any).hireOrderNumber || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                </div>
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Delivery Date</label>
                  <input type="date" name="hireDeliveryDate" value={(form as any).hireDeliveryDate || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                </div>
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Return Date</label>
                  <input type="date" name="hireReturnDate" value={(form as any).hireReturnDate || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                </div>
                <label className="inline-flex items-center gap-2 text-pb-gray md:col-span-2">
                  <input type="checkbox" name="hireMustNotModify" checked={!!(form as any).hireMustNotModify} onChange={(e) => setForm(prev => ({ ...(prev as any), hireMustNotModify: e.target.checked }))} />
                  <span>This prop must not be modified</span>
                </label>
              </div>
            )}
            {form.source === 'borrowed' && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Borrowed From</label>
                  <input name="borrowedFrom" value={(form as any).borrowedFrom || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                </div>
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Delivery Date</label>
                  <input type="date" name="borrowedDeliveryDate" value={(form as any).borrowedDeliveryDate || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                </div>
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Return Date</label>
                  <input type="date" name="borrowedReturnDate" value={(form as any).borrowedReturnDate || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                </div>
                <label className="inline-flex items-center gap-2 text-pb-gray md:col-span-2">
                  <input type="checkbox" name="borrowedCanModify" checked={!!(form as any).borrowedCanModify} onChange={(e) => setForm(prev => ({ ...(prev as any), borrowedCanModify: e.target.checked }))} />
                  <span>Prop can be modified</span>
                </label>
              </div>
            )}
            {/* Category and Status after contextual source fields */}
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Category *</label>
              <select name="category" value={form.category} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                {propCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Status *</label>
              <select name="status" value={form.status} onChange={(e) => { setStatusTouched(true); handleChange(e); }} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                <option value="to-be-made">to be made</option>
                <option value="to-be-bought">to be bought</option>
                <option value="awaiting-delivery">awaiting delivery</option>
                <option value="part-of-the-show">part of the show</option>
                <option value="share">share</option>
                <option value="replacement-needed">replacment needed</option>
                <option value="needs-repair-mod">needs repair/mod</option>
                <option value="cut">cut</option>
                <option value="on-hold">on hold</option>
              </select>
            </div>
            
          </div>
          {/* Transit Handling Flags */}
          <fieldset className="border border-pb-primary/20 rounded-lg p-4">
            <legend className="px-2 text-sm text-pb-primary">Transit Handling</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              <label className="inline-flex items-center gap-2 text-pb-gray">
                <input type="checkbox" name="fragile" checked={!!(form as any).fragile} onChange={handleToggle} />
                <span>Fragile / Handle with care</span>
              </label>
              <label className="inline-flex items-center gap-2 text-pb-gray">
                <input type="checkbox" name="thisWayUp" checked={!!(form as any).thisWayUp} onChange={handleToggle} />
                <span>This way up</span>
              </label>
              <label className="inline-flex items-center gap-2 text-pb-gray">
                <input type="checkbox" name="keepDry" checked={!!(form as any).keepDry} onChange={handleToggle} />
                <span>Keep dry</span>
              </label>
              <label className="inline-flex items-center gap-2 text-pb-gray">
                <input type="checkbox" name="doNotTilt" checked={!!(form as any).doNotTilt} onChange={handleToggle} />
                <span>Do not tilt</span>
              </label>
              <label className="inline-flex items-center gap-2 text-pb-gray">
                <input type="checkbox" name="batteryHazard" checked={!!(form as any).batteryHazard} onChange={handleToggle} />
                <span>Battery hazard</span>
              </label>
            </div>
          </fieldset>

          <div className="flex items-center justify-between pt-2">
            <button type="button" className="text-sm text-pb-primary underline" onClick={() => setShowAdvanced(v => !v)}>
              {showAdvanced ? 'Hide advanced fields' : 'Show advanced fields'}
            </button>
            <div className="text-xs text-pb-gray">Shortcut: Ctrl/⌘ + Enter to save</div>
          </div>
          {showAdvanced && (
          <div className="space-y-6">
            {/* Usage specific assets */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Usage Assets</h3>
              <DigitalAssetForm
                assets={(form as any).usageAssets || []}
                onChange={assets => setForm(prev => ({ ...(prev as any), usageAssets: assets } as any))}
                disabled={saving}
              />
            </div>
            {/* Maintenance specific assets */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Maintenance Assets</h3>
              <DigitalAssetForm
                assets={(form as any).maintenanceAssets || []}
                onChange={assets => setForm(prev => ({ ...(prev as any), maintenanceAssets: assets } as any))}
                disabled={saving}
              />
            </div>
            {/* Other/misc assets */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Other Digital Assets</h3>
              <DigitalAssetForm
                assets={(form as any).otherAssets || []}
                onChange={assets => setForm(prev => ({ ...(prev as any), otherAssets: assets } as any))}
                disabled={saving}
              />
            </div>
          </div>
          )}
          <div className="sticky bottom-0 left-0 right-0 bg-pb-darker/40 backdrop-blur px-4 pt-4 -mx-4">
            <div className="flex flex-col md:flex-row gap-3">
              <button type="submit" disabled={saving} className="md:flex-1 py-3 rounded-lg bg-pb-primary hover:bg-pb-accent text-white font-bold text-lg shadow transition disabled:opacity-60 disabled:cursor-not-allowed">
                {saving ? 'Saving...' : 'Add Prop'}
              </button>
              <button type="button" onClick={(e) => handleSubmit(e as any, true)} disabled={saving} className="md:w-72 py-3 rounded-lg bg-pb-success/80 hover:bg-pb-success text-white font-semibold text-lg shadow transition disabled:opacity-60 disabled:cursor-not-allowed">
                {saving ? 'Saving...' : 'Add & Add Another'}
              </button>
            </div>
          </div>
        </motion.form>
      </div>
      {importOpen && (
        <ImportPropsModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => setImportOpen(false)} />
      )}
    </DashboardLayout>
  );
};

export default AddPropPage; 