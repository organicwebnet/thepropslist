import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import DashboardLayout from '../PropsBibleHomepage';
import { motion } from 'framer-motion';
import { PropFormData, propCategories } from '../../shared/types/props';
import { ImageUpload } from '../components/ImageUpload';
import { DigitalAssetForm } from '../components/DigitalAssetForm';

const EditPropPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { service: firebaseService } = useFirebase();
  const [form, setForm] = useState<PropFormData | null>(null);
  const [original, setOriginal] = useState<PropFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [showOptions, setShowOptions] = useState<{ id: string; name: string }[]>([]);
  const [actOptions, setActOptions] = useState<{ id: string; name: string }[]>([]);
  const [sceneOptions, setSceneOptions] = useState<{ id: string; name: string }[]>([]);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    firebaseService.getDocument('props', id)
      .then(doc => {
        const data = (doc?.data as PropFormData) || null;
        setForm(data);
        setOriginal(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load prop.');
        setLoading(false);
      });
  }, [id, firebaseService]);

  // Focus requested input when arriving via focus query string
  useEffect(() => {
    const key = searchParams.get('focus');
    if (!key) return;
    const idMap: Record<string, string> = {
      statusNotes: 'status-notes-input',
      location: 'location-input',
      currentLocation: 'current-location-input',
      status: 'status-select',
      act: 'act-select',
      sceneName: 'scene-select',
    };
    const targetId = idMap[key] || '';
    if (!targetId) return;
    const tryFocus = () => {
      const el = document.getElementById(targetId) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null);
      if (el) {
        try { 
          el.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
        } catch (error) {
          console.warn('Failed to scroll into view:', error);
        }
        try { 
          el.focus(); 
        } catch (error) {
          console.warn('Failed to focus element:', error);
        }
        return true;
      }
      return false;
    };
    // Attempt now, then after paint, then after a short delay (covers async load)
    if (!tryFocus()) {
      requestAnimationFrame(() => { if (!tryFocus()) { setTimeout(tryFocus, 150); } });
    }
  }, [searchParams]);

  // Re-run focus when form finishes loading
  useEffect(() => {
    if (loading) return;
    const key = searchParams.get('focus');
    if (!key) return;
    const idMap: Record<string, string> = {
      statusNotes: 'status-notes-input',
      location: 'location-input',
      currentLocation: 'current-location-input',
      status: 'status-select',
      act: 'act-select',
      sceneName: 'scene-select',
    };
    const targetId = idMap[key] || '';
    if (!targetId) return;
    const el = document.getElementById(targetId) as (HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null);
    if (el) {
      try { 
        el.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
      } catch (error) {
        console.warn('Failed to scroll into view:', error);
      }
      try { 
        el.focus(); 
      } catch (error) {
        console.warn('Failed to focus element:', error);
      }
    }
  }, [loading, searchParams]);

  // Fetch shows for assignment
  useEffect(() => {
    firebaseService.getDocuments('shows').then(docs => {
      setShowOptions(docs.map(doc => ({ id: doc.id, name: doc.data.name })));
    });
  }, [firebaseService]);

  // Fetch acts/scenes when show changes
  useEffect(() => {
    if (!form?.showId) { setActOptions([]); setSceneOptions([]); return; }
    // Prefer reading acts/scenes from the selected show document
    (async () => {
      try {
        const showDoc = await firebaseService.getDocument<any>('shows', form.showId as string);
        const rawActs = showDoc?.data?.acts || [];
        // Normalize acts to {id,name,scenes}
        const acts = (Array.isArray(rawActs) ? rawActs : []).map((a: any, idx: number) => ({
          id: String(a?.id ?? a?.name ?? idx),
          name: a?.name ?? a?.title ?? `Act ${idx + 1}`,
          scenes: Array.isArray(a?.scenes) ? a.scenes : [],
        }));
        setActOptions(acts.map(a => ({ id: a.id, name: a.name })));
        // If current act is set, populate scenes based on that act
        const currentActNameOrId = form.act || form.act === 0 ? form.act : undefined;
        const chosenAct = acts.find((a: any) => (String(a.id) === String(currentActNameOrId)) || (a.name === currentActNameOrId));
        let scenes = chosenAct?.scenes || [];
        if (!Array.isArray(scenes) || scenes.length === 0) {
          // Fallback: fetch scenes collection for the show
          try {
            const sceneDocs = await firebaseService.getDocuments('scenes', { where: [['showId', '==', form.showId as string]] });
            scenes = sceneDocs.map((doc: any) => ({ id: doc.id, name: doc.data.name ?? doc.data.title }));
          } catch { /* ignore */ }
        }
        // Normalize scenes (supports array of strings or objects)
        const normalizedScenes = (scenes || []).map((s: any, i: number) => ({
          id: String(s?.id ?? s?.name ?? s?.title ?? i),
          name: s?.name ?? s?.title ?? String(s),
        }));
        setSceneOptions(normalizedScenes);
      } catch (e) {
        // Fallback to flat collections if needed
        try {
          const actDocs = await firebaseService.getDocuments('acts', { where: [['showId', '==', form.showId]] });
          setActOptions(actDocs.map((doc: any) => ({ id: doc.id, name: doc.data.name })));
          const sceneDocs = await firebaseService.getDocuments('scenes', { where: [['showId', '==', form.showId]] });
          setSceneOptions(sceneDocs.map((doc: any) => ({ id: doc.id, name: doc.data.name ?? doc.data.title })));
        } catch {
          setActOptions([]);
          setSceneOptions([]);
        }
      }
    })();
  }, [form?.showId, form?.act, firebaseService]);

  // When act changes from the dropdown, refresh scene options based on selected show structure
  const handleActChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setForm(prev => prev ? { ...prev, act: value as any, sceneName: '' } : prev);
    if (!form?.showId) return;
    try {
      const showDoc = await firebaseService.getDocument<any>('shows', form.showId);
      const rawActs = showDoc?.data?.acts || [];
      const acts = (Array.isArray(rawActs) ? rawActs : []).map((a: any, idx: number) => ({
        id: String(a?.id ?? a?.name ?? idx),
        name: a?.name ?? a?.title ?? `Act ${idx + 1}`,
        scenes: Array.isArray(a?.scenes) ? a.scenes : [],
      }));
      const chosenAct = acts.find((a: any) => (String(a.id) === value) || (a.name === value));
      let scenes = chosenAct?.scenes || [];
      if (!Array.isArray(scenes) || scenes.length === 0) {
        // Fallback to flat scenes list scoped to show
        try {
          const sceneDocs = await firebaseService.getDocuments('scenes', { where: [['showId', '==', form.showId as string]] });
          scenes = sceneDocs.map((doc: any) => ({ id: doc.id, name: doc.data.name ?? doc.data.title }));
        } catch (err) { /* ignore */ }
      }
      const normalizedScenes = (scenes || []).map((s: any, i: number) => ({ id: String(s?.id ?? s?.name ?? s?.title ?? i), name: s?.name ?? s?.title ?? String(s) }));
      setSceneOptions(normalizedScenes);
    } catch (err) {
      // ignore
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => prev ? { ...prev, [name]: type === 'number' ? Number(value) : value } : prev);
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const tags = raw
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    setForm(prev => prev ? { ...prev, tags } : prev);
  };

  const handleMaterialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const materials = raw
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    setForm(prev => prev ? { ...prev, materials } : prev);
  };

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setForm(prev => prev ? { ...prev, [name]: checked } : prev);
  };

  // Helper to show a compact, clickable URL preview
  const displayUrl = (u?: string): string => {
    if (!u) return '';
    const s = String(u).trim();
    try {
      const parsed = new URL(s);
      const compact = `${parsed.hostname}${parsed.pathname}`;
      return compact.length > 48 ? `${compact.slice(0, 48)}…` : compact;
    } catch {
      return s.length > 48 ? `${s.slice(0, 48)}…` : s;
    }
  };

  // TODO: Implement image and digital asset upload logic

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !id) return;
    setSaving(true);
    setError(null);
    try {
      const update: any = { ...form };
      const statusChanged = (original?.status !== form.status);
      const notesChanged = ((original as any)?.statusNotes !== (form as any)?.statusNotes);
      if (statusChanged || notesChanged) {
        update.lastStatusUpdate = new Date().toISOString();
      }
      await firebaseService.updateDocument('props', id, update);
      setSaving(false);
      navigate(`/props/${id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update prop.');
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout><div className="text-center text-pb-primary py-16">Loading prop...</div></DashboardLayout>;
  if (error || !form) return <DashboardLayout><div className="text-center text-red-500 py-16">{error || 'Prop not found.'}</div></DashboardLayout>;

  const missing = {
    status: !form.status,
    location: !(form as any).location && !(form as any).currentLocation,
    statusNotes: !(form as any).statusNotes,
    act: !form.act,
    sceneName: !form.sceneName && !(form as any).scene,
  } as Record<string, boolean>;

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen w-full max-w-none p-6">
        <div className="mb-4 flex justify-end">
          <Link to="/props" className="inline-flex items-center px-4 py-2 rounded-lg bg-pb-primary hover:bg-pb-accent text-white font-semibold shadow transition">
            View Props List
          </Link>
        </div>
        <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-pb-darker/60 rounded-xl shadow-lg p-8 space-y-6">
          <h1 className="text-2xl font-bold text-white mb-4">Edit Prop</h1>
          {error && <div className="text-red-500 mb-2">{error}</div>}
          <fieldset className="border border-pb-primary/20 rounded-lg p-4">
            <legend className="px-2 text-sm text-pb-primary">Overview & Identification</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Name *</label>
              <input name="name" value={form.name} onChange={handleChange} required className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
            </div>
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Category *</label>
              <select name="category" value={form.category} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                {propCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Quantity *</label>
              <input name="quantity" type="number" min={1} value={form.quantity} onChange={handleChange} required className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
            </div>
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Price</label>
              <input name="price" type="number" min={0} step="0.01" value={(form.price ?? 0)} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
            </div>
            <div>
              <label className={`block mb-1 font-medium ${missing.status ? 'text-pb-warning' : 'text-pb-gray'}`}>Status *</label>
              <select id="status-select" name="status" value={form.status} onChange={handleChange} className={`w-full rounded p-2 text-white ${missing.status ? 'bg-pb-warning/10 border border-pb-warning' : 'bg-pb-darker border border-pb-primary/30'}`}>
                <option value="to-be-made">to be made</option>
                <option value="to-be-bought">to be bought</option>
                <option value="awaiting-delivery">awaiting delivery</option>
                <option value="part-of-the-show">part of the show</option>
                <option value="share">share</option>
                <option value="replacement-needed">replacment needed</option>
                <option value="needs-repair-mod">needs repair/mod</option>
                <option value="cut">cut</option>
                <option value="on-hold">on hold</option>
                <option value="in-container">in container</option>
                <option value="available_in_storage">available in storage</option>
              </select>
            </div>
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Source</label>
              <select name="source" value={(form as any).source ?? ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                <option value="">Select Source</option>
                <option value="bought">Bought</option>
                <option value="rented">Rented</option>
                <option value="made">Made</option>
                <option value="borrowed">Borrowed</option>
                <option value="owned">Owned</option>
              </select>
            </div>
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Show *</label>
              <select name="showId" value={form.showId} onChange={handleChange} required className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                <option value="">Select Show</option>
                {showOptions.map(show => <option key={show.id} value={show.id}>{show.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Act</label>
              <select id="act-select" name="act" value={form.act || ''} onChange={handleActChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                <option value="">Select Act</option>
                {actOptions.map(act => <option key={act.id} value={act.id}>{act.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Scene</label>
              <select id="scene-select" name="sceneName" value={form.sceneName || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                <option value="">Select Scene</option>
                {sceneOptions.map(scene => <option key={scene.id} value={scene.name}>{scene.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-pb-gray mb-1 font-medium">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
            </div>
            <div className="md:col-span-3">
              <label className={`block mb-1 font-medium ${missing.statusNotes ? 'text-pb-warning' : 'text-pb-gray'}`}>Status Notes</label>
              <textarea id="status-notes-input" name="statusNotes" value={(form as any).statusNotes || ''} onChange={handleChange} rows={2} placeholder="Add any status notes" className={`w-full rounded p-2 text-white ${missing.statusNotes ? 'bg-pb-warning/10 border border-pb-warning' : 'bg-pb-darker border border-pb-primary/30'}`} />
            </div>
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Purchase URL</label>
                <input name="purchaseUrl" value={(form as any).purchaseUrl ?? ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              <div>
                <label className={`block mb-1 font-medium ${missing.location ? 'text-pb-warning' : 'text-pb-gray'}`}>Location</label>
                <input id="location-input" name="location" value={(form as any).location ?? ''} onChange={handleChange} className={`w-full rounded p-2 text-white ${missing.location ? 'bg-pb-warning/10 border border-pb-warning' : 'bg-pb-darker border border-pb-primary/30'}`} />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Current Location</label>
                <input id="current-location-input" name="currentLocation" value={(form as any).currentLocation ?? ''} onChange={handleChange} className={`w-full rounded p-2 text-white ${missing.location ? 'bg-pb-warning/10 border border-pb-warning' : 'bg-pb-darker border border-pb-primary/30'}`} />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Condition</label>
                <input name="condition" value={form.condition || ''} onChange={handleChange} placeholder="e.g., New, Used, Needs Repair" className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Length</label>
                <input name="length" type="number" step="0.01" value={form.length ?? ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Width</label>
                <input name="width" type="number" step="0.01" value={form.width ?? ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Height</label>
                <input name="height" type="number" step="0.01" value={form.height ?? ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Depth</label>
                <input name="depth" type="number" step="0.01" value={(form as any).depth ?? ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Dimension Unit</label>
                <select name="unit" value={(form as any).unit ?? ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                  <option value="">Select Unit</option>
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                  <option value="m">m</option>
                  <option value="ft">ft</option>
                </select>
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Weight</label>
                <input name="weight" type="number" step="0.01" value={form.weight ?? ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Weight Unit</label>
                <select name="weightUnit" value={(form as any).weightUnit ?? ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                  <option value="g">g</option>
                </select>
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Travel Weight</label>
                <input name="travelWeight" type="number" step="0.01" value={(form as any).travelWeight ?? ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-pb-gray mb-1 font-medium">Materials (comma-separated)</label>
                <input
                  name="materialsInput"
                  value={(form.materials && form.materials.length > 0) ? form.materials.join(', ') : ''}
                  onChange={handleMaterialsChange}
                  placeholder="e.g., Wood, Metal, Plastic"
                  className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Color</label>
                <input name="color" value={(form as any).color || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Style</label>
                <input name="style" value={(form as any).style || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              {/* Identification moved under Physical */}
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Manufacturer</label>
                <input name="manufacturer" value={(form as any).manufacturer || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Model</label>
                <input name="model" value={(form as any).model || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Serial Number</label>
                <input name="serialNumber" value={(form as any).serialNumber || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Barcode</label>
                <input name="barcode" value={(form as any).barcode || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Historical Period</label>
                <input name="period" value={form.period || ''} onChange={handleChange} placeholder="e.g., Victorian, 1920s" className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-pb-gray mb-1 font-medium">Tags (comma separated)</label>
                <input
                  name="tagsInput"
                  value={(form.tags && form.tags.length > 0) ? form.tags.join(', ') : ''}
                  onChange={handleTagsChange}
                  placeholder="e.g., weapon, medieval, stage-left"
                  className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white"
                />
              </div>
            </div>
            </div>
            {/* Add more fields as needed for full prop coverage */}
          </fieldset>
          {/* Rental / Details & Flags */}
          {((form as any).source === 'rented') && (
            <fieldset className="border border-pb-primary/20 rounded-lg p-4">
              <legend className="px-2 text-sm text-pb-primary">Purchase & Rental</legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Rental Source</label>
                <input name="rentalSource" value={(form as any).rentalSource || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Rental Due Date</label>
                <input name="rentalDueDate" type="date" value={(form as any).rentalDueDate || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Rental Reference #</label>
                <input name="rentalReferenceNumber" value={(form as any).rentalReferenceNumber || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
              </div>
            </fieldset>
          )}
          
          {/* Details & Flags */}
          <fieldset className="border border-pb-primary/20 rounded-lg p-4">
            <legend className="px-2 text-sm text-pb-primary">Usage & Safety • Pre-Show Setup • Flags</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <label className="inline-flex items-center gap-2 text-pb-gray">
              <input type="checkbox" name="isConsumable" checked={!!form.isConsumable} onChange={handleToggle} />
              <span>Consumable</span>
            </label>
            <label className="inline-flex items-center gap-2 text-pb-gray">
              <input type="checkbox" name="requiresPreShowSetup" checked={!!form.requiresPreShowSetup} onChange={handleToggle} />
              <span>Requires Pre-Show Setup</span>
            </label>
            {form.requiresPreShowSetup && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-pb-gray mb-1 text-sm">Pre-Show Setup Notes</label>
                  <textarea
                    name="preShowSetupNotes"
                    value={form.preShowSetupNotes || ''}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Steps to prepare this prop before the show"
                    className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-pb-gray mb-1 text-sm">Pre-Show Setup Video URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      name="preShowSetupVideo"
                      value={form.preShowSetupVideo || ''}
                      onChange={handleChange}
                      placeholder="https://... (YouTube, Vimeo, MP4, Google Drive)"
                      className="flex-1 rounded bg-pb-darker border border-pb-primary/30 p-2 text-white"
                    />
                    {form.preShowSetupVideo ? (
                      <a
                        href={form.preShowSetupVideo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pb-accent underline whitespace-nowrap"
                        title={form.preShowSetupVideo}
                      >
                        {displayUrl(form.preShowSetupVideo)}
                      </a>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="block text-pb-gray mb-1 text-sm">Pre-Show Setup Duration (minutes)</label>
                  <input
                    name="preShowSetupDuration"
                    type="number"
                    min={0}
                    step="1"
                    value={(form.preShowSetupDuration as any) ?? ''}
                    onChange={handleChange}
                    className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white"
                  />
                </div>
              </div>
            )}
            <label className="inline-flex items-center gap-2 text-pb-gray">
              <input type="checkbox" name="isBreakable" checked={!!form.isBreakable} onChange={handleToggle} />
              <span>Breakable</span>
            </label>
            <label className="inline-flex items-center gap-2 text-pb-gray">
              <input type="checkbox" name="hasOwnShippingCrate" checked={!!form.hasOwnShippingCrate} onChange={handleToggle} />
              <span>Has Dedicated Shipping Crate</span>
            </label>
            <label className="inline-flex items-center gap-2 text-pb-gray">
              <input type="checkbox" name="requiresSpecialTransport" checked={!!form.requiresSpecialTransport} onChange={handleToggle} />
              <span>Requires Special Transport</span>
            </label>
            <label className="inline-flex items-center gap-2 text-pb-gray">
              <input type="checkbox" name="hasBeenModified" checked={!!form.hasBeenModified} onChange={handleToggle} />
              <span>Has Been Modified</span>
            </label>
            <label className="inline-flex items-center gap-2 text-pb-gray md:col-span-2">
              <input type="checkbox" name="hasUsageInstructions" checked={!!form.hasUsageInstructions} onChange={handleToggle} />
              <span>Add Usage Instructions</span>
            </label>
            {form.hasUsageInstructions && (
              <div className="md:col-span-2">
                <textarea name="usageInstructions" value={form.usageInstructions || ''} onChange={handleChange} rows={3} placeholder="Enter usage instructions" className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white mb-3" />
                <label className="block text-pb-gray mb-1 text-sm">Handling Instructions</label>
                <textarea name="handlingInstructions" value={form.handlingInstructions || ''} onChange={handleChange} rows={2} placeholder="How to handle the prop (carrying, storage, etc.)" className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white mb-4" />
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Usage Assets</h3>
                  <DigitalAssetForm
                    assets={(form as any).usageAssets || []}
                    onChange={assets => setForm(prev => prev ? { ...prev, usageAssets: assets } : prev)}
                    disabled={saving}
                  />
                </div>
              </div>
            )}
            <label className="inline-flex items-center gap-2 text-pb-gray md:col-span-2">
              <input type="checkbox" name="hasMaintenanceNotes" checked={!!form.hasMaintenanceNotes} onChange={handleToggle} />
              <span>Add Maintenance Notes</span>
            </label>
            {form.hasMaintenanceNotes && (
              <div className="md:col-span-2">
                <textarea name="maintenanceNotes" value={form.maintenanceNotes || ''} onChange={handleChange} rows={3} placeholder="Enter maintenance notes" className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white mb-3" />
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Maintenance Assets</h3>
                  <DigitalAssetForm
                    assets={(form as any).maintenanceAssets || []}
                    onChange={assets => setForm(prev => prev ? { ...prev, maintenanceAssets: assets } : prev)}
                    disabled={saving}
                  />
                </div>
              </div>
            )}
            <label className="inline-flex items-center gap-2 text-pb-gray md:col-span-2">
              <input type="checkbox" name="hasSafetyNotes" checked={!!form.hasSafetyNotes} onChange={handleToggle} />
              <span>Add Safety Notes</span>
            </label>
            {form.hasSafetyNotes && (
              <div className="md:col-span-2">
                <textarea name="safetyNotes" value={form.safetyNotes || ''} onChange={handleChange} rows={3} placeholder="Enter safety notes" className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-pb-gray mb-1 font-medium">General Notes</label>
              <textarea name="notes" value={(form as any).notes || ''} onChange={handleChange} rows={3} placeholder="Enter any other notes" className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
            </div>
            </div>
          </fieldset>
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
          <fieldset className="border border-pb-primary/20 rounded-lg p-4">
            <legend className="px-2 text-sm text-pb-primary">Media & Assets</legend>
            <div className="space-y-4">
            <ImageUpload
              onImagesChange={imgs => setForm(prev => prev ? { ...prev, images: imgs } : prev)}
              currentImages={form.images || []}
              disabled={saving}
            />
            {/* General Digital Assets */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-white mb-2">Other Digital Assets</h2>
              <DigitalAssetForm
                assets={form.digitalAssets || []}
                onChange={assets => setForm(prev => prev ? { ...prev, digitalAssets: assets } : prev)}
                disabled={saving}
              />
            </div>
            </div>
          </fieldset>
          <button type="submit" disabled={saving} className="w-full py-3 rounded-lg bg-pb-primary hover:bg-pb-accent text-white font-bold text-lg shadow transition disabled:opacity-60 disabled:cursor-not-allowed mt-4">{saving ? 'Saving...' : 'Save Changes'}</button>
        </motion.form>
      </div>
    </DashboardLayout>
  );
};

export default EditPropPage; 