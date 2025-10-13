import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Download, 
  FileText, 
  Settings, 
  Check, 
  ChevronDown, 
  ChevronRight,
  Shield,
  Package,
  MapPin,
  Calendar,
  Tag,
  Image,
  File,
  Search,
  Loader2,
  CheckCircle,
  Eye,
  Palette
} from 'lucide-react';
import { FieldMappingService, type UserPermissions } from '../../services/pdf/FieldMappingService';
import { FieldConfigurationService, type FieldConfiguration } from '../../services/pdf/FieldConfigurationService';
import type { Prop } from '../../types/props';
import CompanyBrandingPanel from './CompanyBrandingPanel';
import BrandingPresetManager from './BrandingPresetManager';
import { BrandingPresetService, type BrandingPreset, type BrandingPresetOptions } from '../../services/pdf/BrandingPresetService';

interface CompanyBranding {
  companyName: string;
  companyLogo: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: 'small' | 'medium' | 'large';
}

interface SimpleExportPanelProps {
  userPermissions: UserPermissions;
  props: Prop[];
  onConfigurationChange: (configuration: FieldConfiguration) => void;
  onExport: (configuration: FieldConfiguration) => void;
  onPreview: (configuration: FieldConfiguration) => void;
  onBrandingChange?: (branding: CompanyBranding) => void;
  initialBranding?: Partial<CompanyBranding>;
  isLoading?: boolean;
  isPreviewLoading?: boolean;
  className?: string;
}

interface FieldSelectionState {
  [key: string]: boolean;
}

const SimpleExportPanel: React.FC<SimpleExportPanelProps> = ({
  userPermissions,
  props,
  onConfigurationChange,
  onExport,
  onPreview,
  onBrandingChange,
  initialBranding,
  isLoading = false,
  isPreviewLoading = false,
  className = '',
}) => {
  // Services
  const fieldMappingService = FieldMappingService.getInstance();
  const configurationService = FieldConfigurationService.getInstance();
  const brandingPresetService = BrandingPresetService.getInstance();

  // State
  const [activeTab, setActiveTab] = useState<'quick' | 'custom' | 'branding'>('quick');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [fieldSelections, setFieldSelections] = useState<FieldSelectionState>({});
  const [showSensitiveFields, setShowSensitiveFields] = useState(false);
  const [selectedDisplayType, setSelectedDisplayType] = useState<string | null>('luxury-catalogue');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'act_scene' | 'alphabetical'>('act_scene');
  const [layout, setLayout] = useState<'portrait' | 'landscape' | 'product-catalog'>('portrait');
  const [showBrandingPresets, setShowBrandingPresets] = useState(false);
  const [selectedBrandingPreset, setSelectedBrandingPreset] = useState<BrandingPreset | null>(null);

  // Get accessible data (memoized to prevent infinite loops)
  const accessibleFields = useMemo(() => 
    fieldMappingService.getFieldsForUser(userPermissions), 
    [userPermissions.role, userPermissions.permissions, userPermissions.showId]
  );
  const accessibleCategories = useMemo(() => 
    fieldMappingService.getFieldCategoriesForUser(userPermissions), 
    [userPermissions.role, userPermissions.permissions, userPermissions.showId]
  );

  // Calculate statistics
  const getTotalProps = () => {
    console.log('SimpleExportPanel - props received:', props);
    console.log('SimpleExportPanel - props length:', props.length);
    return props.length;
  };
  const getPackedContainers = () => {
    // Count props that are in containers (have location or currentLocation)
    const packed = props.filter(prop => prop.location || prop.currentLocation).length;
    console.log('SimpleExportPanel - packed containers:', packed);
    return packed;
  };

  // Luxury Magazine Display Types
  const displayTypes = [
    {
      id: 'portrait',
      name: 'Portrait',
      description: 'Premium magazine-style layout with elegant typography and large images',
      icon: <FileText className="w-5 h-5" />,
      layout: 'portrait' as const,
      color: 'bg-slate-800'
    },
    {
      id: 'landscape',
      name: 'Landscape',
      description: 'Sophisticated landscape layout perfect for showcasing multiple props',
      icon: <Package className="w-5 h-5" />,
      layout: 'landscape' as const,
      color: 'bg-amber-600'
    },
    {
      id: 'product-catalog',
      name: 'Product Catalog',
      description: 'Professional product catalog layout with QR codes linking to prop details',
      icon: <Tag className="w-5 h-5" />,
      layout: 'product-catalog' as const,
      color: 'bg-emerald-600'
    }
  ];

  // Initialize with essential fields
  useEffect(() => {
    const initialSelections: FieldSelectionState = {};
    
    // Always select some basic fields if available (rehearsal call sheet)
    const basicFields = ['name', 'act', 'scene', 'location', 'condition', 'quantity', 'images'];
    basicFields.forEach(fieldKey => {
      if (accessibleFields.some(f => f.key === fieldKey)) {
        initialSelections[fieldKey] = true;
      }
    });
    
    // If no basic fields are available, select the first few accessible fields
    if (Object.keys(initialSelections).length === 0) {
      accessibleFields.slice(0, 5).forEach(field => {
        if (field.exportable) {
          initialSelections[field.key as string] = true;
        }
      });
    }
    
    console.log('Initial field selections:', initialSelections);
    setFieldSelections(initialSelections);
    
    // Call onConfigurationChange with initial selections
    setTimeout(() => {
      const configuration = configurationService.createConfiguration(
        'Custom Export',
        'User-defined field selection',
        initialSelections,
        {},
        userPermissions.role,
        {}
      );
      onConfigurationChange(configuration);
    }, 0);
  }, [accessibleFields]);

  // Create configuration function
  const createConfiguration = () => {
    return configurationService.createConfiguration(
      'Custom Export',
      'User-defined field selection',
      fieldSelections,
      {},
      userPermissions.role,
      {}
    );
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const toggleField = (fieldKey: string) => {
    setFieldSelections(prev => {
      const newSelections = {
        ...prev,
        [fieldKey]: !prev[fieldKey],
      };
      // Call onConfigurationChange with new selections
      setTimeout(() => {
        const configuration = configurationService.createConfiguration(
          'Custom Export',
          'User-defined field selection',
          newSelections,
          {},
          userPermissions.role,
          {}
        );
        onConfigurationChange(configuration);
      }, 0);
      return newSelections;
    });
  };

  const applyDisplayType = (displayType: typeof displayTypes[0]) => {
    setSelectedDisplayType(displayType.id);
    setLayout(displayType.layout);
  };

  const selectAllFields = () => {
    const allSelections: FieldSelectionState = {};
    accessibleFields.forEach(field => {
      if (field.exportable && (!field.permissions.sensitive || showSensitiveFields)) {
        allSelections[field.key as string] = true;
      }
    });
    setFieldSelections(allSelections);
    // Call onConfigurationChange
    setTimeout(() => {
      const configuration = configurationService.createConfiguration(
        'Custom Export',
        'User-defined field selection',
        allSelections,
        {},
        userPermissions.role,
        {}
      );
      onConfigurationChange(configuration);
    }, 0);
  };

  const clearAllFields = () => {
    setFieldSelections({});
    // Call onConfigurationChange
    setTimeout(() => {
      const configuration = configurationService.createConfiguration(
        'Custom Export',
        'User-defined field selection',
        {},
        {},
        userPermissions.role,
        {}
      );
      onConfigurationChange(configuration);
    }, 0);
  };

  const getSelectedFieldCount = (): number => {
    return Object.values(fieldSelections).filter(Boolean).length;
  };

  const getCategoryIcon = (categoryId: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      'basic': <FileText className="w-4 h-4" />,
      'show-assignment': <Calendar className="w-4 h-4" />,
      'status-location': <MapPin className="w-4 h-4" />,
      'physical': <Package className="w-4 h-4" />,
      'identification': <Tag className="w-4 h-4" />,
      'media': <Image className="w-4 h-4" />,
      'financial': <File className="w-4 h-4" />,
      'maintenance': <Settings className="w-4 h-4" />,
      'security': <Shield className="w-4 h-4" />,
      'metadata': <FileText className="w-4 h-4" />
    };
    return icons[categoryId] || <FileText className="w-4 h-4" />;
  };

  const handlePreview = () => {
    const configuration = configurationService.createConfiguration(
      'Custom Export',
      'User-defined field selection',
      fieldSelections,
      {},
      userPermissions.role,
      {}
    );
    // Add sorting and layout to configuration
    (configuration as any).sortBy = sortBy;
    (configuration as any).layout = layout;
    onPreview(configuration);
  };

  const handleExport = () => {
    const configuration = configurationService.createConfiguration(
      'Custom Export',
      'User-defined field selection',
      fieldSelections,
      {},
      userPermissions.role,
      {}
    );
    // Add sorting and layout to configuration
    (configuration as any).sortBy = sortBy;
    (configuration as any).layout = layout;
    onExport(configuration);
  };

  // Branding preset handlers
  const handlePresetSelect = (preset: BrandingPreset) => {
    setSelectedBrandingPreset(preset);
    if (onBrandingChange) {
      onBrandingChange({
        ...preset.branding,
        companyLogo: preset.branding.companyLogo || null
      });
    }
  };

  const handleBrandingChange = (branding: BrandingPresetOptions) => {
    if (onBrandingChange) {
      onBrandingChange({
        ...branding,
        companyLogo: branding.companyLogo || null
      });
    }
  };

  return (
    <div className={`simple-export-panel ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Export Configuration</h2>
              <p className="text-blue-100">Configure your PDF export settings</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-100">Access Level</div>
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span className="font-semibold capitalize">{userPermissions.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          <button
            className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'quick' 
                ? 'border-blue-500 text-blue-600 bg-blue-50' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('quick')}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>Quick Export</span>
            </div>
          </button>
          <button
            className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'custom' 
                ? 'border-blue-500 text-blue-600 bg-blue-50' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('custom')}
          >
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Custom Fields</span>
            </div>
          </button>
          <button
            className={`px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'branding' 
                ? 'border-blue-500 text-blue-600 bg-blue-50' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('branding')}
          >
            <div className="flex items-center space-x-2">
              <Palette className="w-4 h-4" />
              <span>Branding</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-gray-50 p-6">
        {activeTab === 'quick' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Choose PDF Display Type</h3>
              <p className="text-gray-600">Select how you want your props displayed in the PDF</p>
            </div>

            {/* Sorting Options */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Sort Order</h4>
              <div className="flex gap-6">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="sortBy"
                    value="act_scene"
                    checked={sortBy === 'act_scene'}
                    onChange={(e) => setSortBy(e.target.value as 'act_scene' | 'alphabetical')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">By Act & Scene</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="sortBy"
                    value="alphabetical"
                    checked={sortBy === 'alphabetical'}
                    onChange={(e) => setSortBy(e.target.value as 'act_scene' | 'alphabetical')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Alphabetically</span>
                </label>
              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayTypes.map(displayType => (
                <div
                  key={displayType.id}
                  className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition-all hover:shadow-lg ${
                    selectedDisplayType === displayType.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => applyDisplayType(displayType)}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${displayType.color} text-white`}>
                      {displayType.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{displayType.name}</h4>
                      <p className="text-gray-600 text-sm mb-3">{displayType.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {displayType.layout === 'portrait' ? 'Portrait Layout' : 'Landscape Layout'}
                        </span>
                        {selectedDisplayType === displayType.id && (
                          <Check className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="space-y-6">
            {/* Search and Controls */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search fields..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={showSensitiveFields}
                      onChange={(e) => setShowSensitiveFields(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Show sensitive fields</span>
                  </label>
                  <div className="flex space-x-2">
                    <button
                      onClick={selectAllFields}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearAllFields}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Field Categories */}
            <div className="space-y-4">
              {accessibleCategories.map(({ category, fields }) => (
                <div key={category.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                          {getCategoryIcon(category.id)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{category.name}</h3>
                          <p className="text-sm text-gray-600">{category.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-500">
                          {fields.filter(field => {
                            if (!field.exportable) return false;
                            if (field.permissions.sensitive && !showSensitiveFields) return false;
                            if (searchQuery && !field.label.toLowerCase().includes(searchQuery.toLowerCase()) && 
                                !field.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                            return true;
                          }).length} fields
                        </span>
                        {expandedCategories.has(category.id) ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedCategories.has(category.id) && (
                    <div className="border-t border-gray-200">
                      <div className="p-4 space-y-3">
                        {fields.filter(field => {
                          if (!field.exportable) return false;
                          if (field.permissions.sensitive && !showSensitiveFields) return false;
                          if (searchQuery && !field.label.toLowerCase().includes(searchQuery.toLowerCase()) && 
                              !field.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                          return true;
                        }).map(field => (
                          <div key={field.key as string} className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              checked={fieldSelections[field.key as string] || false}
                              onChange={() => toggleField(field.key as string)}
                              disabled={field.permissions.sensitive && !showSensitiveFields}
                              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">{field.label}</span>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  field.priority === 'high' ? 'bg-red-100 text-red-800' :
                                  field.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {field.priority}
                                </span>
                                {field.permissions.sensitive && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 flex items-center space-x-1">
                                    <Shield className="w-3 h-3" />
                                    <span>Sensitive</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{field.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Company Branding</h3>
              <p className="text-gray-600">Customize your PDF with your company branding</p>
            </div>
            
            {/* Branding Preset Manager */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium text-gray-900">Branding Presets</h4>
                <button
                  onClick={() => setShowBrandingPresets(!showBrandingPresets)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <Palette className="w-4 h-4" />
                  {showBrandingPresets ? 'Hide Presets' : 'Show Presets'}
                </button>
              </div>
              
              {showBrandingPresets && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <BrandingPresetManager
                    currentBranding={{
                      companyName: initialBranding?.companyName || '',
                      companyLogo: initialBranding?.companyLogo || null,
                      primaryColor: initialBranding?.primaryColor || '#0ea5e9',
                      secondaryColor: initialBranding?.secondaryColor || '#3b82f6',
                      accentColor: initialBranding?.accentColor || '#22c55e',
                      fontFamily: initialBranding?.fontFamily || 'Inter',
                      fontSize: initialBranding?.fontSize || 'medium'
                    }}
                    onBrandingChange={handleBrandingChange}
                    onPresetSelect={handlePresetSelect}
                  />
                </div>
              )}
            </div>
            
            <CompanyBrandingPanel
              onBrandingChange={onBrandingChange || (() => {})}
              initialBranding={initialBranding}
            />
          </div>
        )}
      </div>

      {/* Summary and Actions */}
      <div className="bg-white border-t border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{getTotalProps()}</div>
              <div className="text-sm text-gray-600">Total Props</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{getPackedContainers()}</div>
              <div className="text-sm text-gray-600">Packed Containers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{accessibleCategories.length}</div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handlePreview}
              disabled={isPreviewLoading || getSelectedFieldCount() === 0}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
            >
              {isPreviewLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating Preview...</span>
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  <span>Preview PDF</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleExport}
              disabled={isLoading || getSelectedFieldCount() === 0}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Export PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleExportPanel;
