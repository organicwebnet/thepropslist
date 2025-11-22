import React, { useMemo, useRef, useState } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { useShowSelection } from '../contexts/ShowSelectionContext';
import { useWebAuth } from '../contexts/WebAuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../PropsBibleHomepage';
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Download, Copy, Eye } from 'lucide-react';

type MappingKey =
  | 'name'
  | 'description'
  | 'category'
  | 'quantity'
  | 'price'
  | 'act'
  | 'scene'
  | 'tags'
  | 'location'
  | 'status'
  | 'source'
  | 'imageUrl';

const SUGGESTED: Partial<Record<MappingKey, string[]>> = {
  name: ['name', 'prop', 'title', 'item'],
  description: ['description', 'desc', 'details', 'notes'],
  category: ['category', 'cat', 'group'],
  quantity: ['qty', 'quantity', 'qnt'],
  price: ['price', 'cost', 'budget'],
  act: ['act'],
  scene: ['scene'],
  tags: ['tags', 'labels', 'keywords'],
  location: ['location', 'loc', 'store', 'box'],
  status: ['status', 'state'],
  source: ['source', 'origin', 'acquired'],
  imageUrl: ['image', 'imageurl', 'photo', 'img'],
};

function guess(headers: string[]) {
  const map: Partial<Record<MappingKey, string>> = {};
  const norm = (s: string) => s.trim().toLowerCase();
  headers.forEach((h) =>
    Object.entries(SUGGESTED).forEach(([k, c]) => {
      if (!map[k as MappingKey] && (c || []).some((x) => norm(h) === x)) map[k as MappingKey] = h;
    }),
  );
  if (!map.name) {
    const h = headers.find((x) => /name|title|item/i.test(x));
    if (h) map.name = h;
  }
  return map;
}

async function parseCsv(file: File) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] as string[][] };
  const split = (line: string) => {
    const out: string[] = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = !q;
      } else if (ch === ',' && !q) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = split(lines[0]);
  const rows = lines
    .slice(1)
    .map(split)
    .filter((r) => r.some(Boolean));
  return { headers, rows };
}

const MAX_ROWS = 1000;

const ImportPropsPage: React.FC = () => {
  const { service } = useFirebase();
  const { currentShowId } = useShowSelection();
  const { user } = useWebAuth();
  const navigate = useNavigate();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Partial<Record<MappingKey, string>>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const importLockRef = useRef<boolean>(false);

  const mappedIdx = useMemo(() => {
    const idx: Partial<Record<MappingKey, number>> = {};
    (Object.keys(mapping) as MappingKey[]).forEach((k) => {
      const h = mapping[k];
      if (!h) return;
      const i = headers.indexOf(h);
      if (i >= 0) idx[k] = i;
    });
    return idx;
  }, [mapping, headers]);

  const onFile = async (f: File) => {
    const { headers, rows } = await parseCsv(f);
    setHeaders(headers);
    if (rows.length > MAX_ROWS) {
      setRows(rows.slice(0, MAX_ROWS));
      setErrors([`This importer is limited to ${MAX_ROWS} rows per upload. Imported the first ${MAX_ROWS} rows. Upload the remainder in another file.`]);
    } else {
      setRows(rows);
      setErrors([]);
    }
    setMapping(guess(headers));
    setImported(null);
  };

  const get = (row: string[], k: MappingKey) => {
    const i = mappedIdx[k];
    return i == null ? '' : row[i] || '';
  };

  const isValidImageUrl = (value?: string) => {
    if (!value) return false;
    try {
      const u = new URL(value);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
      const lower = u.pathname.toLowerCase();
      if (!/(\.png|\.jpe?g|\.gif|\.webp|\.svg)(\?.*)?$/.test(lower)) return false;
      return true;
    } catch {
      return false;
    }
  };

  const createPayload = (row: string[]) => {
    const qty = parseInt(get(row, 'quantity') || '1', 10);
    const price = parseFloat(get(row, 'price') || '0');
    const act = parseInt(get(row, 'act') || '', 10);
    const scene = parseInt(get(row, 'scene') || '', 10);
    const tags = (get(row, 'tags') || '')
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const rawImage = get(row, 'imageUrl') || undefined;
    const imageUrl = isValidImageUrl(rawImage) ? rawImage : undefined;
    
    // Validate and set source field (required)
    const validSources = ['bought', 'made', 'rented', 'borrowed', 'owned', 'created', 'hired'];
    const rawSource = (get(row, 'source') || '').toLowerCase().trim();
    const source = validSources.includes(rawSource) ? rawSource : 'bought';
    
    return {
      userId: user?.uid || '',
      showId: currentShowId || '',
      name: get(row, 'name') || 'Untitled',
      description: get(row, 'description') || '',
      category: get(row, 'category') || 'Other',
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
      price: Number.isFinite(price) ? price : 0,
      source,
      act: Number.isFinite(act) ? act : undefined,
      scene: Number.isFinite(scene) ? scene : undefined,
      tags,
      location: get(row, 'location') || undefined,
      status: get(row, 'status') || 'available_in_storage',
      imageUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;
  };

  const copyAiPrompt = async () => {
    const prompt = `You are a data cleanup assistant. Reformat the following props list into a clean CSV with these exact headers in this order:
name,description,category,quantity,price,act,scene,tags,location,status,source,imageUrl

Rules:
- Keep one prop per row; quote fields that contain commas.
- Map common synonyms: qty→quantity, cost→price, notes→description, image/photo→imageUrl.
- If a value is missing, leave the cell empty (do not write N/A).
- category should be one of: Furniture, Decoration, Costume, Weapon, Food/Drink, Book/Paper, Electronics, Musical Instrument, Hand Prop, Set Dressing, Special Effects, Lighting, Other (or leave empty if unsure).
- tags: separate multiple tags with commas.
- status (optional) examples: available_in_storage, in_transit, under_maintenance.
- source (optional) should be one of: bought, made, rented, borrowed, owned, created, hired. Defaults to 'bought' if not provided.
- act/scene should be numbers if present.

Output only the CSV (no commentary).`;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard copy failed', err);
    }
  };

  const doImport = async () => {
    setErrors([]);
    if (!currentShowId) {
      setErrors(['Please select a show first.']);
      return;
    }
    if (!user?.uid) {
      setErrors(['You must be signed in to import props.']);
      return;
    }
    if (!headers.length || !rows.length) {
      setErrors(['Choose a CSV file first.']);
      return;
    }
    if (!mapping.name) {
      setErrors(['Map a Name column.']);
      return;
    }
    if (importLockRef.current) {
      return;
    }
    importLockRef.current = true;
    setImporting(true);
    try {
      let ok = 0;
      for (const r of rows) {
        await service.addDocument('props', createPayload(r));
        ok++;
      }
      setImported(ok);
      setErrors([]);
    } catch (e: any) {
      setErrors([e?.message || 'Import failed.']);
    } finally {
      setImporting(false);
      importLockRef.current = false;
    }
  };

  const getPreviewData = () => {
    if (!rows.length) return [];
    return rows.slice(0, 10).map((row, index) => ({
      index: index + 1,
      data: createPayload(row)
    }));
  };

  const previewData = getPreviewData();

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-pb-primary/40 via-pb-darker/80 to-pb-accent/30 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate('/props')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pb-darker/60 hover:bg-pb-darker/80 text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Props
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Upload className="w-8 h-8 text-pb-primary" />
                Import Props from CSV
              </h1>
              <p className="text-pb-gray mt-1">Upload and preview your CSV data before importing</p>
            </div>
          </div>

          {/* Success Message */}
          {imported !== null && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <div>
                <h3 className="text-green-400 font-semibold">Import Successful!</h3>
                <p className="text-green-300">Successfully imported {imported} props to your show.</p>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <div>
                <h3 className="text-red-400 font-semibold">Import Error</h3>
                <p className="text-red-300">{errors.join(' ')}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - File Upload and Mapping */}
            <div className="space-y-6">
              {/* File Upload Section */}
              <div className="bg-pb-darker/60 backdrop-blur-sm rounded-xl p-6 border border-pb-primary/20">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-pb-primary" />
                  Upload CSV File
                </h2>
                
                <div className="space-y-4">
                  <div className="text-sm text-pb-gray bg-pb-darker/40 border border-pb-primary/20 rounded-lg p-4">
                    <strong className="text-pb-primary">Tip:</strong> If your spreadsheet is messy, paste the "AI prompt" and your table into your AI assistant to get a clean CSV matching our columns. Then upload that CSV here.
                  </div>
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    <input 
                      ref={fileRef} 
                      type="file" 
                      accept=".csv" 
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="px-4 py-2 rounded-lg bg-pb-primary hover:bg-pb-secondary text-white font-semibold flex items-center gap-2 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Choose File
                    </button>
                    <span className="text-pb-gray text-sm">
                      {fileRef.current?.files?.[0]?.name || 'No file chosen'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <a
                      className="text-pb-primary underline hover:text-pb-accent flex items-center gap-1 text-sm"
                      href={`data:text/csv;charset=utf-8,${encodeURIComponent('name,description,category,quantity,price,act,scene,tags,location,status,source,imageUrl\nChair,,Furniture,1,0,,,stage left,available_in_storage,bought,')}`}
                      download="props-template.csv"
                    >
                      <Download className="w-4 h-4" />
                      Download template
                    </a>
                    <button
                      type="button"
                      onClick={copyAiPrompt}
                      className="px-3 py-1.5 rounded-lg border border-pb-primary/30 text-pb-primary hover:bg-pb-primary/10 flex items-center gap-1 text-sm transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? 'AI prompt copied' : 'Copy AI prompt'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Column Mapping Section */}
              {headers.length > 0 && (
                <div className="bg-pb-darker/60 backdrop-blur-sm rounded-xl p-6 border border-pb-primary/20">
                  <h2 className="text-xl font-semibold text-white mb-4">Map Columns</h2>
                  <div className="grid grid-cols-1 gap-3">
                    {(['name','description','category','quantity','price','act','scene','tags','location','status','source','imageUrl'] as MappingKey[]).map((k) => (
                      <div key={k} className="flex items-center gap-3">
                        <label className="w-32 text-sm font-medium text-pb-gray capitalize">
                          {k.replace(/([A-Z])/g, ' $1')}
                          {k === 'name' && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <select
                          className="flex-1 px-3 py-2 rounded-lg border border-pb-primary/30 bg-pb-darker/40 text-white focus:outline-none focus:ring-2 focus:ring-pb-primary"
                          value={mapping[k] || ''}
                          onChange={(e) => setMapping((prev) => ({ ...prev, [k]: e.target.value || undefined }))}
                        >
                          <option value="">—</option>
                          {headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-xs text-pb-gray">
                    * Required field. Map what you have; you can complete missing fields later.
                  </div>
                </div>
              )}

              {/* Import Actions */}
              {headers.length > 0 && (
                <div className="bg-pb-darker/60 backdrop-blur-sm rounded-xl p-6 border border-pb-primary/20">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">Import Actions</h2>
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="px-3 py-1.5 rounded-lg bg-pb-primary/20 hover:bg-pb-primary/30 text-pb-primary flex items-center gap-2 text-sm transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      {showPreview ? 'Hide' : 'Show'} Preview
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-sm text-pb-gray">
                      Ready to import <strong className="text-white">{rows.length}</strong> props
                      {mapping.name && (
                        <span className="text-green-400 ml-2">✓ Name column mapped</span>
                      )}
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        className="px-6 py-3 rounded-lg bg-pb-primary hover:bg-pb-secondary text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        onClick={doImport}
                        disabled={importing || !mapping.name}
                      >
                        {importing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Importing...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            Import Props
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Data Preview */}
            {showPreview && headers.length > 0 && (
              <div className="bg-pb-darker/60 backdrop-blur-sm rounded-xl p-6 border border-pb-primary/20">
                <h2 className="text-xl font-semibold text-white mb-4">Data Preview</h2>
                
                <div className="space-y-4">
                  <div className="text-sm text-pb-gray">
                    Showing first 10 rows of {rows.length} total rows
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-pb-primary/20">
                          <th className="text-left py-2 px-3 text-pb-gray font-medium">#</th>
                          <th className="text-left py-2 px-3 text-pb-gray font-medium">Name</th>
                          <th className="text-left py-2 px-3 text-pb-gray font-medium">Category</th>
                          <th className="text-left py-2 px-3 text-pb-gray font-medium">Quantity</th>
                          <th className="text-left py-2 px-3 text-pb-gray font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map(({ index, data }) => (
                          <tr key={index} className="border-b border-pb-primary/10 hover:bg-pb-primary/5">
                            <td className="py-2 px-3 text-pb-gray">{index}</td>
                            <td className="py-2 px-3 text-white font-medium">{data.name}</td>
                            <td className="py-2 px-3 text-pb-gray">{data.category}</td>
                            <td className="py-2 px-3 text-pb-gray">{data.quantity}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-1 rounded-full text-xs bg-pb-primary/20 text-pb-primary">
                                {data.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {rows.length > 10 && (
                    <div className="text-xs text-pb-gray text-center">
                      ... and {rows.length - 10} more rows
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ImportPropsPage;
