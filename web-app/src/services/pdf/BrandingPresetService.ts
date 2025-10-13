// Removed unused import

export interface BrandingPreset {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  branding: {
    companyName: string;
    companyLogo?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    fontSize: 'small' | 'medium' | 'large';
  };
}

export interface BrandingPresetOptions {
  companyName: string;
  companyLogo?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: 'small' | 'medium' | 'large';
}

export class BrandingPresetService {
  private static instance: BrandingPresetService;
  private presets: Map<string, BrandingPreset> = new Map();
  private defaultPresets: BrandingPreset[] = [];

  private constructor() {
    this.initializeDefaultPresets();
  }

  public static getInstance(): BrandingPresetService {
    if (!BrandingPresetService.instance) {
      BrandingPresetService.instance = new BrandingPresetService();
    }
    return BrandingPresetService.instance;
  }

  private initializeDefaultPresets(): void {
    this.defaultPresets = [
      {
        id: 'default-professional',
        name: 'Professional',
        description: 'Clean, professional branding with blue accents',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        branding: {
          companyName: 'Your Company Name',
          primaryColor: '#1e40af',
          secondaryColor: '#3b82f6',
          accentColor: '#22c55e',
          fontFamily: 'Inter',
          fontSize: 'medium'
        }
      },
      {
        id: 'default-creative',
        name: 'Creative',
        description: 'Vibrant, creative branding with purple and orange',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        branding: {
          companyName: 'Your Company Name',
          primaryColor: '#7c3aed',
          secondaryColor: '#a855f7',
          accentColor: '#f59e0b',
          fontFamily: 'Poppins',
          fontSize: 'medium'
        }
      },
      {
        id: 'default-minimal',
        name: 'Minimal',
        description: 'Minimalist design with monochrome palette',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        branding: {
          companyName: 'Your Company Name',
          primaryColor: '#000000',
          secondaryColor: '#666666',
          accentColor: '#22c55e',
          fontFamily: 'Helvetica',
          fontSize: 'medium'
        }
      },
      {
        id: 'default-theatrical',
        name: 'Theatrical',
        description: 'Dramatic branding perfect for theater productions',
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        branding: {
          companyName: 'Your Company Name',
          primaryColor: '#dc2626',
          secondaryColor: '#ef4444',
          accentColor: '#fbbf24',
          fontFamily: 'Playfair Display',
          fontSize: 'large'
        }
      }
    ];

    // Add default presets to the presets map
    this.defaultPresets.forEach(preset => {
      this.presets.set(preset.id, preset);
    });
  }

  /**
   * Get all available presets (default + user custom)
   */
  public getAllPresets(): BrandingPreset[] {
    return Array.from(this.presets.values()).sort((a, b) => {
      // Default presets first, then custom presets
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  /**
   * Get default presets only
   */
  public getDefaultPresets(): BrandingPreset[] {
    return this.defaultPresets;
  }

  /**
   * Get user custom presets only
   */
  public getUserPresets(): BrandingPreset[] {
    return Array.from(this.presets.values())
      .filter(preset => !preset.isDefault)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Get a specific preset by ID
   */
  public getPreset(id: string): BrandingPreset | undefined {
    return this.presets.get(id);
  }

  /**
   * Create a new custom preset
   */
  public createPreset(
    name: string,
    description: string,
    branding: BrandingPresetOptions
  ): BrandingPreset {
    const id = this.generateId();
    const now = new Date().toISOString();

    const preset: BrandingPreset = {
      id,
      name,
      description,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      branding
    };

    this.presets.set(id, preset);
    return preset;
  }

  /**
   * Update an existing preset
   */
  public updatePreset(
    id: string,
    updates: Partial<BrandingPreset>
  ): BrandingPreset | null {
    const preset = this.presets.get(id);
    if (!preset) {
      return null;
    }

    if (preset.isDefault) {
      throw new Error('Cannot modify default presets');
    }

    const updatedPreset: BrandingPreset = {
      ...preset,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.presets.set(id, updatedPreset);
    return updatedPreset;
  }

  /**
   * Delete a custom preset
   */
  public deletePreset(id: string): boolean {
    const preset = this.presets.get(id);
    if (!preset) {
      return false;
    }

    if (preset.isDefault) {
      throw new Error('Cannot delete default presets');
    }

    return this.presets.delete(id);
  }

  /**
   * Duplicate a preset
   */
  public duplicatePreset(id: string, newName: string): BrandingPreset | null {
    const originalPreset = this.presets.get(id);
    if (!originalPreset) {
      return null;
    }

    return this.createPreset(
      newName,
      `Copy of ${originalPreset.name}`,
      originalPreset.branding
    );
  }

  /**
   * Apply a preset to get branding options
   */
  public applyPreset(id: string): BrandingPresetOptions | null {
    const preset = this.presets.get(id);
    if (!preset) {
      return null;
    }

    return preset.branding;
  }

  /**
   * Get the default preset (first default preset)
   */
  public getDefaultPreset(): BrandingPreset {
    return this.defaultPresets[0];
  }

  /**
   * Validate branding options
   */
  public validateBranding(branding: Partial<BrandingPresetOptions>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!branding.companyName || branding.companyName.trim().length === 0) {
      errors.push('Company name is required');
    }

    if (!branding.primaryColor || !this.isValidColor(branding.primaryColor)) {
      errors.push('Valid primary color is required');
    }

    if (!branding.secondaryColor || !this.isValidColor(branding.secondaryColor)) {
      errors.push('Valid secondary color is required');
    }

    if (!branding.accentColor || !this.isValidColor(branding.accentColor)) {
      errors.push('Valid accent color is required');
    }

    if (!branding.fontFamily || branding.fontFamily.trim().length === 0) {
      errors.push('Font family is required');
    }

    if (branding.fontSize && !['small', 'medium', 'large'].includes(branding.fontSize)) {
      errors.push('Font size must be small, medium, or large');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get suggested color combinations
   */
  public getColorSuggestions(): Array<{
    name: string;
    primary: string;
    secondary: string;
    accent: string;
  }> {
    return [
      {
        name: 'Ocean Blue',
        primary: '#1e40af',
        secondary: '#3b82f6',
        accent: '#22c55e'
      },
      {
        name: 'Sunset Orange',
        primary: '#ea580c',
        secondary: '#f97316',
        accent: '#fbbf24'
      },
      {
        name: 'Forest Green',
        primary: '#166534',
        secondary: '#22c55e',
        accent: '#84cc16'
      },
      {
        name: 'Royal Purple',
        primary: '#7c3aed',
        secondary: '#a855f7',
        accent: '#f59e0b'
      },
      {
        name: 'Crimson Red',
        primary: '#dc2626',
        secondary: '#ef4444',
        accent: '#fbbf24'
      },
      {
        name: 'Midnight Black',
        primary: '#000000',
        secondary: '#374151',
        accent: '#22c55e'
      }
    ];
  }

  /**
   * Get available font families
   */
  public getFontFamilies(): Array<{
    name: string;
    value: string;
    category: 'sans-serif' | 'serif' | 'monospace' | 'display';
  }> {
    return [
      { name: 'Inter', value: 'Inter', category: 'sans-serif' },
      { name: 'Helvetica', value: 'Helvetica', category: 'sans-serif' },
      { name: 'Arial', value: 'Arial', category: 'sans-serif' },
      { name: 'Poppins', value: 'Poppins', category: 'sans-serif' },
      { name: 'Roboto', value: 'Roboto', category: 'sans-serif' },
      { name: 'Playfair Display', value: 'Playfair Display', category: 'serif' },
      { name: 'Times New Roman', value: 'Times New Roman', category: 'serif' },
      { name: 'Georgia', value: 'Georgia', category: 'serif' },
      { name: 'Courier New', value: 'Courier New', category: 'monospace' },
      { name: 'Monaco', value: 'Monaco', category: 'monospace' }
    ];
  }

  private isValidColor(color: string): boolean {
    // Check if it's a valid hex color
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  private generateId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
