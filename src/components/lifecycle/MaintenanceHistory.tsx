import React from 'react';
import { MaintenanceRecord } from '../../types/lifecycle';
import { Wrench, ClipboardList, Calendar, Clock, AlertTriangle } from 'lucide-react';

interface MaintenanceHistoryProps {
  records: MaintenanceRecord[];
  maxItems?: number;
}

export function MaintenanceHistory({ records, maxItems = 5 }: MaintenanceHistoryProps) {
  // Sort records by date descending (newest first)
  const sortedRecords = [...records].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Limit items if needed
  const displayItems = maxItems ? sortedRecords.slice(0, maxItems) : sortedRecords;
  const hasMoreItems = sortedRecords.length > maxItems;

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
          
          return (
            <li key={record.id} className="p-4 bg-[var(--bg-secondary)] rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[var(--text-secondary)] text-sm">
                    Recorded on {new Date(record.date).toLocaleDateString()}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className="font-medium text-[var(--text-primary)]">{record.performedBy}</span>
                  </div>
                </div>
                <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${typeDetails.color}`}>
                  {typeDetails.icon}
                  {typeDetails.label}
                </span>
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
            // For now, it's just a placeholder
            console.log('View all maintenance records clicked');
          }}
        >
          View all {records.length} records
        </button>
      )}
    </div>
  );
} 