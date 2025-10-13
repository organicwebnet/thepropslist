import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  FileText, 
  Settings, 
  Check, 
  ChevronDown, 
  ChevronRight,
  Info,
  Star,
  Shield,
  Package,
  MapPin,
  Calendar,
  Tag,
  Image,
  File,
  Search,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { FieldMappingService, type UserPermissions } from '../../services/pdf/FieldMappingService';
import { FieldConfigurationService, type FieldConfiguration } from '../../services/pdf/FieldConfigurationService';

interface EnterpriseExportPanelProps {
  userPermissions: UserPermissions;
  onConfigurationChange: (configuration: FieldConfiguration) => void;
  onExport: (configuration: FieldConfiguration) => void;
  isLoading?: boolean;
  className?: string;
}

interface FieldSelectionState {
  [key: string]: boolean;
}

const EnterpriseExportPanel: React.FC<EnterpriseExportPanelProps> = ({
  userPermissions,
  onConfigurationChange,
  onExport,
  isLoading = false,
  className = '',
}) => {
  // Services
  const fieldMappingService = FieldMappingService.getInstance();
  const configurationService = FieldConfigurationService.getInstance();

  // State
  const [activeTab, setActiveTab] = useState<'quick' | 'custom' | 'presets'>('quick');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [fieldSelections, setFieldSelections] = useState<FieldSelectionState>({});
  const [showSensitiveFields, setShowSensitiveFields] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get accessible data
  const accessibleFields = useMemo(() => 
    fieldMappingService.getFieldsForUser(userPermissions), 
    [userPermissions]
  );

  const accessibleCategories = useMemo(() => 
    fieldMappingService.getFieldCategoriesForUser(userPermissions), 
    [userPermissions]
  );

  const permissionSummary = useMemo(() => 
    fieldMappingService.getPermissionSummary(userPermissions), 
    [userPermissions]
  );

  // Quick export presets
  const quickPresets = [
    {
      id: 'essential',
      name: 'Essential Fields',
      description: 'Name, status, location, and basic details',
      icon: <CheckCircle className="w-5 h-5" />,
      fields: ['name', 'status', 'location', 'act', 'scene', 'quantity', 'condition'],
      color: 'bg-blue-500'
    },
    {
      id: 'detailed',
      name: 'Detailed Report',
      description: 'All available fields including images and descriptions',
      icon: <FileText className="w-5 h-5" />,
      fields: accessibleFields.filter(f => f.exportable && f.priority !== 'low').map(f => f.key),
      color: 'bg-green-500'
    },
    {
      id: 'production',
      name: 'Production Ready',
      description: 'Fields needed for production planning and execution',
      icon: <Package className="w-5 h-5" />,
      fields: ['name', 'status', 'location', 'act', 'scene', 'quantity', 'condition', 'manufacturer', 'model', 'weight', 'dimensions'],
      color: 'bg-purple-500'
    },
    {
      id: 'inventory',
      name: 'Inventory List',
      description: 'Basic inventory tracking fields',
      icon: <Package className="w-5 h-5" />,
      fields: ['name', 'category', 'quantity', 'condition', 'location', 'manufacturer', 'model'],
      color: 'bg-orange-500'
    }
  ];

  // Initialize with essential fields
  useEffect(() => {
    const initialSelections: FieldSelectionState = {};
    quickPresets[0].fields.forEach(fieldKey => {
      if (accessibleFields.some(f => f.key === fieldKey)) {
        initialSelections[fieldKey] = true;
      }
    });
    setFieldSelections(initialSelections);
  }, [accessibleFields]);

  // Update configuration when selections change
  useEffect(() => {
    const configuration = configurationService.createConfiguration(
      'Custom Export',
      'User-defined field selection',
      fieldSelections,
      {},
      userPermissions.role,
      {}
    );

    onConfigurationChange(configuration);
  }, [fieldSelections, userPermissions]);

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
    setFieldSelections(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey],
    }));
  };

  const applyQuickPreset = (preset: typeof quickPresets[0]) => {
    setSelectedPreset(preset.id);
    const newSelections: FieldSelectionState = {};
    preset.fields.forEach(fieldKey => {
      if (accessibleFields.some(f => f.key === fieldKey)) {
        newSelections[fieldKey] = true;
      }
    });
    setFieldSelections(newSelections);
  };

  const selectAllFields = () => {
    const allSelections: FieldSelectionState = {};
    accessibleFields.forEach(field => {
      if (field.exportable && (!field.permissions.sensitive || showSensitiveFields)) {
        allSelections[field.key as string] = true;
      }
    });
    setFieldSelections(allSelections);
  };

  const clearAllFields = () => {
    setFieldSelections({});
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
      'metadata': <Info className="w-4 h-4" />
    };
    return icons[categoryId] || <FileText className="w-4 h-4" />;
  };

  return (
    <div className={`enterprise-export-panel ${className}`}>
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
              activeTab === 'presets' 
                ? 'border-blue-500 text-blue-600 bg-blue-50' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('presets')}
          >
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4" />
              <span>Saved Presets</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-gray-50 p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'quick' && (
            <motion.div
              key="quick"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Choose Export Type</h3>
                <p className="text-gray-600">Select a preset that matches your needs</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickPresets.map(preset => (
                  <div
                    key={preset.id}
                    className={`bg-white rounded-lg border-2 p-6 cursor-pointer transition-all hover:shadow-lg ${
                      selectedPreset === preset.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => applyQuickPreset(preset)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${preset.color} text-white`}>
                        {preset.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{preset.name}</h4>
                        <p className="text-gray-600 text-sm mb-3">{preset.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {preset.fields.length} fields
                          </span>
                          {selectedPreset === preset.id && (
                            <Check className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'custom' && (
            <motion.div
              key="custom"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
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
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                    <AnimatePresence>
                      {expandedCategories.has(category.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-gray-200"
                        >
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
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'presets' && (
            <motion.div
              key="presets"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <div className="text-gray-500">
                <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Saved Presets</h3>
                <p>Save your custom field configurations for quick reuse</p>
                <p className="text-sm mt-2">Coming soon...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary and Actions */}
      <div className="bg-white border-t border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{getSelectedFieldCount()}</div>
              <div className="text-sm text-gray-600">Selected Fields</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{permissionSummary.accessibleFields}</div>
              <div className="text-sm text-gray-600">Available Fields</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{accessibleCategories.length}</div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
          </div>
          
          <button
            onClick={() => onExport(configurationService.createConfiguration(
              'Custom Export',
              'User-defined field selection',
              fieldSelections,
              {},
              userPermissions.role,
              {}
            ))}
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
  );
};

export default EnterpriseExportPanel;
