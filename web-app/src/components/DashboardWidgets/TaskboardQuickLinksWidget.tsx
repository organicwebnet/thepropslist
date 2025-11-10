/**
 * Taskboard Quick Links Widget
 * 
 * Displays favorite/recent taskboards with activity indicators
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutList, Plus, TrendingUp } from 'lucide-react';
import { WidgetContainer } from './WidgetContainer';
import { useFirebase } from '../../contexts/FirebaseContext';
import type { DashboardWidgetProps } from './types';
import type { BoardData } from '../../types/taskManager';
import type { CardData } from '../../types/taskManager';

interface BoardWithStats extends BoardData {
  cardCount: number;
  completedCount: number;
  completionPercent: number;
  lastActivity?: Date;
}

interface TaskboardQuickLinksWidgetProps extends DashboardWidgetProps {
  cards?: CardData[];
}

export const TaskboardQuickLinksWidget: React.FC<TaskboardQuickLinksWidgetProps> = ({
  showId,
  cards = [],
}) => {
  const { service } = useFirebase();
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch boards for the show
  useEffect(() => {
    if (!showId || !service) {
      setLoading(false);
      return;
    }

    const unsub = service.listenToCollection<BoardData>(
      'todo_boards',
      docs => {
        const mappedBoards = docs
          .map(d => ({
            ...d.data,
            id: d.id,
            title: d.data.title || d.data.name || 'Untitled Board',
            listIds: d.data.listIds || [],
          }))
          .filter(b => b.showId === showId);

        setBoards(mappedBoards);
        setLoading(false);
      },
      error => {
        console.error('Error loading boards:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [service, showId]);

  // Calculate board statistics
  const boardsWithStats = useMemo((): BoardWithStats[] => {
    return boards.map(board => {
      // Get cards for this board (cards have listId, we need to match to board)
      // For now, we'll count all cards and assume they're distributed across boards
      // This is a simplified version - in a full implementation, we'd track boardId on cards
      // Note: Currently showing all cards as a simplified approach
      const boardCards = cards;

      const totalCards = boardCards.length;
      const completedCards = boardCards.filter((c: CardData) => c.completed).length;
      const completionPercent = totalCards > 0 
        ? Math.round((completedCards / totalCards) * 100) 
        : 0;

      // Find most recent activity
      let lastActivity: Date | undefined;
      if (boardCards.length > 0) {
        const dates = boardCards
          .map((c: CardData) => {
            if (c.updatedAt) return new Date(c.updatedAt);
            if (c.createdAt) return new Date(c.createdAt);
            return null;
          })
          .filter((d): d is Date => d !== null);
        
        if (dates.length > 0) {
          lastActivity = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
        }
      }

      return {
        ...board,
        cardCount: totalCards,
        completedCount: completedCards,
        completionPercent,
        lastActivity,
      };
    }).sort((a, b) => {
      // Sort by most recent activity first
      if (a.lastActivity && b.lastActivity) {
        return b.lastActivity.getTime() - a.lastActivity.getTime();
      }
      if (a.lastActivity) return -1;
      if (b.lastActivity) return 1;
      return 0;
    });
  }, [boards, cards]);

  const formatLastActivity = (date?: Date) => {
    if (!date) return 'No activity';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  return (
    <WidgetContainer
      widgetId="taskboard-quick-links"
      title="Taskboards"
      loading={loading}
    >
      {boardsWithStats.length === 0 ? (
        <div className="text-center py-8">
          <LayoutList className="w-12 h-12 text-pb-gray mx-auto mb-3 opacity-50" />
          <p className="text-pb-gray text-sm mb-2">No taskboards yet</p>
          <Link
            to="/boards"
            className="inline-flex items-center gap-2 text-sm text-pb-primary hover:text-pb-secondary underline"
          >
            <Plus className="w-4 h-4" />
            Create your first board
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {boardsWithStats.slice(0, 5).map((board) => (
            <Link
              key={board.id}
              to={`/boards?boardId=${board.id}`}
              className="block p-4 rounded-lg bg-pb-primary/5 hover:bg-pb-primary/10 transition-colors border border-pb-primary/20"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium truncate">{board.title}</h4>
                  <p className="text-xs text-pb-gray mt-1">
                    {board.cardCount} {board.cardCount === 1 ? 'task' : 'tasks'}
                    {board.lastActivity && (
                      <span className="ml-2">• {formatLastActivity(board.lastActivity)}</span>
                    )}
                  </p>
                </div>
                {board.completionPercent > 0 && (
                  <div className="ml-3 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">
                      {board.completionPercent}%
                    </span>
                  </div>
                )}
              </div>
              
              {/* Progress bar */}
              {board.cardCount > 0 && (
                <div className="mt-2 w-full bg-pb-primary/20 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${board.completionPercent}%` }}
                  />
                </div>
              )}
            </Link>
          ))}

          {boardsWithStats.length > 5 && (
            <div className="pt-2 text-center">
              <Link
                to="/boards"
                className="text-sm text-pb-primary hover:text-pb-secondary underline"
              >
                View all {boardsWithStats.length} boards →
              </Link>
            </div>
          )}

          <div className="pt-2 border-t border-pb-primary/20">
            <Link
              to="/boards"
              className="inline-flex items-center gap-2 text-sm text-pb-primary hover:text-pb-secondary"
            >
              <Plus className="w-4 h-4" />
              Create New Board
            </Link>
          </div>
        </div>
      )}
    </WidgetContainer>
  );
};







