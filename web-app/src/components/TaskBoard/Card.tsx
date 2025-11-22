import React, { useState, useEffect, useRef } from "react";
import type { CardData } from "../../types/taskManager";
import { ImageUpload } from "../ImageUpload";
import type { PropImage } from "../../types/props";
import { useFirebase } from "../../contexts/FirebaseContext";
import { useShowSelection } from "../../contexts/ShowSelectionContext";
import { v4 as uuidv4 } from 'uuid';
// import { RichTextEditor } from "../../../shared/components/RichTextEditor";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreVertical } from 'lucide-react';

interface CardProps {
  card: CardData;
  onUpdateCard: (cardId: string, updates: Partial<CardData>) => void;
  dndId: string;
  openInitially?: boolean;
  onDeleteCard: (cardId: string) => void;
}

// Popover/modal scaffold for feature dialogs
const Popover: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode; className?: string }> = ({ open, onClose, title, children, className }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`bg-pb-darker rounded-xl p-6 w-full ${className || 'max-w-sm'} shadow-xl flex flex-col gap-3 relative`}>
        <button className="absolute top-2 right-2 text-white text-xl" onClick={onClose} aria-label="Close">×</button>
        <div className="text-base font-bold text-white mb-2">{title}</div>
        {children}
      </div>
    </div>
  );
};

// Helper: convert markdown mentions to display text (for editing in textarea)
function markdownToDisplayText(text: string): string {
  if (!text) return '';
  // Replace [@Name](type:id) with just @Name
  return text.replace(/\[@([^\]]+)\]\((?:prop|container|user):[^)]*\)/g, '@$1');
}

// Helper: convert display text back to markdown (for storage)
function displayTextToMarkdown(text: string, propsList: any[], containersList: any[], usersList: any[]): string {
  if (!text) return '';
  let result = text;
  
  // Sort all entities by name length (longest first) to match longest names first
  const allEntities = [
    ...propsList.map(p => ({ ...p, type: 'prop' as const })),
    ...containersList.map(c => ({ ...c, type: 'container' as const })),
    ...usersList.map(u => ({ ...u, type: 'user' as const }))
  ].sort((a, b) => (b.name || '').length - (a.name || '').length);
  
  const replacements: Array<{ start: number; end: number; replacement: string }> = [];
  
  // Search for @ mentions and try to match against entity names (longest first)
  let searchIndex = 0;
  while (searchIndex < text.length) {
    const atIndex = text.indexOf('@', searchIndex);
    if (atIndex === -1) break;
    
    // Try each entity (sorted longest first) to see if it matches starting at this position
    let bestMatch: { entity: any; endIndex: number } | null = null;
    
    for (const entity of allEntities) {
      const entityName = entity.name || '';
      const entityNameLower = entityName.toLowerCase();
      
      // Check if the text after @ starts with this entity name (case-insensitive)
      // We need to check if there's enough text remaining
      const textAfterAt = text.substring(atIndex + 1).toLowerCase();
      
      if (textAfterAt.startsWith(entityNameLower)) {
        // Check if it's followed by a word boundary (space, punctuation, end, etc.)
        const entityEndPos = atIndex + 1 + entityName.length;
        if (entityEndPos >= text.length || 
            /\s/.test(text[entityEndPos]) || 
            /[.,!?;:]/.test(text[entityEndPos]) ||
            text[entityEndPos] === '@' ||
            text[entityEndPos] === '[') {
          bestMatch = { entity, endIndex: entityEndPos };
          break; // Found exact match, use it (longest first due to sorting)
        }
      }
    }
    
    if (bestMatch) {
      replacements.push({
        start: atIndex,
        end: bestMatch.endIndex,
        replacement: `[@${bestMatch.entity.name}](${bestMatch.entity.type}:${bestMatch.entity.id})`
      });
      searchIndex = bestMatch.endIndex;
    } else {
      // No match found, skip this @ and continue
      searchIndex = atIndex + 1;
    }
  }
  
  // Apply replacements in reverse order to maintain indices
  replacements.sort((a, b) => b.start - a.start);
  for (const rep of replacements) {
    result = result.substring(0, rep.start) + rep.replacement + result.substring(rep.end);
  }
  
  return result;
}

// Helper: render text with @-mention links (for both title and description)
function renderTextWithLinks(text: string) {
  if (!text) return null;
  // Regex for [@Name](prop:prop1) and similar, and for @@User
  const mentionRegex = /\[@([^\]]+)\]\((prop|container|user):([^)]*)\)|@@([a-zA-Z0-9_]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
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

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

// Helper: render description with @-mention links
function renderDescriptionWithLinks(description: string) {
  if (!description) return null;
  // Regex for [@Name](prop:prop1) and similar, and for @@User
  const mentionRegex = /\[@([^\]]+)\]\((prop|container|user):([^)]*)\)|@@([a-zA-Z0-9_]+)/g;
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

// Parse mentions in a text and normalize to {type,id,label}
function parseMentions(text: string) {
  const items: { type: 'prop' | 'container' | 'user'; id?: string; label: string }[] = [];
  if (!text) return items;
  // Match markdown format: [@Name](type:id)
  const bracket = /\[@([^\]]+)\]\((prop|container|user):([^)]*)\)/g;
  let m;
  while ((m = bracket.exec(text)) !== null) {
    const mentionType = m[2] as 'prop' | 'container' | 'user';
    items.push({ type: mentionType, id: m[3], label: m[1] });
  }
  // Match plain @Name mentions (for users)
  const plainMention = /(^|\s)@([A-Za-z0-9\s]+?)(?=\s|$|@|\[)/g;
  while ((m = plainMention.exec(text)) !== null) {
    const label = (m[2] || '').trim();
    if (label) items.push({ type: 'user', label });
  }
  // Optional explicit user syntax beginning with @@username
  const explicitUser = /(^|\s)@@([A-Za-z0-9_.-]+)/g;
  while ((m = explicitUser.exec(text)) !== null) {
    const label = (m[2] || '').trim();
    if (label) items.push({ type: 'user', label });
  }
  return items;
}

export const CardDetailModal: React.FC<{
  open: boolean;
  onClose: () => void;
  card: CardData;
  onUpdateCard: (cardId: string, updates: Partial<CardData>) => void;
  onDeleteCard: (cardId: string) => void;
}> = ({ open, onClose, card, onUpdateCard, onDeleteCard }) => {
  // Convert markdown title to display format for editing
  const [title, setTitle] = useState(() => markdownToDisplayText(card.title || ''));
  const { service: firebaseService, user } = useFirebase();
  const { currentShowId } = useShowSelection();
  const [propsList, setPropsList] = useState<{ id: string; name: string }[]>([]);
  const [containersList, setContainersList] = useState<{ id: string; name: string }[]>([]);
  const [usersList, setUsersList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    // Build query options for props - filter by current show if available
    const propsQueryOptions = currentShowId 
      ? { where: [['showId', '==', currentShowId] as [string, any, any]] }
      : undefined;

    firebaseService.getDocuments("props", propsQueryOptions).then(docs => {
      // Additional client-side filter for safety
      const filteredDocs = currentShowId 
        ? docs.filter(d => d.data?.showId === currentShowId)
        : docs;
      setPropsList(filteredDocs.map(d => ({ id: d.id, name: d.data.name })));
    });
    firebaseService.getDocuments("containers").then(docs => setContainersList(docs.map(d => ({ id: d.id, name: d.data.name }))));
    firebaseService.getDocuments("userProfiles").then(docs => setUsersList(docs.map(d => ({ id: d.data?.uid || d.id, name: d.data?.displayName || d.data?.name || d.data?.email }))));
  }, [firebaseService, currentShowId]);

  // Update title display when card changes
  useEffect(() => {
    setTitle(markdownToDisplayText(card.title || ''));
  }, [card.title]);

  const [description, setDescription] = useState(card.description || "");
  const [editingDescription, setEditingDescription] = useState(false);
  const [labels, setLabels] = useState<string[]>(card.labels || []);
  const [members, setMembers] = useState(card.assignedTo || []);
  const [dueDate, setDueDate] = useState(card.dueDate || "");
  const [attachments, setAttachments] = useState<{ id: string; url: string; name?: string }[]>(
    Array.isArray(card.attachments)
      ? card.attachments.map((a: unknown) =>
          typeof a === 'string' ? { id: uuidv4(), url: a } : a as { id: string; url: string; name?: string }
        )
      : []
  );
  const [checklists, setChecklists] = useState(card.checklist || []);
  const [comments, setComments] = useState(card.comments || []);
  const [activityLog, setActivityLog] = useState(card.activityLog || []);
  const [images, setImages] = useState<PropImage[]>(card.images || []);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Popover state
  const [showLabels, setShowLabels] = useState(false);
  const [showDates, setShowDates] = useState(false);
  // const [showChecklist, setShowChecklist] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showMentionUser, setShowMentionUser] = useState(false);
  // const [showAdd, setShowAdd] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocUrl, setNewDocUrl] = useState("");

  // @ context menu state (for description) – disabled for now
  // const [mentionType, setMentionType] = useState<'prop' | 'container' | 'user' | null>(null);
  // const [showMentionMenu, setShowMentionMenu] = useState(false);
  // const [mentionMenuPosition, setMentionMenuPosition] = useState({ top: 0, left: 0 });
  // const [showMentionSearch, setShowMentionSearch] = useState(false);
  // const [mentionSearchText, setMentionSearchText] = useState('');
  // const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);

  const [newComment, setNewComment] = useState("");
  const [showMore, setShowMore] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [open, title]);

  // 1. Add state for image upload popup and checklist add UI
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  // Add state for new label
  const [newLabelTitle, setNewLabelTitle] = useState('');

  // Add state for card color
  const [cardColor, setCardColor] = useState(card.color || '#374151');

  // Add completed state
  const [completed, setCompleted] = useState(card.completed || false);
  const [status, setStatus] = useState<'not_started' | 'in_progress' | 'done'>(card.status || (card.completed ? 'done' : 'not_started'));
  // Keep completed in sync when status is changed directly
  useEffect(() => {
    setCompleted(status === 'done');
  }, [status]);

  // Derive status from checklist changes
  useEffect(() => {
    if (!checklists || checklists.length === 0) {
      if (!completed) setStatus('not_started');
      return;
    }
    const total = checklists.length;
    const done = checklists.filter(c => !!c.checked).length;
    if (done === 0 && !completed) setStatus('not_started');
    else if (done > 0 && done < total && !completed) setStatus('in_progress');
    else if (done === total || completed) setStatus('done');
  }, [checklists, completed]);
  // @mention for TITLE
  const [showMentionMenuTitle, setShowMentionMenuTitle] = useState(false);
  const [mentionTypeTitle, setMentionTypeTitle] = useState<'prop' | 'container' | 'user' | null>(null);
  const [showMentionSearchTitle, setShowMentionSearchTitle] = useState(false);
  const [mentionSearchTextTitle, setMentionSearchTextTitle] = useState('');
  const [mentionSuggestionsTitle, setMentionSuggestionsTitle] = useState<any[]>([]);

  const linkedItems = React.useMemo(() => {
    // Convert display title to markdown for parsing mentions
    const titleMarkdown = displayTextToMarkdown(title || '', propsList, containersList, usersList);
    const fromTitle = parseMentions(titleMarkdown);
    const fromDesc = parseMentions(description || '');
    const combined = [...fromTitle, ...fromDesc].map(i => {
      // Try to resolve plain labels to known entities for linking
      if (!i.id) {
        const lower = i.label.toLowerCase();
        const prop = propsList.find(p => (p.name || '').toLowerCase() === lower);
        if (prop) return { type: 'prop' as const, id: prop.id, label: prop.name };
        const cont = containersList.find(c => (c.name || '').toLowerCase() === lower);
        if (cont) return { type: 'container' as const, id: cont.id, label: cont.name };
        const user = usersList.find(u => (u.name || '').toLowerCase() === lower);
        if (user) return { type: 'user' as const, id: user.id, label: user.name };
      }
      return i;
    });
    // Deduplicate by label+type+id
    const key = (i: any) => `${i.type}:${i.id || ''}:${i.label}`;
    const map = new Map<string, any>();
    combined.forEach(i => { if (!map.has(key(i))) map.set(key(i), i); });
    return Array.from(map.values());
  }, [title, description, propsList, containersList, usersList]); // Note: title is display format, converted to markdown inside

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
    // Convert display text back to markdown format for storage
    const titleMarkdown = displayTextToMarkdown(title, propsList, containersList, usersList);
    
    if (titleMarkdown !== card.title) logActivity('Title changed', { from: card.title, to: titleMarkdown });
    if (description !== card.description) logActivity('Description changed', {});
    if (dueDate !== card.dueDate) logActivity('Due date changed', { from: card.dueDate, to: dueDate });
    if (cardColor !== card.color) logActivity('Color changed', { from: card.color, to: cardColor });
    
    // Only use manually assigned members - @ mentions are just mentions, not assignments
    // @ mentions will be handled separately for notifications only
    if (JSON.stringify(members) !== JSON.stringify(card.assignedTo)) {
      logActivity('Assignee changed', { from: card.assignedTo, to: members });
    }
    
    if (completed !== card.completed) logActivity('Completed changed', { from: card.completed, to: completed });
    if (JSON.stringify(labels) !== JSON.stringify(card.labels)) logActivity('Labels changed', {});
    if (JSON.stringify(checklists) !== JSON.stringify(card.checklist)) logActivity('Checklist changed', {});
    const attachmentUrls = (attachments || []).map((a: { id: string; url: string; name?: string }) => a.url);
    
    // Parse mentions from the markdown title to extract propId
    const titleMentions = parseMentions(titleMarkdown);
    const propMentions = titleMentions
      .filter(item => item.type === 'prop' && item.id)
      .map(item => item.id!)
      .filter((id): id is string => !!id);
    const propId = propMentions.length > 0 ? propMentions[0] : card.propId;
    
    onUpdateCard(card.id, { 
      title: titleMarkdown, // Store markdown format
      description, 
      color: cardColor, 
      assignedTo: members, // Only manually assigned members, not @ mentions
      completed, 
      status, 
      activityLog, 
      dueDate, 
      labels, 
      checklist: checklists, 
      images, 
      attachments: attachmentUrls,
      propId: propId || undefined
    });
    onClose();
  };

  // Helper: open @ menu at cursor
  // const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
  //   if (e.key === '@') {
  //     const textarea = e.target as HTMLTextAreaElement;
  //     const rect = textarea.getBoundingClientRect();
  //     setMentionMenuPosition({ top: rect.top + 40, left: rect.left + 40 });
  //     setShowMentionMenu(true);
  //   }
  // };

  // When mention type is selected
  // const handleSelectMentionType = (type: 'prop' | 'container' | 'user') => {
  //   setMentionType(type);
  //   setShowMentionMenu(false);
  //   setShowMentionSearch(true);
  //   setMentionSearchText('');
  //   if (type === 'prop') setMentionSuggestions(propsList);
  //   else if (type === 'container') setMentionSuggestions(containersList);
  //   else setMentionSuggestions(usersList);
  // };

  // When searching in mention popover
  // const handleMentionSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const val = e.target.value;
  //   setMentionSearchText(val);
  //   let data = [];
  //   if (mentionType === 'prop') data = propsList;
  //   else if (mentionType === 'container') data = containersList;
  //   else data = usersList;
  //   setMentionSuggestions(data.filter(item => item.name && item.name.toLowerCase().includes(val.toLowerCase())));
  // };

  // When a mention is picked
  // const handlePickMention = (item: any) => {
  //   let mentionText = '';
  //   if (mentionType === 'prop') mentionText = `[@${item.name}](prop:${item.id})`;
  //   else if (mentionType === 'container') mentionText = `[@${item.name}](container:${item.id})`;
  //   else mentionText = `@${item.name}`;
  //   setDescription(desc => desc + mentionText + ' ');
  //   setShowMentionSearch(false);
  //   setMentionType(null);
  // };

  // Close all popovers
  // const closeMentionMenus = () => {
  //   setShowMentionMenu(false);
  //   setShowMentionSearch(false);
  //   setMentionType(null);
  // };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4">
      <div
        className="relative rounded-xl shadow-2xl flex flex-col lg:flex-row overflow-hidden max-h-[96vh] min-h-[560px] lg:min-h-[700px] w-full max-w-[1100px]"
      >
        {/* Left column */}
        <div className="flex-1 min-w-0 lg:min-w-[360px] lg:max-w-[680px] p-5 sm:p-6 flex flex-col gap-4 rounded-l-xl overflow-y-auto flex-shrink-0" style={{ maxHeight: '96vh', background: cardColor, transition: 'background 0.3s' }}>
          {/* Hero image at top (full width, cropped height) */}
          {(images && images.length > 0) && (() => {
            const mainIdx = Math.max(0, images.findIndex(i => i.isMain));
            const idx = mainIdx === -1 ? 0 : mainIdx;
            const hero = images[idx];
            return (
              <div className="-mt-1 -mx-1">
                <img
                  src={hero.url}
                  alt={hero.caption || 'image'}
                  className="w-full h-48 object-cover rounded-lg cursor-pointer"
                  onClick={() => { setViewerIndex(idx); setViewerOpen(true); }}
                />
              </div>
            );
          })()}
          {(!images || images.length === 0) && card.imageUrl && (
            <div className="-mt-1 -mx-1">
              <img
                src={card.imageUrl}
                alt="image"
                className="w-full h-56 object-cover rounded-lg"
              />
            </div>
          )}
          {/* Title */}
          <div className="flex items-start gap-3 mb-2 relative">
            {/* Status toggle (click to cycle: not_started → in_progress → done) */}
            <button
              type="button"
              onClick={() => setStatus(s => (s === 'not_started' ? 'in_progress' : s === 'in_progress' ? 'done' : 'not_started'))}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-white/60 text-white/90 bg-transparent hover:bg-white/10 transition-all mt-0.5 flex-shrink-0"
              aria-label={`Status: ${status}`}
              title={`Status: ${status} (click to change)`}
            >
              {status === 'done' ? '✓' : status === 'in_progress' ? '◐' : ''}
            </button>
            <textarea
              className={`flex-1 rounded-lg px-3 py-2 text-xl font-bold bg-transparent shadow-none focus:ring-2 focus:ring-pb-primary focus:outline-none placeholder:text-gray-300 text-white resize-none leading-tight overflow-hidden ${completed ? 'line-through opacity-60' : ''}`}
              value={title}
              onChange={e => {
                const newValue = e.target.value;
                setTitle(newValue);
                
                // Auto-detect mentions as user types
                const cursorPos = e.target.selectionStart || 0;
                const textBeforeCursor = newValue.substring(0, cursorPos);
                
                // Check if we're typing a mention (look for @ followed by text, but not already in markdown format)
                const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9\s]*)$/);
                const isInMarkdown = textBeforeCursor.match(/\[@[^\]]*\]\([^)]*\)$/);
                
                if (mentionMatch && !isInMarkdown && !showMentionSearchTitle) {
                  // User is typing a mention - show menu if not already shown
                  if (!showMentionMenuTitle) {
                    setShowMentionMenuTitle(true);
                  }
                  // If mention type is already selected, update search text as they type
                  if (mentionTypeTitle && mentionMatch[1]) {
                    setMentionSearchTextTitle(mentionMatch[1].trim());
                  }
                } else if (!mentionMatch && showMentionMenuTitle && !showMentionSearchTitle) {
                  // No mention being typed - close menu if open
                  setShowMentionMenuTitle(false);
                }
              }}
              onKeyDown={e => {
                if (e.key === '@') {
                  setShowMentionMenuTitle(true);
                }
                // If user presses space or period while mention menu is open, close it
                if ((e.key === ' ' || e.key === '.' || e.key === ',') && showMentionMenuTitle && !showMentionSearchTitle) {
                  setShowMentionMenuTitle(false);
                }
              }}
              placeholder="Card title"
              style={{ boxShadow: 'none', border: 'none', height: 'auto' }}
              disabled={completed}
              rows={1}
              onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }}
              ref={titleRef}
            />
            <div className="ml-auto relative">
              <button className="text-white/80 hover:text-white" onClick={() => setShowMore(v => !v)} aria-label="More actions">
                <MoreVertical size={18} />
              </button>
              {showMore && (
                <div className="absolute right-0 top-6 bg-pb-darker border border-white/20 rounded shadow-lg z-50 min-w-[140px]">
                  <button className="w-full text-left px-3 py-2 hover:bg-white/10 text-red-300" onClick={() => { onDeleteCard(card.id); setShowMore(false); onClose(); }}>Delete card</button>
                </div>
              )}
            </div>
            {showMentionMenuTitle && (
              <div className="absolute top-12 left-10 bg-white text-black rounded shadow p-2 z-50 w-56">
                <div className="font-semibold mb-1">Mention Type</div>
                <button className="w-full text-left py-1 hover:bg-gray-100 px-2" onClick={() => {
                  // Extract any text typed after @
                  const cursorPos = titleRef.current?.selectionStart || title.length;
                  const textBeforeCursor = title.substring(0, cursorPos);
                  const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9\s]*)$/);
                  const typedText = mentionMatch ? mentionMatch[1].trim() : '';
                  
                  setMentionTypeTitle('prop');
                  setShowMentionMenuTitle(false);
                  setShowMentionSearchTitle(true);
                  setMentionSearchTextTitle(typedText);
                  setMentionSuggestionsTitle(propsList);
                }}>Prop</button>
                <button className="w-full text-left py-1 hover:bg-gray-100 px-2" onClick={() => {
                  // Extract any text typed after @
                  const cursorPos = titleRef.current?.selectionStart || title.length;
                  const textBeforeCursor = title.substring(0, cursorPos);
                  const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9\s]*)$/);
                  const typedText = mentionMatch ? mentionMatch[1].trim() : '';
                  
                  setMentionTypeTitle('container');
                  setShowMentionMenuTitle(false);
                  setShowMentionSearchTitle(true);
                  setMentionSearchTextTitle(typedText);
                  setMentionSuggestionsTitle(containersList);
                }}>Box/Container</button>
                <button className="w-full text-left py-1 hover:bg-gray-100 px-2" onClick={() => {
                  // Extract any text typed after @
                  const cursorPos = titleRef.current?.selectionStart || title.length;
                  const textBeforeCursor = title.substring(0, cursorPos);
                  const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9\s]*)$/);
                  const typedText = mentionMatch ? mentionMatch[1].trim() : '';
                  
                  setMentionTypeTitle('user');
                  setShowMentionMenuTitle(false);
                  setShowMentionSearchTitle(true);
                  setMentionSearchTextTitle(typedText);
                  setMentionSuggestionsTitle(usersList);
                }}>Mention User</button>
                <button className="w-full text-left py-1 hover:bg-gray-100 px-2" onClick={() => {
                  // Extract any text typed after @
                  const cursorPos = titleRef.current?.selectionStart || title.length;
                  const textBeforeCursor = title.substring(0, cursorPos);
                  const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9\s]*)$/);
                  
                  // Remove @ from text
                  if (mentionMatch) {
                    const beforeMention = textBeforeCursor.substring(0, textBeforeCursor.length - mentionMatch[0].length);
                    const textAfterCursor = title.substring(cursorPos);
                    setTitle(beforeMention + textAfterCursor);
                  } else if (title.endsWith('@')) {
                    setTitle(title.slice(0, -1));
                  }
                  
                  setShowMentionMenuTitle(false);
                  // Open the date picker
                  setShowDates(true);
                  // Set the current dueDate value in the picker format if it exists
                  if (dueDate) {
                    const date = new Date(dueDate);
                    if (!isNaN(date.getTime())) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const hours = String(date.getHours()).padStart(2, '0');
                      const minutes = String(date.getMinutes()).padStart(2, '0');
                      // Note: The date picker input will handle this automatically
                    }
                  }
                }}>Due Date/Time</button>
              </div>
            )}
            {showMentionSearchTitle && (
              <div className="absolute top-28 left-10 bg-[#1f2937] text-white rounded border border-white/10 p-3 z-50 w-72">
                <div className="text-sm text-gray-300 mb-2">Search {mentionTypeTitle}</div>
                <input
                  className="w-full rounded bg-[#111827] border border-white/10 px-2 py-1 text-white mb-2"
                  placeholder={`Type to search ${mentionTypeTitle}...`}
                  value={mentionSearchTextTitle}
                  onChange={e => setMentionSearchTextTitle(e.target.value)}
                  autoFocus
                />
                <div className="max-h-40 overflow-auto space-y-1">
                  {mentionSuggestionsTitle.filter(i => (i.name || '').toLowerCase().includes(mentionSearchTextTitle.toLowerCase())).map(i => (
                    <button key={i.id} className="block w-full text-left px-2 py-1 rounded hover:bg-white/10" onClick={() => {
                      // Insert plain @Name format for display (will be converted to markdown on save)
                      const textToInsert = `@${i.name}`;
                      
                      setTitle(prev => {
                        const t = prev || '';
                        const cursorPos = titleRef.current?.selectionStart || t.length;
                        const textBeforeCursor = t.substring(0, cursorPos);
                        const textAfterCursor = t.substring(cursorPos);
                        
                        // Find the @ mention that was being typed (look backwards from cursor)
                        const mentionMatch = textBeforeCursor.match(/@([A-Za-z0-9\s]*)$/);
                        
                        if (mentionMatch) {
                          // Replace the typed mention with the plain @Name format
                          const beforeMention = textBeforeCursor.substring(0, textBeforeCursor.length - mentionMatch[0].length);
                          return beforeMention + textToInsert + ' ' + textAfterCursor;
                        } else {
                          // Fallback: just append if we can't find the mention
                          const endsWithAt = /@\s*$/.test(t) || t.endsWith('@');
                          const base = endsWithAt ? t.replace(/@\s*$/, '').trimEnd() : t.trimEnd();
                          return (base ? base + ' ' : '') + textToInsert + ' ';
                        }
                      });
                      
                      // Reset cursor position after a short delay
                      setTimeout(() => {
                        if (titleRef.current) {
                          const newText = titleRef.current.value;
                          const newPos = newText.indexOf(textToInsert) + textToInsert.length + 1;
                          titleRef.current.setSelectionRange(newPos, newPos);
                        }
                      }, 0);
                      
                      setShowMentionSearchTitle(false);
                      setMentionTypeTitle(null);
                      setShowMentionMenuTitle(false);
                    }}>{i.name}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Documents popover */}
          <Popover open={showDocs} onClose={() => setShowDocs(false)} title="Documents" className="max-w-2xl">
            <div className="space-y-3">
              <div className="flex gap-2">
                <input className="flex-1 rounded border border-pb-primary/40 px-3 py-2 text-[#222]" placeholder="Display name (optional)" value={newDocName} onChange={e => setNewDocName(e.target.value)} />
                <input className="flex-[2] rounded border border-pb-primary/40 px-3 py-2 text-[#222]" placeholder="https://document.link" value={newDocUrl} onChange={e => setNewDocUrl(e.target.value)} />
                <button className="bg-pb-primary hover:bg-pb-success text-white font-semibold px-3 rounded" disabled={!newDocUrl} onClick={() => {
                  const id = uuidv4();
                  setAttachments(list => ([...(list || []), { id, url: newDocUrl.trim(), name: newDocName.trim() || undefined }]));
                  setNewDocName("");
                  setNewDocUrl("");
                }}>Add</button>
              </div>
              {attachments && attachments.length > 0 && (
                <ul className="space-y-2">
                  {attachments.map(att => (
                    <li key={att.id} className="flex items-center justify-between bg-black/20 border border-white/20 rounded px-2 py-1 text-white text-sm">
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="underline truncate">{att.name || att.url}</a>
                      <button className="text-red-400 hover:text-red-300 text-xs" onClick={() => setAttachments(list => (list || []).filter(a => a.id !== att.id))}>Remove</button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="text-right">
                <button className="bg-pb-darker hover:bg-pb-primary/40 text-white font-semibold py-1 px-3 rounded" onClick={() => setShowDocs(false)}>Close</button>
              </div>
            </div>
          </Popover>
          {/* Add bar (closer to title) */}
          <div className="flex flex-wrap gap-2 mt-2 mb-2">
            <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 font-medium py-1.5 px-3 rounded-full flex items-center gap-1.5 text-xs transition-colors" onClick={() => setShowLabels(true)}>
              <span>🏷️</span> Labels
            </button>
            <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 font-medium py-1.5 px-3 rounded-full flex items-center gap-1.5 text-xs transition-colors" onClick={() => setShowDates(true)}>
              <span>🕒</span> Dates
            </button>
            
            <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 font-medium py-1.5 px-3 rounded-full flex items-center gap-1.5 text-xs transition-colors" onClick={() => setShowMembers(true)}>
              <span>✅</span> Assign to
              {members.length > 0 && (
                <span className="ml-1.5 bg-pb-success text-white rounded-full px-1.5 py-0.5 text-xs font-bold">{usersList.find(u => u.id === members[0])?.name?.[0] || '?'}</span>
              )}
            </button>
            <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 font-medium py-1.5 px-3 rounded-full flex items-center gap-1.5 text-xs transition-colors" onClick={() => setShowMentionUser(true)}>
              <span>👤</span> Mention
            </button>
            <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 font-medium py-1.5 px-3 rounded-full flex items-center gap-1.5 text-xs transition-colors" onClick={() => setShowDocs(true)} title="Add documents">
              <span role="img" aria-label="paperclip">📎</span> Docs
            </button>
            {/* Image upload icon */}
            <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 font-medium py-1.5 px-3 rounded-full flex items-center gap-1.5 text-xs transition-colors" onClick={() => setShowImageUpload(true)} title="Upload Images">
              <span role="img" aria-label="Upload">📷</span>
            </button>
          </div>
          {/* Members popover */}
          <Popover open={showMembers} onClose={() => setShowMembers(false)} title="Assign to">
            <div className="space-y-2">
              <div className="text-white text-sm mb-1">Pick team members:</div>
              <div className="max-h-56 overflow-auto flex flex-col gap-1">
                {usersList.map(u => (
                  <label key={u.id} className="flex items-center gap-2 text-white/90">
                    <input
                      type="checkbox"
                      checked={members.includes(u.id)}
                      onChange={(e) => {
                        setMembers(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id));
                      }}
                    />
                    <span>{u.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button className="bg-pb-darker hover:bg-pb-primary/40 text-white font-semibold py-1 px-3 rounded" onClick={() => setShowMembers(false)}>Close</button>
                <button
                  className="bg-pb-primary hover:bg-pb-success text-white font-semibold py-1 px-3 rounded"
                  onClick={() => {
                    onUpdateCard(card.id, { assignedTo: members });
                    setShowMembers(false);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </Popover>
          {/* Mention user popover */}
          <Popover open={showMentionUser} onClose={() => setShowMentionUser(false)} title="Mention User">
            <div className="space-y-2">
              <div className="text-white text-sm mb-1">Mention a user (they'll be notified but not assigned):</div>
              <div className="max-h-56 overflow-auto flex flex-col gap-1">
                {usersList.map(u => (
                  <button
                    key={u.id}
                    className="flex items-center gap-2 text-white/90 hover:bg-white/10 px-2 py-1 rounded text-left"
                    onClick={() => {
                      const mentionText = `@${u.name}`;
                      setTitle(prev => {
                        const t = prev || '';
                        return (t.trim() ? t.trim() + ' ' : '') + mentionText + ' ';
                      });
                      setShowMentionUser(false);
                    }}
                  >
                    <span>{u.name}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button className="bg-pb-darker hover:bg-pb-primary/40 text-white font-semibold py-1 px-3 rounded" onClick={() => setShowMentionUser(false)}>Close</button>
              </div>
            </div>
          </Popover>
          {/* Image upload popup */}
          <Popover open={showImageUpload} onClose={() => setShowImageUpload(false)} title="Upload Images">
            <ImageUpload currentImages={images} onImagesChange={setImages} />
          </Popover>
          {/* Card color picker */}
          <div className="flex gap-2.5 items-center mt-1 mb-1">
            <span className="text-gray-200 text-sm font-medium">Card color:</span>
            <div className="flex gap-2">
              {["#2d5f3f", "#8b7a3a", "#8b5a3a", "#8b4a3a", "#5a3d5a", "#3d5a6b", "#374151"].map(color => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded-full border-2 shadow-md hover:scale-110 transition-all ${
                    cardColor === color ? 'border-white scale-110' : 'border-white/40'
                  }`}
                  style={{ background: color }}
                  onClick={() => setCardColor(color)}
                  aria-label={`Set card color ${color}`}
                />
              ))}
            </div>
          </div>
          {/* Description */}
          <div className="rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="block font-semibold text-white text-sm">Description</label>
            </div>
            {editingDescription ? (
              <div className="space-y-3">
                <textarea
                  className="w-full rounded-lg bg-black/30 border border-white/20 p-3 text-white min-h-[120px] focus:outline-none focus:ring-2 focus:ring-pb-primary/50 resize-none"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Add a more detailed description..."
                />
                <div className="flex gap-2 justify-end">
                  <button
                    className="bg-pb-darker hover:bg-pb-primary/40 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    onClick={() => { setDescription(card.description || ""); setEditingDescription(false); }}
                  >Cancel</button>
                  <button
                    className="bg-pb-primary hover:bg-pb-secondary text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    onClick={() => { onUpdateCard(card.id, { description }); setEditingDescription(false); }}
                  >Save</button>
                </div>
              </div>
            ) : (
              <div className="text-white/90 text-sm leading-6 min-h-[80px] p-3 rounded-lg bg-black/20 border border-white/10 cursor-text hover:border-white/20 transition-colors" onClick={() => setEditingDescription(true)}>
                {description ? renderDescriptionWithLinks(description) : <span className="text-pb-gray/70">Add a more detailed description...</span>}
              </div>
            )}
          </div>
          {/* Documents list in details */}
          {attachments && attachments.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold text-white mb-1">Documents</div>
              <ul className="list-disc pl-5">
                {attachments.map(att => (
                  <li key={att.id} className="text-gray-200"><a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{att.name || att.url}</a></li>
                ))}
              </ul>
            </div>
          )}
          {/* Linked to */}
          {linkedItems.length > 0 && (
            <div>
              <div className="font-semibold text-white mb-1">Linked to:</div>
              <ul className="list-disc pl-5">
                {linkedItems.map((i, idx) => (
                  <li key={idx} className="text-gray-200">
                    <a href={i.type === 'prop' ? `/props/${i.id || ''}` : i.type === 'container' ? `/containers/${i.id || ''}` : `/users/${i.label}`} className="text-blue-400 hover:underline">
                      {i.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Checklist */}
          <div>
            <div className="font-semibold text-white text-sm mb-3">Checklists</div>
            <div className="flex gap-2 mb-3">
              <input
                className="flex-1 rounded-lg border border-white/20 px-3 py-2 text-sm bg-black/20 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
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
              <button className="bg-pb-primary hover:bg-pb-secondary text-white font-semibold py-2 px-4 rounded-lg shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={!newChecklistItem.trim()} onClick={() => {
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
            <div className="mt-2">
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600/20 border border-red-500/40 text-red-200 font-semibold shadow-sm">
                <span>⏰</span>
                <span>Due: {new Date(dueDate).toLocaleString()}</span>
              </span>
            </div>
          )}
          {/* Labels popover */}
          <Popover open={showLabels} onClose={() => setShowLabels(false)} title="Manage Labels">
            <div className="flex flex-col gap-2">
              {/* Add new label */}
              <div className="flex gap-2 items-center mb-2">
                <input
                  className="flex-1 rounded border border-pb-primary/40 px-2 py-1 text-xs bg-black/30 text-white placeholder:text-gray-300"
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
                      className="flex-1 rounded border border-pb-primary/40 px-2 py-1 text-xs bg-black/30 text-white placeholder:text-gray-300"
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
        <div className="w-full lg:w-[340px] flex flex-col p-5 sm:p-6 gap-4 bg-blue-900/90 border-l-0 lg:border-l border-white/10 flex-shrink-0 relative overflow-hidden rounded-r-xl" style={{ maxHeight: '96vh', overflowY: 'auto' }}>
          {/* Close (X) button top right of comments panel */}
          <button className="absolute top-4 right-4 text-white text-2xl z-50 hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center transition-colors" onClick={onClose} aria-label="Close">×</button>
          <div className="font-semibold text-white text-lg mb-1">Comments and activity</div>
          
          {/* Add comment area */}
          <div className="flex gap-2 items-start mb-3">
            <input
              className="flex-1 rounded-lg border border-white/20 px-3 py-2 text-sm text-white bg-white/5 placeholder:text-pb-gray/50 focus:outline-none focus:ring-2 focus:ring-pb-primary/50"
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
              className="bg-pb-primary hover:bg-pb-secondary text-white font-semibold py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
            >
              Add
            </button>
          </div>
          
          {/* Comments and activity list */}
          <div className="flex-1 overflow-y-auto mb-3 min-h-0">
            {combinedLog.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">💬</div>
                <div className="text-pb-gray/70 text-sm font-medium">No comments or activity yet</div>
                <div className="text-pb-gray/50 text-xs mt-1.5">Add a comment to get started</div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {combinedLog.map((item, i) => (
                  <div key={item.id || i} className="flex items-start gap-2.5 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-pb-primary flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {item.userId?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="text-white font-semibold text-xs">
                          {usersList.find(u => u.id === item.userId)?.name || 
                           (item.userId === (user?.uid || '')) ? 
                           (user?.displayName || user?.email || 'You') : 
                           item.userId}
                        </div>
                        {item.type === 'activity' && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-pb-primary/20 text-pb-primary border border-pb-primary/30">
                            Activity
                          </span>
                        )}
                      </div>
                      <div className={`text-sm mb-1 leading-relaxed ${
                        item.type === 'comment' ? 'text-white/90' : 'text-pb-primary/90'
                      }`}>
                        {item.text}
                      </div>
                      <div className="text-pb-gray/50 text-xs mt-1">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Save button at bottom of comments section */}
          <div className="flex justify-end pt-3 mt-auto border-t border-white/10">
            <button 
              className="bg-pb-primary hover:bg-pb-secondary text-white font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-md" 
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </div>
      {/* Fullscreen image viewer */}
      {viewerOpen && images && images.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center">
          <button className="absolute top-4 right-6 text-white text-3xl" onClick={() => setViewerOpen(false)} aria-label="Close">×</button>
          <div className="flex items-center justify-center w-full px-6 gap-4">
            <button
              className="text-white text-2xl px-3 py-2 bg-white/10 rounded-full"
              onClick={() => setViewerIndex(i => (i - 1 + images.length) % images.length)}
              aria-label="Previous"
            >◀</button>
            <img
              src={images[viewerIndex].url}
              alt={images[viewerIndex].caption || 'image'}
              className="max-h-[80vh] max-w-[80vw] object-contain rounded-lg shadow-lg"
            />
            <button
              className="text-white text-2xl px-3 py-2 bg-white/10 rounded-full"
              onClick={() => setViewerIndex(i => (i + 1) % images.length)}
              aria-label="Next"
            >▶</button>
          </div>
          {images.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto px-6 pb-4">
              {images.map((img, i) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt={img.caption || 'thumb'}
                  className={`h-16 w-24 object-cover rounded cursor-pointer border ${i === viewerIndex ? 'border-pb-primary' : 'border-white/20'}`}
                  onClick={() => setViewerIndex(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Card: React.FC<CardProps> = ({ card, onUpdateCard, dndId, openInitially, onDeleteCard }) => {
  const [modalOpen, setModalOpen] = useState(!!openInitially);
  useEffect(() => {
    if (openInitially) setModalOpen(true);
  }, [openInitially]);
  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    setModalOpen(true);
  };
  // dnd-kit sortable for cards (disable when modal open)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dndId, disabled: modalOpen });
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
        className={`block rounded-md p-3 shadow hover:shadow-lg transition cursor-pointer no-underline card ${(!card.color || card.color === '#374151') ? 'border border-white/10' : ''}`}
        onClick={handleOpen}
        tabIndex={0}
        role="button"
        aria-label={`Card: ${card.title}`}
        data-dnd-kit="card"
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen(e as unknown as React.MouseEvent);
          }
        }}
      >
        {/* Cover image (main image) */}
        {Array.isArray(card.images) && card.images.some(img => img.isMain) && (
          <div className="-mt-3 -mx-3 mb-2">
            <img
              src={(card.images.find(i => i.isMain) || card.images[0]).url}
              alt="cover"
              className="w-full h-24 object-cover rounded-t-md"
            />
          </div>
        )}
        {(!card.images || card.images.length === 0) && card.imageUrl && (
          <div className="-mt-3 -mx-3 mb-2">
            <img
              src={card.imageUrl}
              alt="cover"
              className="w-full h-24 object-cover rounded-t-md"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* Status indicator (Cursor-style): circle for not started, half-filled radial for in-progress, check circle for done */}
          <span aria-label={card.status || 'not_started'} title={card.status || 'not_started'} className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 text-gray-200">
            {card.status === 'done' ? '✓' : card.status === 'in_progress' ? '◐' : ''}
          </span>
          <div className="font-semibold" style={{ color: '#fff' }}>{renderTextWithLinks(card.title)}</div>
        </div>
        {card.description && (
          <div className="text-xs mt-1" style={{ color: '#fff' }}>{renderDescriptionWithLinks(card.description)}</div>
        )}
        {/* Assignment indicator */}
        {Array.isArray(card.assignedTo) && card.assignedTo.length > 0 && (
          <div className="mt-2 text-[10px] inline-flex items-center gap-1 bg-pb-primary/60 text-white px-2 py-0.5 rounded-full">
            <span>👤</span>
            <span>{card.assignedTo.length} member{card.assignedTo.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
      <CardDetailModal open={modalOpen} onClose={() => setModalOpen(false)} card={card} onUpdateCard={onUpdateCard} onDeleteCard={onDeleteCard} />
    </>
);
};

export default Card; 