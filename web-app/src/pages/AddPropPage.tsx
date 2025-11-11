import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import DashboardLayout from '../PropsBibleHomepage';
import { motion } from 'framer-motion';
import { useShowSelection } from '../contexts/ShowSelectionContext';
import { PropFormData, propCategories } from '../../shared/types/props';
import { ImageUpload } from '../components/ImageUpload';
import { DigitalAssetForm } from '../components/DigitalAssetForm';
import DimensionInput from '../components/DimensionInput';
import WeightInput from '../components/WeightInput';
// import ImportPropsModal from '../components/ImportPropsModal';
import { useLimitChecker } from '../hooks/useLimitChecker';
import { useWebAuth } from '../contexts/WebAuthContext';

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
  usageInstructions: '',
  maintenanceNotes: '',
  otherAssetsInstructions: '',
  caseLength: '',
  caseWidth: '',
  caseHeight: '',
  showId: '',
} as any;

const AddPropPage: React.FC = () => {
  const { service: firebaseService } = useFirebase();
  const { currentShowId } = useShowSelection();
  const { user } = useWebAuth();
  const { checkPropsLimit, checkPropsLimitForShow } = useLimitChecker();
  const [form, setForm] = useState<PropFormData>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [, setShowOptions] = useState<{ id: string; name: string }[]>([]);
  const [actOptions, setActOptions] = useState<{ id: string; name: string }[]>([]);
  const [sceneOptions, setSceneOptions] = useState<{ id: string; name: string }[]>([]);
  const [actsList, setActsList] = useState<any[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [statusTouched, setStatusTouched] = useState(false);
  const [makers, setMakers] = useState<{ id: string; name: string }[]>([]);
  const [hireCompanies, setHireCompanies] = useState<{ id: string; name: string }[]>([]);
  // const [importOpen, setImportOpen] = useState(false);
  const [showImportNudge, setShowImportNudge] = useState(() => localStorage.getItem('hideImportNudge') !== '1');
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  // Check limits on page load and when show changes
  useEffect(() => {
    const checkLimits = async () => {
      if (!user?.uid) return;
      
      try {
        // Check per-show props limit if show is selected (this checks show owner's limits)
        if (form.showId) {
          const showLimitCheck = await checkPropsLimitForShow(form.showId);
          // Show warning if at limit or almost out (80%+)
          if (!showLimitCheck.withinLimit || showLimitCheck.isAlmostOut) {
            setLimitWarning(showLimitCheck.message || 'Show props limit reached');
            return;
          }
        }

        // Check per-plan props limit (for user's own shows)
        const planLimitCheck = await checkPropsLimit(user.uid);
        if (!planLimitCheck.withinLimit) {
          setLimitWarning(planLimitCheck.message || 'Props limit reached');
          return;
        }

        // Clear warning if within limits
        setLimitWarning(null);
      } catch (error) {
        console.error('Error checking limits:', error);
        // Don't show error to user, just log it
      }
    };

    checkLimits();
  }, [user?.uid, form.showId, checkPropsLimit, checkPropsLimitForShow]);

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

  // Redirect if no show is selected
  useEffect(() => {
    if (!currentShowId) {
      navigate('/props', { 
        state: { 
          message: 'Please select a show first before adding props.',
          type: 'warning'
        }
      });
    }
  }, [currentShowId, navigate]);

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
      } catch (err) { /* ignore */ }
      try {
        const h = await firebaseService.getDocuments('hire_companies');
        setHireCompanies(h.map((d: any) => ({ id: d.id, name: d.data?.name || 'Hire Company' })));
      } catch (err) { /* ignore */ }
    })();
  }, [firebaseService]);

  // Helper functions for dimension and weight inputs
  const handleDimensionChange = (name: string, value: number | undefined) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDimensionUnitChange = (unit: string) => {
    setForm(prev => ({ ...prev, unit: unit as any }));
  };

  const handleWeightChange = (name: string, value: number | undefined) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleWeightUnitChange = (unit: string) => {
    setForm(prev => ({ ...prev, weightUnit: unit as any }));
  };

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
    setLimitError(null);
    
    try {
      // Check props limits before creating
      if (!user?.uid) {
        setError('You must be signed in to create props.');
        setSaving(false);
        return;
      }

      // Check per-plan props limit
      const planLimitCheck = await checkPropsLimit(user.uid);
      if (!planLimitCheck.withinLimit) {
        setLimitError(planLimitCheck.message || 'Props limit reached');
        setSaving(false);
        return;
      }

      // Check per-show props limit if show is selected
      if (form.showId) {
        const showLimitCheck = await checkPropsLimitForShow(form.showId);
        if (!showLimitCheck.withinLimit) {
          setLimitError(showLimitCheck.message || 'Show props limit reached');
          setSaving(false);
          return;
        }
      }
      // Persist new maker / hire company if user typed a new one
      const payload: any = { ...form };
      if (form.source === 'made') {
        const makerName = (form as any).makerName?.trim();
        if (!((form as any).makerId) && makerName) {
          try {
            const newId = await firebaseService.addDocument('makers', { name: makerName });
            payload.makerId = newId;
            setMakers(prev => [...prev, { id: String(newId), name: makerName }]);
          } catch (err) { /* ignore */ }
        }
      }
      if (form.source === 'hired') {
        const hireCompanyName = (form as any).hireCompanyName?.trim();
        if (!((form as any).hireCompanyId) && hireCompanyName) {
          try {
            const newId = await firebaseService.addDocument('hire_companies', { name: hireCompanyName });
            payload.hireCompanyId = newId;
            setHireCompanies(prev => [...prev, { id: String(newId), name: hireCompanyName }]);
          } catch (err) { /* ignore */ }
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

  const [, _setAddAnother] = useState(false);

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen w-full max-w-6xl mx-auto p-6">
        <div className="mb-4 flex justify-end">
          <Link to="/props" className="inline-flex items-center px-4 py-2 rounded-lg bg-pb-primary hover:bg-pb-accent text-white font-semibold shadow transition">
            View Props List
          </Link>
        </div>
        
        {/* Limit Warning Banner */}
        {limitWarning && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-red-200 font-semibold mb-1">Subscription Limit Reached</div>
                <div className="text-red-100 text-sm mb-3">{limitWarning}</div>
                <Link 
                  to="/profile" 
                  className="inline-block px-4 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg font-semibold transition-colors text-sm"
                >
                  Upgrade Plan
                </Link>
              </div>
            </div>
          </div>
        )}
        
        {showImportNudge && (
          <div className="mb-4 p-4 rounded-lg border border-pb-primary/30 bg-pb-darker/50 flex items-center justify-between">
            <div className="text-white">Have a spreadsheet already? Import props and fill in details later.</div>
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded-lg bg-pb-primary text-white hover:bg-pb-accent" onClick={() => {/* setImportOpen(true) */}}>Import Props</button>
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
          className={`bg-pb-darker/60 rounded-xl shadow-lg p-8 space-y-6 ${limitWarning ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <h1 className="text-2xl font-bold text-white mb-4">Add Prop</h1>
          {error && <div className="text-red-500 mb-2">{error}</div>}
          {limitError && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <div className="text-red-200 font-semibold mb-2">Subscription Limit Reached</div>
              <div className="text-red-100 text-sm">{limitError}</div>
              <div className="mt-3">
                <Link 
                  to="/profile" 
                  className="inline-block px-4 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg font-semibold transition-colors"
                >
                  Upgrade Plan
                </Link>
              </div>
            </div>
          )}
          {/* Basic Information */}
          <fieldset className="border border-pb-primary/20 rounded-lg p-4">
            <legend className="px-2 text-sm text-pb-primary">Basic Information</legend>
            <div className="space-y-4">
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
                <div>
                  <label className="block text-pb-gray mb-1 font-medium">Color</label>
                  <input name="color" value={(form as any).color || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" placeholder="e.g., Red, Blue, Wood finish" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-pb-gray mb-1 font-medium">Description</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
                </div>
              </div>
            </div>
          </fieldset>

          {/* Show Assignment */}
          <fieldset className="border border-pb-primary/20 rounded-lg p-4">
            <legend className="px-2 text-sm text-pb-primary">Show Assignment</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </fieldset>

          {/* Pricing & Quantity */}
          <fieldset className="border border-pb-primary/20 rounded-lg p-4">
            <legend className="px-2 text-sm text-pb-primary">Pricing & Quantity</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Price</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-pb-gray text-sm">£</span>
                  </div>
                  <input 
                    name="price" 
                    type="text" 
                    value={form.price ? form.price.toString() : ''} 
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow only numbers and decimal point
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        const numericValue = value === '' ? 0 : parseFloat(value);
                        if (!isNaN(numericValue) && numericValue >= 0) {
                          setForm(prev => ({ ...prev, price: numericValue }));
                        }
                      }
                    }}
                    className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 pl-8 text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Quantity *</label>
                <input name="quantity" type="number" min={1} value={form.quantity} onChange={handleChange} required className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
              </div>
            </div>
          </fieldset>

          {/* Source & Details */}
          <fieldset className="border border-pb-primary/20 rounded-lg p-4">
            <legend className="px-2 text-sm text-pb-primary">Source & Details</legend>
            <div className="space-y-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </fieldset>

          {/* Category & Status */}
          <fieldset className="border border-pb-primary/20 rounded-lg p-4">
            <legend className="px-2 text-sm text-pb-primary">Category & Status</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Prop Dimensions and Weight */}
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-medium text-pb-gray">Prop Dimensions & Weight</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <DimensionInput
                  name="length"
                  label="Length"
                  value={form.length}
                  unit={form.unit || 'mm'}
                  onChange={handleDimensionChange}
                  onUnitChange={handleDimensionUnitChange}
                  disabled={saving}
                />
                <DimensionInput
                  name="width"
                  label="Width"
                  value={form.width}
                  unit={form.unit || 'mm'}
                  onChange={handleDimensionChange}
                  onUnitChange={handleDimensionUnitChange}
                  disabled={saving}
                />
                <DimensionInput
                  name="height"
                  label="Height"
                  value={form.height}
                  unit={form.unit || 'mm'}
                  onChange={handleDimensionChange}
                  onUnitChange={handleDimensionUnitChange}
                  disabled={saving}
                />
                <WeightInput
                  name="weight"
                  label="Weight"
                  value={form.weight}
                  unit={form.weightUnit || 'kg'}
                  onChange={handleWeightChange}
                  onUnitChange={handleWeightUnitChange}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Travel Case Section */}
            <div className="mt-6 space-y-4">
              <label className="inline-flex items-center gap-2 text-pb-gray">
                <input 
                  type="checkbox" 
                  name="hasOwnShippingCrate" 
                  checked={!!form.hasOwnShippingCrate} 
                  onChange={handleToggle} 
                />
                <span className="font-medium">Prop has its own travel case</span>
              </label>
              
              {form.hasOwnShippingCrate && (
                <div className="ml-6 space-y-4">
                  <div>
                    <label className="block text-pb-gray mb-1 text-sm">Travel Case Details</label>
                    <textarea 
                      name="shippingCrateDetails" 
                      value={form.shippingCrateDetails || ''} 
                      onChange={handleChange} 
                      rows={2} 
                      className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" 
                      placeholder="Describe the travel case (material, type, etc.)"
                    />
                  </div>
                  
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <DimensionInput
                    name="caseLength"
                    label="Case Length"
                    value={(form as any).caseLength}
                    unit={form.unit || 'mm'}
                    onChange={handleDimensionChange}
                    onUnitChange={handleDimensionUnitChange}
                    disabled={saving}
                  />
                  <DimensionInput
                    name="caseWidth"
                    label="Case Width"
                    value={(form as any).caseWidth}
                    unit={form.unit || 'mm'}
                    onChange={handleDimensionChange}
                    onUnitChange={handleDimensionUnitChange}
                    disabled={saving}
                  />
                  <DimensionInput
                    name="caseHeight"
                    label="Case Height"
                    value={(form as any).caseHeight}
                    unit={form.unit || 'mm'}
                    onChange={handleDimensionChange}
                    onUnitChange={handleDimensionUnitChange}
                    disabled={saving}
                  />
                  <WeightInput
                    name="travelWeight"
                    label="Travel Weight"
                    value={form.travelWeight}
                    unit={form.weightUnit || 'kg'}
                    onChange={handleWeightChange}
                    onUnitChange={handleWeightUnitChange}
                    disabled={saving}
                  />
                </div>
                </div>
              )}
            </div>
          </fieldset>

          {/* Location & Custody */}
          <fieldset className="border border-pb-primary/20 rounded-lg p-4">
            <legend className="px-2 text-sm text-pb-primary">Location & Custody</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Current Location</label>
                <input 
                  name="currentLocation" 
                  value={(form as any).currentLocation || ''} 
                  onChange={handleChange} 
                  placeholder="e.g., Storage Room A, Backstage Left, Props Workshop"
                  className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" 
                />
              </div>
              <div>
                <label className="block text-pb-gray mb-1 font-medium">Currently With</label>
                <select 
                  name="custodian" 
                  value={(form as any).custodian || ''} 
                  onChange={handleChange} 
                  className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white"
                >
                  <option value="">Select who has the prop</option>
                  <option value="props-team">Props Team</option>
                  <option value="stage-management">Stage Management</option>
                  <option value="maker">Maker</option>
                  <option value="hire-company">Hire Company</option>
                  <option value="storage">In Storage</option>
                  <option value="actor">Actor</option>
                  <option value="wardrobe">Wardrobe Team</option>
                  <option value="sound">Sound Team</option>
                  <option value="lighting">Lighting Team</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {(form as any).custodian === 'other' && (
                <div className="md:col-span-2">
                  <label className="block text-pb-gray mb-1 font-medium">Custom Custodian</label>
                  <input 
                    name="customCustodian" 
                    value={(form as any).customCustodian || ''} 
                    onChange={handleChange} 
                    placeholder="Specify who has the prop"
                    className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" 
                  />
                </div>
              )}
            </div>
          </fieldset>

          <div className="flex items-center justify-between pt-2">
            <button 
              type="button" 
              className="px-4 py-2 rounded-lg bg-pb-primary/20 hover:bg-pb-primary/40 border border-pb-primary/30 hover:border-pb-primary/50 text-pb-primary hover:text-white font-medium transition-all duration-200 flex items-center gap-2" 
              onClick={() => setShowAdvanced(v => !v)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {showAdvanced ? 'Hide notes and instructions' : 'Add notes and instructions'}
            </button>
            <div className="text-xs text-pb-gray">Shortcut: Ctrl/⌘ + Enter to save</div>
          </div>
          {showAdvanced && (
          <div className="space-y-6">
            {/* Usage Instructions & Assets */}
            <fieldset className="border border-pb-primary/20 rounded-lg p-4">
              <legend className="px-2 text-sm text-pb-primary">Usage Instructions & Assets</legend>
              <div className="mt-2">
                <DigitalAssetForm
                  assets={(form as any).usageAssets || []}
                  onChange={assets => setForm(prev => ({ ...(prev as any), usageAssets: assets } as any))}
                  disabled={saving}
                  instructions={(form as any).usageInstructions || ''}
                  onInstructionsChange={instructions => setForm(prev => ({ ...(prev as any), usageInstructions: instructions } as any))}
                  instructionsPlaceholder="Enter usage instructions, setup notes, or other relevant information..."
                />
              </div>
            </fieldset>

            {/* Maintenance Instructions & Assets */}
            <fieldset className="border border-pb-primary/20 rounded-lg p-4">
              <legend className="px-2 text-sm text-pb-primary">Maintenance Instructions & Assets</legend>
              <div className="mt-2">
                <DigitalAssetForm
                  assets={(form as any).maintenanceAssets || []}
                  onChange={assets => setForm(prev => ({ ...(prev as any), maintenanceAssets: assets } as any))}
                  disabled={saving}
                  instructions={(form as any).maintenanceNotes || ''}
                  onInstructionsChange={notes => setForm(prev => ({ ...(prev as any), maintenanceNotes: notes } as any))}
                  instructionsPlaceholder="Enter maintenance instructions, care notes, or repair information..."
                />
              </div>
            </fieldset>

            {/* Other Digital Assets */}
            <fieldset className="border border-pb-primary/20 rounded-lg p-4">
              <legend className="px-2 text-sm text-pb-primary">Other Digital Assets</legend>
              <div className="mt-2">
                <DigitalAssetForm
                  assets={(form as any).otherAssets || []}
                  onChange={assets => setForm(prev => ({ ...(prev as any), otherAssets: assets } as any))}
                  disabled={saving}
                  instructions={(form as any).otherAssetsInstructions || ''}
                  onInstructionsChange={instructions => setForm(prev => ({ ...(prev as any), otherAssetsInstructions: instructions } as any))}
                  instructionsPlaceholder="Enter notes about these assets, rebuild instructions, or other relevant information..."
                />
              </div>
            </fieldset>
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
      {/* {importOpen && (
        <ImportPropsModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => setImportOpen(false)} />
      )} */}
    </DashboardLayout>
  );
};

export default AddPropPage; 