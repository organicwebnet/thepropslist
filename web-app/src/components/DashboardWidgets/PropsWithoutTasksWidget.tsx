/**
 * Props With Tasks Widget
 * 
 * Identifies props that have tasks but are in actionable statuses,
 * indicating they may not be in the correct working order
 */

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Package, X, ExternalLink } from 'lucide-react';
import { WidgetContainer } from './WidgetContainer';
import { parseFirestoreDate, daysBetween } from '../../utils/dateHelpers';
import type { DashboardWidgetProps } from './types';
import type { Prop } from '../../types/props';
import type { CardData } from '../../types/taskManager';

// Statuses that indicate a prop is not in correct working order
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

interface PropWithTask {
  prop: Prop;
  reason: string;
  priority: 'high' | 'medium';
  taskCount: number;
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
  const [dismissedProps, setDismissedProps] = useState<Set<string>>(new Set());

  // Get all prop IDs that have linked tasks and count tasks per prop
  const propsWithTasks = useMemo(() => {
    const propTaskCounts = new Map<string, number>();
    (cards as CardData[])
      .filter(card => card.propId)
      .forEach(card => {
        const count = propTaskCounts.get(card.propId!) || 0;
        propTaskCounts.set(card.propId!, count + 1);
      });
    return propTaskCounts;
  }, [cards]);

  // Identify props that have tasks but are in actionable statuses
  const propsWithTasksInActionableStatus = useMemo((): PropWithTask[] => {
    return (props as Prop[])
      .filter(prop => {
        // Skip if dismissed
        if (dismissedProps.has(prop.id)) return false;
        
        // Only include props that have tasks
        if (!propsWithTasks.has(prop.id)) return false;

        // Check if prop has an actionable status (not in correct working order)
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

        const taskCount = propsWithTasks.get(prop.id) || 0;
        return { prop, reason, priority, taskCount };
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

  const highPriority = propsWithTasksInActionableStatus.filter(p => p.priority === 'high');
  const mediumPriority = propsWithTasksInActionableStatus.filter(p => p.priority === 'medium');

  return (
    <>
      <WidgetContainer
        widgetId="task-planning-assistant"
        title="Props With Tasks"
        loading={false}
      >
        {propsWithTasksInActionableStatus.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-pb-gray mx-auto mb-3 opacity-50" />
            <p className="text-pb-gray text-sm">No props with tasks in actionable status</p>
            <p className="text-pb-gray text-xs mt-1">All props with tasks are in correct working order!</p>
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
                  {highPriority.slice(0, 5).map(({ prop, reason, taskCount }) => (
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
                          <div className="text-xs text-pb-gray mt-1">
                            {taskCount} task{taskCount === 1 ? '' : 's'} linked
                          </div>
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
                        <Link
                          to={`/boards`}
                          className="flex-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Tasks
                        </Link>
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
                  {mediumPriority.slice(0, 3).map(({ prop, reason, taskCount }) => (
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
                          <div className="text-xs text-pb-gray mt-1">
                            {taskCount} task{taskCount === 1 ? '' : 's'} linked
                          </div>
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
                        <Link
                          to={`/taskboard?propId=${prop.id}`}
                          className="flex-1 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Tasks
                        </Link>
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

            {propsWithTasksInActionableStatus.length > 8 && (
              <div className="pt-2 text-center">
                <Link
                  to="/props"
                  className="text-sm text-pb-primary hover:text-pb-secondary underline"
                >
                  View all {propsWithTasksInActionableStatus.length} props with tasks in actionable status →
                </Link>
              </div>
            )}
          </div>
        )}
      </WidgetContainer>
    </>
  );
};

