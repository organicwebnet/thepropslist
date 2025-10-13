import React, { useState, useEffect } from 'react';
import { Upload, Palette, Eye } from 'lucide-react';

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

  const fontOptions = [
    { value: 'Inter', label: 'Inter' },
    { value: 'Helvetica', label: 'Helvetica' },
    { value: 'Arial', label: 'Arial' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Roboto', label: 'Roboto' }
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
      setBranding(prev => ({ ...prev, [colorType]: event.target.value }));
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
      </div>
    </div>
  );
};

export default CompanyBrandingPanel;
