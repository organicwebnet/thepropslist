/**
 * Widget Settings Modal
 * 
 * Allows users to toggle widgets and configure preferences
 */

import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Check, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  'task-planning-assistant': {
    name: 'Props With Tasks',
    description: 'Shows props with tasks that are not in correct working order',
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
  'shopping-approval-needed': {
    name: 'Shopping Items Needing Approval',
    description: 'Shopping items with options pending approval',
  },
  'notifications': {
    name: 'Notifications',
    description: 'Latest notifications and updates',
  },
  'delivery-list': {
    name: 'Delivery List',
    description: 'Props on order with expected delivery dates',
  },
};

// Sortable Widget Item Component
interface SortableWidgetItemProps {
  widgetId: WidgetId;
  enabled: boolean;
  onToggle: (widgetId: WidgetId) => void;
}

const SortableWidgetItem: React.FC<SortableWidgetItemProps> = ({ widgetId, enabled, onToggle }) => {
  const info = WIDGET_DESCRIPTIONS[widgetId];
  if (!info) {
    console.warn(`Widget description not found for: ${widgetId}`);
    return null;
  }
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widgetId, disabled: !enabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 rounded-lg border border-pb-primary/20 bg-pb-primary/5 hover:bg-pb-primary/10 transition-colors ${
        isDragging ? 'z-50' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            {enabled && (
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-pb-gray hover:text-white transition-colors touch-none"
                aria-label="Drag to reorder"
                style={{ touchAction: 'none' }}
              >
                <GripVertical className="w-5 h-5" />
              </div>
            )}
            <button
              onClick={() => onToggle(widgetId)}
              className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pb-primary flex-shrink-0 ${
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
    updateWidgetOrder,
    // updateConfig, // Available for future widget-specific configuration
  } = useWidgetPreferences(userRole);

  const [localEnabled, setLocalEnabled] = useState<Set<WidgetId>>(new Set());
  const [localOrder, setLocalOrder] = useState<WidgetId[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState<WidgetId | null>(null);

  // Initialize local state from preferences
  useEffect(() => {
    if (preferences) {
      // Filter out any widget IDs that don't have descriptions
      const validEnabled = (preferences.enabled || []).filter(id => WIDGET_DESCRIPTIONS[id]);
      setLocalEnabled(new Set(validEnabled));
      // Use the enabled array as the order (it represents the display order)
      setLocalOrder(validEnabled);
      setHasChanges(false);
    }
  }, [preferences]);

  const handleToggle = (widgetId: WidgetId) => {
    const newEnabled = new Set(localEnabled);
    let newOrder = [...localOrder];
    
    if (newEnabled.has(widgetId)) {
      // Disable widget - remove from enabled and order
      newEnabled.delete(widgetId);
      newOrder = newOrder.filter(id => id !== widgetId);
    } else {
      // Enable widget - add to enabled and append to order
      newEnabled.add(widgetId);
      if (!newOrder.includes(widgetId)) {
        newOrder.push(widgetId);
      }
    }
    
    setLocalEnabled(newEnabled);
    setLocalOrder(newOrder);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      // Save each widget toggle state
      for (const widgetId of Object.keys(WIDGET_DESCRIPTIONS) as WidgetId[]) {
        // Skip if widget description doesn't exist
        if (!WIDGET_DESCRIPTIONS[widgetId]) continue;
        
        const shouldBeEnabled = localEnabled.has(widgetId);
        const currentlyEnabled = isWidgetEnabled(widgetId);
        
        if (shouldBeEnabled !== currentlyEnabled) {
          await toggleWidget(widgetId, shouldBeEnabled);
        }
      }
      
      // Save the new order (only enabled widgets in the order they appear)
      const orderedEnabled = localOrder.filter(id => localEnabled.has(id) && WIDGET_DESCRIPTIONS[id]);
      if (updateWidgetOrder) {
        await updateWidgetOrder(orderedEnabled);
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
    setLocalOrder(defaults.enabled || []);
    setHasChanges(true);
  };

  // Drag and drop handlers
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Require 5px of movement before starting drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: any) => {
    const widgetId = event.active.id as WidgetId;
    // Only set activeId if it's a valid widget with a description
    if (WIDGET_DESCRIPTIONS[widgetId]) {
      setActiveId(widgetId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over || active.id === over.id) {
      return;
    }

    const activeWidgetId = active.id as WidgetId;
    const overWidgetId = over.id as WidgetId;

    // Validate widget IDs exist in descriptions
    if (!WIDGET_DESCRIPTIONS[activeWidgetId] || !WIDGET_DESCRIPTIONS[overWidgetId]) {
      console.warn('Invalid widget ID in drag operation:', { activeWidgetId, overWidgetId });
      return;
    }

    const oldIndex = localOrder.indexOf(activeWidgetId);
    const newIndex = localOrder.indexOf(overWidgetId);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(localOrder, oldIndex, newIndex);
      setLocalOrder(newOrder);
      setHasChanges(true);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  if (!isOpen) return null;

  // Filter to only include valid widget IDs that have descriptions
  const allWidgetIds = (Object.keys(WIDGET_DESCRIPTIONS) as WidgetId[]).filter(
    id => WIDGET_DESCRIPTIONS[id]
  );

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
                Choose which widgets to display on your dashboard. Drag enabled widgets to reorder them. You can always change these settings later.
              </p>

              {/* Enabled widgets - draggable */}
              {localOrder.filter(id => localEnabled.has(id)).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-white mb-3">Enabled Widgets (drag to reorder)</h3>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
                    <SortableContext
                      items={localOrder.filter(id => localEnabled.has(id))}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {localOrder
                          .filter(id => localEnabled.has(id) && WIDGET_DESCRIPTIONS[id])
                          .map((widgetId) => (
                            <SortableWidgetItem
                              key={widgetId}
                              widgetId={widgetId}
                              enabled={true}
                              onToggle={handleToggle}
                            />
                          ))}
                      </div>
                    </SortableContext>
                    <DragOverlay>
                      {activeId && WIDGET_DESCRIPTIONS[activeId] ? (
                        <div className="p-4 rounded-lg border border-pb-primary/20 bg-pb-primary/10 opacity-90 rotate-2 shadow-lg">
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-5 h-5 text-pb-gray" />
                            <div>
                              <h3 className="text-white font-medium">{WIDGET_DESCRIPTIONS[activeId].name}</h3>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </div>
              )}

              {/* Disabled widgets - not draggable */}
              {allWidgetIds.filter(id => !localEnabled.has(id)).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white mb-3">Disabled Widgets</h3>
                  <div className="space-y-3">
                    {allWidgetIds
                      .filter(id => !localEnabled.has(id) && WIDGET_DESCRIPTIONS[id])
                      .map((widgetId) => (
                        <SortableWidgetItem
                          key={widgetId}
                          widgetId={widgetId}
                          enabled={false}
                          onToggle={handleToggle}
                        />
                      ))}
                  </div>
                </div>
              )}

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


