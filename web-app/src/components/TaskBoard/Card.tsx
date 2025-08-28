import React, { useState, useEffect } from "react";
import type { CardData } from "../../types/taskManager";
import { ImageUpload } from "../ImageUpload";
import type { PropImage } from "../../types/props";
import { useFirebase } from "../../contexts/FirebaseContext";
import { v4 as uuidv4 } from 'uuid';
import { RichTextEditor } from "../../../shared/components/RichTextEditor";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CardProps {
  card: CardData;
  onUpdateCard: (cardId: string, updates: Partial<CardData>) => void;
  dndId: string;
}

// Popover/modal scaffold for feature dialogs
const Popover: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-pb-darker rounded-xl p-6 w-full max-w-sm shadow-xl flex flex-col gap-3 relative">
        <button className="absolute top-2 right-2 text-white text-xl" onClick={onClose} aria-label="Close">×</button>
        <div className="text-base font-bold text-white mb-2">{title}</div>
        {children}
      </div>
    </div>
  );
};

// Helper: render description with @-mention links
function renderDescriptionWithLinks(description: string) {
  if (!description) return null;
  // Regex for [@Name](prop:prop1) and similar, and for @@User
  const mentionRegex = /\[@([^\]]+)\]\((prop|container|user):([^\)]+)\)|@@([a-zA-Z0-9_]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = mentionRegex.exec(description)) !== null) {
    if (match.index > lastIndex) {
      parts.push(description.slice(lastIndex, match.index));
    }
    if (match[1] && match[2] && match[3]) {
      // Markdown-style mention
      const [, name, type, id] = match;
      let href = '#';
      let color = '#3B82F6';
      let label = name;
      if (type === 'prop') {
        href = `/props/${id}`;
        color = '#3B82F6';
      } else if (type === 'container') {
        href = `/containers/${id}`;
        color = '#A855F7';
      } else if (type === 'user') {
        href = `/users/${id}`;
        color = '#22C55E';
        label = '@' + name;
      }
      parts.push(
        <a
          key={match.index}
          href={href}
          className="underline hover:text-pb-success"
          style={{ color, fontWeight: 600, marginRight: 2 }}
          target="_blank"
          rel="noopener noreferrer"
        >
          {label}
        </a>
      );
    } else if (match[4]) {
      // @@User mention
      const user = match[4];
      const href = `/users/${user}`;
      const color = '#22C55E';
      parts.push(
        <a
          key={match.index}
          href={href}
          className="underline hover:text-pb-success"
          style={{ color, fontWeight: 600, marginRight: 2 }}
          target="_blank"
          rel="noopener noreferrer"
        >
          @{user}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < description.length) {
    parts.push(description.slice(lastIndex));
  }
  return parts;
}

const CardDetailModal: React.FC<{
  open: boolean;
  onClose: () => void;
  card: CardData;
  onUpdateCard: (cardId: string, updates: Partial<CardData>) => void;
}> = ({ open, onClose, card, onUpdateCard }) => {
  const [title, setTitle] = useState(card.title);
  const { service: firebaseService, user } = useFirebase();
  const [propsList, setPropsList] = useState<{ id: string; name: string }[]>([]);
  const [containersList, setContainersList] = useState<{ id: string; name: string }[]>([]);
  const [usersList, setUsersList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    firebaseService.getDocuments("props").then(docs => setPropsList(docs.map(d => ({ id: d.id, name: d.data.name }))));
    firebaseService.getDocuments("containers").then(docs => setContainersList(docs.map(d => ({ id: d.id, name: d.data.name }))));
    firebaseService.getDocuments("users").then(docs => setUsersList(docs.map(d => ({ id: d.id, name: d.data.displayName || d.data.name || d.data.email }))));
  }, [firebaseService]);

  const [description, setDescription] = useState(card.description || "");
  const [labels, setLabels] = useState<string[]>(card.labels || []);
  const [members, setMembers] = useState(card.assignedTo || []);
  const [dueDate, setDueDate] = useState(card.dueDate || "");
  const [attachments, setAttachments] = useState(card.attachments || []);
  const [checklists, setChecklists] = useState(card.checklist || []);
  const [comments, setComments] = useState(card.comments || []);
  const [activityLog, setActivityLog] = useState(card.activityLog || []);
  const [images, setImages] = useState<PropImage[]>(card.images || []);

  // Popover state
  const [showLabels, setShowLabels] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // @ context menu state
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionMenuPosition, setMentionMenuPosition] = useState({ top: 0, left: 0 });
  const [mentionType, setMentionType] = useState<'prop' | 'container' | 'user' | null>(null);
  const [showMentionSearch, setShowMentionSearch] = useState(false);
  const [mentionSearchText, setMentionSearchText] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);

  const [newComment, setNewComment] = useState("");

  // 1. Add state for image upload popup and checklist add UI
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  // Add state for new label
  const [newLabelTitle, setNewLabelTitle] = useState('');

  // Add state for card color
  const [cardColor, setCardColor] = useState(card.color || '#374151');

  // Add completed state
  const [completed, setCompleted] = useState(card.completed || false);

  // Helper to log activity
  function logActivity(type: string, details: any) {
    setActivityLog(log => [
      ...log,
      {
        id: uuidv4(),
        type,
        userId: user?.uid || 'anonymous',
        timestamp: new Date().toISOString(),
        details,
      },
    ]);
  }

  // On save, compare previous and new values, log changes
  const handleSave = () => {
    if (title !== card.title) logActivity('Title changed', { from: card.title, to: title });
    if (description !== card.description) logActivity('Description changed', {});
    if (dueDate !== card.dueDate) logActivity('Due date changed', { from: card.dueDate, to: dueDate });
    if (cardColor !== card.color) logActivity('Color changed', { from: card.color, to: cardColor });
    if (JSON.stringify(members) !== JSON.stringify(card.assignedTo)) logActivity('Assignee changed', { from: card.assignedTo, to: members });
    if (completed !== card.completed) logActivity('Completed changed', { from: card.completed, to: completed });
    if (JSON.stringify(labels) !== JSON.stringify(card.labels)) logActivity('Labels changed', {});
    if (JSON.stringify(checklists) !== JSON.stringify(card.checklist)) logActivity('Checklist changed', {});
    onUpdateCard(card.id, { title, description, color: cardColor, assignedTo: members, completed, activityLog, dueDate, labels, checklist: checklists });
    onClose();
  };

  // Helper: open @ menu at cursor
  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '@') {
      // Find cursor position for popover (approximate)
      const textarea = e.target as HTMLTextAreaElement;
      const rect = textarea.getBoundingClientRect();
      setMentionMenuPosition({ top: rect.top + 40, left: rect.left + 40 });
      setShowMentionMenu(true);
    }
  };

  // When mention type is selected
  const handleSelectMentionType = (type: 'prop' | 'container' | 'user') => {
    setMentionType(type);
    setShowMentionMenu(false);
    setShowMentionSearch(true);
    setMentionSearchText('');
    if (type === 'prop') setMentionSuggestions(propsList);
    else if (type === 'container') setMentionSuggestions(containersList);
    else setMentionSuggestions(usersList);
  };

  // When searching in mention popover
  const handleMentionSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMentionSearchText(val);
    let data = [];
    if (mentionType === 'prop') data = propsList;
    else if (mentionType === 'container') data = containersList;
    else data = usersList;
    setMentionSuggestions(data.filter(item => item.name && item.name.toLowerCase().includes(val.toLowerCase())));
  };

  // When a mention is picked
  const handlePickMention = (item: any) => {
    // Insert mention at cursor (simple: append for now)
    let mentionText = '';
    if (mentionType === 'prop') mentionText = `[@${item.name}](prop:${item.id})`;
    else if (mentionType === 'container') mentionText = `[@${item.name}](container:${item.id})`;
    else mentionText = `@${item.name}`;
    setDescription(desc => desc + mentionText + ' ');
    setShowMentionSearch(false);
    setMentionType(null);
  };

  // Close all popovers
  const closeMentionMenus = () => {
    setShowMentionMenu(false);
    setShowMentionSearch(false);
    setMentionType(null);
  };

  // Combine comments and activity log for chronological display
  const combinedLog = [
    ...comments.map(c => ({
      type: 'comment',
      id: c.id,
      userId: c.userId,
      text: c.text,
      createdAt: c.createdAt,
    })),
    ...activityLog.map(a => ({
      type: 'activity',
      id: a.id,
      userId: a.userId,
      text: a.type,
      details: a.details,
      createdAt: a.timestamp,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className="relative rounded-2xl shadow-2xl flex flex-row overflow-y-auto max-h-[98vh] min-h-[700px] border border-gray-300"
        style={{ background: cardColor, transition: 'background 0.3s' }}
      >
        {/* Close (X) button top right of modal */}
        <button className="absolute top-4 right-4 text-white text-2xl z-50" onClick={onClose} aria-label="Close">×</button>
        {/* Left column */}
        <div className="flex-1 min-w-[340px] max-w-[520px] p-10 flex flex-col gap-8 rounded-l-2xl overflow-y-auto" style={{ maxHeight: '90vh' }}>
          {/* Title */}
          <div className="flex items-center gap-3 mb-2">
            <input
              type="checkbox"
              checked={completed}
              onChange={() => setCompleted(c => !c)}
              className="w-5 h-5 accent-pb-success rounded"
              title="Mark card as completed"
            />
            <input
              className={`rounded-lg px-3 py-2 text-2xl font-bold bg-black/20 border border-white/20 shadow-sm focus:ring-2 focus:ring-pb-primary focus:outline-none placeholder:text-gray-200 text-white ${completed ? 'line-through opacity-60' : ''}`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Card title"
              style={{ boxShadow: 'none', border: 'none' }}
              disabled={completed}
            />
          </div>
          {/* Add bar */}
          <div className="flex gap-2 mb-2">
            <button className="bg-pb-primary/40 hover:bg-pb-primary text-white font-semibold py-1 px-2 rounded flex items-center gap-1 text-xs" onClick={() => setShowLabels(true)}>
              <span>🏷️</span> Labels
            </button>
            <button className="bg-pb-primary/40 hover:bg-pb-primary text-white font-semibold py-1 px-2 rounded flex items-center gap-1 text-xs" onClick={() => setShowDates(true)}>
              <span>🕒</span> Dates
            </button>
            <button className="bg-pb-primary/40 hover:bg-pb-primary text-white font-semibold py-1 px-2 rounded flex items-center gap-1 text-xs" onClick={() => setShowChecklist(true)}>
              <span>☑️</span> Checklist
            </button>
            <button className="bg-pb-primary/40 hover:bg-pb-primary text-white font-semibold py-1 px-2 rounded flex items-center gap-1 text-xs" onClick={() => setShowMembers(true)}>
              <span>👤</span> Assign to
              {members.length > 0 && (
                <span className="ml-2 bg-pb-success text-white rounded-full px-2 py-1 text-xs font-bold">{usersList.find(u => u.id === members[0])?.name?.[0] || '?'}</span>
              )}
            </button>
            {/* Image upload icon */}
            <button className="bg-pb-primary/40 hover:bg-pb-primary text-white font-semibold py-1 px-2 rounded flex items-center gap-1 text-xs" onClick={() => setShowImageUpload(true)} title="Upload Images">
              <span role="img" aria-label="Upload">📷</span>
            </button>
          </div>
          {/* Image upload popup */}
          <Popover open={showImageUpload} onClose={() => setShowImageUpload(false)} title="Upload Images">
            <ImageUpload currentImages={images} onImagesChange={setImages} />
          </Popover>
          {/* Card color picker */}
            <div className="flex gap-2 items-center mt-2">
            <span className="text-gray-700 text-sm">Card color:</span>
            {["#27ae60", "#f1c40f", "#e67e22", "#e74c3c", "#8e44ad", "#2980b9", "#374151"].map(color => (
                <button
                  key={color}
                className="w-7 h-7 rounded-full border-2 border-white shadow hover:scale-110 transition"
                  style={{ background: color }}
                onClick={() => setCardColor(color)}
                  aria-label={`Set card color ${color}`}
                />
              ))}
          </div>
          {/* Description */}
          <div className="bg-black/20 rounded-lg p-2 shadow-inner">
            <label className="block font-semibold text-white mb-1">Description</label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Add a more detailed description..."
              minHeight={120}
              disabled={false}
            />
          </div>
          {/* Checklist */}
          <div>
            <div className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              Checklists
              <button className="ml-2 bg-pb-primary/60 hover:bg-pb-success text-white rounded px-2 py-1 text-xs" onClick={() => setShowChecklist(v => !v)}>
                +
              </button>
            </div>
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 rounded-lg border border-white/20 px-2 py-1 text-base bg-black/20 text-white placeholder:text-gray-200"
                value={newChecklistItem}
                onChange={e => setNewChecklistItem(e.target.value)}
                placeholder="Add checklist item..."
                onKeyDown={e => {
                  if (e.key === 'Enter' && newChecklistItem.trim()) {
                    setChecklists(list => [...list, { id: uuidv4(), text: newChecklistItem, checked: false }]);
                    setNewChecklistItem("");
                  }
                }}
              />
              <button className="bg-pb-primary hover:bg-pb-success text-white font-semibold py-1 px-3 rounded-lg shadow" disabled={!newChecklistItem.trim()} onClick={() => {
                if (newChecklistItem.trim()) {
                  setChecklists(list => [...list, { id: uuidv4(), text: newChecklistItem, checked: false }]);
                  setNewChecklistItem("");
                }
              }}>Add</button>
            </div>
            <div className="flex flex-col gap-2">
              {checklists.map((item, i) => (
                <label key={item.id || i} className="flex items-center gap-2 bg-black/20 border border-white/20 text-white rounded-lg px-3 py-2 text-base cursor-pointer shadow-sm">
                  <input
                    type="checkbox"
                    checked={!!item.checked}
                    onChange={() => {
                      setChecklists(list => list.map((c, idx) => idx === i ? { ...c, checked: !c.checked } : c));
                    }}
                  />
                  <span style={{ textDecoration: item.checked ? 'line-through' : 'none' }}>{item.text || item.id}</span>
                </label>
              ))}
            </div>
          </div>
          {/* Dates popover */}
          <Popover open={showDates} onClose={() => setShowDates(false)} title="Set Due Date & Time">
            <div className="flex flex-col gap-2">
              <label className="text-white text-sm">Due Date & Time</label>
              <input
                type="datetime-local"
                className="rounded border border-pb-primary/40 px-2 py-1 text-[#222]"
                value={dueDate ? dueDate.substring(0, 16) : ''}
                onChange={e => setDueDate(e.target.value)}
              />
              <button
                className="bg-pb-primary hover:bg-pb-success text-white font-semibold py-1 px-3 rounded mt-2"
                onClick={() => setShowDates(false)}
              >Set</button>
            </div>
          </Popover>
          {/* Show selected due date and time */}
          {dueDate && (
            <div className="text-xs text-pb-gray mt-1">Due: {new Date(dueDate).toLocaleString()}</div>
          )}
          {/* Labels popover */}
          <Popover open={showLabels} onClose={() => setShowLabels(false)} title="Manage Labels">
            <div className="flex flex-col gap-2">
              {/* Add new label */}
              <div className="flex gap-2 items-center mb-2">
                <input
                  className="flex-1 rounded border border-pb-primary/40 px-2 py-1 text-xs"
                  placeholder="Label title"
                  value={newLabelTitle || ''}
                  onChange={e => setNewLabelTitle(e.target.value)}
                />
                <button
                  className="bg-pb-primary hover:bg-pb-success text-white font-semibold py-1 px-2 rounded text-xs"
                  disabled={!newLabelTitle}
                  onClick={() => {
                    setLabels(list => [...list, newLabelTitle]);
                    setNewLabelTitle('');
                  }}
                >Add</button>
              </div>
              {/* List and edit labels */}
              <div className="flex flex-col gap-2">
                {labels.map((label, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded border border-pb-primary/40 px-2 py-1 text-xs"
                      value={label}
                      onChange={e => {
                        const v = e.target.value;
                        setLabels(list => list.map((l, idx) => idx === i ? v : l));
                      }}
                    />
                    <button
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-2 rounded text-xs"
                      onClick={() => setLabels(list => list.filter((_, idx) => idx !== i))}
                    >Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </Popover>
          {/* Show current labels as pills */}
          {labels.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              {labels.map((label, i) => (
                <span key={i} className="px-2 py-1 rounded text-xs font-semibold bg-pb-primary text-white">{label}</span>
              ))}
            </div>
          )}
        </div>
        {/* Right column: Comments and Activity */}
        <div className="w-[340px] flex flex-col p-8 gap-6 bg-pb-darker/90 rounded-r-2xl border-l border-gray-200">
          <div className="font-semibold text-white text-lg mb-2">Comments and activity</div>
          {/* Add comment area */}
          <div className="flex gap-2 items-center mb-4">
            <input
              className="flex-1 rounded border border-pb-primary/40 px-2 py-1 text-[#222]"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              onKeyDown={e => {
                if (e.key === 'Enter' && newComment.trim()) {
                  setComments(c => [
                    ...c,
                    {
                      id: uuidv4(),
                      userId: user?.uid || 'anonymous',
                      text: newComment,
                      createdAt: new Date().toISOString(),
                    },
                  ]);
                  setNewComment("");
                }
              }}
            />
            <button
              className="bg-pb-primary hover:bg-pb-success text-white font-semibold py-1 px-3 rounded"
              disabled={!newComment.trim()}
              onClick={() => {
                if (newComment.trim()) {
                  setComments(c => [
                    ...c,
                    {
                      id: uuidv4(),
                      userId: user?.uid || 'anonymous',
                      text: newComment,
                      createdAt: new Date().toISOString(),
                    },
                  ]);
                  setNewComment("");
                }
              }}
            >Add</button>
          </div>
          {/* Comments list */}
          <div className="flex flex-col gap-2 mb-6">
            {combinedLog.map((item, i) => (
              <div key={item.id || i} className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-pb-primary flex items-center justify-center text-white font-bold text-sm">{item.userId?.[0] || 'U'}</div>
                <div>
                  <div className="text-white font-semibold text-sm">{item.userId || 'User'}</div>
                  {item.type === 'comment' ? (
                    <div className="text-white text-xs opacity-70">{item.text}</div>
                  ) : (
                    <div className="text-pb-primary text-xs">{item.text}</div>
                  )}
                  <div className="text-pb-gray text-xs">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Modal footer: Save/Delete/Close */}
        <div className="absolute bottom-6 left-8 flex gap-2">
          <button className="bg-pb-primary hover:bg-pb-success text-white font-semibold py-1 px-3 rounded shadow" onClick={handleSave}>Save</button>
          <button className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded shadow">Delete</button>
        </div>
      </div>
    </div>
  );
};

const Card: React.FC<CardProps> = ({ card, onUpdateCard, dndId }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    setModalOpen(true);
  };
  // dnd-kit sortable for cards
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : undefined,
  };
  return (
    <>
      <div
        ref={setNodeRef}
        style={{
          ...style, // dnd-kit drag styles
          background: card.color || '#374151',
          minHeight: 90,
        }}
        {...attributes}
        {...listeners}
        className="block rounded-lg p-3 shadow hover:shadow-lg transition cursor-pointer no-underline"
        onClick={handleOpen}
        tabIndex={0}
        role="button"
        onKeyPress={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen({ preventDefault: () => {} } as React.MouseEvent);
          }
        }}
      >
        <div className="font-semibold" style={{ color: '#fff' }}>{card.title}</div>
    {card.description && (
          <div className="text-xs mt-1" style={{ color: '#fff' }}>{renderDescriptionWithLinks(card.description)}</div>
    )}
      </div>
      <CardDetailModal open={modalOpen} onClose={() => setModalOpen(false)} card={card} onUpdateCard={onUpdateCard} />
    </>
);
};

export default Card; 