/**
 * Props Without Tasks Widget
 * 
 * Identifies props that need tasks but don't have any linked tasks
 */

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Plus, Package, X } from 'lucide-react';
import { WidgetContainer } from './WidgetContainer';
import { CreateTaskFromPropModal } from './CreateTaskFromPropModal';
import { parseFirestoreDate, daysBetween } from '../../utils/dateHelpers';
import type { DashboardWidgetProps } from './types';
import type { Prop } from '../../types/props';
import type { CardData } from '../../types/taskManager';

// Statuses that indicate a prop needs a task
const ACTIONABLE_STATUSES = [
  'to_buy',
  'on_order',
  'being_modified',
  'damaged_awaiting_repair',
  'damaged_awaiting_replacement',
  'out_for_repair',
  'under_review',
  'missing',
] as const;

type ActionableStatus = typeof ACTIONABLE_STATUSES[number];

interface PropNeedingTask {
  prop: Prop;
  reason: string;
  priority: 'high' | 'medium';
}

interface PropsWithoutTasksWidgetProps extends DashboardWidgetProps {
  props?: Prop[];
  cards?: CardData[];
  showId?: string;
}

export const PropsWithoutTasksWidget: React.FC<PropsWithoutTasksWidgetProps> = ({
  props = [],
  cards = [],
  showId: _showId, // Unused but kept for API consistency
}) => {
  const [selectedProp, setSelectedProp] = useState<Prop | null>(null);
  const [dismissedProps, setDismissedProps] = useState<Set<string>>(new Set());

  // Get all prop IDs that have linked tasks
  const propsWithTasks = useMemo(() => {
    return new Set(
      (cards as CardData[])
        .filter(card => card.propId)
        .map(card => card.propId!)
    );
  }, [cards]);

  // Identify props that need tasks
  const propsNeedingTasks = useMemo((): PropNeedingTask[] => {
    return (props as Prop[])
      .filter(prop => {
        // Skip if dismissed
        if (dismissedProps.has(prop.id)) return false;
        
        // Skip if already has a task
        if (propsWithTasks.has(prop.id)) return false;

        // Check if prop has an actionable status
        const status = prop.status as string;
        return ACTIONABLE_STATUSES.includes(status as ActionableStatus);
      })
      .map(prop => {
        // Note: Prop.status may contain additional values beyond PropLifecycleStatus
        const status = String(prop.status || '');
        let reason = '';
        let priority: 'high' | 'medium' = 'medium';

        switch (status) {
          case 'damaged_awaiting_repair':
          case 'damaged_awaiting_replacement':
          case 'missing':
            reason = `Status: ${status}`;
            priority = 'high';
            break;
          case 'to_buy':
            reason = 'Needs to be purchased';
            priority = 'high';
            break;
          case 'on_order':
            reason = 'Order tracking needed';
            priority = 'medium';
            break;
          case 'being_modified':
            reason = 'Modification in progress';
            priority = 'medium';
            break;
          case 'out_for_repair':
            reason = 'Repair tracking needed';
            priority = 'medium';
            break;
          case 'under_review':
            reason = 'Awaiting review/approval';
            priority = 'medium';
            break;
          default:
            reason = `Status: ${status}`;
        }

        // Check for rental due dates
        if (prop.rentalDueDate) {
          const dueDate = parseFirestoreDate(prop.rentalDueDate);
          if (dueDate) {
            const now = new Date();
            const daysUntilDue = daysBetween(now, dueDate);
            if (daysUntilDue <= 14 && daysUntilDue >= 0) {
              reason += ` • Rental due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;
              priority = daysUntilDue <= 7 ? 'high' : 'medium';
            } else if (daysUntilDue < 0) {
              reason += ` • Rental overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'}`;
              priority = 'high';
            }
          }
        }

        // Check for maintenance due dates
        if (prop.nextMaintenanceDue) {
          const dueDate = parseFirestoreDate(prop.nextMaintenanceDue);
          if (dueDate) {
            const now = new Date();
            const daysUntilDue = daysBetween(now, dueDate);
            if (daysUntilDue <= 14 && daysUntilDue >= 0) {
              reason += ` • Maintenance due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;
              priority = daysUntilDue <= 7 ? 'high' : 'medium';
            } else if (daysUntilDue < 0) {
              reason += ` • Maintenance overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'}`;
              priority = 'high';
            }
          }
        }

        return { prop, reason, priority };
      })
      .sort((a, b) => {
        // Sort by priority first (high before medium)
        if (a.priority !== b.priority) {
          return a.priority === 'high' ? -1 : 1;
        }
        // Then by prop name
        return a.prop.name.localeCompare(b.prop.name);
      });
  }, [props, propsWithTasks, dismissedProps]);

  const handleDismiss = (propId: string) => {
    setDismissedProps(prev => new Set(prev).add(propId));
  };

  const handleTaskCreated = (_taskId: string) => {
    // Close modal and optionally refresh
    setSelectedProp(null);
  };

  const highPriority = propsNeedingTasks.filter(p => p.priority === 'high');
  const mediumPriority = propsNeedingTasks.filter(p => p.priority === 'medium');

  return (
    <>
      <WidgetContainer
        widgetId="task-planning-assistant"
        title="Props Without Tasks"
        loading={false}
      >
        {propsNeedingTasks.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-pb-gray mx-auto mb-3 opacity-50" />
            <p className="text-pb-gray text-sm">All props have tasks</p>
            <p className="text-pb-gray text-xs mt-1">Great job staying organized!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* High Priority */}
            {highPriority.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <h4 className="text-sm font-semibold text-white">
                    Priority ({highPriority.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {highPriority.slice(0, 5).map(({ prop, reason }) => (
                    <div
                      key={prop.id}
                      className="p-3 rounded-lg bg-red-500/20 border border-red-500/30"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-sm mb-1">
                            {prop.name}
                          </div>
                          <div className="text-xs text-pb-gray">{reason}</div>
                          {prop.category && (
                            <div className="text-xs text-pb-gray mt-1">
                              Category: {prop.category}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDismiss(prop.id)}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors ml-2"
                          title="Dismiss"
                        >
                          <X className="w-3 h-3 text-pb-gray" />
                        </button>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => setSelectedProp(prop)}
                          className="flex-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Create Task
                        </button>
                        <Link
                          to={`/props/${prop.id}`}
                          className="px-3 py-1.5 bg-pb-primary/20 hover:bg-pb-primary/30 text-white text-xs rounded-lg transition-colors"
                        >
                          View Prop
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Medium Priority */}
            {mediumPriority.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <h4 className="text-sm font-semibold text-white">
                    Needs Attention ({mediumPriority.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {mediumPriority.slice(0, 3).map(({ prop, reason }) => (
                    <div
                      key={prop.id}
                      className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-sm mb-1">
                            {prop.name}
                          </div>
                          <div className="text-xs text-pb-gray">{reason}</div>
                        </div>
                        <button
                          onClick={() => handleDismiss(prop.id)}
                          className="p-1 hover:bg-yellow-500/20 rounded transition-colors ml-2"
                          title="Dismiss"
                        >
                          <X className="w-3 h-3 text-pb-gray" />
                        </button>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => setSelectedProp(prop)}
                          className="flex-1 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Create Task
                        </button>
                        <Link
                          to={`/props/${prop.id}`}
                          className="px-3 py-1.5 bg-pb-primary/20 hover:bg-pb-primary/30 text-white text-xs rounded-lg transition-colors"
                        >
                          View Prop
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {propsNeedingTasks.length > 8 && (
              <div className="pt-2 text-center">
                <Link
                  to="/props"
                  className="text-sm text-pb-primary hover:text-pb-secondary underline"
                >
                  View all {propsNeedingTasks.length} props needing tasks →
                </Link>
              </div>
            )}
          </div>
        )}
      </WidgetContainer>

      {selectedProp && (
        <CreateTaskFromPropModal
          prop={selectedProp}
          isOpen={true}
          onClose={() => setSelectedProp(null)}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </>
  );
};

