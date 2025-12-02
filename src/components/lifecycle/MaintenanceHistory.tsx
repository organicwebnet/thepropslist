import React, { useState } from 'react';
import { MaintenanceRecord } from '../../types/lifecycle.ts';
import { Wrench, ClipboardList, Calendar, Clock, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import { MaintenanceRecordForm } from './MaintenanceRecordForm.tsx';

interface MaintenanceHistoryProps {
  records: MaintenanceRecord[];
  maxItems?: number;
  onEdit?: (recordId: string, record: Partial<Omit<MaintenanceRecord, 'id' | 'createdAt' | 'createdBy'>>) => Promise<void>;
  onDelete?: (recordId: string) => Promise<void>;
  currentUserId?: string;
}

export function MaintenanceHistory({ records, maxItems = 5, onEdit, onDelete, currentUserId }: MaintenanceHistoryProps) {
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  // Sort records by date descending (newest first)
  const sortedRecords = [...records].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Limit items if needed
  const displayItems = maxItems ? sortedRecords.slice(0, maxItems) : sortedRecords;
  const hasMoreItems = sortedRecords.length > maxItems;

  const handleEdit = async (recordId: string, record: Partial<Omit<MaintenanceRecord, 'id' | 'createdAt' | 'createdBy'>>) => {
    if (!onEdit) return;
    try {
      await onEdit(recordId, record);
      setEditingRecordId(null);
    } catch (error) {
      console.error('Failed to update maintenance record:', error);
      alert('Failed to update maintenance record. Please try again.');
      // Don't clear editing state on error so user can try again
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!onDelete) return;
    if (!confirm('Are you sure you want to delete this maintenance record? This action cannot be undone.')) {
      return;
    }
    try {
      await onDelete(recordId);
      setDeletingRecordId(null);
    } catch (error) {
      console.error('Failed to delete maintenance record:', error);
      alert('Failed to delete maintenance record. Please try again.');
    }
  };

  // Check if user can edit/delete (only if they created it or if no currentUserId is provided)
  const canModify = (record: MaintenanceRecord) => {
    if (!currentUserId) return true; // If no userId provided, allow editing (for backwards compatibility)
    return record.createdBy === currentUserId;
  };

  // Get type icon and color
  const getTypeDetails = (type: MaintenanceRecord['type']) => {
    switch (type) {
      case 'repair':
        return { 
          icon: <Wrench className="h-4 w-4" />, 
          color: 'bg-orange-500/10 text-orange-500',
          label: 'Repair'
        };
      case 'maintenance':
        return { 
          icon: <ClipboardList className="h-4 w-4" />, 
          color: 'bg-[var(--highlight-bg)] text-[var(--highlight-color)]',
          label: 'Maintenance'
        };
      case 'modification':
        return { 
          icon: <Wrench className="h-4 w-4" />, 
          color: 'bg-purple-500/10 text-purple-500',
          label: 'Modification'
        };
      case 'inspection':
        return { 
          icon: <ClipboardList className="h-4 w-4" />, 
          color: 'bg-green-500/10 text-green-500',
          label: 'Inspection'
        };
    }
  };

  // Check if a date is in the future
  const isDateInFuture = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time portion for accurate date comparison
    return date > today;
  };

  if (records.length === 0) {
    return (
      <div className="text-center p-4 border border-dashed border-[var(--border-color)] rounded-lg">
        <p className="text-[var(--text-secondary)]">No maintenance records yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-[var(--text-primary)] flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Maintenance History
        </h3>
      </div>

      <ul className="space-y-4">
        {displayItems.map((record) => {
          const typeDetails = getTypeDetails(record.type);
          const isEditing = editingRecordId === record.id;
          const isDeleting = deletingRecordId === record.id;
          const canEdit = canModify(record) && onEdit;
          const canDelete = canModify(record) && onDelete;
          
          if (isEditing) {
            return (
              <li key={record.id} className="p-4 bg-[var(--bg-secondary)] rounded-lg border-2 border-[var(--highlight-color)]">
                <MaintenanceRecordForm
                  initialData={record}
                  onSubmit={async () => {}}
                  onUpdate={(updateData) => handleEdit(record.id, updateData)}
                  onCancel={() => setEditingRecordId(null)}
                />
              </li>
            );
          }
          
          return (
            <li key={record.id} className="p-4 bg-[var(--bg-secondary)] rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-[var(--text-secondary)] text-sm">
                    Recorded on {new Date(record.date).toLocaleDateString()}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className="font-medium text-[var(--text-primary)]">{record.performedBy}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${typeDetails?.color}`}>
                    {typeDetails?.icon}
                    {typeDetails?.label}
                  </span>
                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          onClick={() => setEditingRecordId(record.id)}
                          disabled={isDeleting}
                          className="p-1.5 hover:bg-[var(--bg-primary)] rounded transition-colors text-[var(--text-secondary)] hover:text-[var(--highlight-color)] disabled:opacity-50"
                          title="Edit record"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(record.id)}
                          disabled={isEditing || isDeleting}
                          className="p-1.5 hover:bg-red-500/10 rounded transition-colors text-[var(--text-secondary)] hover:text-red-500 disabled:opacity-50"
                          title="Delete record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Show repair timeline information if this is a repair record */}
              {record.type === 'repair' && (
                <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {record.repairDeadline && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      <span className={
                        isDateInFuture(record.repairDeadline) 
                          ? 'text-[var(--text-secondary)]' 
                          : 'text-red-400 font-medium'
                      }>
                        Deadline: {new Date(record.repairDeadline).toLocaleDateString()}
                        {!isDateInFuture(record.repairDeadline) && ' (Past due)'}
                      </span>
                    </div>
                  )}
                  
                  {record.estimatedReturnDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-[var(--text-secondary)]" />
                      <span className={
                        isDateInFuture(record.estimatedReturnDate) 
                          ? 'text-[var(--text-secondary)]' 
                          : 'text-red-400'
                      }>
                        Expected return: {new Date(record.estimatedReturnDate).toLocaleDateString()}
                        {!isDateInFuture(record.estimatedReturnDate) && ' (Overdue)'}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-3 text-sm text-[var(--text-primary)] bg-[var(--bg-primary)] p-3 rounded border border-[var(--border-color)]">
                <div dangerouslySetInnerHTML={{ __html: record.description }} />
              </div>
              
              {record.cost !== undefined && (
                <div className="mt-2 text-right">
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    Cost: £{record.cost.toFixed(2)}
                  </span>
                </div>
              )}
              
              {record.notes && (
                <div className="mt-2 text-sm text-[var(--text-secondary)] italic">
                  {record.notes}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {hasMoreItems && (
        <button 
          className="w-full text-center py-2 text-sm text-[var(--highlight-color)] hover:text-[var(--highlight-color)]/80"
          onClick={() => {
            // This would be connected to a state handler for viewing full history
          }}
        >
          View all {records.length} records
        </button>
      )}
    </div>
  );
} 
