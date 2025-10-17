import React, { useState } from "react";
import Card from "./Card";
import type { ListData, CardData } from "../../types/taskManager";
import { Edit, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ListColumnProps {
  list: ListData;
  cards: CardData[];
  onAddCard: (listId: string, title: string) => void;
  onUpdateCard: (cardId: string, updates: Partial<CardData>) => void;
  onDeleteCard: (cardId: string) => void;
  dndId: string;
  onDeleteList: (listId: string) => void;
  cardIdPrefix?: string;
  selectedCardId?: string | null;
}

const ListColumn: React.FC<ListColumnProps> = ({ list, cards, onAddCard, onUpdateCard, onDeleteCard, dndId, onDeleteList, cardIdPrefix = '', selectedCardId }) => {
  const [collapsed, setCollapsed] = useState(false);


  // dnd-kit sortable for lists
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : undefined,
  };


  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-pb-darker rounded-md shadow-lg border border-pb-primary/30 flex flex-col flex-shrink-0 transition-all duration-300 ${collapsed ? '!w-10 min-w-[2.5rem] min-h-[22rem] p-0 bg-pb-primary/20 relative items-center justify-center' : 'p-4 min-w-[18rem] w-[20rem]'}`}
      role="list"
      aria-label={`List: ${list.title}`}
      tabIndex={0}
    >
      <div className={`flex items-center justify-between mb-4 w-full ${collapsed ? 'mb-0' : ''}`} style={collapsed ? { height: 'auto' } : {}}>
        {collapsed ? (
          <>
            <div className="relative h-full w-full flex items-center justify-center">
              <span className="text-sm font-bold text-pb-primary/80 select-none transform -rotate-90 whitespace-nowrap tracking-widest text-center">
                {list.title}
              </span>
              <button
                onClick={() => setCollapsed(false)}
                className="absolute top-2 left-1/2 -translate-x-1/2 text-pb-primary hover:text-pb-success p-1 rounded"
                aria-label="Expand list"
                title="Expand"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="text-lg font-bold text-white tracking-wide text-left">
              {list.title}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCollapsed(true)} className="text-pb-primary hover:text-pb-success p-1 rounded" aria-label="Collapse list" title="Collapse">
                <ChevronLeft size={20} />
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
            <div className="flex flex-col gap-3 mb-4" role="group" aria-label="Cards in this list">
              {cards.map(card => (
                <div key={card.id} className="relative" role="listitem">
                  {/* paperclip icon if has attachments */}
                  {Array.isArray(card.attachments) && card.attachments.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-pb-primary text-white text-[10px] rounded-full px-1.5 py-0.5" title="Has attachments" aria-label="Has attachments">📎</span>
                  )}
                  <Card card={card} onUpdateCard={onUpdateCard} onDeleteCard={onDeleteCard} dndId={`${cardIdPrefix}${card.id}`} openInitially={selectedCardId === card.id} />
                </div>
              ))}
            </div>
          </SortableContext>
        </>
      )}
    </div>
  );
};

export default ListColumn; 