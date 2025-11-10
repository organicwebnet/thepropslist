/**
 * Archive Service for Mobile
 * Handles archiving and restoring shows
 */

import type { FirebaseService } from '../shared/services/firebase/types';
import type { Show } from '../shared/services/firebase/types';

export interface ShowArchive {
  id: string;
  archivedAt: Date;
  archivedBy: string;
  originalShow: Show;
  associatedData: {
    props: any[];
    boards: any[];
    packingLists: any[];
    collaborators: any[];
    teamMembers: any[];
    shoppingLists: any[];
    otherData: any[];
  };
  archiveMetadata: {
    totalProps: number;
    totalTasks: number;
    totalPackingBoxes: number;
    totalCollaborators: number;
    archiveSize: number;
  };
  restorationInfo: {
    canRestore: boolean;
    lastRestoredAt?: Date;
    restoredBy?: string;
  };
}

export class ArchiveService {
  constructor(private firebaseService: FirebaseService) {}

  /**
   * Archive a show and all its associated data
   */
  async archiveShow(showId: string, userId: string, archivedShowsLimit: number): Promise<string> {
    try {
      // 1. Check archived shows limit
      const currentArchives = await this.getUserArchivedShowsCount(userId);
      if (currentArchives >= archivedShowsLimit) {
        throw new Error(`You have reached your plan's archived shows limit of ${archivedShowsLimit}. Please upgrade your plan to archive more shows.`);
      }

      // 2. Get the show data
      const showDoc = await this.firebaseService.getDocument('shows', showId);
      if (!showDoc) {
        throw new Error('Show not found');
      }

      const show = showDoc.data as Show;

      // 3. Collect all associated data
      const associatedData = await this.collectAssociatedData(showId);

      // 4. Create archive object
      const archive: ShowArchive = {
        id: showId,
        archivedAt: new Date(),
        archivedBy: userId,
        originalShow: {
          ...show,
          id: showId,
        } as Show,
        associatedData: associatedData as any,
        archiveMetadata: {
          totalProps: associatedData.props.length,
          totalTasks: associatedData.boards.reduce((total, board) => 
            total + board.lists.reduce((listTotal, list) => listTotal + list.cards.length, 0), 0),
          totalPackingBoxes: associatedData.packingLists.reduce((total, list) => 
            total + list.boxes.length, 0),
          totalCollaborators: associatedData.collaborators.length + associatedData.teamMembers.length,
          archiveSize: this.estimateArchiveSize(show, associatedData),
        },
        restorationInfo: {
          canRestore: true,
        },
      };

      // 5. Save archive
      const archiveDoc = await this.firebaseService.addDocument('show_archives', archive);
      const archiveId = archiveDoc.id;

      // 6. Update show status to archived
      await this.firebaseService.updateDocument('shows', showId, {
        status: 'archived',
        archivedAt: new Date(),
        archivedBy: userId,
        archiveId,
      } as any);

      // 7. Soft delete associated data (mark as archived)
      await this.markAssociatedDataAsArchived(showId, archiveId);

      return archiveId;
    } catch (error) {
      console.error('Error archiving show:', error);
      throw error;
    }
  }

  /**
   * Restore an archived show
   */
  async restoreShow(archiveId: string, userId: string): Promise<string> {
    try {
      // 1. Get archive data
      const archiveDoc = await this.firebaseService.getDocument('show_archives', archiveId);
      if (!archiveDoc) {
        throw new Error('Archive not found');
      }

      const archive = archiveDoc.data as ShowArchive;

      // 2. Restore the show
      const restoredShowData = {
        ...archive.originalShow,
        status: 'completed',
        restoredAt: new Date(),
        restoredBy: userId,
        archiveId: null,
      };

      const showDoc = await this.firebaseService.addDocument('shows', restoredShowData);
      const showId = showDoc.id;

      // 3. Restore associated data
      await this.restoreAssociatedData(archive.associatedData, showId);

      // 4. Update archive with restoration info
      await this.firebaseService.updateDocument('show_archives', archiveId, {
        restorationInfo: {
          ...archive.restorationInfo,
          canRestore: false,
          lastRestoredAt: new Date(),
          restoredBy: userId,
        },
      } as any);

      return showId;
    } catch (error) {
      console.error('Error restoring show:', error);
      throw error;
    }
  }

  /**
   * Get count of archived shows for a user
   */
  async getUserArchivedShowsCount(userId: string): Promise<number> {
    try {
      const archives = await this.firebaseService.getCollection('show_archives', {
        where: [['archivedBy', '==', userId]],
      });
      return archives.length;
    } catch (error) {
      console.error('Error getting archived shows count:', error);
      return 0;
    }
  }

  /**
   * Get all archived shows for a user
   */
  async getUserArchivedShows(userId: string): Promise<ShowArchive[]> {
    try {
      const archives = await this.firebaseService.getCollection('show_archives', {
        where: [['archivedBy', '==', userId]],
        orderBy: [['archivedAt', 'desc']],
      });
      return archives.map(doc => ({ ...doc.data, id: doc.id } as ShowArchive));
    } catch (error) {
      console.error('Error getting archived shows:', error);
      return [];
    }
  }

  /**
   * Collect all associated data for a show
   */
  private async collectAssociatedData(showId: string): Promise<any> {
    const [props, boards, packingLists, shoppingLists] = await Promise.all([
      this.firebaseService.getCollection('props', { where: [['showId', '==', showId]] }),
      this.firebaseService.getCollection('boards', { where: [['showId', '==', showId]] }),
      this.firebaseService.getCollection('packingLists', { where: [['showId', '==', showId]] }),
      this.firebaseService.getCollection('shoppingLists', { where: [['showId', '==', showId]] }),
    ]);

    // Get show to extract collaborators and team
    const showDoc = await this.firebaseService.getDocument('shows', showId);
    const show = showDoc?.data as Show;

    return {
      props: props.map(doc => ({ ...doc.data, id: doc.id })),
      boards: boards.map(doc => ({ ...doc.data, id: doc.id })),
      packingLists: packingLists.map(doc => ({ ...doc.data, id: doc.id })),
      shoppingLists: shoppingLists.map(doc => ({ ...doc.data, id: doc.id })),
      collaborators: Array.isArray(show?.collaborators) ? show.collaborators : [],
      teamMembers: show?.team ? Object.keys(show.team).map(uid => ({ uid, role: show.team[uid] })) : [],
      otherData: [],
    };
  }

  /**
   * Mark associated data as archived
   */
  private async markAssociatedDataAsArchived(showId: string, archiveId: string): Promise<void> {
    const collections = ['props', 'boards', 'packingLists', 'shoppingLists'];
    
    for (const collection of collections) {
      try {
        const docs = await this.firebaseService.getCollection(collection, {
          where: [['showId', '==', showId]],
        });
        
        for (const doc of docs) {
          await this.firebaseService.updateDocument(collection, doc.id, {
            archived: true,
            archiveId,
            archivedAt: new Date(),
          } as any);
        }
      } catch (error) {
        console.error(`Error archiving ${collection}:`, error);
      }
    }
  }

  /**
   * Restore associated data
   */
  private async restoreAssociatedData(associatedData: any, showId: string): Promise<void> {
    // Restore props
    for (const prop of associatedData.props || []) {
      try {
        await this.firebaseService.addDocument('props', {
          ...prop,
          showId,
          archived: false,
          archiveId: null,
        });
      } catch (error) {
        console.error('Error restoring prop:', error);
      }
    }

    // Restore boards
    for (const board of associatedData.boards || []) {
      try {
        await this.firebaseService.addDocument('boards', {
          ...board,
          showId,
          archived: false,
          archiveId: null,
        });
      } catch (error) {
        console.error('Error restoring board:', error);
      }
    }

    // Restore packing lists
    for (const list of associatedData.packingLists || []) {
      try {
        await this.firebaseService.addDocument('packingLists', {
          ...list,
          showId,
          archived: false,
          archiveId: null,
        });
      } catch (error) {
        console.error('Error restoring packing list:', error);
      }
    }

    // Restore shopping lists
    for (const list of associatedData.shoppingLists || []) {
      try {
        await this.firebaseService.addDocument('shoppingLists', {
          ...list,
          showId,
          archived: false,
          archiveId: null,
        });
      } catch (error) {
        console.error('Error restoring shopping list:', error);
      }
    }
  }

  /**
   * Estimate archive size (in bytes)
   */
  private estimateArchiveSize(show: Show, associatedData: any): number {
    const showSize = JSON.stringify(show).length;
    const dataSize = JSON.stringify(associatedData).length;
    return showSize + dataSize;
  }
}





