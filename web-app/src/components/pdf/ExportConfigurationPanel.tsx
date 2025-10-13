import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronRight, 
  Settings, 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  AlertTriangle,
  Info,
  Star,
  Download,
  FileText,
  Users,
  Shield,
  Palette,
  Layout,
  Filter,
  SortAsc,
  Save,
  Loader2
} from 'lucide-react';
import { FieldMappingService, type UserPermissions, type FieldDefinition, type FieldCategory } from '../../services/pdf/FieldMappingService';
import { FieldConfigurationService, type FieldConfiguration, type FieldConfigurationPreset } from '../../services/pdf/FieldConfigurationService';
import type { Prop } from '../../types/props';

interface ExportConfigurationPanelProps {
  userPermissions: UserPermissions;
  onConfigurationChange: (configuration: FieldConfiguration) => void;
  onExport: (configuration: FieldConfiguration) => void;
  isLoading?: boolean;
  className?: string;
}

interface FieldSelectionState {
  [key: string]: boolean;
}

interface CategorySelectionState {
  [key: string]: boolean;
}

const ExportConfigurationPanel: React.FC<ExportConfigurationPanelProps> = ({
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
  const [activeTab, setActiveTab] = useState<'fields' | 'presets' | 'advanced'>('fields');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [fieldSelections, setFieldSelections] = useState<FieldSelectionState>({});
  const [categorySelections, setCategorySelections] = useState<CategorySelectionState>({});
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showSensitiveFields, setShowSensitiveFields] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [configurationName, setConfigurationName] = useState('');
  const [configurationDescription, setConfigurationDescription] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);

  // Get accessible data
  const accessibleFields = useMemo(() => 
    fieldMappingService.getFieldsForUser(userPermissions), 
    [userPermissions]
  );

  const accessibleCategories = useMemo(() => 
    fieldMappingService.getFieldCategoriesForUser(userPermissions), 
    [userPermissions]
  );

  const presets = useMemo(() => 
    configurationService.getPresetsForRole(userPermissions.role), 
    [userPermissions.role]
  );

  const permissionSummary = useMemo(() => 
    fieldMappingService.getPermissionSummary(userPermissions), 
    [userPermissions]
  );

  // Initialize field selections
  useEffect(() => {
    const initialSelections: FieldSelectionState = {};
    const initialCategorySelections: CategorySelectionState = {};

    // Select high-priority fields by default
    accessibleFields.forEach(field => {
      if (field.priority === 'high' && field.exportable) {
        initialSelections[field.key as string] = true;
      }
    });

    // Select basic categories by default
    ['basic', 'show-assignment', 'status-location'].forEach(categoryId => {
      if (accessibleCategories.some(cat => cat.id === categoryId)) {
        initialCategorySelections[categoryId] = true;
      }
    });

    setFieldSelections(initialSelections);
    setCategorySelections(initialCategorySelections);
  }, [accessibleFields, accessibleCategories]);

  // Update configuration when selections change
  useEffect(() => {
    const configuration = configurationService.createConfiguration(
      configurationName || 'Custom Configuration',
      configurationDescription || 'User-defined field selection',
      fieldSelections,
      categorySelections,
      userPermissions.role,
      { priorityFilter }
    );

    const validation = configurationService.validateConfiguration(configuration, userPermissions);
    setValidationResult(validation);
    onConfigurationChange(configuration);
  }, [fieldSelections, categorySelections, priorityFilter, configurationName, configurationDescription, userPermissions]);

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

  const toggleCategorySelection = (categoryId: string) => {
    setCategorySelections(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
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

  const selectAllCategories = () => {
    const allCategorySelections: CategorySelectionState = {};
    accessibleCategories.forEach(category => {
      allCategorySelections[category.id] = true;
    });
    setCategorySelections(allCategorySelections);
  };

  const clearAllCategories = () => {
    setCategorySelections({});
  };

  const applyPreset = (preset: FieldConfigurationPreset) => {
    setSelectedPreset(preset.id);
    setConfigurationName(preset.name);
    setConfigurationDescription(preset.description);
    
    const config = configurationService.applyPreset(preset.id, preset.name, userPermissions.role);
    setFieldSelections(config.fieldSelections);
    setCategorySelections(config.categorySelections);
    setPriorityFilter(config.priorityFilter || 'all');
  };

  const getFilteredFields = (category: FieldCategory): FieldDefinition[] => {
    return category.fields.filter(field => {
      if (!field.exportable) return false;
      if (field.permissions.sensitive && !showSensitiveFields) return false;
      if (priorityFilter !== 'all' && field.priority !== priorityFilter) return false;
      return true;
    });
  };

  const getSelectedFieldCount = (): number => {
    return Object.values(fieldSelections).filter(Boolean).length;
  };

  const getSelectedCategoryCount = (): number => {
    return Object.values(categorySelections).filter(Boolean).length;
  };

  return (
    <div className={`export-configuration-panel ${className}`}>
      {/* Header */}
      <div className="panel-header">
        <div className="header-content">
          <div className="header-title">
            <FileText className="header-icon" />
            <h2>Export Configuration</h2>
          </div>
          <div className="permission-badge">
            <Shield className="badge-icon" />
            <span>{permissionSummary.accessibleFields} of {permissionSummary.totalFields} fields accessible</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'fields' ? 'active' : ''}`}
          onClick={() => setActiveTab('fields')}
        >
          <Settings className="tab-icon" />
          Fields
        </button>
        <button
          className={`tab-button ${activeTab === 'presets' ? 'active' : ''}`}
          onClick={() => setActiveTab('presets')}
        >
          <Star className="tab-icon" />
          Presets
        </button>
        <button
          className={`tab-button ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          <Layout className="tab-icon" />
          Advanced
        </button>
      </div>

      {/* Content */}
      <div className="panel-content">
        <AnimatePresence mode="wait">
          {activeTab === 'fields' && (
            <motion.div
              key="fields"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="tab-content"
            >
              {/* Controls */}
              <div className="field-controls">
                <div className="control-group">
                  <label className="control-label">Priority Filter</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as any)}
                    className="control-select"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High Priority Only</option>
                    <option value="medium">Medium Priority Only</option>
                    <option value="low">Low Priority Only</option>
                  </select>
                </div>

                <div className="control-group">
                  <label className="control-label">
                    <input
                      type="checkbox"
                      checked={showSensitiveFields}
                      onChange={(e) => setShowSensitiveFields(e.target.checked)}
                      className="control-checkbox"
                    />
                    Show Sensitive Fields
                  </label>
                </div>

                <div className="control-actions">
                  <button onClick={selectAllFields} className="action-button secondary">
                    Select All
                  </button>
                  <button onClick={clearAllFields} className="action-button secondary">
                    Clear All
                  </button>
                </div>
              </div>

              {/* Category Selection */}
              <div className="category-selection">
                <div className="section-header">
                  <h3>Categories</h3>
                  <div className="section-actions">
                    <button onClick={selectAllCategories} className="action-button small">
                      All
                    </button>
                    <button onClick={clearAllCategories} className="action-button small">
                      None
                    </button>
                  </div>
                </div>

                <div className="category-grid">
                  {accessibleCategories.map(category => (
                    <div key={category.id} className="category-card">
                      <div className="category-header">
                        <input
                          type="checkbox"
                          checked={categorySelections[category.id] || false}
                          onChange={() => toggleCategorySelection(category.id)}
                          className="category-checkbox"
                        />
                        <span className="category-icon">{category.icon}</span>
                        <span className="category-name">{category.name}</span>
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="expand-button"
                        >
                          {expandedCategories.has(category.id) ? (
                            <ChevronDown className="expand-icon" />
                          ) : (
                            <ChevronRight className="expand-icon" />
                          )}
                        </button>
                      </div>

                      <AnimatePresence>
                        {expandedCategories.has(category.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="category-fields"
                          >
                            {getFilteredFields(category).map(field => (
                              <div key={field.key as string} className="field-item">
                                <input
                                  type="checkbox"
                                  checked={fieldSelections[field.key as string] || false}
                                  onChange={() => toggleField(field.key as string)}
                                  className="field-checkbox"
                                  disabled={field.permissions.sensitive && !showSensitiveFields}
                                />
                                <div className="field-info">
                                  <span className="field-label">{field.label}</span>
                                  <span className="field-description">{field.description}</span>
                                  <div className="field-meta">
                                    <span className={`priority-badge ${field.priority}`}>
                                      {field.priority}
                                    </span>
                                    {field.permissions.sensitive && (
                                      <span className="sensitive-badge">
                                        <Shield className="badge-icon" />
                                        Sensitive
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'presets' && (
            <motion.div
              key="presets"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="tab-content"
            >
              <div className="presets-grid">
                {presets.map(preset => (
                  <div
                    key={preset.id}
                    className={`preset-card ${selectedPreset === preset.id ? 'selected' : ''}`}
                    onClick={() => applyPreset(preset)}
                  >
                    <div className="preset-header">
                      <span className="preset-icon">{preset.icon}</span>
                      <h3 className="preset-name">{preset.name}</h3>
                    </div>
                    <p className="preset-description">{preset.description}</p>
                    <div className="preset-meta">
                      <span className="preset-category">{preset.category}</span>
                      <div className="preset-recommended">
                        {preset.recommendedFor.map(role => (
                          <span key={role} className="role-badge">{role}</span>
                        ))}
                      </div>
                    </div>
                    {selectedPreset === preset.id && (
                      <div className="preset-selected">
                        <Check className="selected-icon" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'advanced' && (
            <motion.div
              key="advanced"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="tab-content"
            >
              <div className="advanced-settings">
                <div className="setting-group">
                  <label className="setting-label">Configuration Name</label>
                  <input
                    type="text"
                    value={configurationName}
                    onChange={(e) => setConfigurationName(e.target.value)}
                    placeholder="Enter configuration name"
                    className="setting-input"
                  />
                </div>

                <div className="setting-group">
                  <label className="setting-label">Description</label>
                  <textarea
                    value={configurationDescription}
                    onChange={(e) => setConfigurationDescription(e.target.value)}
                    placeholder="Enter configuration description"
                    className="setting-textarea"
                    rows={3}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className="validation-results">
          {validationResult.errors.length > 0 && (
            <div className="validation-error">
              <AlertTriangle className="validation-icon" />
              <div className="validation-content">
                <h4>Configuration Errors</h4>
                <ul>
                  {validationResult.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {validationResult.warnings.length > 0 && (
            <div className="validation-warning">
              <Info className="validation-icon" />
              <div className="validation-content">
                <h4>Warnings</h4>
                <ul>
                  {validationResult.warnings.map((warning: string, index: number) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {validationResult.suggestions.length > 0 && (
            <div className="validation-suggestion">
              <Info className="validation-icon" />
              <div className="validation-content">
                <h4>Suggestions</h4>
                <ul>
                  {validationResult.suggestions.map((suggestion: string, index: number) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="configuration-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Selected Fields</span>
            <span className="stat-value">{getSelectedFieldCount()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Selected Categories</span>
            <span className="stat-value">{getSelectedCategoryCount()}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Accessible Fields</span>
            <span className="stat-value">{permissionSummary.accessibleFields}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="panel-actions">
        <button
          onClick={() => onExport(configurationService.createConfiguration(
            configurationName || 'Custom Configuration',
            configurationDescription || 'User-defined field selection',
            fieldSelections,
            categorySelections,
            userPermissions.role,
            { priorityFilter }
          ))}
          disabled={isLoading || !validationResult?.isValid}
          className="action-button primary export-button"
        >
          {isLoading ? (
            <>
              <Loader2 className="button-icon spinning" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="button-icon" />
              Export PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ExportConfigurationPanel;
