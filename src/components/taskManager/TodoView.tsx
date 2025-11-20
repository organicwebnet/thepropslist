import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { darkTheme, lightTheme } from '../../styles/theme';
import type { CardData, ListData } from '../../shared/types/taskManager';
import CardDetailPanel from './CardDetailPanel';
import { formatDueDate as formatDueDateUtil, isPastDate } from '../../utils/taskHelpers';

interface TodoViewProps {
  boardId: string;
  lists: ListData[];
  cards: Record<string, CardData[]>; // listId -> cards
  onAddCard: (listId: string, title: string) => Promise<void>;
  onUpdateCard: (cardId: string, updates: Partial<CardData>) => Promise<void>;
  onDeleteCard: (cardId: string) => void;
  selectedCardId?: string | null;
  loading?: boolean;
  error?: string | null;
  allShowMembers?: any[];
  availableLabels?: any[];
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
  allShowMembers = [],
  availableLabels = [],
}) => {
  const { theme: themeName } = useTheme();
  const colors = themeName === 'dark' ? darkTheme.colors : lightTheme.colors;
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('due_date');
  const [quickAddText, setQuickAddText] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quickAddInputRef = useRef<TextInput>(null);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [isCardDetailVisible, setIsCardDetailVisible] = useState(false);

  // Flatten all cards with list information
  const flattenedCards = useMemo<FlattenedCard[]>(() => {
    const result: FlattenedCard[] = [];
    lists.forEach(list => {
      const listCards = cards[list.id] || [];
      listCards.forEach(card => {
        result.push({
          ...card,
          listId: list.id,
          listName: list.title || list.name || 'Untitled List',
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
        // For mobile, we'll show all tasks for now (can be enhanced with user context)
        break;
      case 'due_today': {
        const today = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(card => {
          const dueDate = card.dueDate;
          if (!dueDate) return false;
          const dateStr = typeof dueDate === 'string' 
            ? dueDate.split('T')[0] 
            : (dueDate as any).toDate?.().toISOString().split('T')[0];
          return dateStr === today && !card.completed;
        });
        break;
      }
      case 'overdue': {
        const now = new Date();
        filtered = filtered.filter(card => {
          if (!card.dueDate || card.completed) return false;
          const date = typeof card.dueDate === 'string' 
            ? new Date(card.dueDate) 
            : (card.dueDate as any).toDate?.();
          return date && date < now;
        });
        break;
      }
      case 'completed':
        filtered = filtered.filter(card => card.completed);
        break;
      case 'all':
      default:
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'due_date':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          const dateA = typeof a.dueDate === 'string' 
            ? new Date(a.dueDate) 
            : (a.dueDate as any).toDate?.();
          const dateB = typeof b.dueDate === 'string' 
            ? new Date(b.dueDate) 
            : (b.dueDate as any).toDate?.();
          return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
        case 'created_date': {
          const aCreated = (a as any).createdAt 
            ? (typeof (a as any).createdAt === 'string' 
              ? new Date((a as any).createdAt) 
              : (a as any).createdAt?.toDate?.())
            : null;
          const bCreated = (b as any).createdAt 
            ? (typeof (b as any).createdAt === 'string' 
              ? new Date((b as any).createdAt) 
              : (b as any).createdAt?.toDate?.())
            : null;
          if (!aCreated && !bCreated) return 0;
          if (!aCreated) return 1;
          if (!bCreated) return -1;
          return (bCreated.getTime() || 0) - (aCreated.getTime() || 0);
        }
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'list': {
          const listCompare = (a.listName || '').localeCompare(b.listName || '');
          if (listCompare !== 0) return listCompare;
          return (a.title || '').localeCompare(b.title || '');
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [flattenedCards, filter, sortBy]);

  // Get first list ID for quick add (or "Inbox" if exists)
  const getDefaultListId = (): string | null => {
    const inboxList = lists.find(l => 
      (l.title || l.name || '').toLowerCase() === 'inbox'
    );
    if (inboxList) return inboxList.id;
    return lists.length > 0 ? lists[0].id : null;
  };

  const handleQuickAdd = async () => {
    if (!quickAddText.trim() || isAddingCard) return;
    
    const defaultListId = getDefaultListId();
    if (!defaultListId) {
      const errorMsg = 'No list available to add card to';
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
      setQuickAddText('');
      // Re-focus input for rapid entry
      setTimeout(() => quickAddInputRef.current?.focus(), 100);
    } catch (error) {
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
      console.error('Failed to toggle card completion', error);
    } finally {
      setTogglingCardId(null);
    }
  };

  const formatDueDate = useCallback((dueDate?: string | any): string => {
    if (!dueDate) return '';
    const date = typeof dueDate === 'string' 
      ? new Date(dueDate) 
      : dueDate?.toDate?.();
    if (!date || isNaN(date.getTime())) return '';
    return formatDueDateUtil(date);
  }, []);

  const isOverdue = useCallback((dueDate?: string | any): boolean => {
    if (!dueDate) return false;
    const date = typeof dueDate === 'string' 
      ? new Date(dueDate) 
      : dueDate?.toDate?.();
    if (!date || isNaN(date.getTime())) return false;
    return isPastDate(date);
  }, []);

  // Combine external error with internal error
  const displayError = externalError || error;

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => quickAddInputRef.current?.focus(), 300);
  }, []);

  const handleCardPress = (card: FlattenedCard) => {
    setSelectedCard(card);
    setIsCardDetailVisible(true);
  };

  const handleCloseCardDetail = () => {
    setIsCardDetailVisible(false);
    setSelectedCard(null);
  };

  const renderTaskItem = ({ item: card }: { item: FlattenedCard }) => {
    const dueDateText = formatDueDate(card.dueDate);
    const overdue = isOverdue(card.dueDate);

    return (
      <Pressable
        style={[
          styles.taskItem,
          { 
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
          card.completed && { opacity: 0.6 },
        ]}
        onPress={() => handleCardPress(card)}
      >
        {/* Checkbox */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handleToggleComplete(card);
          }}
          style={[
            styles.checkbox,
            {
              borderColor: card.completed ? colors.success : colors.primary,
              backgroundColor: card.completed ? colors.success : 'transparent',
            },
            togglingCardId === card.id && { opacity: 0.5 },
          ]}
          disabled={togglingCardId === card.id}
        >
          {card.completed && (
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          )}
        </Pressable>

        {/* Task Content */}
        <View style={styles.taskContent}>
          <Text
            style={[
              styles.taskTitle,
              { color: colors.text },
              card.completed && styles.completedText,
            ]}
          >
            {card.title || 'Untitled Task'}
          </Text>
          {card.description && (
            <Text
              style={[styles.taskDescription, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {card.description}
            </Text>
          )}

          {/* Metadata */}
          <View style={styles.taskMetadata}>
            {card.dueDate && (
              <View
                style={[
                  styles.metadataBadge,
                  {
                    backgroundColor: overdue
                      ? 'rgba(239, 68, 68, 0.2)'
                      : dueDateText === 'Due today'
                      ? 'rgba(234, 179, 8, 0.2)'
                      : 'rgba(139, 92, 246, 0.2)',
                  },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color={
                    overdue
                      ? '#ef4444'
                      : dueDateText === 'Due today'
                      ? '#eab308'
                      : colors.primary
                  }
                />
                <Text
                  style={[
                    styles.metadataText,
                    {
                      color: overdue
                        ? '#ef4444'
                        : dueDateText === 'Due today'
                        ? '#eab308'
                        : colors.primary,
                    },
                  ]}
                >
                  {dueDateText}
                </Text>
              </View>
            )}
            {card.listName && (
              <View style={[styles.metadataBadge, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                <Text style={[styles.metadataText, { color: colors.primary }]}>
                  {card.listName}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with quick add and filters */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {/* Error Message */}
        {displayError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        )}

        {/* Quick Add Input - Microsoft Todo Style */}
        <View style={styles.quickAddContainer}>
          <View style={styles.quickAddInputWrapper}>
            <Ionicons
              name="add-circle"
              size={24}
              color={colors.primary}
              style={styles.addIcon}
            />
            <TextInput
              ref={quickAddInputRef}
              style={[
                styles.quickAddInput,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.primary,
                },
              ]}
              placeholder="Add a task..."
              placeholderTextColor={colors.placeholder}
              value={quickAddText}
              onChangeText={setQuickAddText}
              onSubmitEditing={handleQuickAdd}
              returnKeyType="done"
              editable={!isAddingCard}
            />
            {isAddingCard && (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.loadingIndicator}
              />
            )}
          </View>
          {quickAddText.trim() && (
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              Press Enter to add task
            </Text>
          )}
        </View>

        {/* Filter and Sort Controls */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.controlsContainer}>
          <View style={styles.controlsRow}>
            <Pressable
              style={styles.controlGroup}
              onPress={() => {
                // Cycle through filters
                const filters: FilterType[] = ['all', 'my_tasks', 'due_today', 'overdue', 'completed'];
                const currentIndex = filters.indexOf(filter);
                setFilter(filters[(currentIndex + 1) % filters.length]);
              }}
            >
              <Ionicons name="filter" size={16} color={colors.textSecondary} />
              <View style={[styles.selectWrapper, { backgroundColor: colors.inputBg }]}>
                <Text style={[styles.selectText, { color: colors.text }]}>
                  {filter === 'all' ? 'All Tasks' :
                   filter === 'my_tasks' ? 'My Tasks' :
                   filter === 'due_today' ? 'Due Today' :
                   filter === 'overdue' ? 'Overdue' :
                   'Completed'}
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.controlGroup}
              onPress={() => {
                // Cycle through sort options
                const sorts: SortType[] = ['due_date', 'created_date', 'title', 'list'];
                const currentIndex = sorts.indexOf(sortBy);
                setSortBy(sorts[(currentIndex + 1) % sorts.length]);
              }}
            >
              <Ionicons name="swap-vertical" size={16} color={colors.textSecondary} />
              <View style={[styles.selectWrapper, { backgroundColor: colors.inputBg }]}>
                <Text style={[styles.selectText, { color: colors.text }]}>
                  {sortBy === 'due_date' ? 'Due Date' :
                   sortBy === 'created_date' ? 'Created Date' :
                   sortBy === 'title' ? 'Title' :
                   'List'}
                </Text>
              </View>
            </Pressable>
            <Text style={[styles.taskCount, { color: colors.textSecondary }]}>
              {filteredCards.length} {filteredCards.length === 1 ? 'task' : 'tasks'}
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Task List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading tasks...
          </Text>
        </View>
      ) : filteredCards.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>✓</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No tasks found</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {filter !== 'all'
              ? `No tasks match the "${filter.replace('_', ' ')}" filter`
              : 'Type in the input field above to add your first task'}
          </Text>
          {filter === 'all' && (
            <Pressable
              onPress={() => quickAddInputRef.current?.focus()}
              style={[styles.addFirstButton, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.addFirstButtonText}>Add your first task</Text>
            </Pressable>
          )}
          {filter !== 'all' && (
            <Pressable
              onPress={() => setFilter('all')}
              style={[styles.addFirstButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.addFirstButtonText}>Show all tasks</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredCards}
          renderItem={renderTaskItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Card Detail Panel */}
      {selectedCard && (
        <CardDetailPanel
          isVisible={isCardDetailVisible}
          card={selectedCard}
          boardId={boardId}
          lists={lists}
          allShowMembers={allShowMembers || []}
          availableLabels={availableLabels || []}
          allCards={selectedCard ? cards[selectedCard.listId] || [] : []}
          onNavigateToCard={(card) => {
            setSelectedCard(card as CardData);
          }}
          onClose={handleCloseCardDetail}
          onUpdateCard={onUpdateCard}
          onDeleteCard={(cardId) => {
            onDeleteCard(cardId);
            handleCloseCardDetail();
          }}
          onMoveCard={async (cardId, targetListId) => {
            // Move card to different list
            await onUpdateCard(cardId, { listId: targetListId });
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    paddingTop: 8,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
  },
  quickAddContainer: {
    marginBottom: 16,
  },
  quickAddInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  addIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  quickAddInput: {
    flex: 1,
    height: 56,
    paddingLeft: 48,
    paddingRight: 48,
    paddingVertical: 16,
    fontSize: 18,
    borderRadius: 12,
    borderWidth: 2,
  },
  loadingIndicator: {
    position: 'absolute',
    right: 12,
  },
  hintText: {
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  controlsContainer: {
    marginTop: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 100,
  },
  selectText: {
    fontSize: 14,
  },
  taskCount: {
    fontSize: 14,
    marginLeft: 'auto',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  taskDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  taskMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metadataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metadataText: {
    fontSize: 12,
  },
});

export default TodoView;

