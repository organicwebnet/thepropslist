import React, { useState, useEffect } from 'react';
import { Save, Trash2, Copy, Palette, Type, Upload, X, Check, Plus } from 'lucide-react';
import { BrandingPresetService, type BrandingPreset, type BrandingPresetOptions } from '../../services/pdf/BrandingPresetService';

interface BrandingPresetManagerProps {
  currentBranding: BrandingPresetOptions;
  onBrandingChange: (branding: BrandingPresetOptions) => void;
  onPresetSelect: (preset: BrandingPreset) => void;
  className?: string;
}

const BrandingPresetManager: React.FC<BrandingPresetManagerProps> = ({
  currentBranding,
  onBrandingChange,
  onPresetSelect,
  className = ''
}) => {
  const [presets, setPresets] = useState<BrandingPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [editingBranding, setEditingBranding] = useState<BrandingPresetOptions>(currentBranding);

  const brandingService = BrandingPresetService.getInstance();

  useEffect(() => {
    setPresets(brandingService.getAllPresets());
    setEditingBranding(currentBranding);
  }, [currentBranding]);

  const handlePresetSelect = (preset: BrandingPreset) => {
    setSelectedPresetId(preset.id);
    setEditingBranding(preset.branding);
    onPresetSelect(preset);
    onBrandingChange(preset.branding);
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;

    const newPreset = brandingService.createPreset(
      newPresetName.trim(),
      newPresetDescription.trim(),
      editingBranding
    );

    setPresets(brandingService.getAllPresets());
    setSelectedPresetId(newPreset.id);
    setNewPresetName('');
    setNewPresetDescription('');
    setShowSaveDialog(false);
  };

  const handleDeletePreset = (presetId: string) => {
    if (confirm('Are you sure you want to delete this preset?')) {
      brandingService.deletePreset(presetId);
      setPresets(brandingService.getAllPresets());
      if (selectedPresetId === presetId) {
        setSelectedPresetId(null);
      }
    }
  };

  const handleDuplicatePreset = (preset: BrandingPreset) => {
    const newPreset = brandingService.duplicatePreset(preset.id, `${preset.name} (Copy)`);
    if (newPreset) {
      setPresets(brandingService.getAllPresets());
    }
  };

  const handleColorChange = (field: keyof BrandingPresetOptions, color: string) => {
    const updated = { ...editingBranding, [field]: color };
    setEditingBranding(updated);
    onBrandingChange(updated);
  };

  const handleTextChange = (field: keyof BrandingPresetOptions, value: string) => {
    const updated = { ...editingBranding, [field]: value };
    setEditingBranding(updated);
    onBrandingChange(updated);
  };

  const applyColorSuggestion = (suggestion: { primary: string; secondary: string; accent: string }) => {
    const updated = {
      ...editingBranding,
      primaryColor: suggestion.primary,
      secondaryColor: suggestion.secondary,
      accentColor: suggestion.accent
    };
    setEditingBranding(updated);
    onBrandingChange(updated);
  };

  const colorSuggestions = brandingService.getColorSuggestions();
  const fontFamilies = brandingService.getFontFamilies();

  return (
    <div className={`branding-preset-manager ${className}`}>
      {/* Preset Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Branding Presets</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className={`relative p-3 border rounded-lg cursor-pointer transition-all ${
                selectedPresetId === preset.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handlePresetSelect(preset)}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm text-gray-900">{preset.name}</h4>
                {!preset.isDefault && (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicatePreset(preset);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Duplicate"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePreset(preset.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              {preset.description && (
                <p className="text-xs text-gray-500 mb-2">{preset.description}</p>
              )}
              <div className="flex gap-1">
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: preset.branding.primaryColor }}
                  title="Primary"
                />
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: preset.branding.secondaryColor }}
                  title="Secondary"
                />
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: preset.branding.accentColor }}
                  title="Accent"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save New Preset */}
      <div className="mb-6">
        <button
          onClick={() => setShowSaveDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          Save Current Branding as Preset
        </button>
      </div>

      {/* Branding Customization */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Customize Branding</h3>
        
        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Name
          </label>
          <input
            type="text"
            value={editingBranding.companyName}
            onChange={(e) => handleTextChange('companyName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your company name"
          />
        </div>

        {/* Color Customization */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Colors
            </label>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Palette className="w-4 h-4" />
              Color Suggestions
            </button>
          </div>
          
          {showColorPicker && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Color Suggestions</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {colorSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => applyColorSuggestion(suggestion)}
                    className="p-2 border border-gray-200 rounded hover:border-gray-300 transition-colors"
                  >
                    <div className="flex gap-1 mb-1">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: suggestion.primary }}
                      />
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: suggestion.secondary }}
                      />
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: suggestion.accent }}
                      />
                    </div>
                    <div className="text-xs text-gray-600">{suggestion.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Primary</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={editingBranding.primaryColor}
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={editingBranding.primaryColor}
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Secondary</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={editingBranding.secondaryColor}
                  onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={editingBranding.secondaryColor}
                  onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Accent</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={editingBranding.accentColor}
                  onChange={(e) => handleColorChange('accentColor', e.target.value)}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={editingBranding.accentColor}
                  onChange={(e) => handleColorChange('accentColor', e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Font Customization */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Typography
            </label>
            <button
              onClick={() => setShowFontPicker(!showFontPicker)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Type className="w-4 h-4" />
              Font Options
            </button>
          </div>
          
          {showFontPicker && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Font Families</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {fontFamilies.map((font) => (
                  <button
                    key={font.value}
                    onClick={() => handleTextChange('fontFamily', font.value)}
                    className={`p-2 border rounded text-sm transition-colors ${
                      editingBranding.fontFamily === font.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{ fontFamily: font.value }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Font Family</label>
              <select
                value={editingBranding.fontFamily}
                onChange={(e) => handleTextChange('fontFamily', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {fontFamilies.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Font Size</label>
              <select
                value={editingBranding.fontSize}
                onChange={(e) => handleTextChange('fontSize', e.target.value as 'small' | 'medium' | 'large')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Branding Preset</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preset Name
                </label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter preset name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter description"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSavePreset}
                disabled={!newPresetName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Preset
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandingPresetManager;














