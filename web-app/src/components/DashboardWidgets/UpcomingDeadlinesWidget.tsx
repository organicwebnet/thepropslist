/**
 * Upcoming Deadlines Widget
 * 
 * Shows critical tasks with due dates color-coded by urgency
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, AlertCircle, Clock } from 'lucide-react';
import { WidgetContainer } from './WidgetContainer';
import { getTaskUrgency, formatDueDate } from '../../utils/taskHelpers';
import type { DashboardWidgetProps } from './types';
import type { CardData } from '../../types/taskManager';

interface UpcomingDeadlinesWidgetProps extends DashboardWidgetProps {
  cards?: CardData[];
}

export const UpcomingDeadlinesWidget: React.FC<UpcomingDeadlinesWidgetProps> = ({
  cards = [],
}) => {
  const now = new Date();
  const fourteenDaysFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // Filter and sort tasks with due dates
  const upcomingTasks = useMemo(() => {
    return cards
      .filter((card: CardData) => {
        if (card.completed || !card.dueDate) return false;
        const dueDate = new Date(card.dueDate);
        return dueDate <= fourteenDaysFromNow;
      })
      .map((card: CardData) => ({
        ...card,
        due: new Date(card.dueDate!),
      }))
      .sort((a: { due: Date }, b: { due: Date }) => a.due.getTime() - b.due.getTime())
      .slice(0, 10); // Show top 10
  }, [cards, fourteenDaysFromNow]);

  const getUrgencyDisplay = (dueDate: Date) => {
    const urgency = getTaskUrgency(dueDate, now);
    
    let icon;
    if (urgency.level === 'overdue' || urgency.level === 'urgent') {
      icon = <AlertCircle className="w-4 h-4" aria-hidden="true" />;
    } else if (urgency.level === 'upcoming') {
      icon = <Clock className="w-4 h-4" aria-hidden="true" />;
    } else {
      icon = <Calendar className="w-4 h-4" aria-hidden="true" />;
    }
    
    return {
      ...urgency,
      icon,
    };
  };

  return (
    <WidgetContainer
      widgetId="upcoming-deadlines"
      title="Upcoming Deadlines"
      loading={false}
    >
      {upcomingTasks.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-pb-gray mx-auto mb-3 opacity-50" />
          <p className="text-pb-gray text-sm">No upcoming deadlines</p>
          <p className="text-pb-gray text-xs mt-1">Tasks with due dates will appear here</p>
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="Upcoming deadlines">
          {upcomingTasks.map((task: CardData & { due: Date }) => {
            const urgency = getUrgencyDisplay(task.due);
            return (
              <Link
                key={task.id}
                to={`/boards?cardId=${task.id}`}
                className="block p-3 rounded-lg hover:bg-pb-primary/10 transition-colors focus:outline-none focus:ring-2 focus:ring-pb-primary"
                role="listitem"
                aria-label={`${task.title}, ${formatDueDate(task.due, now)}`}
              >
                <div className={`p-3 rounded-lg ${urgency.color}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm mb-1 truncate">{task.title}</div>
                      <div className="text-xs opacity-90 flex items-center gap-1">
                        {urgency.icon}
                        <time dateTime={task.due.toISOString()}>
                          {formatDueDate(task.due, now)}
                        </time>
                      </div>
                    </div>
                    <span className="ml-2 text-xs font-medium opacity-75" aria-label={`Status: ${urgency.label}`}>
                      {urgency.label}
                    </span>
                  </div>
                  {task.description && (
                    <div className="text-xs mt-2 opacity-75 line-clamp-2">
                      {task.description}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}

          <div className="pt-2 text-center">
            <Link
              to="/boards"
              className="text-sm text-pb-primary hover:text-pb-secondary underline"
            >
              View all tasks →
            </Link>
          </div>
        </div>
      )}
    </WidgetContainer>
  );
};

