/**
 * Task Completion Service
 * 
 * Handles logging completed repair/maintenance tasks to prop maintenance history
 */

import type { FirebaseService } from './firebase/types';
import type { CardData } from '../../types/taskManager';

export interface TaskCompletionLogOptions {
  card: CardData;
  completedBy: string;
  firebaseService: FirebaseService;
}

export class TaskCompletionService {
  /**
   * Check if a task is a repair/maintenance task
   */
  static isRepairMaintenanceTask(card: CardData): boolean {
    // Check if task has repair/maintenance labels
    const labels = card.labels || [];
    const hasRepairLabel = labels.some(label => {
      // Handle both CardLabel objects and string labels (for backward compatibility)
      const labelName = typeof label === 'string' ? label : label.name || '';
      const lowerName = labelName.toLowerCase();
      return lowerName.includes('repair') || lowerName.includes('maintenance');
    });
    
    // Check if task title suggests repair/maintenance
    const title = (card.title || '').toLowerCase();
    const hasRepairTitle = title.includes('repair') || 
                          title.includes('maintenance') || 
                          title.includes('fix') ||
                          title.includes('replace');
    
    return hasRepairLabel || hasRepairTitle;
  }

  /**
   * Log completed repair/maintenance task to prop's maintenance history
   */
  static async logCompletedTaskToProp(options: TaskCompletionLogOptions): Promise<string | null> {
    const { card, completedBy, firebaseService } = options;
    
    // Only log if task is linked to a prop
    if (!card.propId) {
      return null;
    }

    // Only log repair/maintenance tasks
    if (!this.isRepairMaintenanceTask(card)) {
      return null;
    }

    try {
      // Determine maintenance type from task title/labels
      const title = (card.title || '').toLowerCase();
      // Extract label names (handle both CardLabel objects and string labels for backward compatibility)
      const labelNames = (card.labels || []).map(l => {
        return typeof l === 'string' ? l.toLowerCase() : (l.name || '').toLowerCase();
      });
      
      let type: 'repair' | 'maintenance' | 'modification' | 'inspection' = 'maintenance';
      if (title.includes('repair') || title.includes('fix') || labelNames.some(name => name.includes('repair'))) {
        type = 'repair';
      } else if (title.includes('modify') || title.includes('modification') || labelNames.some(name => name.includes('modification'))) {
        type = 'modification';
      } else if (title.includes('inspect') || labelNames.some(name => name.includes('inspection'))) {
        type = 'inspection';
      }

      // Extract description from task
      let description = card.description || card.title || 'Task completed';
      
      // Remove markdown prop links from description for cleaner log entry
      description = description.replace(/\[@([^\]]+)\]\(prop:[^)]*\)/g, '$1');
      
      // Build comprehensive description
      let fullDescription = description;
      if (card.title && card.title !== description) {
        fullDescription = `${card.title}\n\n${description}`;
      }

      // Get assigned users for performedBy
      // Use the first assigned user, or the person who completed it, or 'Unknown'
      const assignedTo = card.assignedTo || [];
      const performedBy = assignedTo.length > 0 ? assignedTo[0] : completedBy;

      // Create maintenance record
      const maintenanceRecord = {
        type,
        description: fullDescription,
        performedBy,
        createdBy: completedBy,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        notes: `Completed from task: ${card.title}`,
        // Task information
        relatedTaskId: card.id,
        taskTitle: card.title,
        taskDescription: card.description,
        taskAssignedTo: assignedTo,
        taskCompletedAt: new Date().toISOString(),
        taskCompletedBy: completedBy,
      };

      // Add to prop's maintenance history
      const recordDoc = await firebaseService.addDocument(
        `props/${card.propId}/maintenanceHistory`,
        maintenanceRecord
      );

      console.log(`Logged completed task ${card.id} to prop ${card.propId} maintenance history: ${recordDoc.id}`);
      
      return recordDoc.id;
    } catch (error) {
      console.warn('Failed to log completed task to prop maintenance history:', error);
      // Don't throw - task completion should still succeed even if logging fails
      return null;
    }
  }

  /**
   * Check if task completion should trigger maintenance history logging
   */
  static shouldLogTaskCompletion(card: CardData, newCompletedStatus: boolean, previousCompletedStatus: boolean): boolean {
    // Only log when task transitions from incomplete to complete
    if (!newCompletedStatus || previousCompletedStatus) {
      return false;
    }

    // Must be linked to a prop
    if (!card.propId) {
      return false;
    }

    // Must be a repair/maintenance task
    return this.isRepairMaintenanceTask(card);
  }
}

