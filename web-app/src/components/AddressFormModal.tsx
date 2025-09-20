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
    <div 
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="address-modal-title"
    >
      <div className="bg-white text-black rounded-lg shadow-xl w-[720px] max-w-[95vw] p-5 relative">
        <button 
          className="absolute right-3 top-3 text-gray-600" 
          onClick={onClose}
          aria-label="Close address form"
        >
          ✕
        </button>
        <h2 id="address-modal-title" className="text-xl font-bold mb-3">{title || 'New Address'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="col-span-2">
            <label htmlFor="address-label" className="text-xs font-semibold">Label</label>
            <input 
              id="address-label"
              value={form.name || ''} 
              onChange={e=>setForm(prev=>({ ...prev, name: e.target.value }))} 
              className="input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30" 
              placeholder="e.g. Theatre, Warehouse, Rehearsal"
              aria-describedby="address-label-help"
            />
          </div>
          <div>
            <label htmlFor="address-company" className="text-xs font-semibold">Company</label>
            <input 
              id="address-company"
              value={form.company || ''} 
              onChange={e=>setForm(prev=>({ ...prev, company: e.target.value }))} 
              className="input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30" 
            />
          </div>
          <div>
            <label htmlFor="address-recipient" className="text-xs font-semibold">Recipient</label>
            <input 
              id="address-recipient"
              value={form.recipient || ''} 
              onChange={e=>setForm(prev=>({ ...prev, recipient: e.target.value }))} 
              className="input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30" 
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="address-line1" className="text-xs font-semibold">Address line 1 *</label>
            <input 
              id="address-line1"
              value={form.line1 || ''} 
              onChange={e=>setForm(prev=>({ ...prev, line1: e.target.value }))} 
              className={`input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30 ${errors.line1 ? 'input-error' : ''}`}
              aria-invalid={!!errors.line1}
              aria-describedby={errors.line1 ? 'address-line1-error' : undefined}
            />
            {errors.line1 && <div id="address-line1-error" className="text-xs text-red-600 mt-1" role="alert">{errors.line1}</div>}
          </div>
          <div className="col-span-2">
            <label htmlFor="address-line2" className="text-xs font-semibold">Address line 2</label>
            <input 
              id="address-line2"
              value={form.line2 || ''} 
              onChange={e=>setForm(prev=>({ ...prev, line2: e.target.value }))} 
              className="input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30" 
            />
          </div>
          <div>
            <label htmlFor="address-city" className="text-xs font-semibold">City *</label>
            <input 
              id="address-city"
              value={form.city || ''} 
              onChange={e=>setForm(prev=>({ ...prev, city: e.target.value }))} 
              className={`input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30 ${errors.city ? 'input-error' : ''}`}
              aria-invalid={!!errors.city}
              aria-describedby={errors.city ? 'address-city-error' : undefined}
            />
            {errors.city && <div id="address-city-error" className="text-xs text-red-600 mt-1" role="alert">{errors.city}</div>}
          </div>
          <div>
            <label htmlFor="address-region" className="text-xs font-semibold">State/Province/Region</label>
            <input 
              id="address-region"
              value={form.region || ''} 
              onChange={e=>setForm(prev=>({ ...prev, region: e.target.value }))} 
              className="input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30" 
            />
          </div>
          <div>
            <label htmlFor="address-postcode" className="text-xs font-semibold">ZIP/Postcode</label>
            <input 
              id="address-postcode"
              value={form.postcode || ''} 
              onChange={e=>setForm(prev=>({ ...prev, postcode: e.target.value }))} 
              className="input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30" 
            />
          </div>
          <div>
            <label htmlFor="address-country" className="text-xs font-semibold">Country/Region</label>
            <input 
              id="address-country"
              value={form.country || ''} 
              onChange={e=>setForm(prev=>({ ...prev, country: e.target.value }))} 
              className={`input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30 ${errors.country ? 'input-error' : ''}`}
              aria-invalid={!!errors.country}
              aria-describedby={errors.country ? 'address-country-error' : undefined}
            />
            {errors.country && <div id="address-country-error" className="text-xs text-red-600 mt-1" role="alert">{errors.country}</div>}
          </div>
          <div>
            <label htmlFor="address-phone" className="text-xs font-semibold">Phone</label>
            <input 
              id="address-phone"
              value={form.phone || ''} 
              onChange={e=>setForm(prev=>({ ...prev, phone: e.target.value }))} 
              className={`input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30 ${errors.phone ? 'input-error' : ''}`}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'address-phone-error' : undefined}
            />
            {errors.phone && <div id="address-phone-error" className="text-xs text-red-600 mt-1" role="alert">{errors.phone}</div>}
          </div>
          <div>
            <label htmlFor="address-contact" className="text-xs font-semibold">Contact name</label>
            <input 
              id="address-contact"
              value={form.contactName || ''} 
              onChange={e=>setForm(prev=>({ ...prev, contactName: e.target.value }))} 
              className="input input-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30" 
            />
          </div>
          <div>
            <label htmlFor="address-type" className="text-xs font-semibold">Type</label>
            <select 
              id="address-type"
              value={form.type || 'theatre'} 
              onChange={e=>setForm(prev=>({ ...prev, type: e.target.value as Address['type'] }))} 
              className="select select-bordered w-full bg-white text-black border border-pb-primary/40 focus:border-pb-primary focus:ring-2 focus:ring-pb-primary/30"
            >
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
            aria-label="Cancel address form"
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
            aria-label={saving ? 'Saving address' : 'Save address'}
          >
            {saving ? 'Saving…' : 'Save Address'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressFormModal;


