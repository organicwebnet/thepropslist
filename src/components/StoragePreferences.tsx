import React, { useState, useEffect } from 'react';
import { Check, Cloud, HardDrive, Settings, AlertCircle, Loader2 } from 'lucide-react';
import { hybridStorageService, StorageProvider } from '../lib/hybridStorage';
import type { UserProfile } from '../types';

interface StoragePreferencesProps {
  userProfile: UserProfile;
  onProfileUpdate: (updates: Partial<UserProfile>) => void;
  disabled?: boolean;
}

export function StoragePreferences({ userProfile, onProfileUpdate, disabled = false }: StoragePreferencesProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [googleDriveAccess, setGoogleDriveAccess] = useState<boolean | null>(null);
  const [userFolder, setUserFolder] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentProvider = userProfile.storagePreference || 'firebase';

  useEffect(() => {
    checkGoogleDriveAccess();
  }, []);

  const checkGoogleDriveAccess = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const hasAccess = await hybridStorageService.checkGoogleDriveAccess();
      setGoogleDriveAccess(hasAccess);
      
      if (hasAccess) {
        const folder = await hybridStorageService.getOrCreateUserFolder();
        setUserFolder(folder);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to check Google Drive access');
      setGoogleDriveAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderChange = async (provider: StorageProvider) => {
    if (disabled) return;

    try {
      setIsLoading(true);
      setError(null);

      // If switching to Google Drive, check access first
      if (provider === 'google-drive' || provider === 'hybrid') {
        if (googleDriveAccess === false) {
          setError('Google Drive access is not available. Please authenticate with Google Drive first.');
          return;
        }

        // Get or create user folder
        const folder = await hybridStorageService.getOrCreateUserFolder();
        if (!folder) {
          setError('Failed to create Google Drive folder. Please try again.');
          return;
        }

        onProfileUpdate({
          storagePreference: provider,
          googleDriveFolderId: folder.id
        });
      } else {
        onProfileUpdate({
          storagePreference: provider,
          googleDriveFolderId: undefined
        });
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update storage preference');
    } finally {
      setIsLoading(false);
    }
  };

  const storageOptions = [
    {
      id: 'firebase' as StorageProvider,
      name: 'Firebase Storage',
      description: 'Store files in the app\'s cloud storage',
      icon: Cloud,
      pros: ['Fast access', 'Integrated with app', 'Automatic backups'],
      cons: ['Limited by app storage', 'No direct file access'],
      recommended: true
    },
    {
      id: 'google-drive' as StorageProvider,
      name: 'Google Drive',
      description: 'Store files in your personal Google Drive',
      icon: HardDrive,
      pros: ['Your own storage space', 'Access files anywhere', 'Share with team'],
      cons: ['Requires Google authentication', 'Slower for small files'],
      recommended: false,
      disabled: googleDriveAccess === false
    },
    {
      id: 'hybrid' as StorageProvider,
      name: 'Smart Hybrid',
      description: 'Small files in Firebase, large files in Google Drive',
      icon: Settings,
      pros: ['Best of both worlds', 'Cost effective', 'Optimized performance'],
      cons: ['More complex', 'Requires Google authentication'],
      recommended: false,
      disabled: googleDriveAccess === false
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-medium text-gray-900">Storage Preferences</h3>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Storage Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-sm text-gray-600">Checking storage access...</span>
        </div>
      )}

      <div className="space-y-4">
        {storageOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = currentProvider === option.id;
          const isDisabled = disabled || option.disabled || isLoading;

          return (
            <div
              key={option.id}
              className={`relative rounded-lg border-2 p-4 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : isDisabled
                  ? 'border-gray-200 bg-gray-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              onClick={() => !isDisabled && handleProviderChange(option.id)}
            >
              <div className="flex items-start space-x-3">
                <div className={`flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                  <Icon className="h-6 w-6" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900">{option.name}</h4>
                    {option.recommended && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Recommended
                      </span>
                    )}
                    {isSelected && (
                      <Check className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  
                  <p className="mt-1 text-sm text-gray-600">{option.description}</p>
                  
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <h5 className="text-xs font-medium text-green-700">Advantages:</h5>
                      <ul className="mt-1 text-xs text-green-600">
                        {option.pros.map((pro, index) => (
                          <li key={index}>• {pro}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-medium text-red-700">Considerations:</h5>
                      <ul className="mt-1 text-xs text-red-600">
                        {option.cons.map((con, index) => (
                          <li key={index}>• {con}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {userFolder && (currentProvider === 'google-drive' || currentProvider === 'hybrid') && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <Check className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Google Drive Connected</h3>
              <div className="mt-2 text-sm text-green-700">
                Files will be stored in: <strong>{userFolder.name}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        <p>
          <strong>Note:</strong> You can change your storage preference at any time. 
          Existing files will remain in their current location, but new uploads will use your selected preference.
        </p>
      </div>
    </div>
  );
}













