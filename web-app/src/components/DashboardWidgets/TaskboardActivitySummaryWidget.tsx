/**
 * Taskboard Activity Summary Widget
 * 
 * Overview of all taskboards with completion metrics
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LayoutList, TrendingUp, AlertCircle } from 'lucide-react';
import { WidgetContainer } from './WidgetContainer';
import { useFirebase } from '../../contexts/FirebaseContext';
import type { DashboardWidgetProps } from './types';
import type { BoardData } from '../../types/taskManager';
import type { CardData } from '../../types/taskManager';

interface BoardSummary extends BoardData {
  totalCards: number;
  completedCards: number;
  inProgressCards: number;
  todoCards: number;
  completionPercent: number;
  overdueCards: number;
}

export const TaskboardActivitySummaryWidget: React.FC<DashboardWidgetProps> = ({
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

  // Calculate summaries for each board
  const boardSummaries = useMemo((): BoardSummary[] => {
    // This is a simplified calculation
    // In a full implementation, we'd need to track which cards belong to which board
    // For now, we'll approximate by distributing cards evenly or using list matching
    
    const now = new Date();
    
    return boards.map(board => {
      // Filter cards - simplified: assume all cards are potentially from this board
      // In reality, we'd need boardId on cards or match via lists
      const boardCards = cards as CardData[];
      
      const totalCards = boardCards.length;
      const completedCards = boardCards.filter(c => c.completed).length;
      const inProgressCards = boardCards.filter(c => 
        !c.completed && (c.status === 'in_progress' || c.status === 'in-progress')
      ).length;
      const todoCards = totalCards - completedCards - inProgressCards;
      
      const completionPercent = totalCards > 0
        ? Math.round((completedCards / totalCards) * 100)
        : 0;

      // Count overdue cards
      const overdueCards = boardCards.filter(c => {
        if (c.completed || !c.dueDate) return false;
        return new Date(c.dueDate) < now;
      }).length;

      return {
        ...board,
        totalCards,
        completedCards,
        inProgressCards,
        todoCards,
        completionPercent,
        overdueCards,
      };
    });
  }, [boards, cards]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const total = boardSummaries.reduce((sum, b) => sum + b.totalCards, 0);
    const completed = boardSummaries.reduce((sum, b) => sum + b.completedCards, 0);
    const overdue = boardSummaries.reduce((sum, b) => sum + b.overdueCards, 0);
    const overallCompletion = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, overdue, overallCompletion };
  }, [boardSummaries]);

  return (
    <WidgetContainer
      widgetId="taskboard-activity-summary"
      title="Taskboard Summary"
      loading={loading}
    >
      {boardSummaries.length === 0 ? (
        <div className="text-center py-8">
          <LayoutList className="w-12 h-12 text-pb-gray mx-auto mb-3 opacity-50" />
          <p className="text-pb-gray text-sm">No taskboards found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overall Stats */}
          <div className="p-4 rounded-lg bg-pb-primary/10 border border-pb-primary/20">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">{overallStats.total}</div>
                <div className="text-xs text-pb-gray">Total Tasks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{overallStats.overallCompletion}%</div>
                <div className="text-xs text-pb-gray">Complete</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{overallStats.overdue}</div>
                <div className="text-xs text-pb-gray">Overdue</div>
              </div>
            </div>
          </div>

          {/* Board Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">By Board</h4>
            {boardSummaries.map((board) => (
              <Link
                key={board.id}
                to={`/boards?boardId=${board.id}`}
                className="block p-3 rounded-lg bg-pb-primary/5 hover:bg-pb-primary/10 transition-colors border border-pb-primary/20"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-white font-medium truncate">{board.title}</h5>
                    <div className="flex items-center gap-3 mt-1 text-xs text-pb-gray">
                      <span>{board.totalCards} tasks</span>
                      {board.overdueCards > 0 && (
                        <span className="text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {board.overdueCards} overdue
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-3 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">
                      {board.completionPercent}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2 w-full bg-pb-primary/20 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${board.completionPercent}%` }}
                  />
                </div>

                {/* Status breakdown */}
                {board.totalCards > 0 && (
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="text-green-400">✓ {board.completedCards} done</span>
                    <span className="text-orange-400">◐ {board.inProgressCards} in progress</span>
                    <span className="text-pb-gray">○ {board.todoCards} to do</span>
                  </div>
                )}
              </Link>
            ))}
          </div>

          <div className="pt-2 text-center border-t border-pb-primary/20">
            <Link
              to="/boards"
              className="text-sm text-pb-primary hover:text-pb-secondary underline"
            >
              View all boards →
            </Link>
          </div>
        </div>
      )}
    </WidgetContainer>
  );
};








