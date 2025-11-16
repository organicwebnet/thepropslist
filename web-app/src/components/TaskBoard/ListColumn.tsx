import React, { useState, useRef } from "react";
import Card from "./Card";
import type { ListData, CardData } from "../../types/taskManager";
import { Edit, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMentionData } from "../../contexts/MentionDataContext";
import { logger } from "../../utils/logger";

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
  const [addingCard, setAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [isAddingCard, setIsAddingCard] = useState(false);
  const newCardInputRef = useRef<HTMLInputElement | null>(null);

  // @mention state for the add-card title input
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionType, setMentionType] = useState<'prop' | 'container' | 'user' | null>(null);
  const [showMentionSearch, setShowMentionSearch] = useState(false);
  const [mentionSearchText, setMentionSearchText] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  
  // Use cached mention data
  const { propsList, containersList, usersList } = useMentionData();

  // dnd-kit sortable for lists
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : undefined,
  };

  const handleAddCard = async () => {
    if (!newCardTitle.trim() || isAddingCard) return;
    
    try {
      setIsAddingCard(true);
      await onAddCard(list.id, newCardTitle);
      setNewCardTitle("");
      setAddingCard(true);
      // Re-focus the input for rapid card entry
      setTimeout(() => newCardInputRef.current?.focus(), 0);
    } catch (error) {
      logger.taskBoardError('Failed to add card', error);
    } finally {
      setIsAddingCard(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-pb-darker rounded-md shadow-lg border border-pb-primary/30 flex flex-col flex-shrink-0 transition-all duration-300 list-column ${collapsed ? '!w-10 min-w-[2.5rem] min-h-[22rem] p-0 bg-pb-primary/20 relative items-center justify-center' : 'p-2 sm:p-4 min-w-[16rem] sm:min-w-[18rem] w-[16rem] sm:w-[20rem] max-w-[20rem]'}`}
      role="list"
      aria-label={`List: ${list.title}`}
      tabIndex={0}
      data-dnd-kit="list"
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
            <div className="text-base sm:text-lg font-bold text-white tracking-wide text-left truncate">
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
          {addingCard ? (
            <div className="flex flex-col gap-2 mt-2 relative">
              <button
                type="button"
                aria-label="Cancel"
                title="Cancel"
                onClick={() => { setAddingCard(false); setNewCardTitle(""); }}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-pb-darker/70 border border-pb-primary/40 text-white flex items-center justify-center hover:bg-pb-primary/40"
              >
                ×
              </button>
              <input
                ref={newCardInputRef}
                className="rounded border border-pb-primary/40 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-pb-primary text-white bg-pb-darker/60 placeholder:text-pb-gray/50"
                type="text"
                value={newCardTitle}
                onChange={e => setNewCardTitle(e.target.value)}
                placeholder="Enter a title for this card..."
                autoFocus
                aria-label="Card title input"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCard();
                  }
                  if (e.key === 'Escape') { setAddingCard(false); setNewCardTitle(""); }
                  if (e.key === '@') { setShowMentionMenu(true); }
                }}
                disabled={isAddingCard}
              />
              {showMentionMenu && (
                <div 
                  className="absolute -top-28 left-0 bg-white text-black rounded shadow p-2 z-50 w-48 sm:w-56"
                  role="menu"
                  aria-label="Mention type selection"
                >
                  <div className="font-semibold mb-1">Mention Type</div>
                  <button 
                    className="w-full text-left py-1 hover:bg-gray-100 px-2 focus:bg-gray-100 focus:outline-none"
                    role="menuitem"
                    onClick={() => { setMentionType('prop'); setShowMentionMenu(false); setShowMentionSearch(true); setMentionSearchText(''); setMentionSuggestions(propsList); }}
                  >
                    Prop
                  </button>
                  <button 
                    className="w-full text-left py-1 hover:bg-gray-100 px-2 focus:bg-gray-100 focus:outline-none"
                    role="menuitem"
                    onClick={() => { setMentionType('container'); setShowMentionMenu(false); setShowMentionSearch(true); setMentionSearchText(''); setMentionSuggestions(containersList); }}
                  >
                    Box/Container
                  </button>
                  <button 
                    className="w-full text-left py-1 hover:bg-gray-100 px-2 focus:bg-gray-100 focus:outline-none"
                    role="menuitem"
                    onClick={() => { setMentionType('user'); setShowMentionMenu(false); setShowMentionSearch(true); setMentionSearchText(''); setMentionSuggestions(usersList); }}
                  >
                    User
                  </button>
                </div>
              )}
              {showMentionSearch && (
                <div 
                  className="absolute -top-40 left-0 bg-[#1f2937] text-white rounded border border-white/10 p-3 z-50 w-64 sm:w-72"
                  role="dialog"
                  aria-label={`Search ${mentionType}s`}
                >
                  <div className="text-sm text-gray-300 mb-2">Search {mentionType}</div>
                  <input
                    className="w-full rounded bg-[#111827] border border-white/10 px-2 py-1 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-pb-primary"
                    placeholder={`Type to search ${mentionType}...`}
                    value={mentionSearchText}
                    onChange={e => setMentionSearchText(e.target.value)}
                    aria-label={`Search ${mentionType}s`}
                  />
                  <div 
                    className="max-h-40 overflow-auto space-y-1"
                    role="listbox"
                    aria-label={`${mentionType} suggestions`}
                  >
                    {mentionSuggestions.filter(i => (i.name || '').toLowerCase().includes(mentionSearchText.toLowerCase())).map(i => (
                      <button 
                        key={i.id} 
                        className="block w-full text-left px-2 py-1 rounded hover:bg-white/10 focus:bg-white/10 focus:outline-none" 
                        role="option"
                        onClick={() => {
                          // For card titles, insert plain @Name (no brackets/IDs); remove trailing lone '@'
                          const text = `@${i.name}`;
                          setNewCardTitle(prev => {
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
              <div className="flex gap-2">
                <button
                  className="bg-pb-success hover:bg-pb-primary text-white font-semibold py-1 px-3 rounded shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  onClick={handleAddCard}
                  disabled={isAddingCard || !newCardTitle.trim()}
                >
                  {isAddingCard ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    'Add'
                  )}
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