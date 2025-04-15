import React, { useState } from 'react';
import { Theater, User, Building, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Show, ShowFormData } from '../types';
import { ShowForm } from './ShowForm';
import { auth } from '../lib/firebase';

interface ShowListProps {
  shows: Show[];
  onDelete?: (id: string) => void;
  onEdit?: (id: string, data: ShowFormData) => void;
  onSelect: (show: Show) => void;
  selectedShowId?: string;
  currentUserEmail?: string;
}

export function ShowList({ shows, onDelete, onEdit, onSelect, selectedShowId, currentUserEmail }: ShowListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleEdit = (show: Show) => {
    setEditingId(show.id);
  };

  const handleEditSubmit = async (data: ShowFormData) => {
    if (editingId && onEdit) {
      await onEdit(editingId, data);
      setEditingId(null);
    }
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId(expandedId === id ? null : id);
  };

  const isShowOwner = (show: Show) => {
    return show.userId === auth.currentUser?.uid;
  };

  return (
    <div className="space-y-4">
      {shows.map((show) => (
        <div key={show.id}>
          {editingId === show.id ? (
            <ShowForm
              onSubmit={handleEditSubmit}
              initialData={{
                name: show.name,
                acts: show.acts,
                scenes: show.scenes,
                description: show.description,
                stageManager: show.stageManager,
                propsSupervisor: show.propsSupervisor,
                productionCompany: show.productionCompany,
                venues: show.venues || [],
                isTouringShow: show.isTouringShow || false,
                contacts: show.contacts || []
              }}
              mode="edit"
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div 
              className={`gradient-border p-6 transition-transform hover:scale-[1.02] cursor-pointer ${
                selectedShowId === show.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onSelect(show)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-primary to-primary-dark p-2 rounded-lg">
                    <Theater className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{show.name}</h3>
                    <div className="flex items-center space-x-4 text-gray-400 mt-1">
                      <span>{show.acts} Act{show.acts !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>{show.scenes} Scene{show.scenes !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => toggleExpand(show.id, e)}
                    className="p-2 text-gray-400 hover:text-primary transition-colors"
                    title={expandedId === show.id ? "Show less" : "Show more"}
                  >
                    {expandedId === show.id ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                  {isShowOwner(show) && onEdit && onDelete && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(show);
                        }}
                        className="p-2 text-gray-400 hover:text-primary transition-colors"
                        title="Edit show"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(show.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete show"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {expandedId === show.id && (
                <div className="pt-4 mt-4 border-t border-gray-800 space-y-4">
                  {show.description && (
                    <p className="text-gray-400">{show.description}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {show.stageManager && (
                      <div className="flex items-center space-x-2 text-gray-400">
                        <User className="h-4 w-4" />
                        <span>Stage Manager: {show.stageManager}</span>
                      </div>
                    )}
                    {show.propsSupervisor && (
                      <div className="flex items-center space-x-2 text-gray-400">
                        <User className="h-4 w-4" />
                        <span>Props Supervisor: {show.propsSupervisor}</span>
                      </div>
                    )}
                    {show.productionCompany && (
                      <div className="flex items-center space-x-2 text-gray-400">
                        <Building className="h-4 w-4" />
                        <span>{show.productionCompany}</span>
                      </div>
                    )}
                  </div>

                  {show.collaborators?.length > 0 && (
                    <div className="text-gray-400">
                      <span>{show.collaborators.length} Collaborator{show.collaborators.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {shows.length === 0 && (
        <div className="text-center py-12 gradient-border">
          <p className="text-gray-400">No shows added yet. Create your first show to get started!</p>
        </div>
      )}
    </div>
  );
}