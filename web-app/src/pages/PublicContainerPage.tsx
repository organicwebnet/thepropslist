import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import './Public.css';

type PackedProp = { name: string; quantity?: number; id?: string; category?: string };
type ContainerDoc = {
  id: string;
  name?: string;
  description?: string;
  props?: PackedProp[];
  status?: string;
  location?: string;
};

export default function PublicContainerPage() {
  const { containerId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [box, setBox] = useState<ContainerDoc | null>(null);

  useEffect(() => {
    const fetchBox = async () => {
      try {
        setLoading(true);
        setError(null);
        // Minimal, anonymous fetch via a Cloud Function or public API endpoint if you have one.
        // Fallback: try Firestore REST API if security rules allow reading this document.
        const res = await fetch(`/api/public/container?id=${encodeURIComponent(String(containerId))}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setBox({ id: containerId || '', ...data });
      } catch (e: any) {
        setError(e.message || 'Failed to load container');
      } finally {
        setLoading(false);
      }
    };
    if (containerId) fetchBox();
  }, [containerId]);

  if (loading) return <div className="public-wrap"><div className="card">Loading…</div></div>;
  if (error) return <div className="public-wrap"><div className="card error">{error}</div></div>;
  if (!box) return <div className="public-wrap"><div className="card">Not found.</div></div>;

  return (
    <div className="public-wrap">
      <div className="card">
        <h1 className="title">{box.name || 'Container'}</h1>
        {box.description && <p className="muted">{box.description}</p>}
        <div className="muted" style={{ marginTop: 8 }}>GUID: <code>{box.id}</code></div>
        <div className="muted" style={{ marginTop: 8 }}>Status: {box.status || '—'}</div>
        {box.location && (
          <div className="muted" style={{ marginTop: 8 }}>
            📍 Location: <strong>{box.location}</strong>
          </div>
        )}

        <h2 className="subtitle" style={{ marginTop: 16 }}>Contents</h2>
        {Array.isArray(box.props) && box.props.length > 0 ? (
          <ul className="list">
            {box.props.map((p, idx) => (
              <li key={p.id || `${p.name}-${idx}`} className="list-item">
                <div className="prop-name">{p.name}</div>
                <div className="prop-meta">Qty: {p.quantity || 1}{p.category ? ` • ${p.category}` : ''}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="muted">No items listed.</div>
        )}

        <div className="footer">
          <Link to="/" className="home-link">Back to site</Link>
        </div>
      </div>
    </div>
  );
}


