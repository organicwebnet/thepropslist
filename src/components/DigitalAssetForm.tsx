import React, { useState, useEffect } from 'react';
import { PlusCircle, X, FileText, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { DigitalAsset } from '../shared/types/props.ts';
import { useFirebase } from '../contexts/FirebaseContext.tsx';

interface DigitalAssetFormProps {
  assets: DigitalAsset[];
  onChange: (assets: DigitalAsset[]) => void;
  disabled?: boolean;
}

export function DigitalAssetForm({ assets = [], onChange, disabled = false }: DigitalAssetFormProps) {
  const { service } = useFirebase();
  const [validating, setValidating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<Record<string, 'valid' | 'invalid' | 'pending'>>({});

  const validateGoogleDriveUrl = async (url: string): Promise<boolean> => {
    try {
      // Extract file ID from various Google Drive URL formats
      let fileId: string | null = null;
      
      // Format 1: /file/d/FILE_ID/view
      const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileMatch) {
        fileId = fileMatch[1];
      }
      
      // Format 2: /open?id=FILE_ID
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (!fileId && idMatch) {
        fileId = idMatch[1];
      }

      if (!fileId) {
        throw new Error('Invalid Google Drive URL format. Please use a sharing link from Google Drive.');
      }

      // Construct the file preview URL
      const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;

      // This validation logic might need adjustment if it relied on direct storage access
      // For now, assume fetch works or storage interaction is handled elsewhere
      // Example: If upload was needed, you might use service.uploadFile()
      
      // Try to fetch the file preview
      const response = await fetch(previewUrl, {
        method: 'HEAD',
        mode: 'no-cors' // This is important for cross-origin requests
      });

      // Since we're using no-cors, we won't get status information
      // Instead, we'll assume the file is accessible if we get here
      return true;
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to validate file access. Please check the URL and try again.');
      }
      return false;
    }
  };

  const handleAddAsset = () => {
    const newId = uuidv4();
    onChange([
      ...assets,
      {
        id: newId,
        name: '',
        url: '',
        type: 'other'
      }
    ]);
    setValidationStatus(prev => ({ ...prev, [newId]: 'pending' }));
  };

  const handleRemoveAsset = (id: string) => {
    onChange(assets.filter(asset => asset.id !== id));
    setValidationStatus(prev => {
        const newState = {...prev};
        delete newState[id];
        return newState;
    });
  };

  const handleAssetChange = async (id: string, field: keyof DigitalAsset, value: string) => {
    const updatedAssets = assets.map(asset => {
      if (asset.id === id) {
        let type: DigitalAsset['type'] = asset.type;
        if (field === 'url') {
           if (value.includes('google.com/document')) type = 'document';
           else if (value.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) type = 'image';
           else if (value.match(/\.(mp4|mov|avi|webm)$/i)) type = 'video';
           else type = 'other';
        }
        const updatedAsset = { ...asset, [field]: value, type };
        
        if (field === 'url' && value) {
          setValidating(id);
          setError(null);
          setValidationStatus(prev => ({ ...prev, [id]: 'pending' }));
          
          validateGoogleDriveUrl(value).then(isValid => {
            setValidationStatus(prev => ({ ...prev, [id]: isValid ? 'valid' : 'invalid' }));
            setValidating(null);
          });
        } else if (field === 'url' && !value) {
            setValidationStatus(prev => ({ ...prev, [id]: 'pending' }));
        }
        
        return updatedAsset;
      }
      return asset;
    });

    onChange(updatedAssets);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Digital Assets</h3>
        <button
          type="button"
          onClick={handleAddAsset}
          className="inline-flex items-center text-sm text-primary hover:text-primary/80"
          disabled={disabled}
        >
          <PlusCircle className="h-4 w-4 mr-1" />
          Add File
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className="p-4 bg-[#1A1A1A] border border-gray-800 rounded-lg space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={asset.name}
                  onChange={(e) => handleAssetChange(asset.id, 'name', e.target.value)}
                  placeholder="Enter file name/description"
                  maxLength={100}
                  className="bg-transparent border-none text-white placeholder-gray-500 focus:outline-none focus:ring-0 flex-1 min-w-0"
                  disabled={disabled}
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveAsset(asset.id)}
                className="text-gray-400 hover:text-red-400"
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <input
                type="url"
                value={asset.url}
                onChange={(e) => handleAssetChange(asset.id, 'url', e.target.value)}
                placeholder="Paste Google Drive sharing link"
                className="w-full bg-[#0A0A0A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-10"
                disabled={disabled}
              />
              {validating === asset.id ? (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
              ) : asset.url && (
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>

            {validationStatus[asset.id] === 'invalid' && (
              <div className="flex items-center space-x-2 text-yellow-500 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Unable to verify file access. Check URL/sharing settings.</span>
              </div>
            )}
          </div>
        ))}

        {assets.length === 0 && (
          <div className="text-center py-8 border border-dashed border-gray-800 rounded-lg">
            <p className="text-gray-400">No digital assets added yet. Click "Add File" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
