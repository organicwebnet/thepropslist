import React, { useState } from 'react';
import DashboardLayout from '../PropsBibleHomepage';
import { useFirebase } from '../contexts/FirebaseContext';
import { useWebAuth } from '../contexts/WebAuthContext';
import { storage } from '../firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const FeedbackPage: React.FC = () => {
  const { service } = useFirebase();
  const { user } = useWebAuth();
  const [type, setType] = useState<'bug' | 'feature' | 'feedback'>('bug');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const doc = {
        type,
        severity,
        title,
        message,
        email: email || user?.email || null,
        page: window.location.pathname,
        userId: user?.uid || null,
        appVersion: import.meta.env.VITE_APP_VERSION || null,
        createdAt: new Date().toISOString(),
        status: 'new'
      } as any;
      const id = await service.addDocument('feedback', doc);
      // Optional screenshot upload
      if (file) {
        const path = `feedback/${id}/${Date.now()}_${file.name}`;
        const sref = storageRef(storage, path);
        await uploadBytes(sref, file);
        const url = await getDownloadURL(sref);
        await service.setDocument('feedback', id, { screenshotUrl: url } as any, { merge: true } as any);
      }
      setSubmittedId(id);
      setTitle('');
      setMessage('');
      setFile(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to send feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6 text-white">Send Feedback or Report a Bug</h1>
        <form onSubmit={handleSubmit} className="bg-pb-darker/60 rounded-xl p-6 border border-pb-primary/20 space-y-4">
          {error && <div className="p-2 rounded border border-red-500/30 text-red-300 bg-red-500/10 text-sm">{error}</div>}
          <div>
            <label className="block text-pb-gray text-xs mb-1">Type</label>
            <select
              className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary"
              value={type}
              onChange={e => setType(e.target.value as any)}
            >
              <option value="bug">Bug</option>
              <option value="feature">Feature request</option>
              <option value="feedback">General feedback</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-pb-gray text-xs mb-1">Severity</label>
              <select className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:border-pb-primary" value={severity} onChange={e => setSeverity(e.target.value as any)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-pb-gray text-xs mb-1">Email (optional)</label>
              <input className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:border-pb-primary" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <label className="block text-pb-gray text-xs mb-1">Screenshot (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-pb-gray file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-pb-primary/20 file:text-pb-primary hover:file:bg-pb-primary/30" />
          </div>
          <div>
            <label className="block text-pb-gray text-xs mb-1">Title</label>
            <input className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:border-pb-primary" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div>
            <label className="block text-pb-gray text-xs mb-1">Message</label>
            <textarea className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:border-pb-primary" rows={5} value={message} onChange={e => setMessage(e.target.value)} required />
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" className="px-4 py-2 rounded bg-pb-primary text-white font-semibold shadow hover:bg-pb-secondary transition-colors disabled:opacity-60" disabled={submitting || !title.trim() || !message.trim()}>
              {submitting ? 'Sending…' : 'Submit'}
            </button>
            {submittedId && <span className="text-green-400 text-sm">Thanks! Reference: {submittedId}</span>}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default FeedbackPage;