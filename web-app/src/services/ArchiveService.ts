import { FirebaseService } from '../types/firebase';
import type { ShowArchive, ArchiveOperation } from '../types/Archive';
import type { Show } from '../types/Show';

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

      // 2. Collect all associated data
      const associatedData = await this.collectAssociatedData(showId);

      // 3. Create archive object
      const archive: ShowArchive = {
        id: showId,
        archivedAt: new Date(),
        archivedBy: userId,
        originalShow: {
          ...show,
          id: showId,
        },
        associatedData,
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

      // 4. Save archive
      const archiveId = await this.firebaseService.addDocument('show_archives', archive);

      // 5. Update show status to archived
      await this.firebaseService.updateDocument('shows', showId, {
        status: 'archived',
        archivedAt: new Date(),
        archivedBy: userId,
        archiveId,
      });

      // 6. Soft delete associated data (mark as archived)
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
        status: 'completed', // Restore as completed, not active
        restoredAt: new Date(),
        restoredBy: userId,
        archiveId: null, // Clear archive reference
      };

      const showId = await this.firebaseService.addDocument('shows', restoredShowData);

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
      });

      return showId;
    } catch (error) {
      console.error('Error restoring show:', error);
      throw error;
    }
  }

  /**
   * Permanently delete a show and all its data
   */
  async permanentlyDeleteShow(showId: string, userId: string): Promise<void> {
    try {
      // 1. Get all associated data IDs
      const associatedDataIds = await this.getAssociatedDataIds(showId);

      // 2. Delete all associated data
      await this.deleteAssociatedData(associatedDataIds);

      // 3. Delete the show
      await this.firebaseService.deleteDocument('shows', showId);

      // 4. Log the deletion
      await this.firebaseService.addDocument('deletion_logs', {
        showId,
        deletedBy: userId,
        deletedAt: new Date(),
        associatedDataCount: associatedDataIds.length,
      });
    } catch (error) {
      console.error('Error permanently deleting show:', error);
      throw error;
    }
  }

  /**
   * Collect all data associated with a show
   */
  private async collectAssociatedData(showId: string) {
    const [props, boards, packingLists, collaborators, shoppingLists] = await Promise.all([
      this.getShowProps(showId),
      this.getShowBoards(showId),
      this.getShowPackingLists(showId),
      this.getShowCollaborators(showId),
      this.getShowShoppingLists(showId),
    ]);

    return {
      props,
      boards,
      packingLists,
      collaborators,
      teamMembers: [], // Will be populated from show data
      shoppingLists,
      otherData: [],
    };
  }

  /**
   * Get all props for a show
   */
  private async getShowProps(showId: string) {
    const propsDocs = await this.firebaseService.getDocuments('props', {
      where: [['showId', '==', showId]],
    });
    return propsDocs.map(doc => ({ ...doc.data, id: doc.id }));
  }

  /**
   * Get all boards for a show
   */
  private async getShowBoards(showId: string) {
    const boardsDocs = await this.firebaseService.getDocuments('todo_boards', {
      where: [['showId', '==', showId]],
    });

    const boards = [];
    for (const boardDoc of boardsDocs) {
      const lists = await this.firebaseService.getDocuments(`todo_boards/${boardDoc.id}/lists`);
      const boardWithLists = {
        ...boardDoc.data,
        id: boardDoc.id,
        lists: await Promise.all(lists.map(async (listDoc) => {
          const cards = await this.firebaseService.getDocuments(`todo_boards/${boardDoc.id}/lists/${listDoc.id}/cards`);
          return {
            ...listDoc.data,
            id: listDoc.id,
            cards: cards.map(cardDoc => ({ ...cardDoc.data, id: cardDoc.id })),
          };
        })),
      };
      boards.push(boardWithLists);
    }

    return boards;
  }

  /**
   * Get all packing lists for a show
   */
  private async getShowPackingLists(showId: string) {
    const packingListsDocs = await this.firebaseService.getDocuments('packing_lists', {
      where: [['showId', '==', showId]],
    });

    const packingLists = [];
    for (const listDoc of packingListsDocs) {
      const boxes = await this.firebaseService.getDocuments(`packing_lists/${listDoc.id}/boxes`);
      packingLists.push({
        ...listDoc.data,
        id: listDoc.id,
        boxes: boxes.map(boxDoc => ({ ...boxDoc.data, id: boxDoc.id })),
      });
    }

    return packingLists;
  }

  /**
   * Get all collaborators for a show
   */
  private async getShowCollaborators(showId: string) {
    const collaboratorsDocs = await this.firebaseService.getDocuments('collaborators', {
      where: [['showId', '==', showId]],
    });
    return collaboratorsDocs.map(doc => ({ ...doc.data, id: doc.id }));
  }

  /**
   * Get all shopping lists for a show
   */
  private async getShowShoppingLists(showId: string) {
    const shoppingListsDocs = await this.firebaseService.getDocuments('shopping_lists', {
      where: [['showId', '==', showId]],
    });
    return shoppingListsDocs.map(doc => ({ ...doc.data, id: doc.id }));
  }

  /**
   * Mark associated data as archived
   */
  private async markAssociatedDataAsArchived(showId: string, archiveId: string) {
    const batch = [
      { collection: 'props', field: 'showId' },
      { collection: 'todo_boards', field: 'showId' },
      { collection: 'packing_lists', field: 'showId' },
      { collection: 'collaborators', field: 'showId' },
      { collection: 'shopping_lists', field: 'showId' },
    ];

    for (const { collection, field } of batch) {
      const docs = await this.firebaseService.getDocuments(collection, {
        where: [[field, '==', showId]],
      });

      for (const doc of docs) {
        await this.firebaseService.updateDocument(collection, doc.id, {
          archived: true,
          archiveId,
          archivedAt: new Date(),
        });
      }
    }
  }

  /**
   * Restore associated data
   */
  private async restoreAssociatedData(associatedData: any, newShowId: string) {
    // Restore props
    for (const prop of associatedData.props) {
      const { id, ...propData } = prop;
      await this.firebaseService.addDocument('props', {
        ...propData,
        showId: newShowId,
        restored: true,
        restoredAt: new Date(),
      });
    }

    // Restore boards and cards
    for (const board of associatedData.boards) {
      const { id, lists, ...boardData } = board;
      const newBoardId = await this.firebaseService.addDocument('todo_boards', {
        ...boardData,
        showId: newShowId,
        restored: true,
        restoredAt: new Date(),
      });

      for (const list of lists) {
        const { id: listId, cards, ...listData } = list;
        const newListId = await this.firebaseService.addDocument(`todo_boards/${newBoardId}/lists`, {
          ...listData,
          restored: true,
          restoredAt: new Date(),
        });

        for (const card of cards) {
          const { id: cardId, ...cardData } = card;
          await this.firebaseService.addDocument(`todo_boards/${newBoardId}/lists/${newListId}/cards`, {
            ...cardData,
            restored: true,
            restoredAt: new Date(),
          });
        }
      }
    }

    // Restore packing lists
    for (const packingList of associatedData.packingLists) {
      const { id, boxes, ...listData } = packingList;
      const newListId = await this.firebaseService.addDocument('packing_lists', {
        ...listData,
        showId: newShowId,
        restored: true,
        restoredAt: new Date(),
      });

      for (const box of boxes) {
        const { id: boxId, ...boxData } = box;
        await this.firebaseService.addDocument(`packing_lists/${newListId}/boxes`, {
          ...boxData,
          restored: true,
          restoredAt: new Date(),
        });
      }
    }

    // Restore collaborators
    for (const collaborator of associatedData.collaborators) {
      const { id, ...collaboratorData } = collaborator;
      await this.firebaseService.addDocument('collaborators', {
        ...collaboratorData,
        showId: newShowId,
        restored: true,
        restoredAt: new Date(),
      });
    }

    // Restore shopping lists
    for (const shoppingList of associatedData.shoppingLists) {
      const { id, ...listData } = shoppingList;
      await this.firebaseService.addDocument('shopping_lists', {
        ...listData,
        showId: newShowId,
        restored: true,
        restoredAt: new Date(),
      });
    }
  }

  /**
   * Get IDs of all associated data for deletion
   */
  private async getAssociatedDataIds(showId: string) {
    const [props, boards, packingLists, collaborators, shoppingLists] = await Promise.all([
      this.firebaseService.getDocuments('props', { where: [['showId', '==', showId]] }),
      this.firebaseService.getDocuments('todo_boards', { where: [['showId', '==', showId]] }),
      this.firebaseService.getDocuments('packing_lists', { where: [['showId', '==', showId]] }),
      this.firebaseService.getDocuments('collaborators', { where: [['showId', '==', showId]] }),
      this.firebaseService.getDocuments('shopping_lists', { where: [['showId', '==', showId]] }),
    ]);

    return {
      props: props.map(doc => ({ collection: 'props', id: doc.id })),
      boards: boards.map(doc => ({ collection: 'todo_boards', id: doc.id })),
      packingLists: packingLists.map(doc => ({ collection: 'packing_lists', id: doc.id })),
      collaborators: collaborators.map(doc => ({ collection: 'collaborators', id: doc.id })),
      shoppingLists: shoppingLists.map(doc => ({ collection: 'shopping_lists', id: doc.id })),
    };
  }

  /**
   * Delete all associated data
   */
  private async deleteAssociatedData(dataIds: any) {
    const allIds = [
      ...dataIds.props,
      ...dataIds.boards,
      ...dataIds.packingLists,
      ...dataIds.collaborators,
      ...dataIds.shoppingLists,
    ];

    for (const { collection, id } of allIds) {
      await this.firebaseService.deleteDocument(collection, id);
    }
  }

  /**
   * Get count of archived shows for a user
   */
  private async getUserArchivedShowsCount(userId: string): Promise<number> {
    const archivesDocs = await this.firebaseService.getDocuments('show_archives', {
      where: [['archivedBy', '==', userId]],
    });
    return archivesDocs.length;
  }

  /**
   * Estimate archive size
   */
  private estimateArchiveSize(show: Show, associatedData: any): number {
    // Rough estimation - in a real implementation, you'd serialize and measure
    const showSize = JSON.stringify(show).length;
    const dataSize = JSON.stringify(associatedData).length;
    return showSize + dataSize;
  }
}
