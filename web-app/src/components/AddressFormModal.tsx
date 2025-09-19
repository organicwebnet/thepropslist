import React, { useMemo, useState } from 'react';
import { AddressService, Address } from '../../shared/services/addressService';
import { useFirebase } from '../contexts/FirebaseContext';

type AddressFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (address: Address) => void;
  showId?: string | null;
  initial?: Partial<Address>;
  defaultType?: Address['type'];
  title?: string;
};

const required = (v?: string) => typeof v === 'string' && v.trim().length > 0;

const AddressFormModal: React.FC<AddressFormModalProps> = ({ open, onClose, onSaved, showId, initial, defaultType = 'other', title }) => {
  const { service } = useFirebase();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Address>>({
    name: initial?.name || '',
    company: initial?.company || '',
    recipient: initial?.recipient || '',
    contactName: initial?.contactName || '',
    line1: initial?.line1 || '',
    line2: initial?.line2 || '',
    city: initial?.city || '',
    region: initial?.region || '',
    postcode: initial?.postcode || '',
    country: initial?.country || '',
    phone: initial?.phone || '',
    type: initial?.type || defaultType,
  });

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!required(form.line1)) e.line1 = 'Address line 1 is required';
    if (!required(form.city)) e.city = 'City is required';
    if (!required(form.country) && !required(form.postcode)) {
      e.country = 'Country or Postcode is required';
    }
    if (form.phone && !/[0-9+()\-\s]{6,}/.test(form.phone)) e.phone = 'Invalid phone';
    return e;
  }, [form]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-white text-black rounded-lg shadow-xl w-[720px] max-w-[95vw] p-5 relative">
        <button className="absolute right-3 top-3 text-gray-600" onClick={onClose}>✕</button>
        <h2 className="text-xl font-bold mb-3">{title || 'New Address'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-semibold">Label</label>
            <input value={form.name || ''} onChange={e=>setForm(prev=>({ ...prev, name: e.target.value }))} className="input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30" placeholder="e.g. Theatre, Warehouse, Rehearsal" />
          </div>
          <div>
            <label className="text-xs font-semibold">Company</label>
            <input value={form.company || ''} onChange={e=>setForm(prev=>({ ...prev, company: e.target.value }))} className="input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold">Recipient</label>
            <input value={form.recipient || ''} onChange={e=>setForm(prev=>({ ...prev, recipient: e.target.value }))} className="input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold">Address line 1 *</label>
            <input value={form.line1 || ''} onChange={e=>setForm(prev=>({ ...prev, line1: e.target.value }))} className={`input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30 ${errors.line1 ? 'input-error' : ''}`} />
            {errors.line1 && <div className="text-xs text-red-600 mt-1">{errors.line1}</div>}
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold">Address line 2</label>
            <input value={form.line2 || ''} onChange={e=>setForm(prev=>({ ...prev, line2: e.target.value }))} className="input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold">City *</label>
            <input value={form.city || ''} onChange={e=>setForm(prev=>({ ...prev, city: e.target.value }))} className={`input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30 ${errors.city ? 'input-error' : ''}`} />
            {errors.city && <div className="text-xs text-red-600 mt-1">{errors.city}</div>}
          </div>
          <div>
            <label className="text-xs font-semibold">State/Province/Region</label>
            <input value={form.region || ''} onChange={e=>setForm(prev=>({ ...prev, region: e.target.value }))} className="input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold">ZIP/Postcode</label>
            <input value={form.postcode || ''} onChange={e=>setForm(prev=>({ ...prev, postcode: e.target.value }))} className="input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold">Country/Region</label>
            <input value={form.country || ''} onChange={e=>setForm(prev=>({ ...prev, country: e.target.value }))} className={`input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30 ${errors.country ? 'input-error' : ''}`} />
            {errors.country && <div className="text-xs text-red-600 mt-1">{errors.country}</div>}
          </div>
          <div>
            <label className="text-xs font-semibold">Phone</label>
            <input value={form.phone || ''} onChange={e=>setForm(prev=>({ ...prev, phone: e.target.value }))} className={`input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30 ${errors.phone ? 'input-error' : ''}`} />
            {errors.phone && <div className="text-xs text-red-600 mt-1">{errors.phone}</div>}
          </div>
          <div>
            <label className="text-xs font-semibold">Contact name</label>
            <input value={form.contactName || ''} onChange={e=>setForm(prev=>({ ...prev, contactName: e.target.value }))} className="input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold">Type</label>
            <select value={form.type || 'theatre'} onChange={e=>setForm(prev=>({ ...prev, type: e.target.value as Address['type'] }))} className="select select-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30">
              <option value="theatre">Theatre</option>
              <option value="rehearsal">Rehearsal space</option>
              <option value="workshop">Workshop</option>
              <option value="maker">Maker</option>
              <option value="supplier">Supplier</option>
              <option value="storage">Storage</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="px-3 py-2 rounded-lg bg-pb-primary text-white hover:bg-pb-accent transition disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={saving || Object.keys(errors).length > 0}
            onClick={async () => {
              if (Object.keys(errors).length > 0) return;
              setSaving(true);
              try {
                const svc = new AddressService(service);
                const id = await svc.createAddress({
                  ...(form as any),
                  showId: showId || undefined,
                  type: form.type || defaultType,
                });
                const saved = await svc.getAddress(id);
                if (saved) onSaved(saved);
                onClose();
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Saving…' : 'Save Address'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressFormModal;


