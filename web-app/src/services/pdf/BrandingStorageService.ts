import { type BrandingPresetOptions } from './BrandingPresetService';

export interface StoredBrandingSettings {
  currentBranding: BrandingPresetOptions;
  lastUsed: string;
  autoSave: boolean;
}

export class BrandingStorageService {
  private static instance: BrandingStorageService;
  private readonly STORAGE_KEY = 'propslist_branding_settings';
  private readonly AUTO_SAVE_KEY = 'propslist_branding_autosave';

  private constructor() {}

  public static getInstance(): BrandingStorageService {
    if (!BrandingStorageService.instance) {
      BrandingStorageService.instance = new BrandingStorageService();
    }
    return BrandingStorageService.instance;
  }

  /**
   * Save current branding settings to localStorage
   */
  public saveBrandingSettings(branding: BrandingPresetOptions): void {
    try {
      const settings: StoredBrandingSettings = {
        currentBranding: branding,
        lastUsed: new Date().toISOString(),
        autoSave: true
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      console.log('Branding settings saved to localStorage');
    } catch (error) {
      console.error('Failed to save branding settings:', error);
    }
  }

  /**
   * Load branding settings from localStorage
   */
  public loadBrandingSettings(): BrandingPresetOptions | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const settings: StoredBrandingSettings = JSON.parse(stored);
      
      // Validate the stored data
      if (!settings.currentBranding || !this.isValidBranding(settings.currentBranding)) {
        console.warn('Invalid branding data in localStorage, clearing...');
        this.clearBrandingSettings();
        return null;
      }

      console.log('Branding settings loaded from localStorage');
      return settings.currentBranding;
    } catch (error) {
      console.error('Failed to load branding settings:', error);
      this.clearBrandingSettings();
      return null;
    }
  }

  /**
   * Clear all branding settings from localStorage
   */
  public clearBrandingSettings(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.AUTO_SAVE_KEY);
      console.log('Branding settings cleared from localStorage');
    } catch (error) {
      console.error('Failed to clear branding settings:', error);
    }
  }

  /**
   * Check if branding settings exist in localStorage
   */
  public hasStoredBranding(): boolean {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored !== null;
    } catch (error) {
      console.error('Failed to check for stored branding:', error);
      return false;
    }
  }

  /**
   * Get the last used timestamp
   */
  public getLastUsed(): string | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const settings: StoredBrandingSettings = JSON.parse(stored);
      return settings.lastUsed;
    } catch (error) {
      console.error('Failed to get last used timestamp:', error);
      return null;
    }
  }

  /**
   * Enable or disable auto-save
   */
  public setAutoSave(enabled: boolean): void {
    try {
      localStorage.setItem(this.AUTO_SAVE_KEY, JSON.stringify(enabled));
    } catch (error) {
      console.error('Failed to set auto-save setting:', error);
    }
  }

  /**
   * Check if auto-save is enabled
   */
  public isAutoSaveEnabled(): boolean {
    try {
      const stored = localStorage.getItem(this.AUTO_SAVE_KEY);
      return stored ? JSON.parse(stored) : true; // Default to true
    } catch (error) {
      console.error('Failed to check auto-save setting:', error);
      return true;
    }
  }

  /**
   * Export branding settings as JSON
   */
  public exportBrandingSettings(): string | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const settings: StoredBrandingSettings = JSON.parse(stored);
      return JSON.stringify(settings, null, 2);
    } catch (error) {
      console.error('Failed to export branding settings:', error);
      return null;
    }
  }

  /**
   * Import branding settings from JSON
   */
  public importBrandingSettings(jsonData: string): boolean {
    try {
      const settings: StoredBrandingSettings = JSON.parse(jsonData);
      
      if (!this.isValidBranding(settings.currentBranding)) {
        throw new Error('Invalid branding data');
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      console.log('Branding settings imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import branding settings:', error);
      return false;
    }
  }

  /**
   * Get default branding settings
   */
  public getDefaultBranding(): BrandingPresetOptions {
    return {
      companyName: 'Your Company Name',
      companyLogo: null,
      primaryColor: '#1e40af',
      secondaryColor: '#3b82f6',
      accentColor: '#22c55e',
      fontFamily: 'Inter',
      fontSize: 'medium'
    };
  }

  /**
   * Validate branding options
   */
  private isValidBranding(branding: any): branding is BrandingPresetOptions {
    return (
      branding &&
      typeof branding === 'object' &&
      typeof branding.companyName === 'string' &&
      typeof branding.primaryColor === 'string' &&
      typeof branding.secondaryColor === 'string' &&
      typeof branding.accentColor === 'string' &&
      typeof branding.fontFamily === 'string' &&
      ['small', 'medium', 'large'].includes(branding.fontSize) &&
      (branding.companyLogo === null || typeof branding.companyLogo === 'string')
    );
  }
}
