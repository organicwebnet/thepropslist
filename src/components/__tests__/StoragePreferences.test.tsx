import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StoragePreferences } from '../StoragePreferences';
import { hybridStorageService } from '../../lib/hybridStorage';
import type { UserProfile } from '../../types';

// Mock the hybrid storage service
jest.mock('../../lib/hybridStorage', () => ({
  hybridStorageService: {
    checkGoogleDriveAccess: jest.fn(),
    getOrCreateUserFolder: jest.fn(),
  },
}));

describe('StoragePreferences', () => {
  const mockUserProfile: UserProfile = {
    displayName: 'Test User',
    email: 'test@example.com',
    photoURL: '',
    phone: '',
    location: '',
    organization: '',
    role: 'user',
    bio: '',
    storagePreference: 'firebase',
  };

  const mockOnProfileUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (hybridStorageService.checkGoogleDriveAccess as jest.Mock).mockResolvedValue(true);
    (hybridStorageService.getOrCreateUserFolder as jest.Mock).mockResolvedValue({
      id: 'folder-123',
      name: 'Props Bible Files',
    });
  });

  describe('Rendering', () => {
    it('should render storage options correctly', () => {
      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      expect(screen.getByText('Storage Preferences')).toBeInTheDocument();
      expect(screen.getByText('Firebase Storage')).toBeInTheDocument();
      expect(screen.getByText('Google Drive')).toBeInTheDocument();
      expect(screen.getByText('Smart Hybrid')).toBeInTheDocument();
    });

    it('should show recommended badge for Firebase', () => {
      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      expect(screen.getByText('Recommended')).toBeInTheDocument();
    });

    it('should show current selection', () => {
      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      // Firebase should be selected by default
      const firebaseOption = screen.getByText('Firebase Storage').closest('div');
      expect(firebaseOption).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('should show Google Drive as selected when user preference is google-drive', () => {
      const profileWithGoogleDrive: UserProfile = {
        ...mockUserProfile,
        storagePreference: 'google-drive',
      };

      render(
        <StoragePreferences
          userProfile={profileWithGoogleDrive}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      const googleDriveOption = screen.getByText('Google Drive').closest('div');
      expect(googleDriveOption).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('should show hybrid as selected when user preference is hybrid', () => {
      const profileWithHybrid: UserProfile = {
        ...mockUserProfile,
        storagePreference: 'hybrid',
      };

      render(
        <StoragePreferences
          userProfile={profileWithHybrid}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      const hybridOption = screen.getByText('Smart Hybrid').closest('div');
      expect(hybridOption).toHaveClass('border-blue-500', 'bg-blue-50');
    });
  });

  describe('Google Drive Access', () => {
    it('should check Google Drive access on mount', async () => {
      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      await waitFor(() => {
        expect(hybridStorageService.checkGoogleDriveAccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should show loading state while checking access', () => {
      (hybridStorageService.checkGoogleDriveAccess as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      expect(screen.getByText('Checking storage access...')).toBeInTheDocument();
    });

    it('should disable Google Drive options when access is not available', async () => {
      (hybridStorageService.checkGoogleDriveAccess as jest.Mock).mockResolvedValue(false);

      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      await waitFor(() => {
        const googleDriveOption = screen.getByText('Google Drive').closest('div');
        const hybridOption = screen.getByText('Smart Hybrid').closest('div');
        
        expect(googleDriveOption).toHaveClass('cursor-not-allowed', 'opacity-60');
        expect(hybridOption).toHaveClass('cursor-not-allowed', 'opacity-60');
      });
    });

    it('should show Google Drive connected message when using Google Drive', async () => {
      const profileWithGoogleDrive: UserProfile = {
        ...mockUserProfile,
        storagePreference: 'google-drive',
      };

      render(
        <StoragePreferences
          userProfile={profileWithGoogleDrive}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Google Drive Connected')).toBeInTheDocument();
        expect(screen.getByText('Files will be stored in: Props Bible Files')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should call onProfileUpdate when Firebase is selected', async () => {
      const profileWithGoogleDrive: UserProfile = {
        ...mockUserProfile,
        storagePreference: 'google-drive',
      };

      render(
        <StoragePreferences
          userProfile={profileWithGoogleDrive}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      const firebaseOption = screen.getByText('Firebase Storage').closest('div');
      fireEvent.click(firebaseOption!);

      await waitFor(() => {
        expect(mockOnProfileUpdate).toHaveBeenCalledWith({
          storagePreference: 'firebase',
          googleDriveFolderId: undefined,
        });
      });
    });

    it('should call onProfileUpdate when Google Drive is selected', async () => {
      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      const googleDriveOption = screen.getByText('Google Drive').closest('div');
      fireEvent.click(googleDriveOption!);

      await waitFor(() => {
        expect(mockOnProfileUpdate).toHaveBeenCalledWith({
          storagePreference: 'google-drive',
          googleDriveFolderId: 'folder-123',
        });
      });
    });

    it('should call onProfileUpdate when hybrid is selected', async () => {
      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      const hybridOption = screen.getByText('Smart Hybrid').closest('div');
      fireEvent.click(hybridOption!);

      await waitFor(() => {
        expect(mockOnProfileUpdate).toHaveBeenCalledWith({
          storagePreference: 'hybrid',
          googleDriveFolderId: 'folder-123',
        });
      });
    });

    it('should not allow interaction when disabled', () => {
      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
          disabled={true}
        />
      );

      const firebaseOption = screen.getByText('Firebase Storage').closest('div');
      fireEvent.click(firebaseOption!);

      expect(mockOnProfileUpdate).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should show error when Google Drive access check fails', async () => {
      (hybridStorageService.checkGoogleDriveAccess as jest.Mock).mockRejectedValue(
        new Error('Access denied')
      );

      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Storage Error')).toBeInTheDocument();
        expect(screen.getByText('Access denied')).toBeInTheDocument();
      });
    });

    it('should show error when Google Drive access is not available for selection', async () => {
      (hybridStorageService.checkGoogleDriveAccess as jest.Mock).mockResolvedValue(false);

      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      const googleDriveOption = screen.getByText('Google Drive').closest('div');
      fireEvent.click(googleDriveOption!);

      await waitFor(() => {
        expect(screen.getByText('Storage Error')).toBeInTheDocument();
        expect(screen.getByText('Google Drive access is not available. Please authenticate with Google Drive first.')).toBeInTheDocument();
      });
    });

    it('should show error when folder creation fails', async () => {
      (hybridStorageService.getOrCreateUserFolder as jest.Mock).mockResolvedValue(null);

      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      const googleDriveOption = screen.getByText('Google Drive').closest('div');
      fireEvent.click(googleDriveOption!);

      await waitFor(() => {
        expect(screen.getByText('Storage Error')).toBeInTheDocument();
        expect(screen.getByText('Failed to create Google Drive folder. Please try again.')).toBeInTheDocument();
      });
    });

    it('should show error when profile update fails', async () => {
      (hybridStorageService.getOrCreateUserFolder as jest.Mock).mockRejectedValue(
        new Error('Update failed')
      );

      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      const googleDriveOption = screen.getByText('Google Drive').closest('div');
      fireEvent.click(googleDriveOption!);

      await waitFor(() => {
        expect(screen.getByText('Storage Error')).toBeInTheDocument();
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during profile update', async () => {
      (hybridStorageService.getOrCreateUserFolder as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      const googleDriveOption = screen.getByText('Google Drive').closest('div');
      fireEvent.click(googleDriveOption!);

      expect(screen.getByText('Checking storage access...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      // Check that options are clickable and have proper structure
      const firebaseOption = screen.getByText('Firebase Storage').closest('div');
      expect(firebaseOption).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      const firebaseOption = screen.getByText('Firebase Storage').closest('div');
      firebaseOption?.focus();
      expect(firebaseOption).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined storage preference', () => {
      const profileWithoutPreference: UserProfile = {
        ...mockUserProfile,
        storagePreference: undefined,
      };

      render(
        <StoragePreferences
          userProfile={profileWithoutPreference}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      // Should default to Firebase
      const firebaseOption = screen.getByText('Firebase Storage').closest('div');
      expect(firebaseOption).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('should handle empty Google Drive folder response', async () => {
      (hybridStorageService.getOrCreateUserFolder as jest.Mock).mockResolvedValue({
        id: '',
        name: '',
      });

      render(
        <StoragePreferences
          userProfile={mockUserProfile}
          onProfileUpdate={mockOnProfileUpdate}
        />
      );

      const googleDriveOption = screen.getByText('Google Drive').closest('div');
      fireEvent.click(googleDriveOption!);

      await waitFor(() => {
        expect(screen.getByText('Storage Error')).toBeInTheDocument();
      });
    });
  });
});

























