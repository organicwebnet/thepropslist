import React, { useEffect, useState, useRef } from "react";
import { useFirebase } from "../../contexts/FirebaseContext";
import ListColumn from "./ListColumn";
import type { BoardData, ListData, CardData } from "../../types/taskManager";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';

interface BoardProps {
  boardId: string;
  hideHeader?: boolean;
  selectedCardId?: string | null;
}

const Board: React.FC<BoardProps> = ({ boardId, hideHeader, selectedCardId }) => {
  const { service } = useFirebase();
  const [board, setBoard] = useState<BoardData | null>(null);
  const [lists, setLists] = useState<ListData[]>([]);
  const [cards, setCards] = useState<Record<string, CardData[]>>({}); // listId -> cards
  const listsRowRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<'list' | 'card' | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    // Listen to board document
    const unsubBoard = service.listenToDocument<BoardData>(
      `todo_boards/${boardId}`,
      (doc) => setBoard(doc.data)
    );
    // Listen to lists
    const unsubLists = service.listenToCollection<ListData>(
      `todo_boards/${boardId}/lists`,
      (docs) => {
        const mappedLists = docs.map(d => ({ ...d.data, id: d.id, title: d.data.title || d.data.name || "Untitled List", cardIds: d.data.cardIds || [] }));
        console.log(`[Board] Lists for board ${boardId}:`, mappedLists);
        setLists(mappedLists);
      },
      (err) => console.error(err)
    );
    // Listen to cards for each list
    let unsubCards: (() => void)[] = [];
    if (lists.length) {
      unsubCards.forEach(unsub => unsub());
      unsubCards = lists.map(list =>
        service.listenToCollection<CardData>(
          `todo_boards/${boardId}/lists/${list.id}/cards`,
           (docs) => setCards(prev => ({ ...prev, [list.id]: docs.map(d => ({ ...d.data, id: d.id, title: d.data.title || d.data.name || "Untitled Card" })) })),
          (err) => console.error(err)
        )
      );
    }
    return () => {
      if (unsubBoard) unsubBoard();
      if (unsubLists) unsubLists();
      unsubCards.forEach(unsub => unsub && unsub());
    };
  }, [boardId, lists.length, service]);

  // Drag-to-scroll handlers
  useEffect(() => {
    const row = listsRowRef.current;
    if (!row) return;
    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      startX.current = e.pageX - row.offsetLeft;
      scrollLeft.current = row.scrollLeft;
      row.classList.add('cursor-grabbing');
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
    // Touch events for mobile
    let touchStartX = 0;
    let touchScrollLeft = 0;
    const onTouchStart = (e: TouchEvent) => {
      isDragging.current = true;
      touchStartX = e.touches[0].pageX - row.offsetLeft;
      touchScrollLeft = row.scrollLeft;
    };
    const onTouchEnd = () => {
      isDragging.current = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      const x = e.touches[0].pageX - row.offsetLeft;
      const walk = (x - touchStartX) * 1.5;
      row.scrollLeft = touchScrollLeft - walk;
    };
    row.addEventListener('touchstart', onTouchStart);
    row.addEventListener('touchend', onTouchEnd);
    row.addEventListener('touchmove', onTouchMove);
    return () => {
      row.removeEventListener('mousedown', onMouseDown);
      row.removeEventListener('mouseleave', onMouseLeave);
      row.removeEventListener('mouseup', onMouseUp);
      row.removeEventListener('mousemove', onMouseMove);
      row.removeEventListener('touchstart', onTouchStart);
      row.removeEventListener('touchend', onTouchEnd);
      row.removeEventListener('touchmove', onTouchMove);
    };
  }, [lists]);

  // Add card handler
  const addCard = async (listId: string, title: string) => {
    if (!title.trim()) return;
    const order = (cards[listId]?.length || 0);
    const newCard = {
      title: title.trim(),
      description: '',
      createdAt: new Date().toISOString(),
      order,
      // Add more fields as needed
    };
    await service.addDocument(`todo_boards/${boardId}/lists/${listId}/cards`, newCard);
    // The listener will update state
  };

  // Update card handler
  const updateCard = async (cardId: string, updates: Partial<CardData>) => {
    // Find the list containing this card
    const listId = Object.keys(cards).find(lid => cards[lid].some(card => card.id === cardId));
    if (!listId) return;
    await service.updateDocument(`todo_boards/${boardId}/lists/${listId}/cards`, cardId, updates);
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
      const payload = {
        title: 'New List',
        cardIds: [],
        createdAt: new Date().toISOString(),
      } as Partial<ListData> & { createdAt: string };
      const newListId = await (service as any).addDocument(`todo_boards/${boardId}/lists`, payload);
      // If we received the new id, append to board.listIds for ordering
      if (newListId && board && Array.isArray(board.listIds)) {
        const updated = [...board.listIds, newListId as string];
        setBoard({ ...board, listIds: updated });
        await service.updateDocument('todo_boards', boardId, { listIds: updated });
      }
    } catch (err) {
      console.error('Failed to add list', err);
    }
  };

  if (!board) return <div>Loading board...</div>;

  // Deduplicate lists by name (case-insensitive)
  const uniqueLists = lists.filter(
    (list, index, self) =>
      list.title &&
      self.findIndex(l => l.title?.toLowerCase() === list.title?.toLowerCase()) === index
  );

  // If listIds is missing or not an array, just show all unique lists
  if (!Array.isArray(board.listIds) || board.listIds.length === 0) {
    if (uniqueLists.length === 0) return <div>No lists found for this board.</div>;
    return (
      <div className="relative w-full h-full flex flex-col bg-transparent overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Board Title as sticky header */}
          {!hideHeader && (
            <div className="sticky top-0 z-10 bg-transparent py-2">
              <span className="text-2xl font-bold text-white pl-6">{board.title || board.name || "Board"}</span>
            </div>
          )}
          {/* Lists Row Scrollable Area */}
          <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-hidden overscroll-contain">
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
              <SortableContext items={Array.isArray(board.listIds) ? board.listIds.map(id => `list-${id}`) : []} strategy={horizontalListSortingStrategy}>
            <div
              ref={listsRowRef}
              className="flex items-start gap-3 h-full cursor-grab w-max px-6 lg:px-10 overscroll-contain"
              style={{ WebkitOverflowScrolling: 'touch' }}
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
                            selectedCardId={selectedCardId || null}
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
          <div className="sticky top-0 z-10 bg-transparent py-2">
            <span className="text-2xl font-bold text-white pl-6">{board.title || board.name || "Board"}</span>
          </div>
        )}
        {/* Lists Row Scrollable Area */}
        <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-hidden overscroll-contain p-0">
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
            <SortableContext items={Array.isArray(board.listIds) ? board.listIds.map(id => `list-${id}`) : []} strategy={horizontalListSortingStrategy}>
          <div
            ref={listsRowRef}
            className="flex items-start gap-6 h-full cursor-grab w-max pr-10 overscroll-contain p-0 m-0"
            style={{ WebkitOverflowScrolling: 'touch' }}
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
        className="fixed bottom-10 right-10 bg-pb-primary hover:bg-pb-success text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg text-3xl z-50"
        aria-label="Add list"
        title="Add list"
      >
        +
      </button>
    </div>
  );
};

export default Board; 