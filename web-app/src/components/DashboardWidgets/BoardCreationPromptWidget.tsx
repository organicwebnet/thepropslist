/**
 * Board Creation Prompt Widget
 * 
 * Encourages creating taskboards with templates for new shows
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, X, LayoutList } from 'lucide-react';
import { WidgetContainer } from './WidgetContainer';
import { useFirebase } from '../../contexts/FirebaseContext';
import { useWebAuth } from '../../contexts/WebAuthContext';
import type { DashboardWidgetProps } from './types';

interface BoardTemplate {
  name: string;
  description: string;
  lists: string[];
}

const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    name: 'Pre-Production',
    description: 'Planning and preparation tasks',
    lists: ['To Do', 'In Progress', 'Waiting', 'Done'],
  },
  {
    name: 'Build Phase',
    description: 'Props creation and modification',
    lists: ['To Do', 'In Progress', 'Review', 'Complete'],
  },
  {
    name: 'Tech Week',
    description: 'Technical rehearsals and adjustments',
    lists: ['Scheduled', 'In Progress', 'Issues', 'Resolved'],
  },
  {
    name: 'Show Run',
    description: 'Ongoing show maintenance',
    lists: ['Daily Tasks', 'Maintenance', 'Notes', 'Archive'],
  },
];

export const BoardCreationPromptWidget: React.FC<DashboardWidgetProps> = ({
  showId,
}) => {
  const { service } = useFirebase();
  const { user } = useWebAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [boards, setBoards] = useState<any[]>([]);

  // Fetch boards for the show
  useEffect(() => {
    if (!showId || !service) {
      setBoards([]);
      return;
    }

    const unsub = service.listenToCollection(
      'todo_boards',
      docs => {
        const mappedBoards = docs
          .map(d => ({ ...d.data, id: d.id }))
          .filter(b => b.showId === showId);
        setBoards(mappedBoards);
      },
      error => console.error('Error loading boards:', error)
    );

    return () => unsub();
  }, [service, showId]);

  // Only show if show has less than 2 boards
  const shouldShow = !dismissed && boards.length < 2 && showId;

  const handleCreateBoard = async (template?: BoardTemplate) => {
    if (!user?.uid || !showId || creating) return;

    setCreating(true);
    try {
      const boardName = template?.name || 'New Board';
      
      // Create the board
      const boardRef = await service.addDocument('todo_boards', {
        title: boardName,
        name: boardName,
        listIds: [],
        ownerId: user.uid,
        sharedWith: [user.uid],
        showId: showId,
        createdAt: new Date().toISOString(),
      });

      // Create lists if template provided
      if (template && template.lists.length > 0) {
        for (let i = 0; i < template.lists.length; i++) {
          await service.addDocument(`todo_boards/${boardRef.id}/lists`, {
            name: template.lists[i],
            title: template.lists[i],
            order: i,
            boardId: boardRef.id,
          });
        }
      }

      // Navigate to the new board
      navigate(`/boards?boardId=${boardRef.id}`);
      setDismissed(true);
    } catch (error) {
      console.error('Error creating board:', error);
      alert('Failed to create board. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <WidgetContainer
      widgetId="board-creation-prompt"
      title="Get Started with Taskboards"
      onClose={handleDismiss}
    >
      <div className="space-y-4">
        <div>
          <p className="text-pb-gray text-sm mb-4">
            Create a taskboard to organize your production tasks. Choose a template to get started:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {BOARD_TEMPLATES.map((template) => (
            <button
              key={template.name}
              onClick={() => handleCreateBoard(template)}
              disabled={creating}
              className="p-4 rounded-lg bg-pb-primary/10 hover:bg-pb-primary/20 border border-pb-primary/30 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-white font-medium">{template.name}</h4>
                <LayoutList className="w-4 h-4 text-pb-primary flex-shrink-0 ml-2" />
              </div>
              <p className="text-xs text-pb-gray mb-2">{template.description}</p>
              <div className="flex flex-wrap gap-1">
                {template.lists.map((list) => (
                  <span
                    key={list}
                    className="text-xs px-2 py-0.5 bg-pb-primary/20 text-pb-primary rounded"
                  >
                    {list}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-pb-primary/20">
          <button
            onClick={() => handleCreateBoard()}
            disabled={creating}
            className="text-sm text-pb-primary hover:text-pb-secondary underline disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create blank board instead'}
          </button>
          <Link
            to="/boards"
            className="text-sm text-pb-gray hover:text-white"
          >
            Go to Boards →
          </Link>
        </div>
      </div>
    </WidgetContainer>
  );
};

