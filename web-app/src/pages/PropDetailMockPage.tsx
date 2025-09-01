import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../PropsBibleHomepage';
import { motion } from 'framer-motion';
import { MapPin, Ruler, BadgeInfo, FileText, Image as ImageIcon, Package, Settings2, ChevronDown, ChevronUp, Pencil } from 'lucide-react';

type SectionProps = { id: string; title: string; defaultOpen?: boolean; isOpen?: boolean; onToggle?: (open: boolean) => void; children: React.ReactNode };

function Section({ id, title, defaultOpen = true, isOpen, onToggle, children }: SectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = typeof isOpen === 'boolean' ? isOpen : internalOpen;
  const setOpen = (next: boolean) => { if (onToggle) onToggle(next); else setInternalOpen(next); };
  return (
    <section id={id} className="bg-pb-darker/40 rounded-lg border border-pb-primary/20">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="text-white font-semibold">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-pb-gray" /> : <ChevronDown className="w-4 h-4 text-pb-gray" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}

type SectionId = 'overview' | 'dimensions' | 'identification' | 'usage' | 'purchase' | 'storage' | 'media' | 'notes';

export default function PropDetailMockPage() {
  const prop = useMemo(() => ({
    name: 'Victorian Teacup', category: 'Decoration', status: 'available_in_storage', quantity: 3, location: '',
    description: 'Porcelain teacup with floral motif. Used in Act 2, Scene 3 (tea party). Handle fragile.\nFinish: semi-gloss.',
    dimensions: { length: 7.5, width: 7.5, height: 6.5, unit: 'cm', weight: 120, weightUnit: 'g' },
    identification: { manufacturer: 'Regal Ceramics', model: 'VT-1890', serialNumber: 'RC-VT-1890-042' },
    usage: { safetyNotes: 'Fragile; keep away from edges.', handlingInstructions: 'Carry with both hands.' },
    purchase: { source: 'bought', price: '£12.50', vendor: 'Antique Co.', purchaseDate: '2024-02-10' },
    storage: { requirements: 'Padded box', replacementCost: '£25' },
    images: [
      { id: '1', url: 'https://picsum.photos/seed/teacup1/600/400', caption: 'Front' },
      { id: '2', url: 'https://picsum.photos/seed/teacup2/600/400', caption: 'Side' },
      { id: '3', url: 'https://picsum.photos/seed/teacup3/600/400', caption: 'Detail' }
    ],
    lastUpdated: '2025-08-01 14:32'
  }), []);

  const mainImage = prop.images[0]?.url || '';
  const otherImages = prop.images.slice(1);

  const missingFields = useMemo(() => {
    const gaps: { label: string; section: SectionId }[] = [];
    if (!prop.location) gaps.push({ label: 'Location', section: 'overview' });
    return gaps;
  }, [prop]);
  const missingBySection = useMemo(() => missingFields.reduce<Record<string, number>>((m, f) => { m[f.section] = (m[f.section] || 0) + 1; return m; }, {}), [missingFields]);

  const [showGapsPanel, setShowGapsPanel] = useState(missingFields.length > 0);
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({ overview: true, dimensions: false, identification: false, usage: false, purchase: false, storage: false, media: false, notes: false });

  useEffect(() => {
    const hash = (window.location.hash || '').replace('#', '') as SectionId;
    if (hash && hash in openSections && !openSections[hash]) setOpenSections(prev => ({ ...prev, [hash]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNavClick = (section: SectionId) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); setOpenSections(prev => ({ ...prev, [section]: true }));
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try { window.history.replaceState(null, '', `#${section}`); } catch {}
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen w-full max-w-none p-6">
        <div className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-pb-darker/80 backdrop-blur-sm border-b border-pb-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md overflow-hidden bg-pb-gray flex items-center justify-center">
                {mainImage ? <img src={mainImage} alt={prop.name} className="object-cover w-full h-full" /> : <ImageIcon className="w-6 h-6 text-white/50" />}
              </div>
              <div>
                <div className="text-white font-bold">{prop.name}</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-pb-primary/30 text-white">{prop.category}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-pb-accent/30 text-white">Qty: {prop.quantity}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className="px-2 py-1 rounded-full text-xs bg-white/10 text-white flex items-center gap-1"><MapPin className="w-3 h-3 text-pb-primary" />{prop.location || 'No location'}</span>
              <span className="px-2 py-1 rounded-full text-xs bg-pb-success/30 text-white">{(prop.status || '').replaceAll('_', ' ')}</span>
              {missingFields.length > 0 && (
                <a href="#gaps" onClick={handleNavClick('overview')} className="px-3 py-1.5 rounded-md bg-pb-warning text-black text-sm hover:opacity-90">Complete details ({missingFields.length})</a>
              )}
              <button className="px-3 py-1.5 rounded-md bg-pb-primary text-white text-sm hover:bg-pb-accent flex items-center gap-1"><Pencil className="w-4 h-4" /> Edit</button>
            </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-6">
          <div className="sticky top-[56px] z-10 -mx-6 px-6 bg-pb-darker/80 backdrop-blur-sm border-b border-pb-primary/10">
            <nav className="flex flex-wrap gap-2 py-2 text-sm">
              <a href="#overview" onClick={handleNavClick('overview')} className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20">Overview{missingBySection['overview'] ? <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-pb-warning text-black">{missingBySection['overview']}</span> : null}</a>
              <a href="#dimensions" onClick={handleNavClick('dimensions')} className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20">Dimensions</a>
              <a href="#identification" onClick={handleNavClick('identification')} className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20">Identification</a>
              <a href="#usage" onClick={handleNavClick('usage')} className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20">Usage & Safety</a>
              <a href="#purchase" onClick={handleNavClick('purchase')} className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20">Purchase & Rental</a>
              <a href="#storage" onClick={handleNavClick('storage')} className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20">Storage</a>
              <a href="#media" onClick={handleNavClick('media')} className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20">Media</a>
              <a href="#notes" onClick={handleNavClick('notes')} className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20">Notes</a>
            </nav>
          </div>

          {showGapsPanel && missingFields.length > 0 && (
            <div id="gaps" className="rounded-lg border border-pb-warning bg-pb-warning/10 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Missing information</div>
                  <div className="text-sm text-white/80">Please complete the following:</div>
                </div>
                <button type="button" onClick={() => setShowGapsPanel(false)} className="text-white/80 hover:text-white text-sm">Dismiss</button>
              </div>
              <ul className="mt-2 list-disc pl-5 text-sm text-white/90">
                {missingFields.map((f, idx) => (
                  <li key={idx} className="mb-1">{f.label} — <a href={`#${f.section}`} onClick={handleNavClick(f.section)} className="underline text-black bg-pb-warning px-1 py-0.5 rounded">Go to section</a></li>
                ))}
              </ul>
            </div>
          )}

          <Section id="overview" title="Overview" defaultOpen isOpen={openSections.overview} onToggle={v => setOpenSections(s => ({ ...s, overview: v }))}>
            <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-4">
              <div className="w-full rounded-lg overflow-hidden bg-black/30 aspect-square flex items-center justify-center">
                {mainImage ? <img src={mainImage} alt={prop.name} className="object-cover w-full h-full" /> : <ImageIcon className="w-8 h-8 text-white/50" />}
              </div>
              <div>
                <div className="text-pb-gray mb-3 whitespace-pre-line">{prop.description}</div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-pb-primary" />
                  <input type="text" placeholder="Set location (mock)" className="flex-1 rounded-md bg-black/30 border border-white/10 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pb-primary" />
                  <button className="px-3 py-2 rounded-md bg-pb-primary text-white hover:bg-pb-accent">Save</button>
                </div>
                {otherImages.length > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {otherImages.map(img => (
                      <div key={img.id} className="w-16 h-16 rounded border border-pb-primary/30 overflow-hidden">
                        <img src={img.url} alt={img.caption} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section id="dimensions" title="Dimensions" defaultOpen={false} isOpen={openSections.dimensions} onToggle={v => setOpenSections(s => ({ ...s, dimensions: v }))}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2"><Ruler className="w-4 h-4 text-pb-primary" /><span className="text-white">Length:</span><span className="text-pb-gray">{prop.dimensions.length} {prop.dimensions.unit}</span></div>
              <div className="flex items-center gap-2"><Ruler className="w-4 h-4 text-pb-primary" /><span className="text-white">Width:</span><span className="text-pb-gray">{prop.dimensions.width} {prop.dimensions.unit}</span></div>
              <div className="flex items-center gap-2"><Ruler className="w-4 h-4 text-pb-primary" /><span className="text-white">Height:</span><span className="text-pb-gray">{prop.dimensions.height} {prop.dimensions.unit}</span></div>
              <div className="flex items-center gap-2"><Package className="w-4 h-4 text-pb-primary" /><span className="text-white">Weight:</span><span className="text-pb-gray">{prop.dimensions.weight} {prop.dimensions.weightUnit}</span></div>
            </div>
          </Section>

          <Section id="identification" title="Identification" defaultOpen={false} isOpen={openSections.identification} onToggle={v => setOpenSections(s => ({ ...s, identification: v }))}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2"><BadgeInfo className="w-4 h-4 text-pb-primary" /><span className="text-white">Manufacturer:</span><span className="text-pb-gray">{prop.identification.manufacturer}</span></div>
              <div className="flex items-center gap-2"><BadgeInfo className="w-4 h-4 text-pb-primary" /><span className="text-white">Model:</span><span className="text-pb-gray">{prop.identification.model}</span></div>
              <div className="flex items-center gap-2"><BadgeInfo className="w-4 h-4 text-pb-primary" /><span className="text-white">Serial #:</span><span className="text-pb-gray">{prop.identification.serialNumber}</span></div>
            </div>
          </Section>

          <Section id="usage" title="Usage & Safety" defaultOpen={false} isOpen={openSections.usage} onToggle={v => setOpenSections(s => ({ ...s, usage: v }))}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-2"><Settings2 className="w-4 h-4 text-pb-primary mt-1" /><div><div className="text-white">Handling</div><div className="text-pb-gray">{prop.usage.handlingInstructions}</div></div></div>
              <div className="flex items-start gap-2"><Settings2 className="w-4 h-4 text-pb-primary mt-1" /><div><div className="text-white">Safety</div><div className="text-pb-gray">{prop.usage.safetyNotes}</div></div></div>
            </div>
          </Section>

          <Section id="purchase" title="Purchase & Rental" defaultOpen={false} isOpen={openSections.purchase} onToggle={v => setOpenSections(s => ({ ...s, purchase: v }))}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-pb-primary" /><span className="text-white">Source:</span><span className="text-pb-gray">{prop.purchase.source}</span></div>
              <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-pb-primary" /><span className="text-white">Price:</span><span className="text-pb-gray">{prop.purchase.price}</span></div>
              <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-pb-primary" /><span className="text-white">Vendor:</span><span className="text-pb-gray">{prop.purchase.vendor}</span></div>
              <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-pb-primary" /><span className="text-white">Purchased:</span><span className="text-pb-gray">{prop.purchase.purchaseDate}</span></div>
            </div>
          </Section>

          <Section id="storage" title="Storage & Logistics" defaultOpen={false} isOpen={openSections.storage} onToggle={v => setOpenSections(s => ({ ...s, storage: v }))}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2"><Package className="w-4 h-4 text-pb-primary" /><span className="text-white">Requirements:</span><span className="text-pb-gray">{prop.storage.requirements}</span></div>
              <div className="flex items-center gap-2"><Package className="w-4 h-4 text-pb-primary" /><span className="text-white">Replacement Cost:</span><span className="text-pb-gray">{prop.storage.replacementCost}</span></div>
            </div>
          </Section>

          <Section id="media" title="Media" defaultOpen={false} isOpen={openSections.media} onToggle={v => setOpenSections(s => ({ ...s, media: v }))}>
            <div className="flex gap-2 flex-wrap">
              {prop.images.map(img => (
                <div key={img.id} className="w-24 h-24 rounded border border-pb-primary/30 overflow-hidden">
                  <img src={img.url} alt={img.caption} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </Section>

          <Section id="notes" title="Notes" defaultOpen={false} isOpen={openSections.notes} onToggle={v => setOpenSections(s => ({ ...s, notes: v }))}>
            <div className="text-pb-gray">Add production or scene notes here…</div>
          </Section>

          <div className="text-xs text-pb-gray">Last updated: {prop.lastUpdated}</div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}


