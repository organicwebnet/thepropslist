/**
 * Prop Lifecycle Management Types
 * 
 * This module contains all types and interfaces related to prop lifecycle management.
 * It's designed to be easily importable in both web and potential future mobile apps.
 */

/**
 * Represents the possible lifecycle statuses of a prop
 */
export type PropLifecycleStatus = 
  | 'confirmed'           // Confirmed to be in the show
  | 'cut'                 // Cut from the show
  | 'out_for_repair'      // Out for repairs
  | 'damaged_awaiting_repair' // Damaged, waiting for repair
  | 'damaged_awaiting_replacement' // Damaged, needs replacement
  | 'missing'             // Lost or misplaced
  | 'in_transit'          // Being moved between locations
  | 'under_maintenance'   // Routine maintenance
  | 'loaned_out'          // Borrowed by another production
  | 'on_hold'             // Set aside
  | 'under_review'        // Being assessed
  | 'being_modified'      // Being customized/modified
  | 'backup'              // Backup/alternate prop
  | 'temporarily_retired' // Stored for future use
  | 'ready_for_disposal'  // Ready for recycling/disposal
  | 'repaired_back_in_show' // Repaired and returned to the show
  // New statuses for check-in/out and active use
  | 'available_in_storage' // In its assigned box/location, ready for use
  | 'checked_out'          // Checked out to actor/scene, not in storage loc
  | 'in_use_on_set'        // Actively on set/stage
  | 'on_order'            // Newly added for props that are ordered but not yet received
  | 'to_buy'               // Needs to be purchased

/**
 * Status labels for UI display
 */
export const lifecycleStatusLabels: Record<PropLifecycleStatus, string> = {
  confirmed: 'Confirmed in Show',
  cut: 'Cut from Show',
  out_for_repair: 'Out for Repair',
  damaged_awaiting_repair: 'Damaged - Awaiting Repair',
  damaged_awaiting_replacement: 'Damaged - Awaiting Replacement',
  missing: 'Missing',
  in_transit: 'In Transit',
  under_maintenance: 'Under Maintenance',
  loaned_out: 'Loaned Out',
  on_hold: 'On Hold',
  under_review: 'Under Review',
  being_modified: 'Being Modified',
  backup: 'Backup/Alternate',
  temporarily_retired: 'Temporarily Retired',
  ready_for_disposal: 'Ready for Disposal',
  repaired_back_in_show: 'Repaired - Back in Show',
  // New labels
  available_in_storage: 'Available in Storage',
  checked_out: 'Checked Out',
  in_use_on_set: 'In Use on Set',
  on_order: 'On Order',
  to_buy: 'To Buy'
};

/**
 * The severity/priority of a status for UI display and filtering
 */
export type StatusPriority = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'active'; // Added 'active' for in_use type statuses

/**
 * Map lifecycle statuses to their severity for UI treatment
 */
export const lifecycleStatusPriority: Record<PropLifecycleStatus, StatusPriority> = {
  missing: 'critical',
  damaged_awaiting_replacement: 'high',
  damaged_awaiting_repair: 'high',
  out_for_repair: 'medium',
  under_maintenance: 'medium',
  in_transit: 'medium',
  loaned_out: 'medium',
  being_modified: 'medium',
  under_review: 'low',
  on_hold: 'low',
  backup: 'low',
  temporarily_retired: 'low',
  ready_for_disposal: 'low',
  confirmed: 'info',
  cut: 'info',
  repaired_back_in_show: 'info',
  // New priorities
  available_in_storage: 'info',
  checked_out: 'active',
  in_use_on_set: 'active',
  on_order: 'info',
  to_buy: 'info'
};

/**
 * Represents a maintenance or repair record for a prop
 */
export interface MaintenanceRecord {
  id: string;
  date: string;
  type: 'repair' | 'maintenance' | 'modification' | 'inspection';
  description: string;
  performedBy: string;
  cost?: number;
  notes?: string;
  createdAt: string;
  createdBy: string;
  estimatedReturnDate?: string; // When the prop is expected to be returned from repair
  repairDeadline?: string; // The deadline by which the prop must be fixed
  // Task information (when created from a completed task)
  relatedTaskId?: string; // ID of the task that was completed
  taskTitle?: string; // Title of the completed task
  taskDescription?: string; // Description from the completed task
  taskAssignedTo?: string[]; // Users who were assigned to the task
  taskCompletedAt?: string; // When the task was completed
  taskCompletedBy?: string; // User who completed the task
}

/**
 * Represents a status change record for a prop
 */
export interface PropStatusUpdate {
  id: string;
  date: string;
  previousStatus: PropLifecycleStatus;
  newStatus: PropLifecycleStatus;
  updatedBy: string;
  notes?: string;
  reason?: string; // Reason for the status change
  relatedTaskId?: string; // ID of related task (e.g., auto-created repair task)
  relatedIncidentId?: string; // ID of related incident
  notified?: string[]; // IDs or emails of notified team members
  createdAt: string;
  damageImageUrls?: string[]; // URLs of damage documentation images
}

/**
 * Represents the repair priority levels
 */
export type RepairPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Repair priority labels for UI display
 */
export const repairPriorityLabels: Record<RepairPriority, string> = {
  low: 'Low Priority',
  medium: 'Medium Priority',
  high: 'High Priority',
  urgent: 'Urgent'
}; 
