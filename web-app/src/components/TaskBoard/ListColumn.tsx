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
  onAddCard: (listId: string, title: string, assignedTo?: string[], dueDate?: string) => void;
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState('');
  const [pendingDueDate, setPendingDueDate] = useState<string | null>(null); // Store due date to set when card is created
  
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
      const dueDateToPass = pendingDueDate || undefined;
      await onAddCard(list.id, newCardTitle, undefined, dueDateToPass);
      setNewCardTitle("");
      setPendingDueDate(null); // Clear pending due date
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
                onChange={e => {
                  const newValue = e.target.value;
                  setNewCardTitle(newValue);
                  
                  // Auto-detect mentions as user types
                  const cursorPos = e.target.selectionStart || 0;
                  const textBeforeCursor = newValue.substring(0, cursorPos);
                  const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9\s]*)$/);
                  const isInMarkdown = textBeforeCursor.match(/\[@[^\]]*\]\([^)]*\)$/);
                  
                  if (mentionMatch && !isInMarkdown && !showMentionSearch) {
                    // User is typing a mention - show menu if not already shown
                    if (!showMentionMenu) {
                      setShowMentionMenu(true);
                    }
                    // If mention type is already selected, update search text as they type
                    if (mentionType && mentionMatch[1]) {
                      setMentionSearchText(mentionMatch[1].trim());
                    }
                  } else if (!mentionMatch && showMentionMenu && !showMentionSearch) {
                    // No mention being typed - close menu if open
                    setShowMentionMenu(false);
                  }
                }}
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
                  // If user presses space or period while mention menu is open, close it
                  if ((e.key === ' ' || e.key === '.' || e.key === ',') && showMentionMenu && !showMentionSearch) {
                    setShowMentionMenu(false);
                  }
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
                    onClick={() => {
                      // Extract any text typed after @
                      const cursorPos = newCardInputRef.current?.selectionStart || newCardTitle.length;
                      const textBeforeCursor = newCardTitle.substring(0, cursorPos);
                      const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9\s]*)$/);
                      const typedText = mentionMatch ? mentionMatch[1].trim() : '';
                      
                      setMentionType('prop');
                      setShowMentionMenu(false);
                      setShowMentionSearch(true);
                      setMentionSearchText(typedText);
                      setMentionSuggestions(propsList);
                    }}
                  >
                    Prop
                  </button>
                  <button 
                    className="w-full text-left py-1 hover:bg-gray-100 px-2 focus:bg-gray-100 focus:outline-none"
                    role="menuitem"
                    onClick={() => {
                      // Extract any text typed after @
                      const cursorPos = newCardInputRef.current?.selectionStart || newCardTitle.length;
                      const textBeforeCursor = newCardTitle.substring(0, cursorPos);
                      const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9\s]*)$/);
                      const typedText = mentionMatch ? mentionMatch[1].trim() : '';
                      
                      setMentionType('container');
                      setShowMentionMenu(false);
                      setShowMentionSearch(true);
                      setMentionSearchText(typedText);
                      setMentionSuggestions(containersList);
                    }}
                  >
                    Box/Container
                  </button>
                  <button 
                    className="w-full text-left py-1 hover:bg-gray-100 px-2 focus:bg-gray-100 focus:outline-none"
                    role="menuitem"
                    onClick={() => {
                      // Extract any text typed after @
                      const cursorPos = newCardInputRef.current?.selectionStart || newCardTitle.length;
                      const textBeforeCursor = newCardTitle.substring(0, cursorPos);
                      const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9\s]*)$/);
                      const typedText = mentionMatch ? mentionMatch[1].trim() : '';
                      
                      setMentionType('user');
                      setShowMentionMenu(false);
                      setShowMentionSearch(true);
                      setMentionSearchText(typedText);
                      setMentionSuggestions(usersList);
                    }}
                  >
                    User
                  </button>
                  <button 
                    className="w-full text-left py-1 hover:bg-gray-100 px-2 focus:bg-gray-100 focus:outline-none"
                    role="menuitem"
                    onClick={() => {
                      // Extract any text typed after @
                      const cursorPos = newCardInputRef.current?.selectionStart || newCardTitle.length;
                      const textBeforeCursor = newCardTitle.substring(0, cursorPos);
                      const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9\s]*)$/);
                      
                      // Remove @ from text
                      if (mentionMatch) {
                        const beforeMention = textBeforeCursor.substring(0, textBeforeCursor.length - mentionMatch[0].length);
                        const textAfterCursor = newCardTitle.substring(cursorPos);
                        setNewCardTitle(beforeMention + textAfterCursor);
                      } else if (newCardTitle.endsWith('@')) {
                        setNewCardTitle(newCardTitle.slice(0, -1));
                      }
                      
                      setShowMentionMenu(false);
                      setShowDatePicker(true);
                      // Set default to current date/time
                      const now = new Date();
                      const year = now.getFullYear();
                      const month = String(now.getMonth() + 1).padStart(2, '0');
                      const day = String(now.getDate()).padStart(2, '0');
                      const hours = String(now.getHours()).padStart(2, '0');
                      const minutes = String(now.getMinutes()).padStart(2, '0');
                      setSelectedDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
                    }}
                  >
                    Due Date/Time
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
                          // Use markdown format for props and containers to handle multi-word names properly
                          // Use plain @ for users
                          const text = mentionType === 'user' 
                            ? `@${i.name}` 
                            : `[@${i.name}](${mentionType}:${i.id})`;
                          
                          setNewCardTitle(prev => {
                            const t = prev || '';
                            const cursorPos = newCardInputRef.current?.selectionStart || t.length;
                            const textBeforeCursor = t.substring(0, cursorPos);
                            const textAfterCursor = t.substring(cursorPos);
                            
                            // Find the @ mention that was being typed (look backwards from cursor)
                            const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9\s]*)$/);
                            
                            if (mentionMatch) {
                              // Replace the typed mention with the markdown format
                              const beforeMention = textBeforeCursor.substring(0, textBeforeCursor.length - mentionMatch[0].length);
                              return beforeMention + text + ' ' + textAfterCursor;
                            } else {
                              // Fallback: just append if we can't find the mention
                              const base = t.endsWith('@') ? t.slice(0, -1).trimEnd() : t.trimEnd();
                              return (base ? base + ' ' : '') + text + ' ';
                            }
                          });
                          
                          // Reset cursor position after a short delay
                          setTimeout(() => {
                            if (newCardInputRef.current) {
                              const newText = newCardInputRef.current.value;
                              const newPos = newText.indexOf(text) + text.length + 1;
                              newCardInputRef.current.setSelectionRange(newPos, newPos);
                            }
                          }, 0);
                          
                          setShowMentionSearch(false);
                          setMentionType(null);
                          setShowMentionMenu(false);
                        }}
                      >
                        {i.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {showDatePicker && (
                <div 
                  className="absolute -top-40 left-0 bg-[#1f2937] text-white rounded border border-white/10 p-3 z-50 w-64 sm:w-72"
                  role="dialog"
                  aria-label="Select due date and time"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-gray-300">Due Date & Time</div>
                    <button
                      onClick={() => {
                        setShowDatePicker(false);
                        setSelectedDateTime('');
                        newCardInputRef.current?.focus();
                      }}
                      className="text-gray-400 hover:text-white px-1"
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    className="w-full rounded bg-[#111827] border border-white/10 px-2 py-1 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-pb-primary"
                    value={selectedDateTime}
                    onChange={e => setSelectedDateTime(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      className="flex-1 px-3 py-1.5 rounded bg-pb-primary hover:bg-pb-secondary text-white text-sm transition-colors"
                      onClick={() => {
                        if (!selectedDateTime) {
                          setShowDatePicker(false);
                          newCardInputRef.current?.focus();
                          return;
                        }
                        
                        // Convert datetime-local format to ISO string for storage
                        const date = new Date(selectedDateTime);
                        const isoString = date.toISOString();
                        
                        // Store the due date to be set when the card is created
                        setPendingDueDate(isoString);
                        
                        // Format the date/time for display in the input
                        const formattedDate = date.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        });
                        
                        // Insert formatted date into text at cursor position
                        const currentDisplay = newCardTitle;
                        const cursorPos = newCardInputRef.current?.selectionStart || currentDisplay.length;
                        const textBeforeCursor = currentDisplay.substring(0, cursorPos);
                        const textAfterCursor = currentDisplay.substring(cursorPos);
                        
                        // Remove @ if it exists
                        const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9\s]*)$/);
                        let beforeMention = textBeforeCursor;
                        if (mentionMatch) {
                          beforeMention = textBeforeCursor.substring(0, textBeforeCursor.length - mentionMatch[0].length);
                        } else if (textBeforeCursor.endsWith('@')) {
                          beforeMention = textBeforeCursor.slice(0, -1);
                        }
                        
                        const newDisplayText = beforeMention + formattedDate + ' ' + textAfterCursor;
                        setNewCardTitle(newDisplayText);
                        
                        setShowDatePicker(false);
                        setSelectedDateTime('');
                        
                        // Return focus to input and set cursor position
                        setTimeout(() => {
                          if (newCardInputRef.current) {
                            const newPos = beforeMention.length + formattedDate.length + 1;
                            newCardInputRef.current.setSelectionRange(newPos, newPos);
                            newCardInputRef.current.focus();
                          }
                        }, 0);
                      }}
                    >
                      Insert
                    </button>
                    <button
                      className="px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-700 text-white text-sm transition-colors"
                      onClick={() => {
                        setShowDatePicker(false);
                        setSelectedDateTime('');
                        newCardInputRef.current?.focus();
                      }}
                    >
                      Cancel
                    </button>
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