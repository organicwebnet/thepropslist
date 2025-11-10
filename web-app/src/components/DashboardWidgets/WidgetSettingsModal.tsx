/**
 * Widget Settings Modal
 * 
 * Allows users to toggle widgets and configure preferences
 */

import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';
import { useWidgetPreferences } from '../../hooks/useWidgetPreferences';
import { useWebAuth } from '../../contexts/WebAuthContext';
import { getRoleBasedWidgetDefaults } from '../../utils/widgetRoleDefaults';
import type { WidgetId } from './types';

interface WidgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WIDGET_DESCRIPTIONS: Record<WidgetId, { name: string; description: string }> = {
  'my-tasks': {
    name: 'My Tasks',
    description: 'Tasks assigned to you from all taskboards',
  },
  'taskboard-quick-links': {
    name: 'Taskboard Quick Links',
    description: 'Fast access to your taskboards',
  },
  'board-creation-prompt': {
    name: 'Board Creation Prompt',
    description: 'Suggestions for creating new taskboards',
  },
  'task-planning-assistant': {
    name: 'Props Without Tasks',
    description: 'Identifies props that need tasks',
  },
  'taskboard-activity-summary': {
    name: 'Taskboard Activity Summary',
    description: 'Overview of all taskboards with completion metrics',
  },
  'upcoming-deadlines': {
    name: 'Upcoming Deadlines',
    description: 'Critical tasks with due dates',
  },
  'cut-props-packing': {
    name: 'Cut Props Packing',
    description: 'Props cut from the show, grouped by packing destination',
  },
  'props-needing-work': {
    name: 'Props Needing Work',
    description: 'Props requiring repairs, maintenance, or modifications',
  },
};

export const WidgetSettingsModal: React.FC<WidgetSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { userProfile } = useWebAuth();
  const userRole = userProfile?.role || '';
  const {
    preferences,
    loading,
    toggleWidget,
    isWidgetEnabled,
    // updateConfig, // Available for future widget-specific configuration
  } = useWidgetPreferences(userRole);

  const [localEnabled, setLocalEnabled] = useState<Set<WidgetId>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state from preferences
  useEffect(() => {
    if (preferences) {
      setLocalEnabled(new Set(preferences.enabled));
      setHasChanges(false);
    }
  }, [preferences]);

  const handleToggle = (widgetId: WidgetId) => {
    const newEnabled = new Set(localEnabled);
    if (newEnabled.has(widgetId)) {
      newEnabled.delete(widgetId);
    } else {
      newEnabled.add(widgetId);
    }
    setLocalEnabled(newEnabled);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      // Save each widget toggle state
      for (const widgetId of Object.keys(WIDGET_DESCRIPTIONS) as WidgetId[]) {
        const shouldBeEnabled = localEnabled.has(widgetId);
        const currentlyEnabled = isWidgetEnabled(widgetId);
        
        if (shouldBeEnabled !== currentlyEnabled) {
          await toggleWidget(widgetId, shouldBeEnabled);
        }
      }
      
      setHasChanges(false);
      onClose();
    } catch (error) {
      console.error('Error saving widget preferences:', error);
      alert('Failed to save preferences. Please try again.');
    }
  };

  const handleReset = () => {
    const defaults = getRoleBasedWidgetDefaults(userRole);
    setLocalEnabled(new Set(defaults.enabled));
    setHasChanges(true);
  };

  if (!isOpen) return null;

  const allWidgetIds = Object.keys(WIDGET_DESCRIPTIONS) as WidgetId[];

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="widget-settings-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-pb-darker rounded-2xl border border-pb-primary/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-pb-primary/20">
          <h2 id="widget-settings-title" className="text-xl font-bold text-white">Widget Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-pb-primary/20 rounded-lg transition-colors"
            aria-label="Close modal"
            type="button"
          >
            <X className="w-5 h-5 text-pb-gray" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-pb-gray">Loading preferences...</div>
          ) : (
            <>
              <p className="text-sm text-pb-gray mb-4">
                Choose which widgets to display on your dashboard. You can always change these settings later.
              </p>

              <div className="space-y-3">
                {allWidgetIds.map((widgetId) => {
                  const info = WIDGET_DESCRIPTIONS[widgetId];
                  const enabled = localEnabled.has(widgetId);

                  return (
                    <div
                      key={widgetId}
                      className="p-4 rounded-lg border border-pb-primary/20 bg-pb-primary/5 hover:bg-pb-primary/10 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <button
                              onClick={() => handleToggle(widgetId)}
                              className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pb-primary ${
                                enabled ? 'bg-green-500' : 'bg-pb-primary/30'
                              }`}
                              aria-label={`${enabled ? 'Disable' : 'Enable'} ${info.name} widget`}
                              aria-checked={enabled}
                              role="switch"
                              type="button"
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                  enabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <div>
                              <h3 className="text-white font-medium">{info.name}</h3>
                              <p className="text-xs text-pb-gray mt-0.5">{info.description}</p>
                            </div>
                          </div>
                        </div>
                        {enabled && (
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-pb-primary/20">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 text-pb-gray hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                  type="button"
                  aria-label="Reset widget preferences to role-based defaults"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  Reset to Defaults
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-pb-gray hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || !hasChanges}
                    type="button"
                    aria-label="Save widget preference changes"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

