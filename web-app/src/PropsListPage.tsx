import React, { useState, useEffect } from 'react';
import DashboardLayout from './PropsBibleHomepage';
import { useWebAuth } from './contexts/WebAuthContext';
import { useFirebase } from './contexts/FirebaseContext';
import { propCategories, Prop } from '../shared/types/props';
import { FirebaseDocument } from '../shared/services/firebase/types';
import { useShowSelection } from './contexts/ShowSelectionContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PropCardWeb from './PropCardWeb';
import jsPDF from 'jspdf';
import type { PdfGenerationOptions } from '../shared/types/pdf';
import ImportPropsModal from './components/ImportPropsModal';

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
  const { service: firebaseService, isInitialized, error: firebaseInitError } = useFirebase();
  const { currentShowId } = useShowSelection();
  const { userProfile } = useWebAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [act, setAct] = useState<string>('');
  const [scene, setScene] = useState<string>('');
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfOptions, setPdfOptions] = useState<PdfGenerationOptions>(defaultPdfOptions);
  const [downloading, setDownloading] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Extract unique acts and scenes from props
  const acts = Array.from(new Set(props.map(p => p.act).filter(a => a != null))).sort((a, b) => (a ?? 0) - (b ?? 0));
  const scenes = Array.from(new Set(props.map(p => p.scene).filter(s => s != null))).sort((a, b) => (a ?? 0) - (b ?? 0));

  useEffect(() => {
    // Auto-open import modal via /props?import=1
    const params = new URLSearchParams(location.search);
    if (params.get('import') === '1') setImportOpen(true);
  }, [location.search]);

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

    if (!currentShowId) {
      setProps([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = firebaseService.listenToCollection<Prop>(
      'props',
      (data: FirebaseDocument<Prop>[]) => {
        const propList = data
          .map(doc => ({ ...doc.data, id: doc.id }))
          .filter(prop => prop.showId === currentShowId);
        setProps(propList);
        setLoading(false);
      },
      (err: Error) => {
        console.error("Error fetching props:", err);
        setError(`Failed to load props: ${err.message}. Please check your network connection and Firebase permissions.`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseService, isInitialized, firebaseInitError, currentShowId]);

  // Removed unused handler

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
    const pdf = new jsPDF({ orientation: pdfOptions.layout });
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
      <div className="relative min-h-[70vh] flex flex-col justify-center items-center bg-gradient-to-br from-pb-primary/40 via-pb-darker/80 to-pb-accent/30 rounded-xl shadow-xl p-6">
        {/* Search and Filters */}
        <div className="w-full max-w-3xl flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search props..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-pb-primary/30 bg-pb-darker/40 text-white placeholder-pb-gray focus:outline-none focus:ring-2 focus:ring-pb-primary"
          />
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
        {!currentShowId && (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-pb-primary font-semibold text-lg mb-2">Please select a show to view its props.</div>
          </div>
        )}
        <h2 className="text-2xl font-bold mb-6 self-start">Props List</h2>
        <div className="w-full max-w-3xl flex justify-between mb-4 gap-2">
          <div>
            {currentShowId && (
              <button
                onClick={() => setImportOpen(true)}
                className="px-4 py-2 rounded-lg bg-pb-primary text-white font-semibold shadow hover:bg-pb-secondary"
              >
                Import Props
              </button>
            )}
          </div>
          {userProfile && (userProfile.role === 'god' || userProfile.role === 'admin' || userProfile.role === 'editor' || userProfile.role === 'props_supervisor' || userProfile.role === 'art_director') && (
            <button
              onClick={handleDownloadCsv}
              disabled={downloadingCsv}
              className="px-4 py-2 rounded-lg bg-pb-primary text-white font-semibold shadow hover:bg-pb-secondary disabled:opacity-60"
            >
              {downloadingCsv ? 'Preparing CSV…' : 'Download CSV'}
            </button>
          )}
        </div>
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
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <svg className="animate-spin h-10 w-10 text-pb-primary mb-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
            <div className="text-pb-gray mt-2">Loading props...</div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64">
            <svg className="h-10 w-10 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
            <div className="text-red-500 font-semibold">{error}</div>
          </div>
        ) : filteredProps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <svg className="h-10 w-10 text-pb-gray mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9 6 9-6" /></svg>
            <div className="text-pb-gray">No props found.</div>
          </div>
        ) : (
          <div className="w-full max-w-3xl mx-auto">
            {filteredProps.map((prop) => (
              <PropCardWeb key={prop.id} prop={prop} />
            ))}
          </div>
        )}
        <Link
          to="/props/add"
          className="fixed bottom-10 right-10 z-50 bg-pb-primary hover:bg-pb-accent text-white rounded-full shadow-lg p-4 flex items-center justify-center transition focus:outline-none focus:ring-2 focus:ring-pb-primary"
          title="Add Prop"
          aria-label="Add Prop"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </Link>
        {importOpen && (
          <ImportPropsModal
            open={importOpen}
            onClose={() => { setImportOpen(false); if (location.search.includes('import=1')) navigate('/props', { replace: true }); }}
            onImported={() => { setImportOpen(false); if (location.search.includes('import=1')) navigate('/props', { replace: true }); }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default PropsListPage; 