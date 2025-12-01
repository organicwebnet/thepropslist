/**
 * Prop Status Service
 * 
 * Handles prop status updates with validation, notifications, and automated workflows
 */

import type { PropLifecycleStatus } from '../../types/lifecycle';
import type { Prop } from '../types/props';
import { NotificationHelper } from '../../services/notificationHelper';
import type { FirebaseService } from '../services/firebase/types';

/**
 * Valid status transitions from QuickActionsService
 */
const STATUS_TRANSITIONS: Record<PropLifecycleStatus, PropLifecycleStatus[]> = {
  'on_order': ['to_buy', 'confirmed'],
  'to_buy': ['on_order', 'confirmed'],
  'confirmed': ['available_in_storage', 'in_use_on_set', 'under_review'],
  'available_in_storage': ['checked_out', 'in_use_on_set', 'under_maintenance'],
  'checked_out': ['in_use_on_set', 'available_in_storage'],
  'in_use_on_set': ['available_in_storage', 'checked_out', 'under_maintenance'],
  'under_maintenance': ['available_in_storage', 'out_for_repair'],
  'out_for_repair': ['repaired_back_in_show', 'damaged_awaiting_repair'],
  'damaged_awaiting_repair': ['repaired_back_in_show', 'damaged_awaiting_replacement'],
  'damaged_awaiting_replacement': ['on_order', 'to_buy'],
  'repaired_back_in_show': ['available_in_storage', 'in_use_on_set'],
  'missing': ['available_in_storage', 'under_review'],
  'in_transit': ['available_in_storage', 'checked_out'],
  'loaned_out': ['available_in_storage'],
  'on_hold': ['available_in_storage', 'under_review'],
  'under_review': ['available_in_storage', 'confirmed', 'cut'],
  'being_modified': ['available_in_storage', 'under_maintenance'],
  'backup': ['available_in_storage', 'confirmed'],
  'temporarily_retired': ['available_in_storage', 'ready_for_disposal'],
  'ready_for_disposal': ['cut'],
  'cut': ['confirmed', 'temporarily_retired'],
};

export interface StatusUpdateOptions {
  prop: Prop;
  previousStatus: PropLifecycleStatus;
  newStatus: PropLifecycleStatus;
  updatedBy: string;
  notes?: string;
  reason?: string;
  relatedTaskId?: string;
  relatedIncidentId?: string;
  notifyTeam?: boolean;
  firebaseService: FirebaseService;
}

export interface StatusValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

export class PropStatusService {
  /**
   * Validate if a status transition is allowed
   */
  static validateStatusTransition(
    previousStatus: PropLifecycleStatus,
    newStatus: PropLifecycleStatus,
    allowAnyTransition: boolean = false
  ): StatusValidationResult {
    // Same status is always valid (no change)
    if (previousStatus === newStatus) {
      return { valid: true };
    }

    // If allowing any transition, skip validation
    if (allowAnyTransition) {
      return { valid: true };
    }

    // Check if transition is in the allowed list
    const allowedTransitions = STATUS_TRANSITIONS[previousStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      return {
        valid: false,
        error: `Invalid status transition: Cannot change from "${previousStatus}" to "${newStatus}". Allowed transitions: ${allowedTransitions.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Get data cleanup updates based on new status
   */
  static getDataCleanupUpdates(newStatus: PropLifecycleStatus): Partial<Prop> {
    const updates: Partial<Prop> = {};

    // Statuses that should clear checkout details
    if (newStatus === 'available_in_storage') {
      updates.checkedOutDetails = undefined;
    }

    // Statuses that should clear assignment
    if (newStatus === 'checked_out') {
      updates.assignment = undefined;
    }

    // Statuses that should clear both assignment and checkout details
    if (['missing', 'cut', 'ready_for_disposal'].includes(newStatus)) {
      updates.assignment = undefined;
      updates.checkedOutDetails = undefined;
    }

    return updates;
  }

  /**
   * Send notifications to relevant team members
   * Enhanced to notify props supervisor for maintenance/repair statuses
   */
  static async sendStatusChangeNotifications(
    options: StatusUpdateOptions
  ): Promise<void> {
    const { prop, newStatus, updatedBy, notifyTeam, notes, firebaseService } = options;

    // Always notify props supervisor for repair/maintenance statuses, even if notifyTeam is false
    const repairMaintenanceStatuses = [
      'damaged_awaiting_repair',
      'damaged_awaiting_replacement',
      'out_for_repair',
      'under_maintenance'
    ];
    
    const isRepairMaintenanceStatus = repairMaintenanceStatuses.includes(newStatus);

    // Don't send general team notification if user disabled it (unless it's repair/maintenance)
    if (notifyTeam === false && !isRepairMaintenanceStatus) {
      return;
    }

    try {
      // Get show team members if prop has showId
      let teamMemberIds: string[] = [];
      let propsSupervisorIds: string[] = [];
      
      if (prop.showId) {
        try {
          const showDoc = await firebaseService.getDocument('shows', prop.showId);
          if (showDoc?.data?.team) {
            // Extract team member IDs from team object
            teamMemberIds = Object.keys(showDoc.data.team);
            
            // Find props supervisors in the team
            const team = showDoc.data.team;
            propsSupervisorIds = Object.keys(team).filter(uid => {
              const role = team[uid];
              return role === 'props_supervisor' || role === 'god';
            });
          }
        } catch (error) {
          console.warn('Failed to load show team for notifications:', error);
        }
      }

      // Add assigned users if prop has assignment
      if (prop.assignedTo && Array.isArray(prop.assignedTo)) {
        teamMemberIds.push(...prop.assignedTo);
      } else if (prop.assignedTo && typeof prop.assignedTo === 'string') {
        teamMemberIds.push(prop.assignedTo);
      }

      // For repair/maintenance statuses, always notify props supervisor
      if (isRepairMaintenanceStatus && propsSupervisorIds.length > 0) {
        const notificationType = newStatus === 'under_maintenance' 
          ? 'prop_needs_maintenance' 
          : 'prop_needs_repair';
        
        const notificationPromises = propsSupervisorIds
          .filter(id => id !== updatedBy) // Don't notify the person who made the change
          .map(supervisorId => {
            const title = newStatus === 'under_maintenance'
              ? 'Prop Needs Maintenance'
              : 'Prop Needs Repair';
            
            const message = `Prop "${prop.name || 'Unnamed Prop'}" has been marked as ${newStatus}. ${notes ? `Details: ${notes.substring(0, 100)}${notes.length > 100 ? '...' : ''}` : 'Action required.'}`;
            
            return firebaseService.addDocument('notifications', {
              userId: supervisorId,
              type: notificationType,
              title,
              message,
              showId: prop.showId,
              propId: prop.id,
              createdAt: new Date().toISOString(),
              read: false,
              metadata: {
                propName: prop.name,
                status: newStatus,
                notes: notes || '',
                updatedBy
              }
            }).catch(error => {
              console.warn(`Failed to send notification to props supervisor ${supervisorId}:`, error);
              return null;
            });
          });

        await Promise.all(notificationPromises);
      }

      // Send general team notifications if notifyTeam is true
      if (notifyTeam !== false) {
        // Remove duplicates and the user who made the change
        const uniqueTeamMemberIds = [...new Set(teamMemberIds)].filter(
          id => id !== updatedBy && !propsSupervisorIds.includes(id) // Avoid duplicate notifications
        );

        // Send notifications to each team member
        const notificationPromises = uniqueTeamMemberIds.map(userId =>
          NotificationHelper.sendPropStatusNotification(
            userId,
            prop.name || 'Unnamed Prop',
            newStatus,
            firebaseService
          ).catch(error => {
            // Log but don't fail the status update if notification fails
            console.warn(`Failed to send notification to user ${userId}:`, error);
            return null;
          })
        );

        await Promise.all(notificationPromises);
      }
    } catch (error) {
      // Log but don't fail the status update if notification fails
      console.warn('Error sending status change notifications:', error);
    }
  }

  /**
   * Create automated workflows based on status change
   * Enhanced to create detailed tasks for repair/maintenance with better descriptions
   */
  static async handleAutomatedWorkflows(
    options: StatusUpdateOptions
  ): Promise<{ taskCreated?: string }> {
    const { prop, newStatus, updatedBy, notes, firebaseService } = options;
    const result: { taskCreated?: string } = {};

    try {
      // Auto-create task for damaged props and maintenance
      const repairMaintenanceStatuses = [
        'damaged_awaiting_repair',
        'damaged_awaiting_replacement',
        'out_for_repair',
        'under_maintenance'
      ];

      if (repairMaintenanceStatuses.includes(newStatus)) {
        // Check if a task already exists for this prop on the task board
        if (prop.showId) {
          try {
            // First find the task board for this show
            const boards = await firebaseService.getCollection('todo_boards', {
              where: [['showId', '==', prop.showId]]
            });
            
            let existingTasks: any[] = [];
            if (boards.length > 0) {
              const boardId = boards[0].id;
              // Check all lists for existing cards linked to this prop
              const lists = await firebaseService.getCollection(`todo_boards/${boardId}/lists`);
              
              for (const list of lists) {
                const cards = await firebaseService.getCollection(
                  `todo_boards/${boardId}/lists/${list.id}/cards`,
                  {
                    where: [
                      ['propId', '==', prop.id],
                      ['completed', '!=', true]
                    ]
                  }
                );
                existingTasks.push(...cards);
              }
            }

            // Only create task if none exists
            if (existingTasks.length === 0) {
              // Find the task board for this show
              let boardId: string | null = null;
              let listId: string | null = null;
              
              try {
                const boards = await firebaseService.getCollection('todo_boards', {
                  where: [['showId', '==', prop.showId]]
                });
                
                if (boards.length > 0) {
                  boardId = boards[0].id;
                  // Find the appropriate list (prefer "To Do" or "Repair" list, otherwise first list)
                  const lists = await firebaseService.getCollection(`todo_boards/${boardId}/lists`);
                  const repairList = lists.find((l: any) => 
                    (l.data?.name || l.data?.title || '').toLowerCase().includes('repair')
                  );
                  const todoList = lists.find((l: any) => 
                    (l.data?.name || l.data?.title || '').toLowerCase().includes('to do')
                  );
                  listId = repairList?.id || todoList?.id || lists[0]?.id || null;
                }
              } catch (error) {
                console.warn('Failed to find task board for show:', error);
              }

              // Only create task card if we have a board and list
              if (boardId && listId) {
                let taskTitle: string;
                let taskDescription: string;
                let priority: 'low' | 'medium' | 'high' | 'urgent';

                switch (newStatus) {
                  case 'damaged_awaiting_replacement':
                    taskTitle = `Replace damaged prop: ${prop.name}`;
                    taskDescription = `Prop "${prop.name}" has been marked as damaged and needs replacement.\n\n`;
                    priority = 'high';
                    break;
                  case 'damaged_awaiting_repair':
                    taskTitle = `Repair damaged prop: ${prop.name}`;
                    taskDescription = `Prop "${prop.name}" has been marked as damaged and needs repair.\n\n`;
                    priority = 'high';
                    break;
                  case 'out_for_repair':
                    taskTitle = `Track repair: ${prop.name}`;
                    taskDescription = `Prop "${prop.name}" is out for external repair. Track progress and return.\n\n`;
                    priority = 'medium';
                    break;
                  case 'under_maintenance':
                    taskTitle = `Maintenance required: ${prop.name}`;
                    taskDescription = `Prop "${prop.name}" requires maintenance.\n\n`;
                    priority = 'medium';
                    break;
                  default:
                    taskTitle = `Action required: ${prop.name}`;
                    taskDescription = `Prop "${prop.name}" has been marked as ${newStatus}.\n\n`;
                    priority = 'medium';
                }

                // Add detailed information to task description with prop link
                taskDescription += `**Prop Details:**\n`;
                taskDescription += `- Name: ${prop.name || 'Unnamed'}\n`;
                if (prop.category) taskDescription += `- Category: ${prop.category}\n`;
                if (prop.location) taskDescription += `- Location: ${prop.location}\n`;
                if (notes) {
                  taskDescription += `\n**Issue Description:**\n${notes}\n`;
                }
                taskDescription += `\n**Next Steps:**\n`;
                taskDescription += `1. Review the prop and assess what needs to be fixed\n`;
                taskDescription += `2. Assign this task to a maker to action the repair/maintenance\n`;
                taskDescription += `3. Update task status as work progresses\n`;
                taskDescription += `4. Update prop status when repair/maintenance is complete\n\n`;
                // Add prop link using markdown mention format
                taskDescription += `Linked: [@${prop.name || 'Prop'}](prop:${prop.id})`;

                // Get props supervisor to assign task to (if available)
                let assignedTo: string[] = [];
                try {
                  const showDoc = await firebaseService.getDocument('shows', prop.showId);
                  if (showDoc?.data?.team) {
                    const team = showDoc.data.team;
                    // Find props supervisor IDs
                    const supervisorIds = Object.keys(team).filter(uid => {
                      const role = team[uid];
                      return role === 'props_supervisor' || role === 'god';
                    });
                    // Assign to first supervisor found (they can reassign to maker)
                    if (supervisorIds.length > 0) {
                      assignedTo = [supervisorIds[0]];
                    }
                  }
                } catch (error) {
                  console.warn('Failed to get props supervisor for task assignment:', error);
                }

                // Create task card on the task board
                const cardData = {
                  title: taskTitle,
                  description: taskDescription,
                  propId: prop.id, // Link to prop using propId (not relatedPropId)
                  assignedTo,
                  completed: false,
                  order: 0,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  labels: ['repair', 'maintenance', 'prop'],
                  // Store priority and status in metadata
                  priority,
                  status: 'not_started',
                };

                const cardDoc = await firebaseService.addDocument(
                  `todo_boards/${boardId}/lists/${listId}/cards`,
                  cardData
                );
                result.taskCreated = cardDoc.id;

                // Notify assigned supervisor about the new task
                if (assignedTo.length > 0) {
                  try {
                    await firebaseService.addDocument('notifications', {
                      userId: assignedTo[0],
                      type: 'task_assigned',
                      title: 'New Repair/Maintenance Task',
                      message: `A new task has been created for ${prop.name}. Please review and assign to a maker.`,
                      showId: prop.showId,
                      taskId: cardDoc.id,
                      propId: prop.id,
                      boardId,
                      createdAt: new Date().toISOString(),
                      read: false,
                    });
                  } catch (error) {
                    console.warn('Failed to send task assignment notification:', error);
                  }
                }

                console.log(`Auto-created task card for ${newStatus} prop: ${cardDoc.id} on board ${boardId}`);
              } else {
                console.warn(`Could not create task card: No task board found for show ${prop.showId}`);
              }
            }
          } catch (error) {
            console.warn(`Failed to create automated task for ${newStatus} prop:`, error);
          }
        }
      }

      // Auto-create task for missing props
      if (newStatus === 'missing') {
        if (prop.showId) {
          try {
            const existingTasks = await firebaseService.getCollection('tasks', {
              where: [
                ['showId', '==', prop.showId],
                ['relatedPropId', '==', prop.id],
                ['status', '!=', 'completed'],
                ['title', '==', `Locate missing prop: ${prop.name}`]
              ]
            });

            if (existingTasks.length === 0) {
              const taskData = {
                title: `Locate missing prop: ${prop.name}`,
                description: `Prop "${prop.name}" has been marked as missing. Please locate and update status.${notes ? `\n\nNotes: ${notes}` : ''}`,
                showId: prop.showId,
                relatedPropId: prop.id,
                status: 'todo',
                priority: 'high',
                createdBy: updatedBy,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              const taskDoc = await firebaseService.addDocument('tasks', taskData);
              result.taskCreated = taskDoc.id;

              console.log(`Auto-created task for missing prop: ${taskDoc.id}`);
            }
          } catch (error) {
            console.warn('Failed to create automated task for missing prop:', error);
          }
        }
      }
    } catch (error) {
      console.warn('Error in automated workflows:', error);
    }

    return result;
  }

  /**
   * Create enhanced status history entry with additional context
   */
  static createStatusHistoryEntry(
    options: StatusUpdateOptions
  ): {
    previousStatus: PropLifecycleStatus;
    newStatus: PropLifecycleStatus;
    updatedBy: string;
    date: string;
    createdAt: string;
    notes?: string;
    reason?: string;
    relatedTaskId?: string;
    relatedIncidentId?: string;
  } {
    const {
      previousStatus,
      newStatus,
      updatedBy,
      notes,
      reason,
      relatedTaskId,
      relatedIncidentId
    } = options;

    return {
      previousStatus,
      newStatus,
      updatedBy,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...(notes && { notes }),
      ...(reason && { reason }),
      ...(relatedTaskId && { relatedTaskId }),
      ...(relatedIncidentId && { relatedIncidentId }),
    };
  }
}

