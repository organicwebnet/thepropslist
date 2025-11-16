import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { CardData, ListData } from "../../types/taskManager";
import { CardDetailModal } from "./Card";
import { useFirebase } from "../../contexts/FirebaseContext";
import { useMentionData } from "../../contexts/MentionDataContext";
import { Calendar, Filter, SortAsc } from "lucide-react";
import { logger } from "../../utils/logger";
import { formatDueDate as formatDueDateUtil, isPastDate } from "../../utils/taskHelpers";

interface TodoViewProps {
  boardId: string;
  lists: ListData[];
  cards: Record<string, CardData[]>; // listId -> cards
  onAddCard: (listId: string, title: string) => void;
  onUpdateCard: (cardId: string, updates: Partial<CardData>) => void;
  onDeleteCard: (cardId: string) => void;
  selectedCardId?: string | null;
  loading?: boolean;
  error?: string | null;
}

type FilterType = 'all' | 'my_tasks' | 'due_today' | 'overdue' | 'completed';
type SortType = 'due_date' | 'created_date' | 'title' | 'list';

interface FlattenedCard extends CardData {
  listId: string;
  listName: string;
}

const TodoView: React.FC<TodoViewProps> = ({
  boardId,
  lists,
  cards,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  selectedCardId,
  loading = false,
  error: externalError = null,
}) => {
  const { user } = useFirebase();
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('due_date');
  const [quickAddText, setQuickAddText] = useState("");
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quickAddInputRef = useRef<HTMLInputElement>(null);

  // @mention state for quick add
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionType, setMentionType] = useState<'prop' | 'container' | 'user' | null>(null);
  const [showMentionSearch, setShowMentionSearch] = useState(false);
  const [mentionSearchText, setMentionSearchText] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  
  const { propsList, containersList, usersList } = useMentionData();

  // Flatten all cards with list information
  const flattenedCards = useMemo<FlattenedCard[]>(() => {
    const result: FlattenedCard[] = [];
    lists.forEach(list => {
      const listCards = cards[list.id] || [];
      listCards.forEach(card => {
        result.push({
          ...card,
          listId: list.id,
          listName: list.title,
        });
      });
    });
    return result;
  }, [lists, cards]);

  // Filter cards
  const filteredCards = useMemo(() => {
    let filtered = [...flattenedCards];

    // Apply filter
    switch (filter) {
      case 'my_tasks':
        filtered = filtered.filter(card => 
          card.assignedTo?.includes(user?.uid || '')
        );
        break;
      case 'due_today':
        const today = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(card => 
          card.dueDate && card.dueDate.split('T')[0] === today && !card.completed
        );
        break;
      case 'overdue':
        const now = new Date();
        filtered = filtered.filter(card => 
          card.dueDate && 
          new Date(card.dueDate) < now && 
          !card.completed
        );
        break;
      case 'completed':
        filtered = filtered.filter(card => card.completed);
        break;
      case 'all':
      default:
        // Show all non-completed by default, or all if filter is explicitly 'all'
        if (filter === 'all') {
          // Show all
        } else {
          filtered = filtered.filter(card => !card.completed);
        }
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'due_date':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'created_date':
          // Use order field or fallback to 0 if createdAt doesn't exist
          const aCreated = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : ((a as any).order ?? 0);
          const bCreated = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : ((b as any).order ?? 0);
          return bCreated - aCreated; // Newest first
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'list':
          const listCompare = (a.listName || '').localeCompare(b.listName || '');
          if (listCompare !== 0) return listCompare;
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [flattenedCards, filter, sortBy, user?.uid]);

  // Get first list ID for quick add (or "Inbox" if exists)
  const getDefaultListId = (): string | null => {
    const inboxList = lists.find(l => l.title.toLowerCase() === 'inbox');
    if (inboxList) return inboxList.id;
    return lists.length > 0 ? lists[0].id : null;
  };

  const handleQuickAdd = async () => {
    if (!quickAddText.trim() || isAddingCard) return;
    
    const defaultListId = getDefaultListId();
    if (!defaultListId) {
      const errorMsg = 'No list available to add card to';
      logger.taskBoardError(errorMsg, new Error('No lists found'));
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
      return;
    }

    // Validate input length
    const trimmedText = quickAddText.trim();
    if (trimmedText.length > 200) {
      const errorMsg = 'Task title must be 200 characters or less';
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
      return;
    }

    try {
      setIsAddingCard(true);
      setError(null);
      await onAddCard(defaultListId, trimmedText);
      setQuickAddText("");
      // Re-focus input for rapid entry
      setTimeout(() => quickAddInputRef.current?.focus(), 0);
    } catch (error) {
      logger.taskBoardError('Failed to add card', error);
      const errorMsg = 'Failed to add task. Please try again.';
      setError(errorMsg);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsAddingCard(false);
    }
  };

  const [togglingCardId, setTogglingCardId] = useState<string | null>(null);

  const handleToggleComplete = async (card: FlattenedCard) => {
    if (togglingCardId === card.id) return; // Prevent double-clicks
    setTogglingCardId(card.id);
    try {
      await onUpdateCard(card.id, { completed: !card.completed });
    } catch (error) {
      logger.taskBoardError('Failed to toggle card completion', error);
    } finally {
      setTogglingCardId(null);
    }
  };

  const formatDueDate = useCallback((dueDate?: string): string => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) return '';
    return formatDueDateUtil(date);
  }, []);

  const isOverdue = useCallback((dueDate?: string): boolean => {
    if (!dueDate) return false;
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) return false;
    return isPastDate(date);
  }, []);

  // Combine external error with internal error
  const displayError = externalError || error;

  return (
    <div className="flex flex-col h-full w-full bg-transparent min-h-0">
      {/* Header with quick add and filters */}
      <div className="sticky top-0 z-10 bg-transparent p-4 border-b border-pb-primary/20 flex-shrink-0">
        {/* Error Message */}
        {displayError && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="text-red-200 text-sm">{displayError}</div>
          </div>
        )}
        {/* Quick Add Input */}
        <div className="mb-4 relative">
          <input
            ref={quickAddInputRef}
            type="text"
            value={quickAddText}
            onChange={e => setQuickAddText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleQuickAdd();
              }
              if (e.key === 'Escape') {
                setQuickAddText("");
              }
              if (e.key === '@') {
                setShowMentionMenu(true);
              }
            }}
            placeholder="Add a task..."
            className="w-full px-4 py-3 rounded-lg bg-pb-darker/60 border border-pb-primary/30 text-white placeholder:text-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary"
            disabled={isAddingCard}
          />
          {showMentionMenu && (
            <div 
              className="absolute -top-28 left-0 bg-white text-black rounded shadow p-2 z-50 w-48 sm:w-56"
              role="menu"
            >
              <div className="font-semibold mb-1">Mention Type</div>
              <button 
                className="w-full text-left py-1 hover:bg-gray-100 px-2"
                onClick={() => { 
                  setMentionType('prop'); 
                  setShowMentionMenu(false); 
                  setShowMentionSearch(true); 
                  setMentionSearchText(''); 
                  setMentionSuggestions(propsList); 
                }}
              >
                Prop
              </button>
              <button 
                className="w-full text-left py-1 hover:bg-gray-100 px-2"
                onClick={() => { 
                  setMentionType('container'); 
                  setShowMentionMenu(false); 
                  setShowMentionSearch(true); 
                  setMentionSearchText(''); 
                  setMentionSuggestions(containersList); 
                }}
              >
                Box/Container
              </button>
              <button 
                className="w-full text-left py-1 hover:bg-gray-100 px-2"
                onClick={() => { 
                  setMentionType('user'); 
                  setShowMentionMenu(false); 
                  setShowMentionSearch(true); 
                  setMentionSearchText(''); 
                  setMentionSuggestions(usersList); 
                }}
              >
                User
              </button>
            </div>
          )}
          {showMentionSearch && (
            <div 
              className="absolute -top-40 left-0 bg-[#1f2937] text-white rounded border border-white/10 p-3 z-50 w-64 sm:w-72"
            >
              <div className="text-sm text-gray-300 mb-2">Search {mentionType}</div>
              <input
                className="w-full rounded bg-[#111827] border border-white/10 px-2 py-1 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-pb-primary"
                placeholder={`Type to search ${mentionType}...`}
                value={mentionSearchText}
                onChange={e => setMentionSearchText(e.target.value)}
              />
              <div className="max-h-40 overflow-auto space-y-1">
                {mentionSuggestions.filter(i => (i.name || '').toLowerCase().includes(mentionSearchText.toLowerCase())).map(i => (
                  <button 
                    key={i.id} 
                    className="block w-full text-left px-2 py-1 rounded hover:bg-white/10"
                    onClick={() => {
                      const text = `@${i.name}`;
                      setQuickAddText(prev => {
                        const t = prev || '';
                        const base = t.endsWith('@') ? t.slice(0, -1).trimEnd() : t.trimEnd();
                        return (base ? base + ' ' : '') + text + ' ';
                      });
                      setShowMentionSearch(false);
                      setMentionType(null);
                    }}
                  >
                    {i.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-pb-gray" />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as FilterType)}
              aria-label="Filter tasks"
              className="bg-pb-darker/60 border border-pb-primary/30 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pb-primary"
            >
              <option value="all">All Tasks</option>
              <option value="my_tasks">My Tasks</option>
              <option value="due_today">Due Today</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <SortAsc className="w-4 h-4 text-pb-gray" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortType)}
              aria-label="Sort tasks"
              className="bg-pb-darker/60 border border-pb-primary/30 text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-pb-primary"
            >
              <option value="due_date">Due Date</option>
              <option value="created_date">Created Date</option>
              <option value="title">Title</option>
              <option value="list">List</option>
            </select>
          </div>
          <div className="text-sm text-pb-gray ml-auto">
            {filteredCards.length} {filteredCards.length === 1 ? 'task' : 'tasks'}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pb-primary mx-auto mb-4"></div>
              <p className="text-pb-gray/70">Loading tasks...</p>
            </div>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-pb-gray/70">
            <div className="text-6xl mb-4">✓</div>
            <div className="text-lg mb-2">No tasks found</div>
            <div className="text-sm">
              {filter !== 'all' 
                ? `No tasks match the "${filter.replace('_', ' ')}" filter`
                : 'Add a task above to get started'}
            </div>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="mt-4 px-4 py-2 bg-pb-primary text-white rounded hover:bg-pb-secondary transition"
                aria-label="Show all tasks"
              >
                Show all tasks
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCards.map(card => {
              const cardWithList = card as FlattenedCard;
              return (
                <TodoTaskItem
                  key={card.id}
                  card={cardWithList}
                  onToggleComplete={() => handleToggleComplete(cardWithList)}
                  togglingCardId={togglingCardId}
                  onUpdateCard={onUpdateCard}
                  onDeleteCard={onDeleteCard}
                  formatDueDate={formatDueDate}
                  isOverdue={isOverdue}
                  selectedCardId={selectedCardId}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Task Item Component
interface TodoTaskItemProps {
  card: FlattenedCard;
  onToggleComplete: () => void;
  onUpdateCard: (cardId: string, updates: Partial<CardData>) => void;
  onDeleteCard: (cardId: string) => void;
  formatDueDate: (dueDate?: string) => string;
  isOverdue: (dueDate?: string) => boolean;
  selectedCardId?: string | null;
  togglingCardId?: string | null;
}

const TodoTaskItem: React.FC<TodoTaskItemProps> = ({
  card,
  onToggleComplete,
  onUpdateCard,
  onDeleteCard,
  formatDueDate,
  isOverdue,
  selectedCardId,
  togglingCardId,
}) => {
  const [modalOpen, setModalOpen] = useState(selectedCardId === card.id);

  useEffect(() => {
    if (selectedCardId === card.id) {
      setModalOpen(true);
    } else if (selectedCardId === null || selectedCardId !== card.id) {
      setModalOpen(false);
    }
  }, [selectedCardId, card.id]);

  const dueDateText = formatDueDate(card.dueDate);
  const overdue = isOverdue(card.dueDate);

  return (
    <>
      <div
        className={`flex items-start gap-3 p-3 rounded-lg bg-pb-darker/40 border border-pb-primary/20 hover:bg-pb-darker/60 hover:border-pb-primary/40 transition-all cursor-pointer group ${
          card.completed ? 'opacity-60' : ''
        }`}
        onClick={() => setModalOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setModalOpen(true);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Task: ${card.title || 'Untitled Task'}`}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleComplete();
          }}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all hover:scale-110 ${
                card.completed
                  ? 'bg-pb-success border-pb-success'
                  : 'border-pb-primary/50 hover:border-pb-primary bg-transparent'
              } ${togglingCardId === card.id ? 'opacity-50 cursor-wait' : ''}`}
              aria-label={card.completed ? 'Mark incomplete' : 'Mark complete'}
              disabled={togglingCardId === card.id}
        >
          {card.completed && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className={`flex items-start gap-2 ${card.completed ? 'line-through' : ''}`}>
            <div className="flex-1">
              <div className="text-white font-medium">{card.title || 'Untitled Task'}</div>
              {card.description && (
                <div className="text-sm text-pb-gray/70 mt-1 line-clamp-2">{card.description}</div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {card.dueDate && (
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                overdue
                  ? 'bg-red-500/20 text-red-300'
                  : dueDateText === 'Due today'
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-pb-primary/20 text-pb-primary'
              }`}>
                <Calendar className="w-3 h-3" />
                {dueDateText}
              </div>
            )}
            {card.listName && (
              <div className="text-xs px-2 py-1 rounded bg-pb-primary/20 text-pb-primary">
                {card.listName}
              </div>
            )}
            {card.assignedTo && card.assignedTo.length > 0 && (
              <div className="text-xs text-pb-gray/70">
                {card.assignedTo.length} {card.assignedTo.length === 1 ? 'assignee' : 'assignees'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Detail Modal */}
      <CardDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        card={card}
        onUpdateCard={onUpdateCard}
        onDeleteCard={onDeleteCard}
      />
    </>
  );
};

export default TodoView;

