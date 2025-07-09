import React, { useState } from "react";
import Card from "./Card";
import type { ListData, CardData } from "../../types/taskManager";
import { Edit, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ListColumnProps {
  list: ListData;
  cards: CardData[];
  boardId: string;
  onAddCard: (listId: string, title: string) => void;
  onUpdateCard: (cardId: string, updates: Partial<CardData>) => void;
  dndId: string;
  onDeleteList: (listId: string) => void;
  cardIdPrefix?: string;
}

const ListColumn: React.FC<ListColumnProps> = ({ list, cards, boardId, onAddCard, onUpdateCard, dndId, onDeleteList, cardIdPrefix = '' }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");

  // dnd-kit sortable for lists
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : undefined,
  };

  const handleAddCard = () => {
    if (!newCardTitle.trim()) return;
    onAddCard(list.id, newCardTitle);
    setNewCardTitle("");
    setAddingCard(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-pb-darker rounded-xl p-4 min-w-[20rem] w-80 flex-shrink-0 shadow-lg border border-pb-primary/30 flex flex-col transition-all duration-300 ${collapsed ? 'w-12 min-w-[3rem] p-0 items-center justify-center bg-pb-primary/20' : ''}`}
    >
      <div className={`flex items-center justify-between mb-4 w-full ${collapsed ? 'flex-col gap-0 mb-0 items-center justify-center' : ''}`} style={collapsed ? { height: '100%' } : {}}>
        {collapsed ? (
          <>
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-xs font-bold text-pb-primary/80 mb-2" style={{ letterSpacing: '0.1em', writingMode: 'vertical-lr', textOrientation: 'upright' }}>
                {list.title.split('').join('\n')}
              </span>
              <button onClick={() => setCollapsed(false)} className="text-pb-primary hover:text-pb-success p-1 rounded mt-2">
                <ChevronDown size={20} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-lg font-bold text-white tracking-wide text-left">
              {list.title}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCollapsed(true)} className="text-pb-primary hover:text-pb-success p-1 rounded">
                <ChevronUp size={20} />
              </button>
              <button className="text-pb-primary hover:text-pb-success p-1 rounded"><Edit size={20} /></button>
              <button className="text-pb-accent hover:text-red-500 p-1 rounded" onClick={() => onDeleteList(list.id)}><Trash2 size={20} /></button>
            </div>
          </>
        )}
      </div>
      {!collapsed && (
        <>
          <SortableContext items={Array.isArray(cards) ? cards.map(card => `${cardIdPrefix}${card.id}`) : []} strategy={verticalListSortingStrategy}>
            <div className="flex-1 flex flex-col gap-3 mb-4">
              {cards.map(card => (
                <Card key={card.id} card={card} onUpdateCard={onUpdateCard} dndId={`${cardIdPrefix}${card.id}`} />
              ))}
            </div>
          </SortableContext>
          {addingCard ? (
            <div className="flex flex-col gap-2 mt-2">
              <input
                className="rounded border border-pb-primary/40 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-pb-primary text-[#222]"
                type="text"
                value={newCardTitle}
                onChange={e => setNewCardTitle(e.target.value)}
                placeholder="Enter a title for this card..."
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddCard();
                  if (e.key === 'Escape') { setAddingCard(false); setNewCardTitle(""); }
                }}
              />
              <div className="flex gap-2">
                <button
                  className="bg-pb-success hover:bg-pb-primary text-white font-semibold py-1 px-3 rounded shadow"
                  onClick={handleAddCard}
                >
                  Add
                </button>
                <button
                  className="bg-pb-darker hover:bg-pb-primary/40 text-white font-semibold py-1 px-3 rounded shadow"
                  onClick={() => { setAddingCard(false); setNewCardTitle(""); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button className="mt-auto bg-pb-primary/90 hover:bg-pb-success text-white font-semibold py-2 px-3 rounded transition shadow focus:outline-none"
              onClick={() => setAddingCard(true)}
            >
              + Add Card
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default ListColumn; 