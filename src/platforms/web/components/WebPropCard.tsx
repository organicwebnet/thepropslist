import React from 'react';
import { Link, useRouter } from 'expo-router'; // Import Link for navigation, Added useRouter
import type { Prop } from '../../../shared/types/props.ts';
// Remove direct import of lifecycle types if no longer needed here
// import { PropLifecycleStatus, lifecycleStatusLabels, lifecycleStatusPriority } from '@/types/lifecycle'; 

// Import helpers from the new utility file
import { statusColorMap, getStatusLabel, formatDateTime } from '../utils/propDisplayUtils.ts';
// import { Card, CardContent, CardActions, Typography, Button, Chip, Box, Grid } from '@mui/material';
// import { styled } from '@mui/material/styles';
import { Calendar as CalendarIcon, Image as ImageIcon } from 'lucide-react';

// --- SVG Icons ---
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
// --- ---

interface WebPropCardProps {
  prop: Prop;
  onDelete: (id: string) => void; // Keep for button action
}

// Remove local helper definitions (statusColorMap, getStatusLabel, formatDateTime)
// They are now imported from propDisplayUtils.ts

export function WebPropCard({ prop, onDelete }: WebPropCardProps) {
  const router = useRouter(); // Added router
  // Use imported helpers
  const statusLabel = getStatusLabel(prop.status);
  const colors = statusColorMap[prop.status] || { bg: 'bg-gray-600/20', text: 'text-gray-400', border: 'border-gray-500/50' };
  const displayImage = prop.images?.[0]?.url ?? prop.imageUrl; // Use first image or fallback to imageUrl

  const dimensionString = [
    prop.length && `L: ${prop.length}`,
    prop.width && `W: ${prop.width}`,
    prop.height && `H: ${prop.height}`
  ].filter(Boolean).join(' x ') + (prop.unit ? ` ${prop.unit}` : '');

  const lastModifiedString = formatDateTime(prop.updatedAt); // Use updatedAt

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md flex flex-col overflow-hidden h-full relative group"> {/* Added relative and group */}
      {/* Edit/Delete Icons - Positioned top-right */}
      <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <Link href={`/props/${prop.id}/edit`} asChild>
          <button
            className="p-1 rounded-full bg-gray-700/80 hover:bg-blue-600 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Edit Prop"
          >
            <EditIcon />
          </button>
        </Link>
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(prop.id); }} // Prevent link navigation
          className="p-1 rounded-full bg-gray-700/80 hover:bg-red-600 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          aria-label="Delete Prop"
        >
          <DeleteIcon />
        </button>
      </div>

      {/* Link wrapper for card content - this is the outer link */}
      <Link href={`/props/${prop.id}` as any} className="cursor-pointer">
        {displayImage ? (
          <img
            src={displayImage}
            alt={prop.name}
            className="w-full h-40 object-cover" // Kept image size
          />
        ) : (
          <div className="w-full h-40 bg-gray-700 flex items-center justify-center text-gray-500">
            No Image
          </div>
        )}

        <div className="p-4 flex flex-col flex-grow">
          {/* Top section: Title, Act/Scene, Category */}
          <div className="mb-2">
            <h3 className="text-lg font-semibold text-gray-100 truncate mb-1">{prop.name}</h3>
            <div className="flex items-center gap-2 text-xs text-red-400"> {/* Icon color matches old design */}
              {/* Act/Scene */}
              {(prop.act || prop.scene) && (
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" /></svg>
                  {prop.act && `Act ${prop.act}`}
                  {prop.act && prop.scene && ', '}
                  {prop.scene && `Scene ${prop.scene}`}
                </span>
              )}
              {/* Category Tag */}
              {prop.category && (
                 <span className={`inline-block px-2 py-0.5 rounded-full bg-red-900/70 text-red-300 border border-red-700/80`}> {/* Category style from old design */}
                  {prop.category}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-400 mb-2">
            {prop.description || 'No description'}
          </p>

          {/* Dimensions */}
          {dimensionString && (
             <p className="text-xs text-gray-500 mb-3">{dimensionString}</p>
          )}

          {/* Status Pill & Modified Info - Pushed towards bottom */}
          <div className="mt-auto space-y-1">
             {/* Status Pill */}
            <span
              className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
            >
              {statusLabel}
            </span>
             {/* Modified Info */}
             {prop.hasBeenModified && (
              <div className="flex items-center gap-1 text-xs text-red-500"> {/* Warning color */}
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1.75-5.75a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3z" clipRule="evenodd" />
                </svg>
                Modified Prop
              </div>
             )}
             {/* Modification details/timestamp */}
             {(prop.hasBeenModified && prop.modificationDetails) && (
                 <p className="text-xs text-gray-500">{prop.modificationDetails}</p>
             )}
             {lastModifiedString && (
                <p className="text-xs text-gray-500">Modified on {lastModifiedString}</p>
             )}
          </div>

        </div>
      </Link> {/* End Link wrapper */}
    </div>
  );
} 