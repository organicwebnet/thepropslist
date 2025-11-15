import React, { useEffect, useState, useRef } from "react";
import { useFirebase } from "../../contexts/FirebaseContext";
import ListColumn from "./ListColumn";
import TodoView from "./TodoView";
import type { BoardData, ListData, CardData } from "../../types/taskManager";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { logger } from "../../utils/logger";
import { validateCardTitle, validateCardDescription } from "../../utils/validation";
import type { BoardViewMode } from "../../hooks/useBoardPreferences";

interface BoardProps {
  boardId: string;
  hideHeader?: boolean;
  selectedCardId?: string | null;
  viewMode?: BoardViewMode;
}

const Board: React.FC<BoardProps> = ({ boardId, hideHeader, selectedCardId, viewMode = 'kanban' }) => {
  const { service } = useFirebase();
  const [board, setBoard] = useState<BoardData | null>(null);
  const [lists, setLists] = useState<ListData[]>([]);
  const [cards, setCards] = useState<Record<string, CardData[]>>({}); // listId -> cards
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const listsRowRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<'list' | 'card' | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Separate useEffect for board and lists to prevent infinite loop
  useEffect(() => {
    // Listen to board document
    const unsubBoard = service.listenToDocument<BoardData>(
      `todo_boards/${boardId}`,
      (doc) => setBoard({ ...doc.data, listIds: doc.data.listIds || [] })
    );
    
    // Listen to lists
    const unsubLists = service.listenToCollection<ListData>(
      `todo_boards/${boardId}/lists`,
      (docs) => {
        const mappedLists = docs.map(d => ({ 
          ...d.data, 
          id: d.id, 
          title: d.data.title || d.data.name || "Untitled List", 
          cardIds: d.data.cardIds || [] 
        }));
        setLists(mappedLists);
      },
      (err) => {
        logger.taskBoardError('Error loading lists', err);
        setError(err.message || 'Failed to load lists');
      }
    );

    return () => {
      unsubBoard?.();
      unsubLists?.();
    };
  }, [boardId, service]);

  // Separate useEffect for card listeners to prevent infinite loop
  useEffect(() => {
    if (lists.length === 0) return;
    
    const unsubCards = lists.map(list =>
      service.listenToCollection<CardData>(
        `todo_boards/${boardId}/lists/${list.id}/cards`,
        (docs) => setCards(prev => ({ 
          ...prev, 
          [list.id]: docs.map(d => ({ 
            ...d.data, 
            id: d.id, 
            title: d.data.title || d.data.name || "Untitled Card" 
          })) 
        })),
        (err) => {
          logger.taskBoardError(`Error loading cards for list ${list.id}`, err);
        }
      )
    );

    return () => {
      unsubCards.forEach(unsub => unsub?.());
    };
  }, [boardId, service, lists.length]); // Use list length to prevent infinite loops

  // Drag-to-scroll handlers (disabled to allow normal scrolling)
  useEffect(() => {
    const row = listsRowRef.current;
    if (!row) return;
    
    // Only enable drag-to-scroll when not interacting with cards or lists
    const onMouseDown = (e: MouseEvent) => {
      // Only enable drag-to-scroll if clicking on empty space
      const target = e.target as HTMLElement;
      if (target.closest('[data-dnd-kit]') || target.closest('.card') || target.closest('.list-column')) {
        return;
      }
      
      isDragging.current = true;
      startX.current = e.pageX - row.offsetLeft;
      scrollLeft.current = row.scrollLeft;
      row.classList.add('cursor-grabbing');
      e.preventDefault();
    };
    
    const onMouseLeave = () => {
      isDragging.current = false;
      row.classList.remove('cursor-grabbing');
    };
    
    const onMouseUp = () => {
      isDragging.current = false;
      row.classList.remove('cursor-grabbing');
    };
    
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const x = e.pageX - row.offsetLeft;
      const walk = (x - startX.current) * 1.5; // scroll speed
      row.scrollLeft = scrollLeft.current - walk;
    };
    
    row.addEventListener('mousedown', onMouseDown);
    row.addEventListener('mouseleave', onMouseLeave);
    row.addEventListener('mouseup', onMouseUp);
    row.addEventListener('mousemove', onMouseMove);
    
    return () => {
      row.removeEventListener('mousedown', onMouseDown);
      row.removeEventListener('mouseleave', onMouseLeave);
      row.removeEventListener('mouseup', onMouseUp);
      row.removeEventListener('mousemove', onMouseMove);
    };
  }, [lists]);

  // Add card handler
  const addCard = async (listId: string, title: string) => {
    const validation = validateCardTitle(title);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid card title');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const order = (cards[listId]?.length || 0);
      const newCard = {
        title: validation.sanitizedValue!,
        description: '',
        createdAt: new Date().toISOString(),
        order,
        // Add more fields as needed
      };
      await service.addDocument(`todo_boards/${boardId}/lists/${listId}/cards`, newCard);
      // The listener will update state
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add card';
      setError(errorMessage);
      logger.taskBoardError('Failed to add card', err);
    } finally {
      setLoading(false);
    }
  };

  // Update card handler
  const updateCard = async (cardId: string, updates: Partial<CardData>) => {
    // Find the list containing this card
    const listId = Object.keys(cards).find(lid => cards[lid].some(card => card.id === cardId));
    if (!listId) return;
    
    try {
      setError(null);
      
      // Validate title if provided
      if (updates.title) {
        const titleValidation = validateCardTitle(updates.title);
        if (!titleValidation.isValid) {
          setError(titleValidation.error || 'Invalid card title');
          return;
        }
        updates.title = titleValidation.sanitizedValue!;
      }
      
      // Validate description if provided
      if (updates.description) {
        const descValidation = validateCardDescription(updates.description);
        if (!descValidation.isValid) {
          setError(descValidation.error || 'Invalid card description');
          return;
        }
        updates.description = descValidation.sanitizedValue!;
      }
      
      await service.updateDocument(`todo_boards/${boardId}/lists/${listId}/cards`, cardId, updates);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update card';
      setError(errorMessage);
      logger.taskBoardError('Failed to update card', err);
    }
  };

  // Delete card handler
  const deleteCard = async (cardId: string) => {
    // Find the list containing this card
    const listId = Object.keys(cards).find(lid => cards[lid].some(card => card.id === cardId));
    if (!listId) return;
    await service.deleteDocument(`todo_boards/${boardId}/lists/${listId}/cards`, cardId);
  };

  const handleListDragEnd = async (event: DragEndEvent) => {
    if (!board) return;
    const { active, over } = event;
    if (!over || !active) return;
    if (!Array.isArray(board.listIds)) return;

    const activeId = String(active.id).replace(/^list-/, '');

    // Determine which list we are "over". When dragging a list, the over target
    // might be a card inside a list due to nested sortable contexts.
    let overListId: string | null = null;
    const rawOverId = String(over.id);

    if (rawOverId.startsWith('list-')) {
      overListId = rawOverId.replace(/^list-/, '');
    } else if (rawOverId.startsWith('card-')) {
      const overCardId = rawOverId.replace(/^card-/, '');
      for (const list of lists) {
        if ((cards[list.id] || []).some(c => c.id === overCardId)) {
          overListId = list.id;
          break;
        }
      }
    } else if (over.data?.current?.sortable?.containerId) {
      const containerId = String(over.data.current.sortable.containerId);
      if (containerId.startsWith('list-')) {
        overListId = containerId.replace(/^list-/, '');
      }
    }

    if (!overListId) return;

    const oldIndex = board.listIds.indexOf(activeId);
    const newIndex = board.listIds.indexOf(overListId);
    if (oldIndex === -1 || newIndex === -1) return;
    if (oldIndex !== newIndex) {
      const newListIds = arrayMove(board.listIds, oldIndex, newIndex);
      setBoard({ ...board, listIds: newListIds });
      await service.updateDocument(`todo_boards`, boardId, { listIds: newListIds });
    }
  };

  // --- NEW: Card drag handler for cross-list movement ---
  const handleCardDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !active) return;
    const activeCardId = String(active.id).replace(/^card-/, '');
    let sourceListId: string | undefined;
    let destListId: string | undefined;
    for (const list of lists) {
      const idx = (cards[list.id] || []).findIndex(card => card.id === activeCardId);
      if (idx !== -1) {
        sourceListId = list.id;
        break;
      }
    }
    for (const list of lists) {
      if (over.data?.current?.sortable?.containerId === `list-${list.id}` || over.id === `list-${list.id}`) {
        destListId = list.id;
        break;
      }
      if ((cards[list.id] || []).some(card => `card-${card.id}` === over.id)) {
        destListId = list.id;
        break;
      }
    }
    if (!sourceListId || !destListId) return;
    if (sourceListId === destListId) {
      const cardList = cards[sourceListId] || [];
      const oldIdx = cardList.findIndex(card => card.id === activeCardId);
      const newIdx = cardList.findIndex(card => `card-${card.id}` === over.id);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
      const newCards = arrayMove(cardList, oldIdx, newIdx);
      for (let i = 0; i < newCards.length; i++) {
        await service.updateDocument(`todo_boards/${boardId}/lists/${sourceListId}/cards`, newCards[i].id, { order: i });
      }
      return;
    }
    const sourceCards = [...(cards[sourceListId] || [])];
    const destCards = [...(cards[destListId] || [])];
    const movingCardIdx = sourceCards.findIndex(card => card.id === activeCardId);
    if (movingCardIdx === -1) return;
    const [movingCard] = sourceCards.splice(movingCardIdx, 1);
    let insertIdx = destCards.findIndex(card => `card-${card.id}` === over.id);
    if (insertIdx === -1) insertIdx = destCards.length;
    destCards.splice(insertIdx, 0, movingCard);
    await service.deleteDocument(`todo_boards/${boardId}/lists/${sourceListId}/cards`, movingCard.id);
    await service.addDocument(`todo_boards/${boardId}/lists/${destListId}/cards`, { ...movingCard, order: insertIdx });
    for (let i = 0; i < destCards.length; i++) {
      await service.updateDocument(`todo_boards/${boardId}/lists/${destListId}/cards`, destCards[i].id, { order: i });
    }
  };

  // Add deleteList handler
  const deleteList = async (listId: string) => {
    // Remove list document
    await service.deleteDocument(`todo_boards/${boardId}/lists`, listId);
    // Remove from board.listIds
    if (board && Array.isArray(board.listIds)) {
      const newListIds = board.listIds.filter(id => id !== listId);
      setBoard({ ...board, listIds: newListIds });
      await service.updateDocument(`todo_boards`, boardId, { listIds: newListIds });
    }
  };

  // Add list handler (FAB)
  const addList = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        title: 'New List',
        cardIds: [],
        createdAt: new Date().toISOString(),
      } as Partial<ListData> & { createdAt: string };
      
      const newListId = await service.addDocument(`todo_boards/${boardId}/lists`, payload);
      
      // If we received the new id, append to board.listIds for ordering
      if (newListId && typeof newListId === 'string' && board && Array.isArray(board.listIds)) {
        const updated: string[] = [...board.listIds.filter(id => typeof id === 'string'), newListId];
        setBoard({ ...board, listIds: updated });
        await service.updateDocument('todo_boards', boardId, { listIds: updated });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add list';
      setError(errorMessage);
      logger.taskBoardError('Failed to add list', err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading && !board) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pb-primary mx-auto mb-4"></div>
          <p className="text-pb-gray/70">Loading board...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">Error loading board</div>
          <p className="text-pb-gray/70 mb-4">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              setLoading(true);
            }}
            className="px-4 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!board) return null;

  // Render Todo view if viewMode is 'todo'
  if (viewMode === 'todo') {
    return (
      <div className="relative w-full h-full flex flex-col bg-transparent overflow-hidden p-0">
        <TodoView
          boardId={boardId}
          lists={lists}
          cards={cards}
          onAddCard={addCard}
          onUpdateCard={updateCard}
          onDeleteCard={deleteCard}
          selectedCardId={selectedCardId}
          loading={loading}
          error={error}
        />
      </div>
    );
  }

  // Deduplicate lists by name (case-insensitive)
  const uniqueLists = lists.filter(
    (list, index, self) =>
      list.title &&
      self.findIndex(l => l.title?.toLowerCase() === list.title?.toLowerCase()) === index
  );

  // If there are no lists at all, show empty state
  if (lists.length === 0) {
    return (
      <div className="relative w-full h-full flex flex-col bg-transparent overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Board Title as sticky header */}
          {!hideHeader && (
            <div className="sticky top-0 z-10 bg-transparent py-2">
              <span className="text-2xl font-bold text-white pl-6">{board.title || board.name || "Board"}</span>
            </div>
          )}
          {/* Empty state */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-pb-gray/70">
              <div className="text-6xl mb-4">📋</div>
              <div className="text-lg sm:text-xl mb-2">No lists found for this board</div>
              <div className="text-sm sm:text-base">Click the + button to add your first list</div>
            </div>
          </div>
        </div>
        {/* FAB to add a list */}
        <button
          onClick={addList}
          className="fixed bottom-10 right-10 bg-pb-primary hover:bg-pb-success text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg text-3xl z-50"
          aria-label="Add list"
          title="Add list"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-transparent overflow-hidden p-0">
      <div className="flex-1 flex flex-col min-h-0">
        {/* Board Title as sticky header */}
        {!hideHeader && (
          <div className="sticky top-0 z-10 bg-transparent py-2 px-4 sm:px-6">
            <span className="text-xl sm:text-2xl font-bold text-white">{board.title || board.name || "Board"}</span>
          </div>
        )}
        {/* Lists Row Scrollable Area */}
        <div 
          className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-hidden p-2 sm:p-4 task-board-scroll" 
          style={{ 
            minWidth: 0,
            WebkitOverflowScrolling: 'touch'
          }}
          role="main"
          aria-label="Task board lists"
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={event => {
              const id = String(event.active.id);
              if (id.startsWith('list-')) setActiveDragType('list');
              else if (id.startsWith('card-')) setActiveDragType('card');
              else setActiveDragType(null);
              setActiveDragId(id);
            }}
            onDragEnd={event => {
              const id = String(event.active.id);
              if (id.startsWith('list-')) handleListDragEnd(event);
              else if (id.startsWith('card-')) handleCardDragEnd(event);
              setActiveDragId(null);
              setActiveDragType(null);
            }}
            onDragCancel={() => {
              setActiveDragId(null);
              setActiveDragType(null);
            }}
          >
            <SortableContext items={
              Array.isArray(board.listIds) && board.listIds.length > 0 
                ? board.listIds.map(id => `list-${id}`) 
                : uniqueLists.map(list => `list-${list.id}`)
            } strategy={horizontalListSortingStrategy}>
          <div
            ref={listsRowRef}
            className="flex items-start gap-2 sm:gap-4 md:gap-6 h-full cursor-grab pr-8 sm:pr-12 md:pr-24 pl-2 sm:pl-4 md:pl-6 p-0 m-0"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              width: 'max-content',
              minWidth: '100%',
              display: 'flex',
              flexWrap: 'nowrap',
              height: '100%'
            }}
            role="region"
            aria-label="Task board lists"
            tabIndex={0}
          >
            {Array.isArray(board.listIds) && board.listIds.length > 0
              ? board.listIds.map(listId => {
                  const list = lists.find(l => l.id === listId);
                  if (!list) return null;
                  return (
                    <ListColumn
                      key={list.id}
                      list={list}
                      cards={cards[list.id] || []}
                      onAddCard={addCard}
                      onUpdateCard={updateCard}
                      onDeleteCard={deleteCard}
                          dndId={`list-${list.id}`}
                          onDeleteList={deleteList}
                          cardIdPrefix="card-"
                    />
                  );
                })
              : uniqueLists.map(list => (
                  <ListColumn
                    key={list.id}
                    list={list}
                    cards={cards[list.id] || []}
                    onAddCard={addCard}
                    onUpdateCard={updateCard}
                    onDeleteCard={deleteCard}
                    dndId={`list-${list.id}`}
                    onDeleteList={deleteList}
                    cardIdPrefix="card-"
                    selectedCardId={selectedCardId || null}
                  />
                ))}
            {/* Add List button at the end of the lists (hidden, replaced by FAB) */}
          </div>
            </SortableContext>
            <DragOverlay>
              {activeDragType === 'card' && activeDragId ? (() => {
                // Find the card data
                let card: CardData | undefined;
                for (const list of lists) {
                  card = (cards[list.id] || []).find(c => `card-${c.id}` === activeDragId);
                  if (card) break;
                }
                return card ? (
                  <div className="block rounded-lg p-3 shadow-lg bg-pb-darker text-white min-w-[16rem] min-h-[4rem]">
                    <div className="font-semibold">{card.title}</div>
                    {card.description && <div className="text-xs opacity-70 mt-1">{card.description}</div>}
                  </div>
                ) : null;
              })() : null}
              {activeDragType === 'list' && activeDragId ? (() => {
                // Find the list data
                const list = lists.find(l => `list-${l.id}` === activeDragId);
                return list ? (
                  <div className="bg-pb-darker rounded-xl p-4 min-w-[20rem] w-80 shadow-lg border border-pb-primary/30">
                    <div className="text-lg font-bold text-white tracking-wide text-left">{list.title}</div>
                  </div>
                ) : null;
              })() : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
      {/* FAB to add a list */}
      <button
        onClick={addList}
        className="fixed bottom-4 right-4 sm:bottom-10 sm:right-10 bg-pb-primary hover:bg-pb-success text-white rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shadow-lg text-2xl sm:text-3xl z-50 focus:outline-none focus:ring-4 focus:ring-pb-primary/50"
        aria-label="Add new list"
        title="Add new list"
        disabled={loading}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 sm:h-6 sm:w-6 border-b-2 border-white"></div>
        ) : (
          '+'
        )}
      </button>
    </div>
  );
};

export default Board; 