import React, { useState, useEffect } from 'react';
import DashboardLayout from './PropsBibleHomepage';
import { useWebAuth } from './contexts/WebAuthContext';
import { useFirebase } from './contexts/FirebaseContext';
import { propCategories, Prop } from '../shared/types/props';
import { FirebaseDocument } from '../shared/services/firebase/types';
import { useShowSelection } from './contexts/ShowSelectionContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import type { PdfGenerationOptions } from '../shared/types/pdf';
import AvailabilityCounter from './components/AvailabilityCounter';
import { useSubscription } from './hooks/useSubscription';
import { PropCard } from './components/PropCard';
import { PropsListSkeleton } from './components/LoadingSkeleton';
// Simplified loader removed per design request
import { usePropListLoading } from './hooks/useImageLoading';

const defaultPdfOptions: PdfGenerationOptions = {
  selectedFields: {
    name: true,
    description: true,
    category: true,
    status: true,
    quantity: true,
    // Add more fields as needed, defaulting to true/false
  } as any,
  layout: 'portrait',
  columns: 1,
  imageCount: 1,
  imageWidthOption: 'medium',
  showFilesQR: false,
  showVideosQR: false,
  title: 'Props List',
};

function generatePropsListHtml(props: Prop[], options: PdfGenerationOptions): string {
  // Simple HTML table for now
  const fields = Object.keys(options.selectedFields).filter(k => (options.selectedFields as any)[k]);
  return `
    <html><head><meta charset='UTF-8'><title>${options.title || 'Props List'}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #222; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; }
      th { background: #f0f0f0; }
      .prop-img { max-width: 80px; max-height: 80px; }
    </style></head><body>
    <h2>${options.title || 'Props List'}</h2>
    <table><thead><tr>
      ${fields.map(f => `<th>${f.charAt(0).toUpperCase() + f.slice(1)}</th>`).join('')}
    </tr></thead><tbody>
      ${props.map(prop => `<tr>
        ${fields.map(f => {
          if (f === 'images' && prop.images && prop.images.length > 0) {
            return `<td><img class='prop-img' src='${prop.images[0].url}' /></td>`;
          }
          return `<td>${(prop as any)[f] ?? ''}</td>`;
        }).join('')}
      </tr>`).join('')}
    </tbody></table>
    </body></html>
  `;
}


const PropsListPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [props, setProps] = useState<Prop[]>([]);
  
  // Use the loading hook for better state management
  const {
    initialLoadComplete,
    handleDataLoaded,
    handleImageLoad,
    handleImageError
  } = usePropListLoading(props);
  const { service: firebaseService, isInitialized, error: firebaseInitError } = useFirebase();
  const { currentShowId } = useShowSelection();
  const { userProfile, user } = useWebAuth();
  const { effectiveLimits } = useSubscription();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [act, setAct] = useState<string>('');
  const [scene, setScene] = useState<string>('');
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfOptions, setPdfOptions] = useState<PdfGenerationOptions>(defaultPdfOptions);
  const [downloading, setDownloading] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [viewAllProps, setViewAllProps] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Extract unique acts and scenes from props
  const acts = Array.from(new Set(props.map(p => p.act).filter(a => a != null))).sort((a, b) => (a ?? 0) - (b ?? 0));
  const scenes = Array.from(new Set(props.map(p => p.scene).filter(s => s != null))).sort((a, b) => (a ?? 0) - (b ?? 0));

  useEffect(() => {
    // Auto-redirect to import page via /props?import=1
    const params = new URLSearchParams(location.search);
    if (params.get('import') === '1') {
      navigate('/props/import');
    }
  }, [location.search, navigate]);

  useEffect(() => {
    if (!isInitialized) {
      setLoading(true);
      setError("Firebase not initialized.");
      return;
    }

    if (firebaseInitError) {
      setError(`Firebase Initialization Error: ${firebaseInitError.message}`);
      setLoading(false);
      return;
    }

    // If no show is selected and not in god mode, show the welcome screen
    // God users can view all props even without a show selected
    if (!currentShowId && !viewAllProps && userProfile?.role !== 'god') {
      setProps([]);
      setLoading(false);
      setError(null); // Clear any previous errors since this is expected behavior
      return;
    }

    setLoading(true);
    setError(null);

    // Only attempt to listen to props if we have a show selected or are in god mode
    if (!currentShowId && !viewAllProps && userProfile?.role !== 'god') {
      setLoading(false);
      return;
    }

    const unsubscribe = firebaseService.listenToCollection<Prop>(
      'props',
      (data: FirebaseDocument<Prop>[]) => {
        const propList = data
          .map(doc => ({ ...doc.data, id: doc.id }))
          .filter(prop => viewAllProps || prop.showId === currentShowId || (userProfile?.role === 'god' && !currentShowId));
        setProps(propList);
        setLoading(false);
        handleDataLoaded();
      },
      (err: Error) => {
        console.error("Error fetching props:", err);
        console.log("Debug info:", {
          currentShowId,
          userId: user?.uid,
          userEmail: user?.email,
          userRole: userProfile?.role,
          isSystemAdmin: userProfile?.groups?.['system-admin']
        });
        
        // Provide more specific error messages based on error type
        let errorMessage = "Failed to load props.";
        
        if (err.message.includes("permission-denied") || err.message.includes("Missing or insufficient permissions")) {
          // Check if this is likely due to no shows existing
          if (!currentShowId && !viewAllProps && userProfile?.role !== 'god') {
            errorMessage = "No show selected. Please create a show first to start managing your props.";
          } else if (userProfile?.role === 'god') {
            errorMessage = "Permission error detected for god user. This may indicate a Firestore rules issue.";
          } else {
            errorMessage = "You don't have permission to view props for this show. Try selecting a different show or contact the show administrator to get access.";
          }
        } else if (err.message.includes("unavailable") || err.message.includes("network")) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (err.message.includes("unauthenticated")) {
          errorMessage = "You need to sign in to view props. Please refresh the page and sign in again.";
        } else if (err.message.includes("not-found")) {
          errorMessage = "The show or props collection could not be found.";
        } else {
          errorMessage = `Failed to load props: ${err.message}. Please check your network connection and try again.`;
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseService, isInitialized, firebaseInitError, currentShowId, viewAllProps, userProfile?.role]);


  // Filtered props
  const filteredProps = props.filter((prop) => {
    const matchesSearch =
      search.trim() === '' ||
      prop.name.toLowerCase().includes(search.toLowerCase()) ||
      (prop.description && prop.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = !category || prop.category === category;
    const matchesStatus = !status || (prop.status && prop.status === status);
    const matchesAct = !act || (prop.act != null && String(prop.act) === act);
    const matchesScene = !scene || (prop.scene != null && String(prop.scene) === scene);
    return matchesSearch && matchesCategory && matchesStatus && matchesAct && matchesScene;
  });

  const handleDownloadPdf = async () => {
    setDownloading(true);
    const html = generatePropsListHtml(filteredProps, pdfOptions);
    const orientation = pdfOptions.layout === 'landscape' ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ orientation });
    await pdf.html(html, { callback: () => {
      pdf.save(`${pdfOptions.title || 'props-list'}.pdf`);
      setDownloading(false);
      setShowPdfDialog(false);
    }});
  };

  const handleDownloadCsv = async () => {
    try {
      setDownloadingCsv(true);
      const csvFields: { key: keyof Prop | string; label: string }[] = [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description' },
        { key: 'category', label: 'Category' },
        { key: 'status', label: 'Status' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'act', label: 'Act' },
        { key: 'scene', label: 'Scene' },
        { key: 'location', label: 'Location' },
        { key: 'manufacturer', label: 'Manufacturer' },
        { key: 'model', label: 'Model' },
        { key: 'serialNumber', label: 'Serial Number' },
        { key: 'color', label: 'Color' },
        { key: 'style', label: 'Style' },
        { key: 'condition', label: 'Condition' },
        { key: 'purchaseUrl', label: 'Purchase URL' },
        { key: 'images', label: 'Image URLs' },
        { key: 'digitalAssets', label: 'File URLs' },
        { key: 'videos', label: 'Video URLs' },
      ];

      const escapeCsv = (val: any): string => {
        if (val === undefined || val === null) return '""';
        const s = String(val).replace(/"/g, '""');
        return `"${s}"`;
      };

      const arrayToUrls = (arr: any[] | undefined): string => {
        if (!Array.isArray(arr)) return '';
        const urls = arr
          .map((item: any) => {
            if (!item) return '';
            if (typeof item === 'string') return item;
            if (typeof item.url === 'string') return item.url;
            return '';
          })
          .filter(Boolean);
        return urls.join(' ');
      };

      const headerRow = csvFields.map(f => escapeCsv(f.label)).join(',');
      const rows = filteredProps.map(p => {
        const values = csvFields.map(field => {
          const key = field.key as any;
          if (key === 'images') return escapeCsv(arrayToUrls(p.images as any));
          if (key === 'digitalAssets') return escapeCsv(arrayToUrls(p.digitalAssets as any));
          if (key === 'videos') return escapeCsv(arrayToUrls(p.videos as any));
          const v = (p as any)[key];
          // Handle nested objects for act/scene
          if ((key === 'act' || key === 'scene') && v && typeof v === 'object' && 'name' in v) return escapeCsv(v.name);
          return escapeCsv(v);
        });
        return values.join(',');
      });
      const csv = [headerRow, ...rows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'props-export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingCsv(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="relative min-h-[70vh] flex flex-col justify-center items-center bg-gradient-to-br from-pb-primary/40 via-pb-darker/80 to-pb-accent/30 rounded-xl shadow-xl p-6 max-w-7xl mx-auto">
        {/* Header Section - Title and Context */}
        <div className="w-full max-w-6xl mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-white">
                {viewAllProps ? "All Props" : "Props List"}
              </h1>
              {viewAllProps && (
                <span className="px-3 py-1 bg-pb-accent/20 text-pb-accent rounded-full text-sm font-medium">
                  God Mode
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <AvailabilityCounter
                currentCount={props.length}
                limit={effectiveLimits.props}
                type="props"
                className="text-sm"
              />
              {viewAllProps && (
                <button
                  onClick={() => setViewAllProps(false)}
                  className="px-3 py-1 bg-pb-accent/20 text-pb-accent rounded-full text-sm font-medium hover:bg-pb-accent/30 transition-colors"
                >
                  Switch to Show View
                </button>
              )}
            </div>
          </div>

          {/* Primary Search Section */}
          <div className="mb-6">
            <div className="relative max-w-2xl">
              <input
                type="text"
                placeholder="Search props by name, description, or tags..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-6 py-4 text-lg rounded-xl border border-pb-primary/30 bg-pb-darker/60 text-white placeholder-pb-gray/70 focus:outline-none focus:ring-2 focus:ring-pb-primary focus:border-pb-primary/50 transition-all"
              />
              <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-pb-gray/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filters and Actions Row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="appearance-none pr-10 px-4 py-2 rounded-lg border border-pb-primary/30 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary hover:bg-pb-darker/70 transition"
                >
                  <option value="">All Categories</option>
                  {propCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/80" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
              <div className="relative">
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="appearance-none pr-10 px-4 py-2 rounded-lg border border-pb-primary/30 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary hover:bg-pb-darker/70 transition"
                >
                  <option value="">All Statuses</option>
                  <option value="in">In</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                  <option value="available">Available</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/80" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
              <div className="relative">
                <select
                  value={act}
                  onChange={e => setAct(e.target.value)}
                  className="appearance-none pr-10 px-4 py-2 rounded-lg border border-pb-primary/30 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary hover:bg-pb-darker/70 transition"
                >
                  <option value="">All Acts</option>
                  {acts.map(a => (
                    <option key={a} value={String(a)}>{a}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/80" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
              <div className="relative">
                <select
                  value={scene}
                  onChange={e => setScene(e.target.value)}
                  className="appearance-none pr-10 px-4 py-2 rounded-lg border border-pb-primary/30 bg-pb-darker/60 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary hover:bg-pb-darker/70 transition"
                >
                  <option value="">All Scenes</option>
                  {scenes.map(s => (
                    <option key={s} value={String(s)}>{s}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/80" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {(currentShowId || viewAllProps) && (
                <button
                  onClick={() => navigate('/props/import')}
                  className="px-4 py-2 rounded-lg bg-pb-primary/80 text-white font-medium shadow hover:bg-pb-primary transition-colors flex items-center gap-2"
                  disabled={viewAllProps}
                  title={viewAllProps ? "Import is only available when viewing a specific show" : "Import Props"}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Import
                </button>
              )}
              {userProfile && (userProfile.role === 'god' || userProfile.role === 'admin' || userProfile.role === 'editor' || userProfile.role === 'props_supervisor' || userProfile.role === 'art_director') && filteredProps.length > 0 && (
                <button
                  onClick={handleDownloadCsv}
                  disabled={downloadingCsv}
                  className="px-4 py-2 rounded-lg bg-pb-accent/80 text-white font-medium shadow hover:bg-pb-accent transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {downloadingCsv ? 'Preparing…' : 'Download CSV'}
                </button>
              )}
            </div>
          </div>
        </div>
        {!currentShowId && !viewAllProps && (
          <div className="flex flex-col items-center justify-center h-96 bg-gradient-to-br from-pb-primary/10 via-pb-secondary/5 to-pb-accent/10 rounded-xl border border-pb-primary/20 p-8">
            <div className="text-6xl mb-4">🎭</div>
            <h3 className="text-2xl font-bold text-pb-primary mb-3">Welcome to Props Management!</h3>
            <p className="text-pb-gray text-center mb-6 max-w-md">
              To get started, create your first show. This will be your workspace for organizing and managing all your theater props.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/shows/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-pb-primary hover:bg-pb-secondary text-white font-semibold rounded-lg shadow transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create Your First Show
              </Link>
              <Link
                to="/shows/list"
                className="inline-flex items-center gap-2 px-6 py-3 bg-pb-darker/60 hover:bg-pb-darker/80 text-white font-semibold rounded-lg shadow transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9 6 9-6"></path>
                </svg>
                View Existing Shows
              </Link>
              {userProfile?.role === 'god' && (
                <button
                  onClick={() => setViewAllProps(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-pb-accent hover:bg-pb-accent/80 text-white font-semibold rounded-lg shadow transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3h18v18H3zM9 9h6v6H9z"></path>
                  </svg>
                  View All Props (God Mode)
                </button>
              )}
            </div>
          </div>
        )}
        {showPdfDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white text-black rounded-lg shadow-lg p-6 min-w-[320px]">
              <h3 className="font-bold text-lg mb-2">Export Props List to PDF</h3>
              <div className="mb-2">
                <label className="block font-semibold mb-1">Fields to include:</label>
                {Object.keys(defaultPdfOptions.selectedFields).map(f => (
                  <label key={f} className="block text-sm">
                    <input
                      type="checkbox"
                      checked={pdfOptions.selectedFields[f as keyof Prop]}
                      onChange={e => setPdfOptions(opt => ({
                        ...opt,
                        selectedFields: { ...opt.selectedFields, [f]: e.target.checked }
                      }))}
                    /> {f.charAt(0).toUpperCase() + f.slice(1)}
                  </label>
                ))}
              </div>
              <div className="mb-2">
                <label className="block font-semibold mb-1">Layout:</label>
                <select
                  value={pdfOptions.layout}
                  onChange={e => setPdfOptions(opt => ({ ...opt, layout: e.target.value as any }))}
                  className="border rounded px-2 py-1"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  className="btn btn-primary"
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                >
                  {downloading ? 'Generating...' : 'Download PDF'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowPdfDialog(false)}
                  disabled={downloading}
                >Cancel</button>
              </div>
            </div>
          </div>
        )}
        {/* Loader intentionally removed */}
        {!loading && !error && filteredProps.length === 0 ? (
          <div 
            className="flex flex-col items-center justify-center h-64"
            role="status"
            aria-live="polite"
          >
            <div className="text-pb-gray text-lg font-semibold mb-2">No props found</div>
            <div className="text-pb-gray/80 text-center max-w-md mb-6">
              Get started by adding your first prop! You can either:
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <Link
                to="/props/add"
                className="px-6 py-3 rounded-lg bg-pb-primary hover:bg-pb-secondary text-white font-semibold shadow transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Prop
              </Link>
              <span className="text-pb-gray/60 text-sm">or</span>
              <Link
                to="/props/import"
                className="px-6 py-3 rounded-lg border border-pb-primary/30 hover:border-pb-primary/60 text-pb-primary hover:text-white hover:bg-pb-primary font-semibold transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Import Props
              </Link>
            </div>
            <div className="text-pb-gray/60 text-sm text-center max-w-md mt-4">
              Use the floating + button in the bottom right corner to quickly add props, or import from a CSV file to get started faster.
            </div>
          </div>
        ) : (
          <div className="w-full max-w-6xl">
            {/* Show skeleton loading for initial load or when images are still loading */}
            {!initialLoadComplete ? (
              <div className="animate-fade-in">
                <PropsListSkeleton count={6} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {filteredProps.map((prop, index) => (
                  <div
                    key={prop.id}
                    className="animate-slide-up"
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    <PropCard
                      prop={prop}
                      onImageLoad={() => handleImageLoad(prop.id)}
                      onImageError={() => handleImageError(prop.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {(currentShowId || viewAllProps) && (
          <Link
            to="/props/add"
            className="fixed bottom-10 right-10 z-50 bg-pb-primary hover:bg-pb-accent text-white rounded-full shadow-lg p-4 flex items-center justify-center transition focus:outline-none focus:ring-2 focus:ring-pb-primary"
            title={viewAllProps ? "Add Prop (requires show selection)" : "Add Prop"}
            aria-label="Add Prop"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </Link>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PropsListPage; 