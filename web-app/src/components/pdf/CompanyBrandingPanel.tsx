import React, { useState, useEffect } from 'react';
import { Upload, Palette, Eye, Save, Download, Trash2 } from 'lucide-react';
import { BrandingStorageService } from '../../services/pdf/BrandingStorageService';

interface CompanyBranding {
  companyName: string;
  companyLogo: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: 'small' | 'medium' | 'large';
}

interface CompanyBrandingPanelProps {
  onBrandingChange: (branding: CompanyBranding) => void;
  initialBranding?: Partial<CompanyBranding>;
}

const CompanyBrandingPanel: React.FC<CompanyBrandingPanelProps> = ({
  onBrandingChange,
  initialBranding = {}
}) => {
  const brandingStorageService = BrandingStorageService.getInstance();
  const [branding, setBranding] = useState<CompanyBranding>({
    companyName: '',
    companyLogo: null,
    primaryColor: '#0ea5e9',
    secondaryColor: '#3b82f6',
    accentColor: '#22c55e',
    fontFamily: 'Inter',
    fontSize: 'medium',
    ...initialBranding
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(branding.companyLogo);
  const [contrastWarnings, setContrastWarnings] = useState<Record<string, string>>({});

  // Contrast checking functions
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const getContrastRatio = (color1: string, color2: string): number => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return 1;
    
    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  };

  const checkColorContrast = (color: string, colorType: string): string | null => {
    const whiteContrast = getContrastRatio(color, '#ffffff');
    const blackContrast = getContrastRatio(color, '#000000');
    
    // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
    const minContrast = 4.5;
    
    if (whiteContrast < minContrast && blackContrast < minContrast) {
      return `⚠️ ${colorType} colour has poor contrast on both light and dark backgrounds. Consider choosing a darker or lighter colour for better readability.`;
    } else if (whiteContrast < minContrast) {
      return `⚠️ ${colorType} colour may be hard to read on light backgrounds. Consider using a darker colour.`;
    } else if (blackContrast < minContrast) {
      return `⚠️ ${colorType} colour may be hard to read on dark backgrounds. Consider using a lighter colour.`;
    }
    
    return null;
  };

  const fontOptions = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Roboto', label: 'Roboto' },
    { value: 'Open Sans', label: 'Open Sans' },
    { value: 'Lato', label: 'Lato' },
    { value: 'Montserrat', label: 'Montserrat' },
    { value: 'Source Sans Pro', label: 'Source Sans Pro' },
    { value: 'Poppins', label: 'Poppins' },
    { value: 'Nunito', label: 'Nunito' },
    { value: 'Raleway', label: 'Raleway' },
    { value: 'Ubuntu', label: 'Ubuntu' },
    { value: 'Playfair Display', label: 'Playfair Display' },
    { value: 'Merriweather', label: 'Merriweather' },
    { value: 'PT Sans', label: 'PT Sans' },
    { value: 'Work Sans', label: 'Work Sans' },
    { value: 'Fira Sans', label: 'Fira Sans' },
    { value: 'Helvetica', label: 'Helvetica (System)' },
    { value: 'Arial', label: 'Arial (System)' },
    { value: 'Times New Roman', label: 'Times New Roman (System)' },
    { value: 'Georgia', label: 'Georgia (System)' }
  ];

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const logoUrl = e.target?.result as string;
        setLogoPreview(logoUrl);
        setBranding(prev => ({ ...prev, companyLogo: logoUrl }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorChange = (colorType: keyof Pick<CompanyBranding, 'primaryColor' | 'secondaryColor' | 'accentColor'>) => 
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newColor = event.target.value;
      setBranding(prev => ({ ...prev, [colorType]: newColor }));
      
      // Check contrast and update warnings
      const warning = checkColorContrast(newColor, colorType.charAt(0).toUpperCase() + colorType.slice(1));
      setContrastWarnings(prev => ({
        ...prev,
        [colorType]: warning || ''
      }));
    };

  const handleTextChange = (field: keyof Pick<CompanyBranding, 'companyName' | 'fontFamily'>) => 
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setBranding(prev => ({ ...prev, [field]: event.target.value }));
    };

  const handleFontSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setBranding(prev => ({ ...prev, fontSize: event.target.value as 'small' | 'medium' | 'large' }));
  };

  useEffect(() => {
    onBrandingChange(branding);
  }, [branding, onBrandingChange]);

  // Check initial colors for contrast issues
  useEffect(() => {
    const warnings: Record<string, string> = {};
    
    const primaryWarning = checkColorContrast(branding.primaryColor, 'Primary');
    if (primaryWarning) warnings.primaryColor = primaryWarning;
    
    const secondaryWarning = checkColorContrast(branding.secondaryColor, 'Secondary');
    if (secondaryWarning) warnings.secondaryColor = secondaryWarning;
    
    const accentWarning = checkColorContrast(branding.accentColor, 'Accent');
    if (accentWarning) warnings.accentColor = accentWarning;
    
    setContrastWarnings(warnings);
  }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Palette className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Company Branding</h3>
      </div>

      <div className="space-y-6">
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name
          </label>
          <input
            type="text"
            value={branding.companyName}
            onChange={handleTextChange('companyName')}
            placeholder="Enter your company name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
          />
        </div>

        {/* Company Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Logo
          </label>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors text-gray-900 bg-white"
              >
                <Upload className="w-4 h-4 text-gray-600" />
                <span>Upload Logo</span>
              </label>
            </div>
            {logoPreview && (
              <div className="flex items-center space-x-2">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-16 h-16 object-contain border border-gray-200 rounded"
                />
                <button
                  onClick={() => {
                    setLogoPreview(null);
                    setBranding(prev => ({ ...prev, companyLogo: null }));
                  }}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Color Scheme */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Color Scheme
          </label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Primary</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={branding.primaryColor}
                  onChange={handleColorChange('primaryColor')}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.primaryColor}
                  onChange={handleColorChange('primaryColor')}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded text-gray-900 bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Secondary</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={branding.secondaryColor}
                  onChange={handleColorChange('secondaryColor')}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.secondaryColor}
                  onChange={handleColorChange('secondaryColor')}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded text-gray-900 bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Accent</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={branding.accentColor}
                  onChange={handleColorChange('accentColor')}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.accentColor}
                  onChange={handleColorChange('accentColor')}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded text-gray-900 bg-white"
                />
              </div>
            </div>
          </div>
          
          {/* Contrast Warnings */}
          {(contrastWarnings.primaryColor || contrastWarnings.secondaryColor || contrastWarnings.accentColor) && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-start space-x-2">
                <div className="text-amber-600 text-sm">⚠️</div>
                <div className="text-sm text-amber-800">
                  <div className="font-medium mb-1">Accessibility Warning:</div>
                  <ul className="space-y-1">
                    {contrastWarnings.primaryColor && (
                      <li>• {contrastWarnings.primaryColor}</li>
                    )}
                    {contrastWarnings.secondaryColor && (
                      <li>• {contrastWarnings.secondaryColor}</li>
                    )}
                    {contrastWarnings.accentColor && (
                      <li>• {contrastWarnings.accentColor}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Typography */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Font Family
            </label>
            <select
              value={branding.fontFamily}
              onChange={handleTextChange('fontFamily')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            >
              {fontOptions.map(font => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Font Size
            </label>
            <select
              value={branding.fontSize}
              onChange={handleFontSizeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>

        {/* Preview */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 mb-3">
            <Eye className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Preview</span>
          </div>
          <div 
            className="p-4 border border-gray-200 rounded-md bg-white"
            style={{
              fontFamily: branding.fontFamily,
              fontSize: branding.fontSize === 'small' ? '12px' : branding.fontSize === 'large' ? '16px' : '14px'
            }}
          >
            <div className="flex items-center space-x-3 mb-3">
              {logoPreview && (
                <img src={logoPreview} alt="Logo" className="w-8 h-8 object-contain" />
              )}
              <h4 
                className="font-semibold"
                style={{ color: branding.primaryColor }}
              >
                {branding.companyName || 'Your Company Name'}
              </h4>
            </div>
            <div className="space-y-2">
              <div 
                className="text-sm"
                style={{ color: branding.secondaryColor }}
              >
                Secondary text color
              </div>
              <div 
                className="text-sm font-medium"
                style={{ color: branding.accentColor }}
              >
                Accent color for highlights
              </div>
            </div>
          </div>
        </div>

        {/* Branding Settings Management */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Branding Settings</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                brandingStorageService.saveBrandingSettings(branding);
                alert('Branding settings saved successfully!');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Settings
            </button>
            
            <button
              onClick={() => {
                const saved = brandingStorageService.loadBrandingSettings();
                if (saved) {
                  setBranding(saved);
                  setLogoPreview(saved.companyLogo);
                  alert('Branding settings loaded successfully!');
                } else {
                  alert('No saved branding settings found.');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Load Settings
            </button>
            
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all saved branding settings? This action cannot be undone.')) {
                  brandingStorageService.clearBrandingSettings();
                  alert('Branding settings cleared successfully!');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear Settings
            </button>
          </div>
          
          <div className="mt-3 text-sm text-gray-600">
            <p>• <strong>Save Settings:</strong> Store your current branding configuration</p>
            <p>• <strong>Load Settings:</strong> Restore previously saved branding</p>
            <p>• <strong>Clear Settings:</strong> Remove all saved branding data</p>
            <p className="mt-2 text-xs text-gray-500">
              Settings are automatically saved when you make changes (auto-save enabled)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyBrandingPanel;
