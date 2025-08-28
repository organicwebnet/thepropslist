import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFirebase } from '../contexts/FirebaseContext';
import DashboardLayout from '../PropsBibleHomepage';
import { motion } from 'framer-motion';
import { Prop } from '../../shared/types/props';
import { ArrowLeft, Pencil, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, MapPin, Info, Hash, BadgeInfo, Package, FileText } from 'lucide-react';
import MaintenanceInlineForm from '../components/MaintenanceInlineForm';

function formatDate(value: any): string {
  if (!value) return 'N/A';
  if (typeof value === 'object' && value.seconds) {
    try {
      if (typeof value.toDate === 'function') {
        return value.toDate().toLocaleString();
      }
      return new Date(value.seconds * 1000).toLocaleString();
    } catch {
      return JSON.stringify(value);
    }
  }
  if (typeof value === 'string') return value;
  return String(value);
}

const PropDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { service: firebaseService } = useFirebase();
  const [linkedCards, setLinkedCards] = useState<{ id: string; title: string; boardId: string }[]>([]);
  const [prop, setProp] = useState<Prop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  // Top-level tabs removed in favor of anchor-based sticky nav (mock behavior)
  const [showName, setShowName] = useState<string>('');
  const [showLocationPrompt, setShowLocationPrompt] = useState<boolean>(false);
  const [locationInput, setLocationInput] = useState<string>('');
  const [locationSaving, setLocationSaving] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const gaps = React.useMemo(() => {
    const items: { label: string; section: 'overview' | 'usage' | 'purchase' | 'storage' | 'media' | 'notes' }[] = [];
    if (!prop?.location && !prop?.currentLocation) items.push({ label: 'Location', section: 'overview' });
    if (!prop?.status) items.push({ label: 'Status', section: 'overview' });
    if (prop?.status && !prop?.statusNotes) items.push({ label: 'Status Notes', section: 'overview' });
    if (!prop?.act) items.push({ label: 'Act', section: 'overview' });
    if (!prop?.sceneName && !prop?.scene) items.push({ label: 'Scene', section: 'overview' });
    if (!prop?.images || prop.images.length === 0) items.push({ label: 'Main image', section: 'overview' });
    if (!prop?.assignment?.type && typeof prop?.location === 'string' && /box|container/i.test(prop.location)) {
      items.push({ label: 'Location may be outdated (removed from container)', section: 'overview' });
    }
    return items;
  }, [prop?.location, prop?.currentLocation, prop?.status, prop?.statusNotes, prop?.act, prop?.sceneName, prop?.scene, prop?.images, prop?.assignment?.type]);
  const [showGapsPanel, setShowGapsPanel] = useState(false);
  useEffect(() => { setShowGapsPanel(gaps.length > 0); }, [gaps.length]);
  const missingLabelSet = React.useMemo(() => new Set(gaps.map(g => g.label)), [gaps]);
  // Collapsible section state (to mirror mock UX inside Overview)
  type SectionId = 'summary' | 'dimensions' | 'identification' | 'usage' | 'purchase' | 'storage' | 'media' | 'notes' | 'maintenance';
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    summary: true,
    dimensions: false,
    identification: false,
    usage: false,
    purchase: false,
    storage: false,
    media: false,
    notes: false,
    maintenance: false,
  });
  // Note: overview subnav removed; sections toggle via headers

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const fetchLinked = async (propName?: string) => {
      try {
        const boards = await firebaseService.getDocuments<any>('todo_boards');
        const results: { id: string; title: string; boardId: string }[] = [];
        const namePattern = propName ? new RegExp(`(^|\\s)@${escapeRegex(propName)}(\\s|$)`, 'i') : null;
        for (const b of boards) {
          const lists = await firebaseService.getDocuments<any>(`todo_boards/${b.id}/lists`);
          for (const l of lists) {
            const cards = await firebaseService.getDocuments<any>(`todo_boards/${b.id}/lists/${l.id}/cards`);
            cards.forEach(c => {
              const data = c.data || {};
              const t = String(data.title || '');
              const d = String(data.description || '');
              const byId = new RegExp(`\\(prop:${id}\\)`);
              const byName = namePattern ? (namePattern.test(t) || namePattern.test(d)) : false;
              if (byId || byName) {
                if (byId.test(t) || byId.test(d) || byName) {
                  results.push({ id: c.id, title: data.title || 'Untitled Card', boardId: b.id });
                }
              }
            });
          }
        }
        setLinkedCards(results);
      } catch {
        setLinkedCards([]);
      }
    };

    firebaseService.getDocument('props', id)
      .then(doc => {
        const data = (doc?.data as Prop) || null;
        setProp(data);
        setLoading(false);
        fetchLinked(data?.name);
      })
      .catch(() => {
        setError('Failed to load prop.');
        setLoading(false);
        fetchLinked();
      });
  }, [id, firebaseService]);

  // Load Show title for display
  useEffect(() => {
    const loadShow = async () => {
      const sid = prop?.showId;
      if (!sid) { setShowName(''); return; }
      try {
        const showDoc = await firebaseService.getDocument<any>('shows', String(sid));
        setShowName(showDoc?.data?.name || '');
      } catch {
        setShowName('');
      }
    };
    loadShow();
  }, [prop?.showId, firebaseService]);

  const mainImage = prop?.images?.find(img => img.isMain)?.url || prop?.images?.[0]?.url || prop?.imageUrl || '';

  const galleryImages = React.useMemo(() => {
    const imgs = (prop?.images || [])
      .filter(img => !!img && !!img.url)
      .map(img => ({ url: img.url, caption: (img as any).caption || '', id: (img as any).id, isMain: (img as any).isMain }));
    if (prop?.imageUrl && !imgs.some(i => i.url === prop.imageUrl)) {
      imgs.unshift({ url: prop.imageUrl, caption: prop?.name || '', id: 'primary' } as any);
    }
    const mainIdx = imgs.findIndex(i => (i as any).isMain);
    if (mainIdx > 0) {
      const [m] = imgs.splice(mainIdx, 1);
      imgs.unshift(m);
    }
    return imgs;
  }, [prop?.images, prop?.imageUrl, prop?.name]);

  // Collect video URLs from multiple sources (pre-show, videos[], digitalAssets)
  const videoUrls = React.useMemo(() => {
    const urls: string[] = [];
    const add = (u?: string) => { if (u && typeof u === 'string' && u.trim()) urls.push(u.trim()); };
    add((prop as any)?.preShowSetupVideo);
    if (Array.isArray((prop as any)?.videos)) {
      (prop as any).videos.forEach((v: any) => add(v?.url || v));
    }
    if (Array.isArray((prop as any)?.digitalAssets)) {
      (prop as any).digitalAssets.filter((a: any) => (a?.type || '').toLowerCase() === 'video').forEach((a: any) => add(a?.url));
    }
    return Array.from(new Set(urls));
  }, [prop?.preShowSetupVideo, (prop as any)?.videos, (prop as any)?.digitalAssets]);

  // Auto-open Usage & Safety section if we have videos to show
  React.useEffect(() => {
    if (videoUrls.length > 0) {
      setOpenSections(s => s.usage ? s : { ...s, usage: true });
    }
  }, [videoUrls.length]);

  // Filmstrip of other images was removed to match mock; keep only main image and lightbox

  const openLightboxAt = (index: number) => {
    if (!galleryImages.length) return;
    setLightboxIndex(Math.max(0, Math.min(index, galleryImages.length - 1)));
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);
  const showPrev = () => setLightboxIndex(i => (i - 1 + galleryImages.length) % galleryImages.length);
  const showNext = () => setLightboxIndex(i => (i + 1) % galleryImages.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartXRef.current = t.clientX;
    touchStartYRef.current = t.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    if (startX == null || startY == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) {
        showNext();
      } else {
        showPrev();
      }
    }
  };

  React.useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen, galleryImages.length]);

  // Keep lightboxIndex in range if images array changes while open
  useEffect(() => {
    if (!lightboxOpen) return;
    if (galleryImages.length === 0) return;
    if (lightboxIndex < 0 || lightboxIndex >= galleryImages.length) {
      setLightboxIndex(Math.max(0, Math.min(lightboxIndex, galleryImages.length - 1)));
    }
  }, [lightboxOpen, galleryImages.length, lightboxIndex]);

  // Initialize location prompt and input when prop loads
  useEffect(() => {
    const current = (prop?.location || prop?.currentLocation || '') as string;
    setLocationInput(current);
    setShowLocationPrompt(!current);
  }, [prop?.location, prop?.currentLocation]);

  const saveLocation = async () => {
    if (!id) return;
    const value = (locationInput || '').trim();
    setLocationSaving(true);
    setLocationError(null);
    try {
      await firebaseService.updateDocument('props', id, { location: value });
      setProp(prev => prev ? { ...prev, location: value } : prev);
      setShowLocationPrompt(false);
    } catch (e) {
      setLocationError('Failed to save location. Please try again.');
    } finally {
      setLocationSaving(false);
    }
  };

  const handleEdit = () => {
    if (id) navigate(`/props/${id}/edit`);
  };

  // Helper: embed video players for known providers or direct files
  function renderEmbeddedVideo(url?: string) {
    if (!url) return null;
    const trimmed = String(url).trim();
    if (!trimmed) return null;
    // Google Drive (file links) → use preview iframe
    if (/drive\.google\.com\//i.test(trimmed)) {
      let fileId: string | null = null;
      const byPath = trimmed.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/i);
      const byQuery = trimmed.match(/[?&]id=([A-Za-z0-9_-]+)/i);
      if (byPath && byPath[1]) fileId = byPath[1];
      else if (byQuery && byQuery[1]) fileId = byQuery[1];
      if (fileId) {
        const src = `https://drive.google.com/file/d/${fileId}/preview`;
        return (
          <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden border border-white/10">
            <iframe
              src={src}
              title="Google Drive video"
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          </div>
        );
      }
    }
    const youTubeMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
    if (youTubeMatch) {
      const vid = youTubeMatch[1];
      const src = `https://www.youtube.com/embed/${vid}`;
      return (
        <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden border border-white/10">
          <iframe
            src={src}
            title="YouTube video player"
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (vimeoMatch) {
      const vid = vimeoMatch[1];
      const src = `https://player.vimeo.com/video/${vid}`;
      return (
        <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden border border-white/10">
          <iframe
            src={src}
            title="Vimeo video player"
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(trimmed)) {
      return (
        <video controls className="w-full rounded-lg border border-white/10">
          <source src={trimmed} />
        </video>
      );
    }
    // Unknown provider: show link fallback
    return (
      <a href={trimmed} target="_blank" rel="noopener noreferrer" className="text-pb-accent underline">
        Open video
      </a>
    );
  }

  function getDisplayUrl(u?: string): string {
    if (!u) return '';
    const s = String(u).trim();
    try {
      const parsed = new URL(s);
      const compact = `${parsed.hostname}${parsed.pathname}`;
      return compact.length > 48 ? `${compact.slice(0, 48)}…` : compact;
    } catch {
      return s.length > 48 ? `${s.slice(0, 48)}…` : s;
    }
  }

  const renderField = (label: string, value: any, isDate = false, IconComp?: React.ComponentType<{ className?: string }>, focusKey?: string) => {
    const missingValue = (!value && value !== 0) || (typeof value === 'string' && value.trim() === '');
    const missing = missingValue || missingLabelSet.has(label);
    const labelToFocusKey: Record<string, string> = {
      'Location': 'location',
      'Status': 'status',
      'Status Notes': 'statusNotes',
      'Act': 'act',
      'Scene': 'sceneName',
      'Last Status Update': 'status',
    };
    const goEdit = (key?: string) => {
      if (!key || !id) return;
      navigate(`/props/${id}/edit?focus=${encodeURIComponent(key)}`);
    };
    const effectiveKey = focusKey || (missing ? labelToFocusKey[label] : undefined);
    const content = (
      <>
        {IconComp ? <IconComp className={`w-4 h-4 mt-0.5 ${missing ? 'text-pb-warning' : 'text-pb-primary'}`} /> : null}
        <div>
          <span className={`font-semibold ${missing ? 'text-pb-warning' : 'text-pb-primary'}`}>{label}:</span>{' '}
          <span className={`${missing ? 'text-pb-warning' : 'text-white'}`}>{isDate ? formatDate(value) : (value ?? 'N/A')}</span>
    </div>
      </>
    );
    if (missing && effectiveKey) {
      return (
        <button
          type="button"
          className={`mb-2 flex items-start gap-2 w-full text-left bg-pb-warning/10 rounded px-2 py-1 -mx-1 hover:bg-pb-warning/20`}
          onClick={() => { console.debug('[PropDetail] click missing field → edit', { label, effectiveKey, id }); goEdit(effectiveKey); }}
        >
          {content}
        </button>
      );
    }
    return (
      <div className={`mb-2 flex items-start gap-2 ${missing ? 'bg-pb-warning/10 rounded px-2 py-1 -mx-1' : ''}`}>{content}</div>
    );
  };

  // Anchor navigation to sections: open the target section and smooth scroll
  const handleNavClick = (target: 'overview' | 'dimensions' | 'identification' | 'usage' | 'purchase' | 'storage' | 'media' | 'notes' | 'maintenance') => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setOpenSections(prev => ({
      ...prev,
      ...(target === 'dimensions' ? { dimensions: true } : {}),
      ...(target === 'identification' ? { identification: true } : {}),
      ...(target === 'usage' ? { usage: true } : {}),
      ...(target === 'purchase' ? { purchase: true } : {}),
      ...(target === 'storage' ? { storage: true } : {}),
      ...(target === 'media' ? { media: true } : {}),
      ...(target === 'notes' ? { notes: true } : {}),
    }));
    const id = target === 'overview' ? 'overview' : `ov-${target}`;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try { window.history.replaceState(null, '', `#${target}`); } catch {}
  };

  // Collapsible Section UI (local component)
  const Section: React.FC<{ id: string; title: string; open: boolean; onToggle: () => void; children: React.ReactNode }>
    = ({ id, title, open, onToggle, children }) => (
    <section id={id} className="bg-pb-darker/40 rounded-lg border border-pb-primary/20 scroll-mt-[120px]">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="text-white font-semibold">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-pb-gray" /> : <ChevronDown className="w-4 h-4 text-pb-gray" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );

  // Guarded early returns after all hooks to satisfy hook order and TS narrowing
  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center text-pb-primary py-16">Loading prop...</div>
      </DashboardLayout>
    );
  }
  if (error || !prop) {
    return (
      <DashboardLayout>
        <div className="text-center text-red-500 py-16">{error || 'Prop not found.'}</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen w-full max-w-none p-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-pb-primary hover:text-pb-accent">
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-0 relative">
          {/* Sticky summary header (like mock) */}
          <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-pb-darker/80 backdrop-blur-sm border-b border-pb-primary/20">
            <div className="mx-auto max-w-6xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-md overflow-hidden bg-pb-gray flex items-center justify-center">
                  {mainImage ? (
                    <img src={mainImage} alt={prop.name} className="object-cover w-full h-full" />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" className="text-white/50"><circle cx="12" cy="12" r="10" fill="currentColor" /></svg>
                  )}
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">{prop.name}</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-pb-primary/30 text-white">{prop.category}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-pb-accent/30 text-white">Qty: {prop.quantity}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="px-2 py-1 rounded-full text-xs bg-white/10 text-white flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-pb-primary" />
                  {prop.location || prop.currentLocation || 'No location'}
                </span>
                <span className="px-2 py-1 rounded-full text-xs bg-pb-success/30 text-white">{(prop.status || '').toString().replaceAll('_', ' ')}</span>
                {gaps.length > 0 && (
          <button
                    type="button"
                    onClick={() => navigate(`/props/${id}/edit`)}
                    className="px-3 py-1.5 rounded-md bg-pb-warning text-black text-sm hover:opacity-90"
                  >
                    Complete details ({gaps.length})
          </button>
                )}
                {gaps.length > 0 && (
                  <span className="hidden">{/* reserved for a11y */}{gaps.length}</span>
                )}
                <button onClick={handleEdit} className="px-3 py-1.5 rounded-md bg-pb-primary text-white text-sm hover:bg-pb-accent flex items-center gap-1"><Pencil className="w-4 h-4" /> Edit</button>
              </div>
            </div>
          </div>
          {/* Pill nav (mock-style) sticky directly under header, 1px spacer */}
          <div className="sticky top-[56px] z-10 -mx-6 px-6 py-[1px] mb-6 bg-pb-darker/80 backdrop-blur-sm border-b border-pb-primary/10" style={{ marginBottom: '24px' }}>
            <div className="mx-auto max-w-6xl">
              <nav className="flex items-center flex-wrap gap-3 py-2 text-sm">
                <a href="#overview" onClick={handleNavClick('overview')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">Overview{(!prop.location && !prop.currentLocation) ? <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] rounded-full bg-pb-warning text-black">1</span> : null}</a>
                <a href="#dimensions" onClick={handleNavClick('dimensions')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">Dimensions</a>
                <a href="#identification" onClick={handleNavClick('identification')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">Identification</a>
                <a href="#usage" onClick={handleNavClick('usage')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">Usage & Safety</a>
                <a href="#purchase" onClick={handleNavClick('purchase')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">Purchase & Rental</a>
                <a href="#storage" onClick={handleNavClick('storage')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">Storage & Logistics</a>
                <a href="#notes" onClick={handleNavClick('notes')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">Notes</a>
                <a href="#maintenance" onClick={handleNavClick('maintenance')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">Maintenance</a>
              </nav>
            </div>
          </div>
          {/* Missing / update-needed info banner (mock-style) */}
          {showGapsPanel && gaps.length > 0 && (
            <>
              <div className="mx-auto max-w-6xl border-2 border-pb-warning bg-pb-warning/10 px-5 py-4 my-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base md:text-lg font-semibold text-white">Missing information</div>
                    <div className="text-sm text-white/80">Please complete the following:</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-white/90">
                      {gaps.map((g, idx) => (
                        <li key={idx}>
                          {g.label} —
                          <button onClick={() => {
                            const container = document.getElementById('overview');
                            if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            setTimeout(() => {
                              const notesInput = document.querySelector<HTMLInputElement | HTMLTextAreaElement>('#status-notes-input, [name="statusNotes"], textarea[placeholder="Status notes"], input[placeholder="Status notes"]');
                              if (notesInput) {
                                try { notesInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
                                notesInput.focus();
                              }
                            }, 300);
                          }} className="ml-2 underline text-black bg-pb-warning px-1 py-0.5 rounded">Go to section</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button type="button" onClick={() => setShowGapsPanel(false)} className="text-white/80 hover:text-white text-sm pl-2">Dismiss</button>
                </div>
              </div>
            </>
          )}

          <div id="overview" className="space-y-4 mx-auto max-w-6xl px-6 scroll-mt-[120px]" style={{ marginTop: '32px', marginBottom: '32px' }}>
            {/* Main image and description (moved into Overview to match mock) */}
            <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-4">
              <div className="w-full rounded-lg overflow-hidden bg-black/30 aspect-square flex items-center justify-center">
              {mainImage ? (
                <button
                  type="button"
                  onClick={() => {
                    const idx = galleryImages.findIndex(i => i.url === mainImage);
                    openLightboxAt(idx >= 0 ? idx : 0);
                  }}
                  className="block w-full h-full cursor-zoom-in"
                  title="Click to view larger"
                >
                <img src={mainImage} alt={prop.name} className="object-cover w-full h-full" />
                </button>
              ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" className="text-white/50"><circle cx="12" cy="12" r="10" fill="currentColor" /></svg>
                )}
              </div>
              <div>
                {prop.description && <p className="text-pb-gray whitespace-pre-line">{prop.description}</p>}
                {galleryImages.length > 1 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {galleryImages.slice(1).map((img, idx) => (
                      <button
                        key={img.id || img.url}
                        type="button"
                        onClick={() => openLightboxAt(idx + 1)}
                        className="w-16 h-16 rounded border border-pb-primary/30 overflow-hidden focus:outline-none focus:ring-2 focus:ring-pb-primary"
                        title="View larger"
                      >
                        <img src={img.url} alt={img.caption || prop.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                </div>
              )}
              </div>
            </div>
            {/* Overview summary box (mock-style colors) */}
            {/* Overview summary box (mock-style colors) */}
            <div className="bg-pb-darker/70 border border-white/10 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('Show', showName || prop.showId, false, BadgeInfo)}
              {renderField('Act', prop.act, false, Hash, 'act')}
              {renderField('Scene', prop.sceneName || prop.scene, false, FileText, 'sceneName')}
              {renderField('Location', prop.location || prop.currentLocation, false, MapPin, 'location')}
              {renderField('Status', prop.status, false, Info, 'status')}
              {renderField('Status Notes', prop.statusNotes, false, FileText, 'statusNotes')}
              {renderField('Condition', prop.condition, false, Package)}
              </div>
            </div>
            {/* Removed secondary Overview subnav to avoid duplicate nav */}
            {/* Inline compact location editor (shown if banner dismissed and location still empty) */}
            {!showLocationPrompt && !(prop.location || prop.currentLocation) && (
              <div className="bg-pb-darker/40 rounded-lg p-4">
                <div className="font-semibold text-pb-primary mb-2">Quick set location</div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={locationInput}
                    onChange={e => setLocationInput(e.target.value)}
                    placeholder="Add a location for this prop"
                    className="flex-1 rounded-md bg-black/30 border border-white/10 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pb-primary"
                  />
                <button
                  type="button"
                    onClick={saveLocation}
                    disabled={locationSaving}
                    className={`px-4 py-2 rounded-md font-medium ${locationSaving ? 'bg-pb-primary/50 cursor-not-allowed' : 'bg-pb-primary hover:bg-pb-accent'} text-white`}
                >
                    {locationSaving ? 'Saving…' : 'Save'}
                </button>
            </div>
                {locationError && <div className="text-red-400 text-sm mt-2">{locationError}</div>}
          </div>
            )}
            {/* Collapsible sections matching mock */}
            <Section id="ov-dimensions" title="Dimensions" open={openSections.dimensions} onToggle={() => setOpenSections(s => ({ ...s, dimensions: !s.dimensions }))}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField('Length', (prop.length != null && (prop as any).unit) ? `${prop.length} ${(prop as any).unit}` : (prop.length != null ? String(prop.length) : 'N/A'))}
                {renderField('Width', (prop.width != null && (prop as any).unit) ? `${prop.width} ${(prop as any).unit}` : (prop.width != null ? String(prop.width) : 'N/A'))}
                {renderField('Height', (prop.height != null && (prop as any).unit) ? `${prop.height} ${(prop as any).unit}` : (prop.height != null ? String(prop.height) : 'N/A'))}
                {renderField('Depth', (((prop as any).depth != null) && (prop as any).unit) ? `${(prop as any).depth} ${(prop as any).unit}` : ((prop as any).depth != null ? String((prop as any).depth) : 'N/A'))}
            {renderField('Weight', prop.weight ? `${prop.weight} ${prop.weightUnit || ''}` : 'N/A')}
            {renderField('Travel Weight', (prop as any).travelWeight)}
            {renderField('Materials', prop.materials?.join(', '))}
            {renderField('Color', (prop as any).color)}
            {renderField('Style', (prop as any).style)}
              </div>
            </Section>
            <Section id="ov-identification" title="Identification" open={openSections.identification} onToggle={() => setOpenSections(s => ({ ...s, identification: !s.identification }))}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('Manufacturer', (prop as any).manufacturer)}
            {renderField('Model', (prop as any).model)}
            {renderField('Serial Number', (prop as any).serialNumber)}
            </div>
            </Section>
            <Section id="ov-usage" title="Usage & Safety" open={openSections.usage} onToggle={() => setOpenSections(s => ({ ...s, usage: !s.usage }))}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField('Usage Instructions', prop.usageInstructions)}
                {prop.handlingInstructions ? renderField('Handling Instructions', prop.handlingInstructions) : null}
                {renderField('Safety Notes', prop.safetyNotes)}
                {renderField('Pre-Show Setup', prop.preShowSetupNotes)}
                {renderField('Pre-Show Setup Video', prop.preShowSetupVideo ? (
                  <a
                    href={prop.preShowSetupVideo as any}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pb-accent underline inline-block max-w-full truncate align-bottom"
                    title={String(prop.preShowSetupVideo)}
                  >
                    {getDisplayUrl(prop.preShowSetupVideo as any)}
                  </a>
                ) : 'N/A')}
                {renderField('Pre-Show Setup Duration', prop.preShowSetupDuration)}
              </div>
              {prop.preShowSetupVideo && (
                <div className="mt-3">
                  {renderEmbeddedVideo(prop.preShowSetupVideo as any)}
                </div>
              )}
              {videoUrls.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="text-sm font-semibold text-pb-primary mb-2">Videos</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {videoUrls.map((u, idx) => (
                        <div key={`${u}-${idx}`} className="space-y-2">
                          {renderEmbeddedVideo(u)}
                        </div>
                  ))}
                </div>
              </div>
          </div>
          )}
            </Section>
            <Section id="ov-purchase" title="Purchase & Rental" open={openSections.purchase} onToggle={() => setOpenSections(s => ({ ...s, purchase: !s.purchase }))}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('Price', prop.price ? `£${prop.price}` : 'N/A')}
            {renderField('Source', prop.source)}
            {renderField('Source Details', prop.sourceDetails)}
            {renderField('Purchase URL', prop.purchaseUrl ? <a href={prop.purchaseUrl} className="text-pb-accent underline" target="_blank" rel="noopener noreferrer">{prop.purchaseUrl}</a> : 'N/A')}
            {(prop.source === 'rented') && renderField('Rental Source', (prop as any).rentalSource)}
            {(prop.source === 'rented') && renderField('Rental Due Date', (prop as any).rentalDueDate, true)}
            {(prop.source === 'rented') && renderField('Rental Reference', (prop as any).rentalReferenceNumber)}
              </div>
            </Section>
            {/* Maintenance moved into Overview */}
            <Section id="ov-maintenance" title="Maintenance" open={openSections.maintenance} onToggle={() => setOpenSections(s => ({ ...s, maintenance: !s.maintenance }))}>
              <div className="space-y-4">
              {linkedCards.length > 0 && (
                <div className="bg-pb-darker/40 rounded-lg p-4">
                  <div className="font-semibold text-pb-primary mb-2">Mentioned in Tasks</div>
                  <ul className="list-disc pl-5">
                    {linkedCards.map(c => (
                      <li key={c.id}><a className="text-pb-accent underline" href={`/boards?selectedCardId=${c.id}&boardId=${c.boardId}`}>{c.title}</a></li>
                    ))}
                  </ul>
                </div>
              )}
              <MaintenanceInlineForm propId={id as string} initial={{ showId: prop.showId, name: prop.name }} />
            </div>
            </Section>
            <Section id="ov-storage" title="Storage & Logistics" open={openSections.storage} onToggle={() => setOpenSections(s => ({ ...s, storage: !s.storage }))}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('Storage Requirements', prop.storageRequirements)}
            {renderField('Replacement Cost', prop.replacementCost)}
            {renderField('Replacement Lead Time', prop.replacementLeadTime)}
            {renderField('Travels Unboxed', prop.travelsUnboxed ? 'Yes' : 'No')}
            {renderField('Courier', prop.courier)}
            {renderField('Tracking Number', prop.trackingNumber)}
          </div>
            </Section>
            {/* Notes */}
            <Section id="ov-notes" title="Notes" open={openSections.notes} onToggle={() => setOpenSections(s => ({ ...s, notes: !s.notes }))}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField('Notes', prop.notes)}
                {renderField('Public Notes', prop.publicNotes)}
              </div>
            </Section>
            {/* Gallery removed per request */}
          </div>
        </motion.div>

        {/* Lightbox Modal */}
        {lightboxOpen && galleryImages.length > 0 && galleryImages[lightboxIndex] && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <div
              className="relative w-full h-full max-h-[100vh] flex items-center justify-center"
              onClick={e => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <button
                type="button"
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white"
                onClick={closeLightbox}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              {galleryImages.length > 1 && (
                <button
                  type="button"
                  className="absolute left-4 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white"
                  onClick={showPrev}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              <img
                src={galleryImages[lightboxIndex].url}
                alt={(galleryImages[lightboxIndex].caption || prop.name) as string}
                className="max-w-[95vw] max-h-[75vh] object-contain"
              />
              {/* Caption */}
              <div className="absolute left-0 right-0 bottom-28 px-6 text-center">
                <div className="inline-block bg-black/50 text-white/90 text-sm md:text-base px-3 py-1 rounded">
                  {galleryImages[lightboxIndex].caption || prop.name}
                </div>
              </div>
              {galleryImages.length > 1 && (
                <button
                  type="button"
                  className="absolute right-4 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white"
                  onClick={showNext}
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
              {/* Thumbnails strip */}
              {galleryImages.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 px-6">
                  <div className="mx-auto max-w-[95vw] bg-black/30 rounded-lg p-2 overflow-x-auto">
                    <div className="flex items-center gap-2">
                      {galleryImages.map((img, idx) => {
                        const selected = idx === lightboxIndex;
                        return (
                          <button
                            key={img.id || img.url}
                            type="button"
                            onClick={() => setLightboxIndex(idx)}
                            className={`relative w-16 h-16 md:w-20 md:h-20 rounded overflow-hidden border ${selected ? 'border-white ring-2 ring-white' : 'border-white/30 hover:border-white/60'}`}
                            aria-label={`View image ${idx + 1}`}
                          >
                            <img src={img.url} alt={img.caption || prop.name} className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PropDetailPage; 