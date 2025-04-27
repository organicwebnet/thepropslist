import React, { useState } from 'react';
import { Theater, User, Building, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Show, ShowFormData } from '../types';
import ShowForm from './ShowForm';
import { useAuth } from '../contexts/AuthContext';

interface ShowListProps {
  shows: Show[];
  onDelete?: (id: string) => void;
  onEdit?: (id: string, data: ShowFormData) => void;
  onSelect: (show: Show) => void;
  selectedShowId?: string;
  currentUserEmail?: string;
}

export function ShowList({ shows, onDelete, onEdit, onSelect, selectedShowId, currentUserEmail }: ShowListProps) {
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleEdit = (show: Show) => {
    console.log('=== SHOW EDIT HANDLER ===');
    console.log('1. handleEdit called with show:', show);
    setEditingId(show.id);
    console.log('2. Set editingId to:', show.id);
  };

  const handleEditSubmit = async (data: ShowFormData) => {
    console.log('=== HANDLE EDIT SUBMIT ===');
    console.log('1. Received form data:', data);
    
    if (editingId && onEdit) {
      console.log('2. Calling onEdit with editingId:', editingId);
      await onEdit(editingId, data);
      console.log('3. onEdit function completed');
      setEditingId(null);
      console.log('4. Reset editingId to null');
    }
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId(expandedId === id ? null : id);
  };

  const isShowOwner = (show: Show) => {
    return show.userId === user?.uid;
  };

  return (
    <div className="space-y-4">
      {shows.map((show) => (
        <div key={show.id}>
          {editingId === show.id ? (
            <ShowForm
              onSubmit={handleEditSubmit}
              initialData={{
                ...show,
                // Ensure these fields have default values if they're missing
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
                selectedShowId === show.id ? 'ring-2 ring-primary border-2 border-primary shadow-lg shadow-primary/30' : ''
              }`}
              onClick={() => onSelect(show)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`${selectedShowId === show.id ? 'bg-primary' : 'bg-gradient-to-r from-primary to-primary-dark'} p-2 rounded-lg`}>
                    <Theater className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-semibold text-white line-clamp-2">{show.name}</h3>
                    <div className="flex items-center space-x-4 text-gray-400 mt-1">
                      <span>{show.acts.length} Act{show.acts.length !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>
                        {show.acts.reduce((total, act) => total + act.scenes.length, 0)} Scene
                        {show.acts.reduce((total, act) => total + act.scenes.length, 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {selectedShowId === show.id && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-white">
                          Currently Selected
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(show);
                    }}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                      selectedShowId === show.id 
                        ? 'bg-green-600/20 text-green-400 cursor-default' 
                        : 'bg-primary hover:bg-primary-dark text-white'
                    }`}
                    disabled={selectedShowId === show.id}
                  >
                    {selectedShowId === show.id ? 'Currently Active' : 'Select Show'}
                  </button>
                  <button
                    onClick={(e) => {
                      console.log('=== SHOW EDIT BUTTON CLICKED ===');
                      console.log('1. Edit button clicked for show:', show);
                      e.stopPropagation();
                      console.log('2. Event propagation stopped');
                      handleEdit(show);
                      console.log('3. handleEdit called with show data');
                    }}
                    className="p-2 text-gray-400 hover:text-primary transition-colors"
                    title="Edit show"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  {isShowOwner(show) && onEdit && onDelete && (
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