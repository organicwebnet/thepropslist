/**
 * My Tasks Widget
 * 
 * Shows tasks assigned to the current user from all taskboards
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { WidgetContainer } from './WidgetContainer';
import type { DashboardWidgetProps } from './types';
import type { CardData } from '../../types/taskManager';

interface MyTasksWidgetProps extends DashboardWidgetProps {
  userId?: string;
  userDisplayName?: string;
  userEmail?: string;
}

export const MyTasksWidget: React.FC<MyTasksWidgetProps> = ({
  cards = [],
  userId,
  userDisplayName,
  userEmail,
}) => {
  const now = new Date();

  // Filter tasks assigned to current user
  const myTasks = useMemo(() => {
    if (!userId || !cards) return [];

    return cards.filter((card: CardData) => {
      if (card.completed) return false;
      
      // Check if assigned to user
      const assigned = Array.isArray(card.assignedTo) && card.assignedTo.includes(userId);
      
      // Check if mentioned in description
      const mention = card.description && (
        (userDisplayName && card.description.includes(userDisplayName)) ||
        (userEmail && card.description.includes(userEmail))
      );

      return assigned || Boolean(mention);
    });
  }, [cards, userId, userDisplayName, userEmail]);

  // Group tasks by urgency
  const groupedTasks = useMemo(() => {
    const overdue: CardData[] = [];
    const dueSoon: CardData[] = [];
    const upcoming: CardData[] = [];
    const noDueDate: CardData[] = [];

    myTasks.forEach((task: CardData) => {
      if (!task.dueDate) {
        noDueDate.push(task);
        return;
      }

      const dueDate = new Date(task.dueDate);
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        overdue.push(task);
      } else if (diffDays <= 7) {
        dueSoon.push(task);
      } else {
        upcoming.push(task);
      }
    });

    // Sort by due date
    const sortByDueDate = (a: CardData, b: CardData) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return dateA - dateB;
    };

    return {
      overdue: overdue.sort(sortByDueDate),
      dueSoon: dueSoon.sort(sortByDueDate),
      upcoming: upcoming.sort(sortByDueDate),
      noDueDate,
    };
  }, [myTasks, now]);

  const getTaskColor = (dueDate?: string) => {
    if (!dueDate) return 'bg-pb-primary/80 text-white';
    const due = new Date(dueDate);
    if (due < now) return 'bg-red-600 text-white';
    const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 2) return 'bg-orange-500 text-white';
    return 'bg-green-600 text-white';
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderTaskGroup = (
    title: string,
    tasks: CardData[],
    icon: React.ReactNode,
    maxItems: number = 5
  ) => {
    if (tasks.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h4 className="text-sm font-semibold text-white">{title} ({tasks.length})</h4>
        </div>
        <div className="space-y-2">
          {tasks.slice(0, maxItems).map((task) => (
            <Link
              key={task.id}
              to={`/boards?cardId=${task.id}`}
              className="block p-3 rounded-lg hover:bg-pb-primary/10 transition-colors"
            >
              <div className={`p-3 rounded-lg ${getTaskColor(task.dueDate)}`}>
                <div className="font-medium text-sm mb-1">{task.title}</div>
                {task.dueDate && (
                  <div className="text-xs opacity-90">
                    Due: {formatDueDate(task.dueDate)}
                  </div>
                )}
                {task.description && (
                  <div className="text-xs mt-1 opacity-75 line-clamp-1">
                    {task.description}
                  </div>
                )}
              </div>
            </Link>
          ))}
          {tasks.length > maxItems && (
            <div className="text-xs text-pb-gray text-center pt-2">
              +{tasks.length - maxItems} more tasks
            </div>
          )}
        </div>
      </div>
    );
  };

  const totalTasks = myTasks.length;

  return (
    <WidgetContainer
      widgetId="my-tasks"
      title="My Tasks"
      loading={false}
    >
      {totalTasks === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-pb-gray mx-auto mb-3 opacity-50" />
          <p className="text-pb-gray text-sm">No tasks assigned to you</p>
          <p className="text-pb-gray text-xs mt-1">Tasks assigned to you will appear here</p>
        </div>
      ) : (
        <div>
          {renderTaskGroup(
            'Overdue',
            groupedTasks.overdue,
            <AlertCircle className="w-4 h-4 text-red-400" />,
            3
          )}
          {renderTaskGroup(
            'Due Soon (Next 7 Days)',
            groupedTasks.dueSoon,
            <Clock className="w-4 h-4 text-orange-400" />,
            5
          )}
          {renderTaskGroup(
            'Upcoming',
            groupedTasks.upcoming,
            <Clock className="w-4 h-4 text-green-400" />,
            3
          )}
          {groupedTasks.noDueDate.length > 0 && (
            <div className="mt-4">
              <Link
                to="/boards"
                className="text-sm text-pb-primary hover:text-pb-secondary underline"
              >
                View all {totalTasks} tasks →
              </Link>
            </div>
          )}
        </div>
      )}
    </WidgetContainer>
  );
};







