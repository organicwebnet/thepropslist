import React, { useEffect, useState } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';
import { ImageUpload } from './ImageUpload';
import type { PropImage } from '../types/props';

type Props = {
  propId: string;
  initial?: any;
};

const MaintenanceInlineForm: React.FC<Props> = ({ propId, initial }) => {
  const { service } = useFirebase();
  const [mode, setMode] = useState<'repair' | 'modify' | 'replace'>('repair');
  const [notes, setNotes] = useState<string>(initial?.maintenanceNotes || '');
  const [dueBy, setDueBy] = useState<string>('');
  const [availableFrom, setAvailableFrom] = useState<string>('');
  const [contact, setContact] = useState<string>('');
  const [repairImages, setRepairImages] = useState<PropImage[]>(initial?.repairImages || []);
  const [videoUrl, setVideoUrl] = useState<string>((initial as any)?.maintenanceVideoUrl || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const showId = initial?.showId;
        if (!showId) { setRequests([]); return; }
        const boards = await service.getDocuments<any>('todo_boards', { where: [['showId', '==', showId]] });
        const board = boards?.[0];
        if (!board) { setRequests([]); return; }
        const lists = await service.getDocuments<any>(`todo_boards/${board.id}/lists`);
        const items: any[] = [];
        for (const l of (lists || [])) {
          const cards = await service.getDocuments<any>(`todo_boards/${board.id}/lists/${l.id}/cards`);
          cards.forEach(c => {
            const d = c.data || {};
            const matches = d.propId === propId || (String(d.description || '').includes(`(prop:${propId})`));
            if (matches) items.push({ id: c.id, listId: l.id, boardId: board.id, title: d.title, createdAt: d.createdAt, completed: d.completed, assignedTo: d.assignedTo || [], maintenanceMode: d.maintenanceMode });
          });
        }
        items.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setRequests(items);
      } catch {
        setRequests([]);
      }
    };
    load();
  }, [service, propId, initial?.showId, success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: any = {
        maintenanceNotes: notes,
        maintenanceMode: mode,
        updatedAt: new Date().toISOString(),
      };
      if (mode === 'repair' || mode === 'modify') {
        payload.repairDueBy = dueBy || null;
        payload.repairAvailableFrom = availableFrom || null;
        payload.repairContact = contact || null;
        payload.repairImages = repairImages;
      } else if (mode === 'replace') {
        payload.replaceDueBy = dueBy || null;
        payload.replaceContact = contact || null;
      }
      await service.updateDocument('props', propId, payload);

      // create a task card for the props supervisor to action
      try {
        const showId = initial?.showId;
        if (showId) {
          const boards = await service.getDocuments<any>('todo_boards', { where: [['showId', '==', showId]] });
          const board = boards?.[0];
          if (board) {
            const lists = await service.getDocuments<any>(`todo_boards/${board.id}/lists`);
            const targetList = (lists || []).find((l: any) => ((l.data?.name || '').toLowerCase().includes('to do')) ) || lists?.[0];
            if (targetList) {
              const cardTitle = `${mode === 'replace' ? 'Replace' : mode === 'modify' ? 'Modify' : 'Repair'}: ${initial?.name || ''}`.trim();
              const description = `${notes || ''}\n\nLinked: [@${initial?.name || 'Prop'}](prop:${propId})`;
              const newCard = await service.addDocument(`todo_boards/${board.id}/lists/${targetList.id}/cards`, {
                title: cardTitle,
                description,
                order: 0,
                createdAt: new Date().toISOString(),
                maintenanceMode: mode,
                propId,
                assignedTo: [],
                completed: false,
                // If a video URL is provided, store it in attachments so it opens in the card modal
                attachments: (videoUrl && videoUrl.trim()) ? [videoUrl.trim()] : [],
              });
              await service.updateDocument('props', propId, { maintenanceTaskId: newCard?.id || null });
            }
          }
        }
      } catch (err) {
        console.warn('Failed to create maintenance task card', err);
      }
      setSuccess('Maintenance updated');
    } catch (err: any) {
      setError(err.message || 'Failed to update maintenance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-pb-darker/40 rounded-lg p-4 border border-pb-primary/20 space-y-4">
      <div className="text-white font-semibold">Update Maintenance</div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {success && <div className="text-green-500 text-sm">{success}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mode !== 'replace' && (
          <div className="md:col-span-2">
            <label className="block text-pb-gray mb-1 text-sm">Photos / Videos</label>
            <ImageUpload onImagesChange={(imgs) => setRepairImages(imgs)} currentImages={repairImages} />
          </div>
        )}
        <div className="md:col-span-2">
          <label className="block text-pb-gray mb-1 text-sm">Video URL (optional)</label>
          <input
            className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="https://... (YouTube, Vimeo, Google Drive, MP4)"
          />
        </div>
        <div>
          <label className="block text-pb-gray mb-1 text-sm">Type</label>
          <select className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" value={mode} onChange={e => setMode(e.target.value as any)}>
            <option value="repair">Repair</option>
            <option value="modify">Modify</option>
            <option value="replace">Replace</option>
          </select>
        </div>
        <div>
          <label className="block text-pb-gray mb-1 text-sm">Main Contact</label>
          <input className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" value={contact} onChange={e => setContact(e.target.value)} placeholder="Name / Email / Phone" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-pb-gray mb-1 text-sm">{mode === 'replace' ? 'Reason' : 'Details'}</label>
          <textarea className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe the work needed" />
        </div>
        <div>
          <label className="block text-pb-gray mb-1 text-sm">{mode === 'replace' ? 'Needed By' : 'Repair Needed By'}</label>
          <input type="date" className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" value={dueBy} onChange={e => setDueBy(e.target.value)} />
        </div>
        {mode !== 'replace' && (
          <>
            <div>
              <label className="block text-pb-gray mb-1 text-sm">Available To Work From</label>
              <input type="date" className="w-full rounded bg-pb-darker border border-pb-primary/30 p-2 text-white" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} />
            </div>
          </>
        )}
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-pb-primary text-white font-semibold hover:bg-pb-accent disabled:opacity-60">
          {saving ? 'Saving…' : 'Save Maintenance'}
        </button>
      </div>
      <div className="mt-4">
        <div className="text-white font-semibold mb-2">Maintenance Requests</div>
        {requests.length === 0 ? (
          <div className="text-pb-gray text-sm">No maintenance requests yet.</div>
        ) : (
          <ul className="space-y-2">
            {requests.map(r => (
              <li key={r.id} className="bg-pb-darker/40 rounded p-3 border border-pb-primary/20">
                <div className="flex items-center justify-between">
                  <div className="text-white font-medium">{r.title}</div>
                  <a className="text-pb-accent underline text-sm" href={`/boards?selectedCardId=${r.id}&boardId=${r.boardId}`}>Open</a>
                </div>
                <div className="text-pb-gray text-xs mt-1">Mode: {r.maintenanceMode || 'n/a'} • Assigned: {r.assignedTo?.length ? r.assignedTo.join(', ') : 'Unassigned'} • {r.completed ? 'Completed' : 'Open'}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
};

export default MaintenanceInlineForm;


