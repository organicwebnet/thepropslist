import React, { useState, useEffect } from 'react';
import { PropStatusUpdate as PropStatusUpdateType, MaintenanceRecord, PropLifecycleStatus, lifecycleStatusLabels, lifecycleStatusPriority, RepairPriority, repairPriorityLabels } from '../../types/lifecycle';
import { PropStatusUpdate } from './PropStatusUpdate';
import { MaintenanceRecordForm } from './MaintenanceRecordForm';
import { StatusHistory } from './StatusHistory';
import { MaintenanceHistory } from './MaintenanceHistory';
import { Clock, Activity, Calendar, AlertTriangle, CircleAlert, Navigation, DollarSign } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Show } from '../../types';

interface PropLifecycleProps {
  status: PropLifecycleStatus;
  statusNotes?: string;
  statusHistory: PropStatusUpdateType[];
  maintenanceHistory: MaintenanceRecord[];
  lastInspectionDate?: string;
  nextInspectionDue?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDue?: string;
  currentLocation?: string;
  expectedReturnDate?: string;
  replacementCost?: number;
  replacementLeadTime?: number;
  repairEstimate?: number;
  repairPriority?: RepairPriority;
  onStatusUpdate: (status: PropLifecycleStatus, notes: string, notifyTeam: boolean) => Promise<void>;
  onAddMaintenanceRecord: (record: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
  show?: Show;
  userId: string;
}

export function PropLifecycle({
  status,
  statusNotes,
  statusHistory,
  maintenanceHistory,
  lastInspectionDate,
  nextInspectionDue,
  lastMaintenanceDate,
  nextMaintenanceDue,
  currentLocation,
  expectedReturnDate,
  replacementCost,
  replacementLeadTime,
  repairEstimate,
  repairPriority,
  onStatusUpdate,
  onAddMaintenanceRecord,
  show,
  userId
}: PropLifecycleProps) {
  const [activeTab, setActiveTab] = useState<'status' | 'maintenance'>('status');

  // Add custom CSS to override any leftover blue styles
  useEffect(() => {
    // Create a style element
    const style = document.createElement('style');
    
    // Add CSS to override blue tabs with the highlight color
    style.textContent = `
      .border-primary.text-primary {
        border-color: var(--highlight-color) !important;
        color: var(--highlight-color) !important;
      }
      
      button.border-primary {
        border-color: var(--highlight-color) !important;
      }
      
      button.text-primary {
        color: var(--highlight-color) !important;
      }
    `;
    
    // Append the style to the document head
    document.head.appendChild(style);
    
    // Clean up when component unmounts
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Get status color
  const getStatusColor = () => {
    const priority = lifecycleStatusPriority[status];
    switch (priority) {
      case 'critical':
        return 'text-red-500 bg-red-500/10';
      case 'high':
        return 'text-orange-500 bg-orange-500/10';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'low':
        return 'text-[var(--highlight-color)] bg-[var(--highlight-bg)]';
      default:
        return 'text-green-500 bg-green-500/10';
    }
  };

  // Is there an upcoming inspection/maintenance?
  const hasUpcomingInspection = nextInspectionDue && new Date(nextInspectionDue) > new Date();
  const hasUpcomingMaintenance = nextMaintenanceDue && new Date(nextMaintenanceDue) > new Date();
  
  // Is a date overdue?
  const isInspectionOverdue = nextInspectionDue && new Date(nextInspectionDue) < new Date();
  const isMaintenanceOverdue = nextMaintenanceDue && new Date(nextMaintenanceDue) < new Date();

  // Check if return date is overdue (for loaned props)
  const isReturnOverdue = status === 'loaned_out' && expectedReturnDate && new Date(expectedReturnDate) < new Date();

  // Status that need attention
  const needsAttention = 
    isInspectionOverdue || 
    isMaintenanceOverdue || 
    isReturnOverdue || 
    status === 'damaged_awaiting_repair' || 
    status === 'damaged_awaiting_replacement' || 
    status === 'missing';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Prop Lifecycle Management
        </h2>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
          {lifecycleStatusLabels[status]}
        </div>
      </div>

      {needsAttention && (
        <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-500 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">This prop needs attention</p>
            <ul className="mt-1 list-disc list-inside text-sm space-y-1">
              {isInspectionOverdue && <li>Inspection overdue since {new Date(nextInspectionDue!).toLocaleDateString()}</li>}
              {isMaintenanceOverdue && <li>Maintenance overdue since {new Date(nextMaintenanceDue!).toLocaleDateString()}</li>}
              {isReturnOverdue && <li>Return overdue since {new Date(expectedReturnDate!).toLocaleDateString()}</li>}
              {status === 'damaged_awaiting_repair' && <li>Prop is awaiting repair</li>}
              {status === 'damaged_awaiting_replacement' && <li>Prop is awaiting replacement</li>}
              {status === 'missing' && <li>Prop is missing</li>}
            </ul>
          </div>
        </div>
      )}
      
      {/* Quick info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Location */}
        {currentLocation && (
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase">Current Location</h3>
              <Navigation className="h-4 w-4 text-[var(--text-secondary)]" />
            </div>
            <p className="text-[var(--text-primary)]">{currentLocation}</p>
            {expectedReturnDate && (
              <p className={`text-sm mt-1 ${isReturnOverdue ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}>
                Expected Return: {new Date(expectedReturnDate).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Inspection */}
        {(lastInspectionDate || nextInspectionDue) && (
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase">Inspection</h3>
              <Calendar className="h-4 w-4 text-[var(--text-secondary)]" />
            </div>
            {lastInspectionDate && (
              <p className="text-[var(--text-secondary)] text-sm">
                Last Inspection: {new Date(lastInspectionDate).toLocaleDateString()}
              </p>
            )}
            {nextInspectionDue && (
              <p className={`text-sm mt-1 ${isInspectionOverdue ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
                Next Inspection: {new Date(nextInspectionDue).toLocaleDateString()}
                {isInspectionOverdue && <span className="ml-2 text-red-500">(Overdue)</span>}
              </p>
            )}
          </div>
        )}

        {/* Maintenance */}
        {(lastMaintenanceDate || nextMaintenanceDue) && (
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase">Maintenance</h3>
              <Clock className="h-4 w-4 text-[var(--text-secondary)]" />
            </div>
            {lastMaintenanceDate && (
              <p className="text-[var(--text-secondary)] text-sm">
                Last Service: {new Date(lastMaintenanceDate).toLocaleDateString()}
              </p>
            )}
            {nextMaintenanceDue && (
              <p className={`text-sm mt-1 ${isMaintenanceOverdue ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
                Next Service: {new Date(nextMaintenanceDue).toLocaleDateString()}
                {isMaintenanceOverdue && <span className="ml-2 text-red-500">(Overdue)</span>}
              </p>
            )}
          </div>
        )}

        {/* Repair/Replacement info */}
        {(status === 'damaged_awaiting_repair' || status === 'damaged_awaiting_replacement') && (
          <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[var(--text-secondary)] uppercase">
                {status === 'damaged_awaiting_repair' ? 'Repair' : 'Replacement'} Info
              </h3>
              <DollarSign className="h-4 w-4 text-[var(--text-secondary)]" />
            </div>
            
            {status === 'damaged_awaiting_repair' && repairEstimate !== undefined && (
              <p className="text-[var(--text-primary)]">
                Estimated Cost: £{repairEstimate.toFixed(2)}
              </p>
            )}
            
            {status === 'damaged_awaiting_replacement' && replacementCost !== undefined && (
              <p className="text-[var(--text-primary)]">
                Replacement Cost: £{replacementCost.toFixed(2)}
              </p>
            )}
            
            {repairPriority && (
              <p className={`text-sm mt-1 
                ${repairPriority === 'urgent' ? 'text-red-500' : 
                repairPriority === 'high' ? 'text-orange-500' : 
                repairPriority === 'medium' ? 'text-yellow-500' : 
                'text-[var(--highlight-color)]'}`}>
                Priority: {repairPriorityLabels[repairPriority]}
              </p>
            )}
            
            {replacementLeadTime !== undefined && (
              <p className="text-[var(--text-secondary)] text-sm mt-1">
                Lead Time: {replacementLeadTime} {replacementLeadTime === 1 ? 'day' : 'days'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[var(--border-color)]">
        <div className="flex -mb-px">
          <button
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'status'
                ? 'border-[var(--highlight-color)] text-[var(--highlight-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
            }`}
            onClick={() => setActiveTab('status')}
          >
            Status Updates
          </button>
          <button
            className={`py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'maintenance'
                ? 'border-[var(--highlight-color)] text-[var(--highlight-color)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-color)]'
            }`}
            onClick={() => setActiveTab('maintenance')}
          >
            Maintenance Records
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'status' && (
          <>
            <PropStatusUpdate
              currentStatus={status}
              onStatusUpdate={onStatusUpdate}
              showManagerEmail={show?.stageManagerEmail}
              propsSupervisorEmail={show?.propsSupervisorEmail}
            />
            <StatusHistory history={statusHistory} />
          </>
        )}

        {activeTab === 'maintenance' && (
          <>
            <MaintenanceRecordForm onSubmit={onAddMaintenanceRecord} />
            <MaintenanceHistory records={maintenanceHistory} />
          </>
        )}
      </div>
    </div>
  );
} 