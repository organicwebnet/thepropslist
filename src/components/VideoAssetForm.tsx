import React, { useState } from 'react';
import { PlusCircle, X, Video, Link2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { DigitalAsset } from '@/shared/types/props'; // Use DigitalAsset for now

interface VideoAssetFormProps {
  assets: DigitalAsset[];
  onChange: (assets: DigitalAsset[]) => void;
  disabled?: boolean;
}

export function VideoAssetForm({ assets = [], onChange, disabled = false }: VideoAssetFormProps) {
  const [newVideoName, setNewVideoName] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddVideo = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newVideoUrl.trim()) {
      setError('Please enter a video URL.');
      return;
    }

    // Basic URL validation (can be enhanced)
    try {
      new URL(newVideoUrl);
    } catch (_) {
      setError('Invalid URL format.');
      return;
    }

    const newId = uuidv4();
    const newAsset: DigitalAsset = {
      id: newId,
      name: newVideoName.trim() || newVideoUrl, // Use URL as name if name is empty
      url: newVideoUrl.trim(),
      type: 'video', // Explicitly set type
    };

    onChange([...assets, newAsset]);
    setNewVideoName('');
    setNewVideoUrl('');
  };

  const handleRemoveAsset = (id: string) => {
    onChange(assets.filter(asset => asset.id !== id));
  };

  // Styles similar to DigitalAssetForm or PropForm inputs
  const inputStyles = "w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50";
  const buttonStyles = "inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50";

  return (
    <div className="space-y-4">
      {/* Input form for adding a new video */}
      <form onSubmit={handleAddVideo} className="p-4 bg-[#1A1A1A] border border-gray-800 rounded-lg space-y-3">
        <div className="flex items-center space-x-2">
           <Video className="h-5 w-5 text-gray-400 flex-shrink-0" />
           <h4 className="text-sm font-medium text-gray-300">Add Video Link</h4>
        </div>
        <div>
          <label htmlFor="videoName" className="sr-only">Video Name (Optional)</label>
          <input
            id="videoName"
            type="text"
            value={newVideoName}
            onChange={(e) => setNewVideoName(e.target.value)}
            placeholder="Video Name (Optional)"
            maxLength={100}
            className={inputStyles}
            disabled={disabled}
          />
        </div>
        <div>
          <label htmlFor="videoUrl" className="sr-only">Video URL</label>
          <input
            id="videoUrl"
            type="url"
            value={newVideoUrl}
            onChange={(e) => setNewVideoUrl(e.target.value)}
            placeholder="Paste Video URL (e.g., YouTube, Vimeo)"
            required
            className={inputStyles}
            disabled={disabled}
          />
        </div>
         {error && (
           <p className="text-red-400 text-xs">{error}</p>
         )}
        <button
          type="submit"
          className={buttonStyles + " w-full justify-center"}
          disabled={disabled}
        >
          <PlusCircle className="h-4 w-4 mr-1" />
          Add Video
        </button>
      </form>

      {/* List of added videos (handled in PropForm) */}
      {/* The display logic is moved to PropForm to keep this component focused */}

    </div>
  );
} 