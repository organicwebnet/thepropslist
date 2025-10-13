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
    const items: { label: string; section: 'basic' | 'show-assignment' | 'pricing' | 'source' | 'category-status' | 'transit' | 'location' | 'media' | 'notes' | 'relationships'; explanation: string }[] = [];
    if (!prop?.location && !prop?.currentLocation) items.push({ 
      label: 'Location', 
      section: 'location',
      explanation: 'Helps the team find this prop quickly and track its current whereabouts'
    });
    if (!prop?.status) items.push({ 
      label: 'Status', 
      section: 'category-status',
      explanation: 'Shows the current state of the prop (in use, available, needs repair, etc.)'
    });
    if (prop?.status && !prop?.statusNotes) items.push({ 
      label: 'Status Notes', 
      section: 'category-status',
      explanation: 'Provides context about why the prop has this status'
    });
    if (!prop?.act) items.push({ 
      label: 'Act', 
      section: 'show-assignment',
      explanation: 'Helps organize props by show structure and track usage'
    });
    if (!prop?.sceneName && !prop?.scene) items.push({ 
      label: 'Scene', 
      section: 'show-assignment',
      explanation: 'Shows which scene this prop is used in for better organization'
    });
    if (!prop?.images || prop.images.length === 0) items.push({ 
      label: 'Main image', 
      section: 'basic',
      explanation: 'Visual reference helps identify the prop quickly'
    });
    if (!prop?.assignment?.type && typeof prop?.location === 'string' && /box|container/i.test(prop.location)) {
      items.push({ 
        label: 'Location may be outdated (removed from container)', 
        section: 'location',
        explanation: 'Update the location to reflect where the prop currently is'
      });
    }
    return items;
  }, [prop?.location, prop?.currentLocation, prop?.status, prop?.statusNotes, prop?.act, prop?.sceneName, prop?.scene, prop?.images, prop?.assignment?.type]);
  const [showGapsPanel, setShowGapsPanel] = useState(false);
  useEffect(() => { setShowGapsPanel(gaps.length > 0); }, [gaps.length]);
  const missingLabelSet = React.useMemo(() => new Set(gaps.map(g => g.label)), [gaps]);
  
  // Count missing items per section
  const getMissingCountForSection = (sectionId: SectionId): number => {
    return gaps.filter(gap => gap.section === sectionId).length;
  };
  // Collapsible section state (to mirror mock UX inside Overview)
  type SectionId = 'basic' | 'show-assignment' | 'pricing' | 'source' | 'category-status' | 'transit' | 'location' | 'media' | 'notes' | 'relationships';
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({ 
    basic: true,
    'show-assignment': true,
    pricing: true,
    source: true,
    'category-status': true,
    transit: true,
    location: true,
    media: true,
    notes: true,
    relationships: true,
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
      setOpenSections(s => s['show-assignment'] ? s : { ...s, 'show-assignment': true });
    }
  }, [videoUrls.length]);

  // Filmstrip of other images was removed to match mock; keep only main image and lightbox

  const openLightboxAt = (index: number) => {
    if (!galleryImages.length) return;
    setLightboxIndex(Math.max(0, Math.min(index, galleryImages.length - 1)));
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);
  const showPrev = React.useCallback(() => setLightboxIndex(i => (i - 1 + galleryImages.length) % galleryImages.length), [galleryImages.length]);
  const showNext = React.useCallback(() => setLightboxIndex(i => (i + 1) % galleryImages.length), [galleryImages.length]);

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
  }, [lightboxOpen, galleryImages.length, showNext, showPrev]);

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
    
    // Check if the value is potentially long text that should go under the label (like textarea content)
    const isLongText = typeof value === 'string' && value.length > 50;
    const displayValue = isDate ? formatDate(value) : (value ?? 'N/A');
    
    const content = (
      <>
        {IconComp ? <IconComp className={`w-4 h-4 mt-0.5 ${missing ? 'text-pb-warning' : 'text-pb-primary'}`} /> : null}
        {isLongText ? (
          // For long text (textarea-like), put label on top
          <div className="space-y-1">
            <div className={`font-semibold ${missing ? 'text-pb-warning' : 'text-pb-primary'}`}>{label}:</div>
            <div className={`${missing ? 'text-pb-warning' : 'text-white'} whitespace-pre-line`}>{displayValue}</div>
          </div>
        ) : (
          // For short text, put label and value side-by-side
          <div className="flex items-center gap-2">
            <div className={`font-semibold ${missing ? 'text-pb-warning' : 'text-pb-primary'}`}>{label}:</div>
            <span className={`${missing ? 'text-pb-warning' : 'text-white'}`}>{displayValue}</span>
          </div>
        )}
      </>
    );
    if (missing && effectiveKey) {
      return (
        <button
          type="button"
          className={`mb-2 flex items-start gap-2 w-full text-left bg-pb-warning/20 border border-pb-warning/40 rounded-lg px-3 py-2 -mx-1 hover:bg-pb-warning/30 transition-colors`}
          onClick={() => { console.debug('[PropDetail] click missing field → edit', { label, effectiveKey, id }); goEdit(effectiveKey); }}
        >
          {content}
        </button>
      );
    }
    return (
      <div className={`mb-2 flex items-start gap-2 ${missing ? 'bg-pb-warning/15 border border-pb-warning/30 rounded-lg px-3 py-2 -mx-1' : ''}`}>{content}</div>
    );
  };

  // Anchor navigation to sections: open the target section and smooth scroll
  const handleNavClick = (target: SectionId) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setOpenSections(prev => ({
      ...prev,
      [target]: true,
    }));
    const id = target;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try { 
      window.history.replaceState(null, '', `#${target}`); 
    } catch (error) {
      console.warn('Failed to update history state:', error);
    }
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
          <button onClick={() => navigate('/props')} className="flex items-center gap-2 text-pb-primary hover:text-pb-accent">
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
              {/* Location pill - shows missing if in gaps */}
              {(() => {
                const locationGap = gaps.find(g => g.label === 'Location');
                const hasLocation = prop.location || prop.currentLocation;
                return (
                  <span 
                    className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                      locationGap 
                        ? 'bg-pb-warning/30 text-pb-warning border border-pb-warning/50' 
                        : 'bg-white/10 text-white'
                    }`}
                    title={locationGap ? `Missing: ${locationGap.explanation}` : undefined}
                  >
                    <MapPin className={`w-3 h-3 ${locationGap ? 'text-pb-warning' : 'text-pb-primary'}`} />
                    {hasLocation || 'No location'}
                  </span>
                );
              })()}
              
              {/* Status pill - shows missing if in gaps */}
              {(() => {
                const statusGap = gaps.find(g => g.label === 'Status');
                const hasStatus = prop.status;
                return (
                  <span 
                    className={`px-2 py-1 rounded-full text-xs ${
                      statusGap
                        ? 'bg-pb-warning/30 text-pb-warning border border-pb-warning/50'
                        : 'bg-pb-success/30 text-white'
                    }`}
                    title={statusGap ? `Missing: ${statusGap.explanation}` : undefined}
                  >
                    {hasStatus ? (prop.status || '').toString().replace(/_/g, ' ') : 'No status'}
                  </span>
                );
              })()}
              
              {/* Complete details button with tooltip */}
              {gaps.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate(`/props/${id}/edit`)}
                  className="px-3 py-1.5 rounded-md bg-pb-warning text-black text-sm hover:opacity-90 relative group flex items-center gap-2"
                  title={`Missing: ${gaps.map(g => g.label).join(', ')}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Complete details ({gaps.length})
                </button>
              )}
              
              <button onClick={handleEdit} className="px-3 py-1.5 rounded-md bg-pb-primary text-white text-sm hover:bg-pb-accent flex items-center gap-1"><Pencil className="w-4 h-4" /> Edit</button>
            </div>
          </div>
        </div>
          {/* Pill nav (mock-style) sticky directly under header, 1px spacer */}
          <div className="sticky top-[56px] z-10 -mx-6 px-6 py-[1px] mb-6 bg-pb-darker/80 backdrop-blur-sm border-b border-pb-primary/10" style={{ marginBottom: '24px' }}>
            <div className="mx-auto max-w-6xl">
              <nav className="flex items-center flex-wrap gap-3 py-2 text-sm">
                <a href="#basic" onClick={handleNavClick('basic')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">
                  Basic Info
                  {getMissingCountForSection('basic') > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] rounded-full bg-pb-warning text-black">
                      {getMissingCountForSection('basic')}
                    </span>
                  )}
                </a>
                <a href="#show-assignment" onClick={handleNavClick('show-assignment')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">
                  Show Assignment
                  {getMissingCountForSection('show-assignment') > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] rounded-full bg-pb-warning text-black">
                      {getMissingCountForSection('show-assignment')}
                    </span>
                  )}
                </a>
                <a href="#pricing" onClick={handleNavClick('pricing')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">
                  Pricing & Quantity
                  {getMissingCountForSection('pricing') > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] rounded-full bg-pb-warning text-black">
                      {getMissingCountForSection('pricing')}
                    </span>
                  )}
                </a>
                <a href="#source" onClick={handleNavClick('source')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">
                  Source & Details
                  {getMissingCountForSection('source') > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] rounded-full bg-pb-warning text-black">
                      {getMissingCountForSection('source')}
                    </span>
                  )}
                </a>
                <a href="#category-status" onClick={handleNavClick('category-status')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">
                  Category & Status
                  {getMissingCountForSection('category-status') > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] rounded-full bg-pb-warning text-black">
                      {getMissingCountForSection('category-status')}
                    </span>
                  )}
                </a>
                <a href="#transit" onClick={handleNavClick('transit')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">
                  Transit & Dimensions
                  {getMissingCountForSection('transit') > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] rounded-full bg-pb-warning text-black">
                      {getMissingCountForSection('transit')}
                    </span>
                  )}
                </a>
                <a href="#location" onClick={handleNavClick('location')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">
                  Location & Custody
                  {getMissingCountForSection('location') > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] rounded-full bg-pb-warning text-black">
                      {getMissingCountForSection('location')}
                    </span>
                  )}
                </a>
                <a href="#media" onClick={handleNavClick('media')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">
                  Media & Assets
                  {getMissingCountForSection('media') > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] rounded-full bg-pb-warning text-black">
                      {getMissingCountForSection('media')}
                    </span>
                  )}
                </a>
                <a href="#notes" onClick={handleNavClick('notes')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">
                  Notes
                  {getMissingCountForSection('notes') > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] rounded-full bg-pb-warning text-black">
                      {getMissingCountForSection('notes')}
                    </span>
                  )}
                </a>
                <a href="#relationships" onClick={handleNavClick('relationships')} className="px-4 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white">
                  Relationships
                  {getMissingCountForSection('relationships') > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] rounded-full bg-pb-warning text-black">
                      {getMissingCountForSection('relationships')}
                    </span>
                  )}
                </a>
            </nav>
          </div>
          </div>
          {/* Helpful information completion suggestions */}
          {showGapsPanel && gaps.length > 0 && (
            <>
              <div className="mx-auto max-w-6xl bg-pb-warning/5 border border-pb-warning/20 rounded-lg px-4 py-3 my-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-pb-warning mb-1 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Missing information ({gaps.length})
                    </div>
                    <div className="text-xs text-pb-warning/70">Hover over the pills above for details, or click to edit</div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => navigate(`/props/${id}/edit`)}
                    className="px-3 py-1.5 bg-pb-warning hover:bg-pb-warning/80 text-white text-sm rounded-md transition-colors whitespace-nowrap"
                  >
                    Complete Details
                  </button>
                  <button type="button" onClick={() => setShowGapsPanel(false)} className="text-pb-warning/60 hover:text-pb-warning text-sm">✕</button>
                </div>
              </div>
            </>
          )}

          <div id="basic" className="space-y-4 mx-auto max-w-6xl px-6 scroll-mt-[120px]" style={{ marginTop: '32px', marginBottom: '32px' }}>
            {/* Basic Info Container with integrated image */}
            <div className="bg-pb-darker/70 border border-white/10 rounded-xl p-4">
              <div className="grid grid-cols-1 lg:grid-cols-[200px,1fr] gap-6">
                {/* Image Section */}
                <div className="relative group">
                  <div className="w-full rounded-lg overflow-hidden bg-gradient-to-br from-pb-darker/60 to-pb-darker/80 border border-white/20 aspect-square flex items-center justify-center shadow-lg">
                    {mainImage ? (
                      <button
                        type="button"
                        onClick={() => {
                          const idx = galleryImages.findIndex(i => i.url === mainImage);
                          openLightboxAt(idx >= 0 ? idx : 0);
                        }}
                        className="block w-full h-full cursor-zoom-in hover:scale-105 transition-transform duration-300 relative overflow-hidden"
                        title="Click to view larger"
                      >
                        <img 
                          src={mainImage} 
                          alt={prop.name} 
                          className="object-cover w-full h-full transition-all duration-300 group-hover:brightness-110" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <svg width="14" height="14" viewBox="0 0 24 24" className="text-white">
                            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                          </svg>
                        </div>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-white/40">
                        <svg width="32" height="32" viewBox="0 0 24 24" className="mb-1">
                          <path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                        </svg>
                        <span className="text-xs">No image</span>
                      </div>
                    )}
                  </div>
                  {galleryImages.length > 1 && (
                    <div className="mt-2 relative">
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {galleryImages.slice(1).map((img, idx) => (
                          <button
                            key={img.id || img.url}
                            type="button"
                            onClick={() => openLightboxAt(idx + 1)}
                            className="flex-shrink-0 w-10 h-10 rounded-lg border border-white/30 overflow-hidden focus:outline-none focus:ring-2 focus:ring-pb-primary hover:border-pb-primary/70 hover:scale-105 transition-all duration-200 shadow-sm"
                            title="View larger"
                          >
                            <img src={img.url} alt={img.caption || prop.name} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                      {/* Scroll indicators */}
                      <div className="absolute top-0 left-0 w-4 h-full bg-gradient-to-r from-pb-darker/80 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="absolute top-0 right-0 w-4 h-full bg-gradient-to-l from-pb-darker/80 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  )}
                </div>
                
                {/* Basic Info Fields */}
                <div className="space-y-4">
                  {prop.description && (
                    <div className="mb-4">
                      <div className="text-sm font-semibold text-pb-primary mb-2">Description:</div>
                      <p className="text-white/90 whitespace-pre-line leading-relaxed text-sm">{prop.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showName || prop.showId ? renderField('Show', showName || prop.showId, false, BadgeInfo) : null}
              {prop.act ? renderField('Act', prop.act, false, Hash, 'act') : null}
              {prop.sceneName || prop.scene ? renderField('Scene', prop.sceneName || prop.scene, false, FileText, 'sceneName') : null}
              {prop.location || prop.currentLocation ? renderField('Location', prop.location || prop.currentLocation, false, MapPin, 'location') : null}
              {prop.status ? renderField('Status', prop.status, false, Info, 'status') : null}
              {prop.statusNotes ? renderField('Status Notes', prop.statusNotes, false, FileText, 'statusNotes') : null}
              {prop.color ? renderField('Color', prop.color, false, Package) : null}
              {prop.length != null ? renderField('Length', (prop.length != null && prop.unit) ? `${prop.length} ${prop.unit}` : String(prop.length)) : null}
              {prop.width != null ? renderField('Width', (prop.width != null && prop.unit) ? `${prop.width} ${prop.unit}` : String(prop.width)) : null}
              {prop.height != null ? renderField('Height', (prop.height != null && prop.unit) ? `${prop.height} ${prop.unit}` : String(prop.height)) : null}
              {prop.weight ? renderField('Weight', `${prop.weight} ${prop.weightUnit || ''}`) : null}
                  </div>
                </div>
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
            {(prop.usageInstructions || prop.handlingInstructions || prop.safetyNotes || prop.preShowSetupNotes || prop.preShowSetupVideo || prop.preShowSetupDuration || videoUrls.length > 0) && (
            <Section id="ov-usage" title="Usage & Safety" open={openSections['show-assignment']} onToggle={() => setOpenSections(s => ({ ...s, 'show-assignment': !s['show-assignment'] }))}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prop.usageInstructions ? renderField('Usage Instructions', prop.usageInstructions) : null}
                {prop.handlingInstructions ? renderField('Handling Instructions', prop.handlingInstructions) : null}
                {prop.safetyNotes ? renderField('Safety Notes', prop.safetyNotes) : null}
                {prop.preShowSetupNotes ? renderField('Pre-Show Setup', prop.preShowSetupNotes) : null}
                {prop.preShowSetupVideo ? renderField('Pre-Show Setup Video', (
                  <a
                    href={prop.preShowSetupVideo as any}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pb-accent underline inline-block max-w-full truncate align-bottom"
                    title={String(prop.preShowSetupVideo)}
                  >
                    {getDisplayUrl(prop.preShowSetupVideo as any)}
                  </a>
                )) : null}
                {prop.preShowSetupDuration ? renderField('Pre-Show Setup Duration', prop.preShowSetupDuration) : null}
              </div>
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
            )}
            {(prop.price || prop.source || prop.sourceDetails || prop.purchaseUrl || (prop.source === 'rented' && ((prop as any).rentalSource || (prop as any).rentalDueDate || (prop as any).rentalReferenceNumber))) && (
            <Section id="ov-purchase" title="Purchase & Rental" open={openSections.pricing} onToggle={() => setOpenSections(s => ({ ...s, pricing: !s.pricing }))}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prop.price ? renderField('Price', `£${prop.price}`) : null}
            {prop.source ? renderField('Source', prop.source) : null}
            {prop.sourceDetails ? renderField('Source Details', prop.sourceDetails) : null}
            {prop.purchaseUrl ? renderField('Purchase URL', <a href={prop.purchaseUrl} className="text-pb-accent underline" target="_blank" rel="noopener noreferrer">{prop.purchaseUrl}</a>) : null}
            {(prop.source === 'rented' && (prop as any).rentalSource) && renderField('Rental Source', (prop as any).rentalSource)}
            {(prop.source === 'rented' && (prop as any).rentalDueDate) && renderField('Rental Due Date', (prop as any).rentalDueDate, true)}
            {(prop.source === 'rented' && (prop as any).rentalReferenceNumber) && renderField('Rental Reference', (prop as any).rentalReferenceNumber)}
              </div>
            </Section>
            )}
            {/* Maintenance moved into Overview */}
            {(linkedCards.length > 0) && (
            <Section id="ov-maintenance" title="Maintenance" open={openSections.notes} onToggle={() => setOpenSections(s => ({ ...s, notes: !s.notes }))}>
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
            )}
            {(prop.storageRequirements || prop.replacementCost || prop.replacementLeadTime || prop.travelsUnboxed || prop.courier || prop.trackingNumber) && (
            <Section id="ov-storage" title="Storage & Logistics" open={openSections.transit} onToggle={() => setOpenSections(s => ({ ...s, transit: !s.transit }))}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prop.storageRequirements ? renderField('Storage Requirements', prop.storageRequirements) : null}
            {prop.replacementCost ? renderField('Replacement Cost', prop.replacementCost) : null}
            {prop.replacementLeadTime ? renderField('Replacement Lead Time', prop.replacementLeadTime) : null}
            {prop.travelsUnboxed !== undefined ? renderField('Travels Unboxed', prop.travelsUnboxed ? 'Yes' : 'No') : null}
            {prop.courier ? renderField('Courier', prop.courier) : null}
            {prop.trackingNumber ? renderField('Tracking Number', prop.trackingNumber) : null}
          </div>
            </Section>
            )}
            {/* Notes */}
            {(prop.notes || prop.publicNotes) && (
            <Section id="ov-notes" title="Notes" open={openSections.notes} onToggle={() => setOpenSections(s => ({ ...s, notes: !s.notes }))}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prop.notes ? renderField('Notes', prop.notes) : null}
                {prop.publicNotes ? renderField('Public Notes', prop.publicNotes) : null}
            </div>
          </Section>
            )}
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