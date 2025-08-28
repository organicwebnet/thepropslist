import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import DashboardLayout from '../PropsBibleHomepage';
import { motion } from 'framer-motion';
import { Prop, PropFormData, propCategories } from '../../shared/types/props';
import { ImageUpload } from '../components/ImageUpload';
import { DigitalAssetForm } from '../components/DigitalAssetForm';

const EditPropPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { service: firebaseService } = useFirebase();
  const [form, setForm] = useState<PropFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [showOptions, setShowOptions] = useState<{ id: string; name: string }[]>([]);
  const [actOptions, setActOptions] = useState<{ id: string; name: string }[]>([]);
  const [sceneOptions, setSceneOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    firebaseService.getDocument('props', id)
      .then(doc => {
        setForm(doc?.data as PropFormData || null);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load prop.');
        setLoading(false);
      });
  }, [id, firebaseService]);

  // Fetch shows for assignment
  useEffect(() => {
    firebaseService.getDocuments('shows').then(docs => {
      setShowOptions(docs.map(doc => ({ id: doc.id, name: doc.data.name })));
    });
  }, [firebaseService]);

  // Fetch acts/scenes when show changes
  useEffect(() => {
    if (!form?.showId) return;
    firebaseService.getDocuments('acts', { where: [['showId', '==', form.showId]] }).then(docs => {
      setActOptions(docs.map(doc => ({ id: doc.id, name: doc.data.name })));
    });
    firebaseService.getDocuments('scenes', { where: [['showId', '==', form.showId]] }).then(docs => {
      setSceneOptions(docs.map(doc => ({ id: doc.id, name: doc.data.name })));
    });
  }, [form?.showId, firebaseService]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => prev ? { ...prev, [name]: type === 'number' ? Number(value) : value } : prev);
  };

  // TODO: Implement image and digital asset upload logic

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !id) return;
    setSaving(true);
    setError(null);
    try {
      await firebaseService.updateDocument('props', id, form);
      setSaving(false);
      navigate(`/props/${id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update prop.');
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout><div className="text-center text-pb-primary py-16">Loading prop...</div></DashboardLayout>;
  if (error || !form) return <DashboardLayout><div className="text-center text-red-500 py-16">{error || 'Prop not found.'}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen w-full max-w-3xl mx-auto p-6">
        <div className="mb-4 flex justify-end">
          <Link to="/props" className="inline-flex items-center px-4 py-2 rounded-lg bg-pb-primary hover:bg-pb-accent text-white font-semibold shadow transition">
            View Props List
          </Link>
        </div>
        <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-pb-darker/60 rounded-xl shadow-lg p-8 space-y-6">
          <h1 className="text-2xl font-bold text-white mb-4">Edit Prop</h1>
          {error && <div className="text-red-500 mb-2">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="block text-pb-gray mb-1 font-medium">Status *</label>
              <select name="status" value={form.status} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                <option value="in">In</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
                <option value="available">Available</option>
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
              <select name="act" value={form.act || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                <option value="">Select Act</option>
                {actOptions.map(act => <option key={act.id} value={act.name}>{act.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-pb-gray mb-1 font-medium">Scene</label>
              <select name="sceneName" value={form.sceneName || ''} onChange={handleChange} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white">
                <option value="">Select Scene</option>
                {sceneOptions.map(scene => <option key={scene.id} value={scene.name}>{scene.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-pb-gray mb-1 font-medium">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" />
            </div>
            {/* Add more fields as needed for full prop coverage */}
          </div>
          <div className="space-y-4">
            <ImageUpload
              onImagesChange={imgs => setForm(prev => prev ? { ...prev, images: imgs } : prev)}
              currentImages={form.images || []}
              disabled={saving}
            />
            <DigitalAssetForm
              assets={form.digitalAssets || []}
              onChange={assets => setForm(prev => prev ? { ...prev, digitalAssets: assets } : prev)}
              disabled={saving}
            />
          </div>
          <button type="submit" disabled={saving} className="w-full py-3 rounded-lg bg-pb-primary hover:bg-pb-accent text-white font-bold text-lg shadow transition disabled:opacity-60 disabled:cursor-not-allowed mt-4">{saving ? 'Saving...' : 'Save Changes'}</button>
        </motion.form>
      </div>
    </DashboardLayout>
  );
};

export default EditPropPage; 