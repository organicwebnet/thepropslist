import React from 'react';
import { Link } from 'react-router-dom';

export interface PropImage {
  id: string;
  url: string;
  caption?: string;
  isMain?: boolean;
}

export interface PropCardWebProps {
  prop: {
    name: string;
    description?: string;
    status?: string;
    quantity?: number;
    images?: PropImage[];
    imageUrl?: string;
    id: string;
  };
}

const statusColors: Record<string, string> = {
  in: 'bg-green-600',
  maintenance: 'bg-yellow-500',
  retired: 'bg-gray-500',
  available: 'bg-blue-600',
  '': 'bg-pb-gray',
};

const PropCardWeb: React.FC<PropCardWebProps> = ({ prop }) => {
  // Use main image, or first image, or fallback
  const mainImage =
    (prop.images?.find(img => img.isMain)?.url) ||
    (prop.images && prop.images.length > 0 ? prop.images[0].url : '') ||
    prop.imageUrl ||
    '';
  const hasImage = !!mainImage && mainImage.trim() !== '';
  const status = prop.status || '';
  const statusColor = statusColors[status] || 'bg-pb-gray';
  const quantity = typeof prop.quantity === 'number' ? prop.quantity : 1;

  return (
    <Link to={`/props/${prop.id}`} className="block group focus:outline-none focus:ring-2 focus:ring-pb-primary rounded-xl">
      <div className="flex items-center bg-pb-darker/60 backdrop-blur-md rounded-xl shadow-lg p-4 mb-4 hover:bg-pb-primary/10 transition cursor-pointer group-focus:ring-2 group-focus:ring-pb-primary">
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-pb-gray flex items-center justify-center mr-4 flex-shrink-0">
          {hasImage ? (
            <img
              src={mainImage}
              alt={prop.name}
              className="object-cover w-full h-full"
              onError={e => (e.currentTarget.style.display = 'none')}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-pb-light/60">
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9 6 9-6" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg text-white truncate mb-1">{prop.name || 'Unnamed Prop'}</div>
          {prop.description && (
            <div className="text-pb-gray text-sm mb-2 line-clamp-2">{prop.description}</div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${statusColor}`}>{status || 'unknown'}</span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-pb-primary/30 text-white">Qty: {quantity}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PropCardWeb; 