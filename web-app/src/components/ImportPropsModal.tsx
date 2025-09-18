import React, { useMemo, useRef, useState } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { useShowSelection } from '../contexts/ShowSelectionContext';
import { useWebAuth } from '../contexts/WebAuthContext';

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

const ImportPropsModal: React.FC<{ open: boolean; onClose: () => void; onImported?: (n: number) => void }> = ({ open, onClose, onImported }) => {
  const { service } = useFirebase();
  const { currentShowId } = useShowSelection();
  const { user } = useWebAuth();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Partial<Record<MappingKey, string>>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [copied, setCopied] = useState(false);
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
    return {
      userId: user?.uid || '',
      showId: currentShowId || '',
      name: get(row, 'name') || 'Untitled',
      description: get(row, 'description') || '',
      category: get(row, 'category') || 'Other',
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
      price: Number.isFinite(price) ? price : 0,
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
name,description,category,quantity,price,act,scene,tags,location,status,imageUrl

Rules:
- Keep one prop per row; quote fields that contain commas.
- Map common synonyms: qty→quantity, cost→price, notes→description, image/photo→imageUrl.
- If a value is missing, leave the cell empty (do not write N/A).
- category should be one of: Furniture, Decoration, Costume, Weapon, Food/Drink, Book/Paper, Electronics, Musical Instrument, Hand Prop, Set Dressing, Special Effects, Lighting, Other (or leave empty if unsure).
- tags: separate multiple tags with commas.
- status (optional) examples: available_in_storage, in_transit, under_maintenance.
- act/scene should be numbers if present.

Output only the CSV (no commentary).`;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback: ignore copy failures silently
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
      onImported?.(ok);
      onClose();
    } catch (e: any) {
      setErrors([e?.message || 'Import failed.']);
    } finally {
      setImporting(false);
      importLockRef.current = false;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white text-black rounded-xl shadow-xl w-full max-w-3xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xl font-bold">Import Props from CSV</div>
          <button className="text-gray-600 hover:text-black" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <input ref={fileRef} type="file" accept=".csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            <a
              className="text-pb-primary underline"
              href={`data:text/csv;charset=utf-8,${encodeURIComponent('name,description,category,quantity,price,act,scene,tags,location,status,imageUrl\nChair,,Furniture,1,0,,,stage left,available_in_storage,')}`}
              download="props-template.csv"
            >
              Download template
            </a>
            <button
              type="button"
              onClick={copyAiPrompt}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-100"
              title="Copy an AI prompt to help reformat your data"
            >
              {copied ? 'AI prompt copied' : 'Copy AI prompt'}
            </button>
          </div>
          <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-3">
            Tip: If your spreadsheet is messy, paste the “AI prompt” and your table into your AI assistant to get a clean CSV matching our columns. Then upload that CSV here.
          </div>
          {!!headers.length && (
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="font-semibold mb-2">Map columns</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(['name','description','category','quantity','price','act','scene','tags','location','status','imageUrl'] as MappingKey[]).map((k) => (
                  <div key={k} className="flex items-center gap-2">
                    <div className="w-28 text-sm font-medium capitalize">{k.replace(/([A-Z])/g, ' $1')}</div>
                    <select
                      className="flex-1 border rounded px-2 py-1"
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
            </div>
          )}
          {!!headers.length && (
            <div className="border border-gray-200 rounded-lg p-3 overflow-x-auto text-sm">
              <div className="font-semibold mb-2">Preview</div>
              <table className="min-w-full">
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="text-left px-2 py-1 border-b border-gray-200">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i} className="odd:bg-gray-50">
                      {r.map((c, j) => (
                        <td key={j} className="px-2 py-1 border-b border-gray-100">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!!errors.length && <div className="text-red-600 text-sm">{errors.join(' ')}</div>}
          <div className="flex justify-end gap-2">
            <button className="px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-60" onClick={onClose} disabled={importing}>
              Cancel
            </button>
            <button
              className="px-3 py-2 rounded-lg bg-pb-primary text-white hover:bg-pb-accent disabled:opacity-60"
              onClick={doImport}
              disabled={importing || !headers.length}
            >
              {importing ? 'Importing…' : 'Import'}
            </button>
          </div>
          <div className="text-xs text-gray-600">Tip: Map what you have; you can complete missing fields later.</div>
        </div>
      </div>
    </div>
  );
};

export default ImportPropsModal;
