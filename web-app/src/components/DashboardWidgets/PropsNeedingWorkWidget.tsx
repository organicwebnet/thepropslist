/**
 * Props Needing Work Widget
 * 
 * Shows a list of props that need work done (repairs, maintenance, modifications)
 * to help the props supervisor prioritize and track work items.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, AlertTriangle, Calendar, Hammer } from 'lucide-react';
import { WidgetContainer } from './WidgetContainer';
import { parseFirestoreDate, daysBetween } from '../../utils/dateHelpers';
import type { DashboardWidgetProps } from './types';
import type { Prop } from '../../types/props';

interface PropsNeedingWorkWidgetProps extends DashboardWidgetProps {
  props?: Prop[];
}

interface PropNeedingWork {
  prop: Prop;
  workType: 'repair' | 'maintenance' | 'modification' | 'replacement';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  reason: string;
  dueDate?: Date;
}

export const PropsNeedingWorkWidget: React.FC<PropsNeedingWorkWidgetProps> = ({
  props = [],
}) => {
  // Filter and categorize props that need work
  const propsNeedingWork = useMemo((): PropNeedingWork[] => {
    const now = new Date();
    const workItems: PropNeedingWork[] = [];

    props.forEach(prop => {
      const status = String(prop.status || '').toLowerCase();
      let workType: 'repair' | 'maintenance' | 'modification' | 'replacement' | null = null;
      let priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium';
      let reason = '';
      let dueDate: Date | undefined;

      // Check status-based work needs
      if (status === 'damaged_awaiting_repair' || status === 'out_for_repair') {
        workType = 'repair';
        priority = prop.repairPriority === 'urgent' ? 'urgent' : 
                   prop.repairPriority === 'high' ? 'high' : 
                   prop.repairPriority === 'medium' ? 'medium' : 'low';
        reason = status === 'damaged_awaiting_repair' 
          ? 'Damaged - awaiting repair'
          : 'Out for repair';
      } else if (status === 'damaged_awaiting_replacement') {
        workType = 'replacement';
        priority = 'high';
        reason = 'Damaged - needs replacement';
      } else if (status === 'being_modified') {
        workType = 'modification';
        priority = 'medium';
        reason = 'Being modified';
      } else if (status === 'under_maintenance') {
        workType = 'maintenance';
        priority = 'medium';
        reason = 'Under maintenance';
      }

      // Check maintenance due dates
      if (prop.nextMaintenanceDue) {
        const maintenanceDue = parseFirestoreDate(prop.nextMaintenanceDue);
        if (maintenanceDue) {
          const daysUntilDue = daysBetween(now, maintenanceDue);
          
          // If maintenance is due or overdue, add it
          if (daysUntilDue <= 30) {
            if (!workType) {
              workType = 'maintenance';
            }
            
            if (daysUntilDue < 0) {
              priority = 'urgent';
              reason = `Maintenance overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'}`;
            } else if (daysUntilDue <= 7) {
              priority = priority === 'urgent' ? 'urgent' : 'high';
              reason = reason || `Maintenance due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;
            } else {
              priority = priority === 'urgent' || priority === 'high' ? priority : 'medium';
              reason = reason || `Maintenance due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;
            }
            
            dueDate = maintenanceDue;
          }
        }
      }

      // Check for maintenance notes indicating work needed
      if (prop.maintenanceNotes && prop.maintenanceNotes.trim().length > 0) {
        if (!workType) {
          workType = 'maintenance';
          reason = 'Has maintenance notes';
        }
      }

      // If we identified work needed, add it to the list
      if (workType) {
        workItems.push({
          prop,
          workType,
          priority,
          reason: reason || `Status: ${status}`,
          dueDate,
        });
      }
    });

    // Sort by priority (urgent first) then by due date
    return workItems.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
  }, [props]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-pb-primary/80 text-white';
    }
  };

  const getWorkTypeIcon = (workType: string) => {
    switch (workType) {
      case 'repair':
        return <Wrench className="w-4 h-4" />;
      case 'replacement':
        return <AlertTriangle className="w-4 h-4" />;
      case 'modification':
        return <Hammer className="w-4 h-4" />;
      case 'maintenance':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Wrench className="w-4 h-4" />;
    }
  };

  const getWorkTypeLabel = (workType: string) => {
    switch (workType) {
      case 'repair':
        return 'Repair';
      case 'replacement':
        return 'Replacement';
      case 'modification':
        return 'Modification';
      case 'maintenance':
        return 'Maintenance';
      default:
        return 'Work';
    }
  };

  const renderPropItem = (item: PropNeedingWork, maxItems: number = 10) => {
    return (
      <Link
        key={item.prop.id}
        to={`/props/${item.prop.id}`}
        className="block p-3 rounded-lg bg-pb-primary/10 hover:bg-pb-primary/20 border border-pb-primary/20 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(item.priority)}`}>
                {item.priority.toUpperCase()}
              </div>
              <div className="flex items-center gap-1 text-xs text-pb-gray">
                {getWorkTypeIcon(item.workType)}
                <span>{getWorkTypeLabel(item.workType)}</span>
              </div>
            </div>
            <div className="font-medium text-sm text-white mb-1 truncate">
              {item.prop.name}
            </div>
            <div className="text-xs text-pb-gray mb-1">
              {item.reason}
            </div>
            {item.dueDate && (
              <div className="text-xs text-pb-gray flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Due: {item.dueDate.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </div>
            )}
            {item.prop.category && (
              <div className="text-xs text-pb-gray mt-1">
                Category: {item.prop.category}
              </div>
            )}
          </div>
          {item.prop.imageUrl || item.prop.primaryImageUrl ? (
            <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-pb-darker">
              <img
                src={item.prop.imageUrl || item.prop.primaryImageUrl}
                alt={item.prop.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ) : null}
        </div>
      </Link>
    );
  };

  // Group by priority
  const groupedByPriority = useMemo(() => {
    const urgent: PropNeedingWork[] = [];
    const high: PropNeedingWork[] = [];
    const medium: PropNeedingWork[] = [];
    const low: PropNeedingWork[] = [];

    propsNeedingWork.forEach(item => {
      switch (item.priority) {
        case 'urgent':
          urgent.push(item);
          break;
        case 'high':
          high.push(item);
          break;
        case 'medium':
          medium.push(item);
          break;
        case 'low':
          low.push(item);
          break;
      }
    });

    return { urgent, high, medium, low };
  }, [propsNeedingWork]);

  return (
    <WidgetContainer
      widgetId="props-needing-work"
      title="Props Needing Work"
      loading={false}
    >
      {propsNeedingWork.length === 0 ? (
        <div className="text-center py-8">
          <Wrench className="w-12 h-12 text-pb-gray mx-auto mb-3 opacity-50" />
          <p className="text-pb-gray text-sm">No props need work</p>
          <p className="text-pb-gray text-xs mt-1">Props requiring repairs, maintenance, or modifications will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Urgent Priority */}
          {groupedByPriority.urgent.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h4 className="text-sm font-semibold text-white">
                  Urgent ({groupedByPriority.urgent.length})
                </h4>
              </div>
              <div className="space-y-2">
                {groupedByPriority.urgent.slice(0, 5).map(item => renderPropItem(item))}
                {groupedByPriority.urgent.length > 5 && (
                  <div className="text-xs text-pb-gray text-center pt-2">
                    +{groupedByPriority.urgent.length - 5} more urgent item{groupedByPriority.urgent.length - 5 === 1 ? '' : 's'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* High Priority */}
          {groupedByPriority.high.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <h4 className="text-sm font-semibold text-white">
                  High Priority ({groupedByPriority.high.length})
                </h4>
              </div>
              <div className="space-y-2">
                {groupedByPriority.high.slice(0, 5).map(item => renderPropItem(item))}
                {groupedByPriority.high.length > 5 && (
                  <div className="text-xs text-pb-gray text-center pt-2">
                    +{groupedByPriority.high.length - 5} more high priority item{groupedByPriority.high.length - 5 === 1 ? '' : 's'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Medium Priority */}
          {groupedByPriority.medium.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-yellow-400" />
                <h4 className="text-sm font-semibold text-white">
                  Medium Priority ({groupedByPriority.medium.length})
                </h4>
              </div>
              <div className="space-y-2">
                {groupedByPriority.medium.slice(0, 3).map(item => renderPropItem(item))}
                {groupedByPriority.medium.length > 3 && (
                  <div className="text-xs text-pb-gray text-center pt-2">
                    +{groupedByPriority.medium.length - 3} more medium priority item{groupedByPriority.medium.length - 3 === 1 ? '' : 's'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Low Priority - only show if there are no urgent/high items */}
          {groupedByPriority.low.length > 0 && groupedByPriority.urgent.length === 0 && groupedByPriority.high.length === 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-semibold text-white">
                  Low Priority ({groupedByPriority.low.length})
                </h4>
              </div>
              <div className="space-y-2">
                {groupedByPriority.low.slice(0, 3).map(item => renderPropItem(item))}
                {groupedByPriority.low.length > 3 && (
                  <div className="text-xs text-pb-gray text-center pt-2">
                    +{groupedByPriority.low.length - 3} more low priority item{groupedByPriority.low.length - 3 === 1 ? '' : 's'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* View All Link */}
          {propsNeedingWork.length > 0 && (
            <div className="pt-4 border-t border-pb-primary/20">
              <Link
                to={`/props?needsWork=true`}
                className="text-sm text-pb-primary hover:text-pb-secondary underline flex items-center gap-1"
              >
                View all {propsNeedingWork.length} prop{propsNeedingWork.length === 1 ? '' : 's'} needing work →
              </Link>
            </div>
          )}
        </div>
      )}
    </WidgetContainer>
  );
};

