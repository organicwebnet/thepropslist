/**
 * Archive data structure for consolidating show information
 * This allows for complete restoration of archived shows
 */
export interface ShowArchive {
  id: string; // Original show ID
  archivedAt: Date;
  archivedBy: string; // User ID who archived
  originalShow: {
    // Complete show data
    id: string;
    name: string;
    description: string;
    startDate: any;
    endDate: any;
    logoImage?: { id: string; url: string; caption?: string };
    productionCompany: string;
    stageManager: string;
    stageManagerEmail: string;
    propsSupervisor: string;
    propsSupervisorEmail: string;
    status: string;
    isTouringShow: boolean;
    venueIds?: string[];
    rehearsalAddressIds?: string[];
    storageAddressIds?: string[];
    acts?: any[];
    team?: any[];
    collaborators?: any[];
    createdAt: any;
    updatedAt: any;
    userId: string;
  };
  
  // Consolidated associated data
  associatedData: {
    // Props with full details
    props: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      status: string;
      condition: string;
      location: any;
      images: any[];
      maintenanceSchedule: any;
      metadata: any;
      // Include all prop fields
    }>;
    
    // Task boards and cards
    boards: Array<{
      id: string;
      name: string;
      description: string;
      lists: Array<{
        id: string;
        name: string;
        cards: any[];
      }>;
    }>;
    
    // Packing lists
    packingLists: Array<{
      id: string;
      name: string;
      description: string;
      boxes: any[];
      metadata: any;
    }>;
    
    // Collaborators and team members
    collaborators: any[];
    teamMembers: any[];
    
    // Shopping lists
    shoppingLists: any[];
    
    // Any other show-specific data
    otherData: any[];
  };
  
  // Archive metadata
  archiveMetadata: {
    totalProps: number;
    totalTasks: number;
    totalPackingBoxes: number;
    totalCollaborators: number;
    archiveSize: number; // Estimated size in bytes
    compressionRatio?: number; // If compression is applied
  };
  
  // Restoration info
  restorationInfo?: {
    canRestore: boolean;
    restorationNotes?: string;
    lastRestoredAt?: Date;
    restoredBy?: string;
  };
}

/**
 * Archive status for shows
 */
export type ShowArchiveStatus = 'active' | 'archived' | 'deleted';

/**
 * Archive operation types
 */
export type ArchiveOperation = 'archive' | 'restore' | 'delete' | 'permanent_delete';
