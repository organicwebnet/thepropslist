import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import { Prop } from '../types/props';
import { LoadingSpinner } from '../components/LoadingSkeleton';
import { MapPin, Ruler, BadgeInfo, FileText, Image as ImageIcon, Package, Settings2, ChevronDown, ChevronUp, Pencil, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import DashboardLayout from '../PropsBibleHomepage';

type SectionProps = { 
  id: string; 
  title: string; 
  defaultOpen?: boolean; 
  isOpen?: boolean; 
  onToggle?: (open: boolean) => void; 
  children: React.ReactNode;
  missingCount?: number;
};

function Section({ id, title, defaultOpen = true, isOpen, onToggle, children, missingCount }: SectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = typeof isOpen === 'boolean' ? isOpen : internalOpen;
  const setOpen = (next: boolean) => { if (onToggle) onToggle(next); else setInternalOpen(next); };
  
  return (
    <section id={id} className="bg-pb-darker/40 rounded-lg border border-pb-primary/20">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">{title}</span>
          {missingCount && missingCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-pb-warning text-black">
              {missingCount}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-pb-gray" /> : <ChevronDown className="w-4 h-4 text-pb-gray" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}

type SectionId = 'overview' | 'dimensions' | 'identification' | 'usage' | 'purchase' | 'storage' | 'media' | 'notes';

const PropDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { service } = useFirebase();
  const [prop, setProp] = useState<Prop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({ 
    overview: true, 
    dimensions: false, 
    identification: false, 
    usage: false, 
    purchase: false, 
    storage: false, 
    media: false, 
    notes: false 
  });

  useEffect(() => {
    if (!id || !service) return;

    const loadProp = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const doc = await service.getDocument('props', id);
        if (doc) {
          setProp({ ...doc.data, id: doc.id } as Prop);
        } else {
          setError('Prop not found');
        }
      } catch (err) {
        console.error('Error loading prop:', err);
        setError('Failed to load prop details');
      } finally {
        setLoading(false);
      }
    };

    loadProp();
  }, [id, service]);

  useEffect(() => {
    const hash = (window.location.hash || '').replace('#', '') as SectionId;
    if (hash && hash in openSections && !openSections[hash]) {
      setOpenSections(prev => ({ ...prev, [hash]: true }));
    }
  }, []);

  const handleNavClick = (section: SectionId) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setOpenSections(prev => ({ ...prev, [section]: true }));
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try { 
      window.history.replaceState(null, '', `#${section}`); 
    } catch (error) {
      console.warn('Failed to update history state:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-pb-darker/80 to-pb-primary/30 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-pb-light text-lg mt-4">Loading prop details...</p>
        </div>
      </div>
    );
  }

  if (error || !prop) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-pb-darker/80 to-pb-primary/30 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-pb-gray mb-6">{error || 'Prop not found'}</p>
          <Link 
            to="/props" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-pb-primary text-white rounded-lg hover:bg-pb-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Props List
          </Link>
        </div>
      </div>
    );
  }

  const mainImage = prop.images?.find(img => img.isMain)?.url || 
                   prop.images?.[0]?.url || 
                   prop.imageUrl || '';
  const otherImages = prop.images?.filter(img => img.url !== mainImage) || [];

  const missingFields = [];
  if (!prop.location && !prop.currentLocation) missingFields.push({ label: 'Location', section: 'overview' as SectionId });
  if (!prop.status) missingFields.push({ label: 'Status', section: 'overview' as SectionId });
  if (!prop.act) missingFields.push({ label: 'Act', section: 'overview' as SectionId });
  if (!prop.sceneName && !prop.scene) missingFields.push({ label: 'Scene', section: 'overview' as SectionId });
  if (!prop.images || prop.images.length === 0) missingFields.push({ label: 'Images', section: 'media' as SectionId });

  const missingBySection = missingFields.reduce<Record<string, number>>((m, f) => { 
    m[f.section] = (m[f.section] || 0) + 1; 
    return m; 
  }, {});

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen w-full max-w-none p-6">
      <div className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-pb-darker/80 backdrop-blur-sm border-b border-pb-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/props" 
              className="flex items-center gap-2 text-pb-gray hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Props
            </Link>
            <div className="w-12 h-12 rounded-md overflow-hidden bg-pb-gray flex items-center justify-center">
              {mainImage ? (
                <img src={mainImage} alt={prop.name} className="object-cover w-full h-full" />
              ) : (
                <ImageIcon className="w-6 h-6 text-white/50" />
              )}
            </div>
            <div>
              <div className="text-white font-bold">{prop.name}</div>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-full text-xs bg-pb-primary/30 text-white">
                  {prop.category}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-pb-accent/30 text-white">
                  Qty: {prop.quantity}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="px-2 py-1 rounded-full text-xs bg-white/10 text-white flex items-center gap-1">
              <MapPin className="w-3 h-3 text-pb-primary" />
              {prop.location || prop.currentLocation || 'No location'}
            </span>
            <span className="px-2 py-1 rounded-full text-xs bg-pb-success/30 text-white">
              {prop.status?.replace(/_/g, ' ') || 'No status'}
            </span>
            {missingFields.length > 0 && (
              <a 
                href="#gaps" 
                onClick={handleNavClick('overview')} 
                className="px-3 py-1.5 rounded-md bg-pb-warning text-black text-sm hover:opacity-90"
              >
                Complete details ({missingFields.length})
              </a>
            )}
            <Link 
              to={`/props/${prop.id}/edit`}
              className="px-3 py-1.5 rounded-md bg-pb-primary text-white text-sm hover:bg-pb-accent flex items-center gap-1"
            >
              <Pencil className="w-4 h-4" /> Edit
            </Link>
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 12 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.25 }} 
        className="space-y-6"
      >
        <div className="sticky top-[56px] z-10 -mx-6 px-6 bg-pb-darker/80 backdrop-blur-sm border-b border-pb-primary/10">
          <nav className="flex flex-wrap gap-2 py-2 text-sm">
            <a 
              href="#overview" 
              onClick={handleNavClick('overview')} 
              className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              Overview{missingBySection['overview'] ? <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-pb-warning text-black">{missingBySection['overview']}</span> : null}
            </a>
            <a href="#dimensions" onClick={handleNavClick('dimensions')} className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20">Dimensions</a>
            <a href="#identification" onClick={handleNavClick('identification')} className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20">Identification</a>
            <a href="#usage" onClick={handleNavClick('usage')} className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20">Usage & Safety</a>
            <a href="#purchase" onClick={handleNavClick('purchase')} className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20">Purchase & Rental</a>
            <a href="#storage" onClick={handleNavClick('storage')} className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20">Storage</a>
            <a href="#media" onClick={handleNavClick('media')} className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20">Media</a>
            <a href="#notes" onClick={handleNavClick('notes')} className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20">Notes</a>
          </nav>
        </div>

        {missingFields.length > 0 && (
          <div id="gaps" className="rounded-lg border border-pb-warning bg-pb-warning/10 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Missing information</div>
                <div className="text-sm text-white/80">Please complete the following:</div>
              </div>
            </div>
            <ul className="mt-2 list-disc pl-5 text-sm text-white/90">
              {missingFields.map((f, idx) => (
                <li key={idx} className="mb-1">
                  {f.label} — <a href={`#${f.section}`} onClick={handleNavClick(f.section)} className="underline text-black bg-pb-warning px-1 py-0.5 rounded">Go to section</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Section 
          id="overview" 
          title="Overview" 
          defaultOpen 
          isOpen={openSections.overview} 
          onToggle={v => setOpenSections(s => ({ ...s, overview: v }))}
          missingCount={missingBySection['overview']}
        >
          <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-4">
            <div className="w-full rounded-lg overflow-hidden bg-black/30 aspect-square flex items-center justify-center">
              {mainImage ? (
                <img src={mainImage} alt={prop.name} className="object-cover w-full h-full" />
              ) : (
                <ImageIcon className="w-8 h-8 text-white/50" />
              )}
            </div>
            <div>
              <div className="text-pb-gray mb-3 whitespace-pre-line">{prop.description}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-pb-primary" />
                  <span className="text-white">Location:</span>
                  <span className="text-pb-gray">{prop.location || prop.currentLocation || 'Not set'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeInfo className="w-4 h-4 text-pb-primary" />
                  <span className="text-white">Status:</span>
                  <span className="text-pb-gray">{prop.status || 'Not set'}</span>
                </div>
                {prop.act && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-pb-primary" />
                    <span className="text-white">Act:</span>
                    <span className="text-pb-gray">{prop.act}</span>
                  </div>
                )}
                {(prop.scene || prop.sceneName) && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-pb-primary" />
                    <span className="text-white">Scene:</span>
                    <span className="text-pb-gray">{prop.sceneName || prop.scene}</span>
                  </div>
                )}
              </div>
              {otherImages.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {otherImages.map(img => (
                    <div key={img.id} className="w-16 h-16 rounded border border-pb-primary/30 overflow-hidden">
                      <img src={img.url} alt={img.caption || 'Prop image'} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section 
          id="dimensions" 
          title="Dimensions" 
          defaultOpen={false} 
          isOpen={openSections.dimensions} 
          onToggle={v => setOpenSections(s => ({ ...s, dimensions: v }))}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {prop.length && (
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-pb-primary" />
                <span className="text-white">Length:</span>
                <span className="text-pb-gray">{prop.length} {prop.unit || 'cm'}</span>
              </div>
            )}
            {prop.width && (
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-pb-primary" />
                <span className="text-white">Width:</span>
                <span className="text-pb-gray">{prop.width} {prop.unit || 'cm'}</span>
              </div>
            )}
            {prop.height && (
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-pb-primary" />
                <span className="text-white">Height:</span>
                <span className="text-pb-gray">{prop.height} {prop.unit || 'cm'}</span>
              </div>
            )}
            {prop.weight && (
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-pb-primary" />
                <span className="text-white">Weight:</span>
                <span className="text-pb-gray">{prop.weight} {prop.weightUnit || 'kg'}</span>
              </div>
            )}
          </div>
        </Section>

        <Section 
          id="usage" 
          title="Usage & Safety" 
          defaultOpen={false} 
          isOpen={openSections.usage} 
          onToggle={v => setOpenSections(s => ({ ...s, usage: v }))}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {prop.handlingInstructions && (
              <div className="flex items-start gap-2">
                <Settings2 className="w-4 h-4 text-pb-primary mt-1" />
                <div>
                  <div className="text-white">Handling</div>
                  <div className="text-pb-gray">{prop.handlingInstructions}</div>
                </div>
              </div>
            )}
            {prop.safetyNotes && (
              <div className="flex items-start gap-2">
                <Settings2 className="w-4 h-4 text-pb-primary mt-1" />
                <div>
                  <div className="text-white">Safety</div>
                  <div className="text-pb-gray">{prop.safetyNotes}</div>
                </div>
              </div>
            )}
            {prop.usageInstructions && (
              <div className="flex items-start gap-2">
                <Settings2 className="w-4 h-4 text-pb-primary mt-1" />
                <div>
                  <div className="text-white">Usage Instructions</div>
                  <div className="text-pb-gray">{prop.usageInstructions}</div>
                </div>
              </div>
            )}
          </div>
        </Section>

        <Section 
          id="purchase" 
          title="Purchase & Rental" 
          defaultOpen={false} 
          isOpen={openSections.purchase} 
          onToggle={v => setOpenSections(s => ({ ...s, purchase: v }))}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-pb-primary" />
              <span className="text-white">Source:</span>
              <span className="text-pb-gray">{prop.source}</span>
            </div>
            {prop.price && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-pb-primary" />
                <span className="text-white">Price:</span>
                <span className="text-pb-gray">£{prop.price}</span>
              </div>
            )}
            {prop.sourceDetails && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-pb-primary" />
                <span className="text-white">Details:</span>
                <span className="text-pb-gray">{prop.sourceDetails}</span>
              </div>
            )}
            {prop.rentalDueDate && (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-pb-primary" />
                <span className="text-white">Rental Due:</span>
                <span className="text-pb-gray">{new Date(prop.rentalDueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </Section>

        <Section 
          id="storage" 
          title="Storage & Logistics" 
          defaultOpen={false} 
          isOpen={openSections.storage} 
          onToggle={v => setOpenSections(s => ({ ...s, storage: v }))}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {prop.hasOwnShippingCrate && (
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-pb-primary" />
                <span className="text-white">Has Shipping Crate:</span>
                <span className="text-pb-gray">Yes</span>
              </div>
            )}
            {prop.shippingCrateDetails && (
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-pb-primary" />
                <span className="text-white">Crate Details:</span>
                <span className="text-pb-gray">{prop.shippingCrateDetails}</span>
              </div>
            )}
            {prop.requiresSpecialTransport && (
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-pb-primary" />
                <span className="text-white">Special Transport:</span>
                <span className="text-pb-gray">Yes</span>
              </div>
            )}
            {prop.transportMethod && (
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-pb-primary" />
                <span className="text-white">Transport Method:</span>
                <span className="text-pb-gray">{prop.transportMethod}</span>
              </div>
            )}
          </div>
        </Section>

        <Section 
          id="media" 
          title="Media" 
          defaultOpen={false} 
          isOpen={openSections.media} 
          onToggle={v => setOpenSections(s => ({ ...s, media: v }))}
          missingCount={missingBySection['media']}
        >
          {prop.images && prop.images.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {prop.images.map(img => (
                <div key={img.id} className="w-24 h-24 rounded border border-pb-primary/30 overflow-hidden">
                  <img src={img.url} alt={img.caption || 'Prop image'} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-pb-gray">No images uploaded</div>
          )}
        </Section>

        <Section 
          id="notes" 
          title="Notes" 
          defaultOpen={false} 
          isOpen={openSections.notes} 
          onToggle={v => setOpenSections(s => ({ ...s, notes: v }))}
        >
          <div className="text-pb-gray">
            {prop.notes || 'No notes added'}
          </div>
          {prop.maintenanceNotes && (
            <div className="mt-3">
              <div className="text-white font-semibold mb-2">Maintenance Notes:</div>
              <div className="text-pb-gray">{prop.maintenanceNotes}</div>
            </div>
          )}
        </Section>
      </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default PropDetailPage;