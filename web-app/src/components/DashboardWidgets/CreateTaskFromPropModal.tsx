/**
 * Create Task From Prop Modal
 * 
 * Reusable component for creating tasks from props with smart defaults
 */

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useShowSelection } from '../../contexts/ShowSelectionContext';
import { validateTaskTitle, validateDueDate, sanitiseTextInput } from '../../utils/inputValidation';
import type { Prop } from '../../types/props';
import type { BoardData } from '../../types/taskManager';

interface CreateTaskFromPropModalProps {
  prop: Prop;
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: (taskId: string) => void;
}

interface ListData {
  id: string;
  name: string;
  title: string;
  order?: number;
}

export const CreateTaskFromPropModal: React.FC<CreateTaskFromPropModalProps> = ({
  prop,
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const { service } = useFirebase();
  const { currentShowId } = useShowSelection();
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [lists, setLists] = useState<ListData[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Use refs to track if we've initialized board/list selection to prevent loops
  const hasInitializedBoard = useRef(false);
  const hasInitializedList = useRef(false);

  // Generate smart defaults based on prop
  useEffect(() => {
    if (!prop || !isOpen) return;

    // Generate title based on prop status
    // Note: Prop.status is typed as PropLifecycleStatus but may contain additional values in practice
    let suggestedTitle = '';
    const status = String(prop.status || '');
    
    if (status === 'to_buy') {
      suggestedTitle = `Purchase ${prop.name}`;
    } else if (status === 'on_order') {
      suggestedTitle = `Track ${prop.name} Order`;
    } else if (status === 'being_modified') {
      suggestedTitle = `Modify ${prop.name}`;
    } else if (status === 'damaged_awaiting_repair' || status === 'out_for_repair' || status === 'repair') {
      suggestedTitle = `Repair ${prop.name}`;
    } else if (status === 'damaged_awaiting_replacement') {
      suggestedTitle = `Replace ${prop.name}`;
    } else if (status === 'under_review') {
      suggestedTitle = `Review ${prop.name}`;
    } else if (status === 'missing') {
      suggestedTitle = `Locate ${prop.name}`;
    } else {
      suggestedTitle = `Task for ${prop.name}`;
    }

    setTaskTitle(suggestedTitle);

    // Build description with prop details
    let description = `Prop: ${prop.name}\n`;
    description += `Status: ${status}\n`;
    if (prop.category) description += `Category: ${prop.category}\n`;
    if (prop.location) description += `Location: ${prop.location}\n`;
    if (prop.notes) description += `\nNotes: ${prop.notes}\n`;
    description += `\nLinked: [@${prop.name}](prop:${prop.id})`;

    setTaskDescription(description);

    // Set due date based on prop deadlines
    if (prop.rentalDueDate) {
      setDueDate(prop.rentalDueDate.split('T')[0]);
    } else if (prop.nextMaintenanceDue) {
      setDueDate(prop.nextMaintenanceDue.split('T')[0]);
    }
  }, [prop, isOpen]);

  // Reset initialization flags when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      hasInitializedBoard.current = false;
      hasInitializedList.current = false;
    }
  }, [isOpen]);

  // Fetch boards for the show
  useEffect(() => {
    if (!currentShowId || !service || !isOpen) return;

    const unsub = service.listenToCollection<BoardData>(
      'todo_boards',
      docs => {
        const mappedBoards = docs
          .map(d => ({
            ...d.data,
            id: d.id,
            title: d.data.title || d.data.name || 'Untitled Board',
            listIds: d.data.listIds || [],
          }))
          .filter(b => b.showId === currentShowId);

        setBoards(mappedBoards);
        
        // Auto-select first board only once
        if (mappedBoards.length > 0 && !hasInitializedBoard.current && !selectedBoardId) {
          setSelectedBoardId(mappedBoards[0].id);
          hasInitializedBoard.current = true;
        }
      },
      error => console.error('Error loading boards:', error)
    );

    return () => unsub();
  }, [service, currentShowId, isOpen]); // Removed selectedBoardId from deps

  // Fetch lists for selected board
  useEffect(() => {
    if (!selectedBoardId || !service || !isOpen) {
      setLists([]);
      setSelectedListId('');
      hasInitializedList.current = false;
      return;
    }

    const unsub = service.listenToCollection<ListData>(
      `todo_boards/${selectedBoardId}/lists`,
      docs => {
        const mappedLists = docs
          .map(d => ({
            id: d.id,
            name: d.data.name || d.data.title || 'Untitled List',
            title: d.data.title || d.data.name || 'Untitled List',
            order: d.data.order || 0,
          }))
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        setLists(mappedLists);
        
        // Auto-select first "To Do" list or first list only when board changes
        if (mappedLists.length > 0 && !hasInitializedList.current) {
          const todoList = mappedLists.find(l => 
            l.name.toLowerCase().includes('to do') || 
            l.name.toLowerCase().includes('todo')
          );
          setSelectedListId(todoList?.id || mappedLists[0].id);
          hasInitializedList.current = true;
        }
      },
      error => console.error('Error loading lists:', error)
    );

    return () => unsub();
  }, [service, selectedBoardId, isOpen]); // Removed selectedListId from deps
  
  // Reset list initialization when board changes
  useEffect(() => {
    hasInitializedList.current = false;
    setSelectedListId('');
  }, [selectedBoardId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    setError(null);

    // Validate inputs
    const titleValidation = validateTaskTitle(taskTitle);
    if (!titleValidation.isValid) {
      setValidationErrors({ title: titleValidation.error || '' });
      return;
    }

    if (!selectedBoardId || !selectedListId) {
      setValidationErrors({ board: 'Please select a board and list' });
      return;
    }

    if (dueDate) {
      const dateValidation = validateDueDate(dueDate, false);
      if (!dateValidation.isValid) {
        setValidationErrors({ dueDate: dateValidation.error || '' });
        return;
      }
    }

    setLoading(true);

    try {
      // Sanitise inputs
      const sanitisedTitle = sanitiseTextInput(taskTitle);
      const sanitisedDescription = sanitiseTextInput(taskDescription);

      const newCard = await service.addDocument(
        `todo_boards/${selectedBoardId}/lists/${selectedListId}/cards`,
        {
          title: sanitisedTitle,
          description: sanitisedDescription,
          order: 0,
          createdAt: new Date().toISOString(),
          propId: prop.id,
          assignedTo: [],
          completed: false,
          dueDate: dueDate || null,
        }
      );

      onTaskCreated?.(newCard.id);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-pb-darker rounded-2xl border border-pb-primary/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-pb-primary/20">
          <h2 id="modal-title" className="text-xl font-bold text-white">Create Task from Prop</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-pb-primary/20 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-pb-gray" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Prop
            </label>
            <div className="p-3 bg-pb-primary/10 rounded-lg border border-pb-primary/20">
              <div className="text-white font-medium">{prop.name}</div>
              <div className="text-xs text-pb-gray mt-1">
                Status: {prop.status} • Category: {prop.category || 'N/A'}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-white mb-2">
              Task Title *
            </label>
            <input
              id="task-title"
              type="text"
              value={taskTitle}
              onChange={(e) => {
                setTaskTitle(e.target.value);
                if (validationErrors.title) {
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.title;
                    return newErrors;
                  });
                }
              }}
              className="w-full px-4 py-2 bg-pb-primary/10 border border-pb-primary/20 rounded-lg text-white placeholder-pb-gray focus:outline-none focus:ring-2 focus:ring-pb-primary aria-invalid:border-red-500"
              required
              aria-invalid={!!validationErrors.title}
              aria-describedby={validationErrors.title ? 'title-error' : undefined}
            />
            {validationErrors.title && (
              <p id="title-error" className="mt-1 text-sm text-red-400" role="alert">
                {validationErrors.title}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-board" className="block text-sm font-medium text-white mb-2">
                Board *
              </label>
              <select
                id="task-board"
                value={selectedBoardId}
                onChange={(e) => {
                  setSelectedBoardId(e.target.value);
                  setSelectedListId(''); // Reset list selection
                  if (validationErrors.board) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.board;
                      return newErrors;
                    });
                  }
                }}
                className="w-full px-4 py-2 bg-pb-primary/10 border border-pb-primary/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pb-primary aria-invalid:border-red-500"
                required
                aria-invalid={!!validationErrors.board}
                aria-describedby={validationErrors.board ? 'board-error' : undefined}
              >
                <option value="">Select a board</option>
                {boards.map(board => (
                  <option key={board.id} value={board.id}>{board.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="task-list" className="block text-sm font-medium text-white mb-2">
                List *
              </label>
              <select
                id="task-list"
                value={selectedListId}
                onChange={(e) => {
                  setSelectedListId(e.target.value);
                  if (validationErrors.board) {
                    setValidationErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.board;
                      return newErrors;
                    });
                  }
                }}
                className="w-full px-4 py-2 bg-pb-primary/10 border border-pb-primary/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pb-primary disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={!selectedBoardId || lists.length === 0}
              >
                <option value="">Select a list</option>
                {lists.map(list => (
                  <option key={list.id} value={list.id}>{list.name}</option>
                ))}
              </select>
              {validationErrors.board && (
                <p id="board-error" className="mt-1 text-sm text-red-400" role="alert">
                  {validationErrors.board}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="task-due-date" className="block text-sm font-medium text-white mb-2">
              Due Date
            </label>
            <input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                if (validationErrors.dueDate) {
                  setValidationErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.dueDate;
                    return newErrors;
                  });
                }
              }}
              className="w-full px-4 py-2 bg-pb-primary/10 border border-pb-primary/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pb-primary aria-invalid:border-red-500"
              aria-invalid={!!validationErrors.dueDate}
              aria-describedby={validationErrors.dueDate ? 'due-date-error' : undefined}
            />
            {validationErrors.dueDate && (
              <p id="due-date-error" className="mt-1 text-sm text-red-400" role="alert">
                {validationErrors.dueDate}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="task-description" className="block text-sm font-medium text-white mb-2">
              Description
            </label>
            <textarea
              id="task-description"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 bg-pb-primary/10 border border-pb-primary/20 rounded-lg text-white placeholder-pb-gray focus:outline-none focus:ring-2 focus:ring-pb-primary resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-pb-primary/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-pb-gray hover:text-white transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-pb-primary hover:bg-pb-secondary text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

