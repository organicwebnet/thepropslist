import React, { useEffect, useState } from 'react';
import DashboardLayout from '../PropsBibleHomepage';
import { useFirebase } from '../contexts/FirebaseContext';
import { useShowSelection } from '../contexts/ShowSelectionContext';
import type { BrandProfile } from '../../shared/types/brand';

const BrandingStudioPage: React.FC = () => {
  const { service } = useFirebase();
  const { currentShowId } = useShowSelection();
  const [brand, setBrand] = useState<BrandProfile>({ colors: { primary: '#0ea5e9', accent: '#22c55e' }, fonts: { heading: 'Inter', body: 'Inter' } });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentShowId) return;
    const unsub = service.listenToDocument(`shows/${currentShowId}/brand/default`, (doc: any) => {
      if (doc?.data) setBrand({ ...(doc.data as BrandProfile) });
    }, (e: any) => {});
    return () => { if (unsub) unsub(); };
  }, [service, currentShowId]);

  const save = async () => {
    if (!currentShowId) return;
    setSaving(true);
    try {
      await service.setDocument(`shows/${currentShowId}/brand`, 'default', { ...brand, updatedAt: new Date().toISOString() } as any, { merge: true } as any);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Branding Studio</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Heading Font</label>
            <select className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-3 py-2 text-white" value={brand.fonts?.heading} onChange={e => setBrand(b => ({ ...b, fonts: { ...(b.fonts||{}), heading: e.target.value } }))}>
              <option>Inter</option><option>Roboto</option><option>Merriweather</option><option>Source Serif Pro</option><option>Poppins</option>
            </select>
          </div>
          <div>
            <label className="block mb-1">Body Font</label>
            <select className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-3 py-2 text-white" value={brand.fonts?.body} onChange={e => setBrand(b => ({ ...b, fonts: { ...(b.fonts||{}), body: e.target.value } }))}>
              <option>Inter</option><option>Roboto</option><option>Open Sans</option><option>Source Sans Pro</option><option>Lato</option>
            </select>
          </div>
          <div>
            <label className="block mb-1">Primary Color</label>
            <input type="color" value={brand.colors?.primary || '#0ea5e9'} onChange={e => setBrand(b => ({ ...b, colors: { ...(b.colors||{}), primary: e.target.value } }))} />
          </div>
          <div>
            <label className="block mb-1">Accent Color</label>
            <input type="color" value={brand.colors?.accent || '#22c55e'} onChange={e => setBrand(b => ({ ...b, colors: { ...(b.colors||{}), accent: e.target.value } }))} />
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1">Header Text</label>
            <input className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-3 py-2 text-white" value={brand.headerText || ''} onChange={e => setBrand(b => ({ ...b, headerText: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1">Footer Text</label>
            <input className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-3 py-2 text-white" value={brand.footerText || ''} onChange={e => setBrand(b => ({ ...b, footerText: e.target.value }))} />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="px-4 py-2 rounded bg-pb-primary text-white" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Brand'}</button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BrandingStudioPage;


