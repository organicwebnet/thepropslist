import { useSubscription } from './useSubscription';
import { useFirebase } from '../contexts/FirebaseContext';
import { useState, useEffect } from 'react';

export interface LimitCheckResult {
  withinLimit: boolean;
  currentCount: number;
  limit: number;
  isPerShow: boolean;
  message?: string;
}

/**
 * Hook for checking various subscription limits
 * Supports both per-plan and per-show limits
 */
export function useLimitChecker() {
  const { limits, perShowLimits } = useSubscription();
  const { service: firebaseService } = useFirebase();

  /**
   * Check if user can create more shows
   */
  const checkShowLimit = async (userId: string): Promise<LimitCheckResult> => {
    try {
      const shows = await firebaseService.getDocuments('shows', {
        where: [['userId', '==', userId]]
      });
      
      const currentCount = shows.length;
      const limit = limits.shows;
      
      return {
        withinLimit: currentCount < limit,
        currentCount,
        limit,
        isPerShow: false,
        message: currentCount >= limit 
          ? `You have reached your plan's show limit of ${limit}. Upgrade to create more shows.`
          : undefined
      };
    } catch (error) {
      console.error('Error checking show limit:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: limits.shows,
        isPerShow: false,
        message: 'Error checking show limit'
      };
    }
  };

  /**
   * Check if user can create more boards (per-plan limit)
   */
  const checkBoardLimit = async (userId: string): Promise<LimitCheckResult> => {
    try {
      const boards = await firebaseService.getDocuments('todo_boards', {
        where: [['userId', '==', userId]]
      });
      
      const currentCount = boards.length;
      const limit = limits.boards;
      
      return {
        withinLimit: currentCount < limit,
        currentCount,
        limit,
        isPerShow: false,
        message: currentCount >= limit 
          ? `You have reached your plan's board limit of ${limit}. Upgrade to create more boards.`
          : undefined
      };
    } catch (error) {
      console.error('Error checking board limit:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: limits.boards,
        isPerShow: false,
        message: 'Error checking board limit'
      };
    }
  };

  /**
   * Check if user can create more boards for a specific show (per-show limit)
   */
  const checkBoardLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
    try {
      const boards = await firebaseService.getDocuments('todo_boards', {
        where: [['showId', '==', showId]]
      });
      
      const currentCount = boards.length;
      const limit = perShowLimits.boards;
      
      return {
        withinLimit: currentCount < limit,
        currentCount,
        limit,
        isPerShow: true,
        message: currentCount >= limit 
          ? `This show has reached its board limit of ${limit}. Upgrade to create more boards per show.`
          : undefined
      };
    } catch (error) {
      console.error('Error checking board limit for show:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: perShowLimits.boards,
        isPerShow: true,
        message: 'Error checking board limit for show'
      };
    }
  };

  /**
   * Check if user can create more props (per-plan limit)
   */
  const checkPropsLimit = async (userId: string): Promise<LimitCheckResult> => {
    try {
      const props = await firebaseService.getDocuments('props', {
        where: [['userId', '==', userId]]
      });
      
      const currentCount = props.length;
      const limit = limits.props;
      
      return {
        withinLimit: currentCount < limit,
        currentCount,
        limit,
        isPerShow: false,
        message: currentCount >= limit 
          ? `You have reached your plan's props limit of ${limit}. Upgrade to create more props.`
          : undefined
      };
    } catch (error) {
      console.error('Error checking props limit:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: limits.props,
        isPerShow: false,
        message: 'Error checking props limit'
      };
    }
  };

  /**
   * Check if user can create more props for a specific show (per-show limit)
   */
  const checkPropsLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
    try {
      const props = await firebaseService.getDocuments('props', {
        where: [['showId', '==', showId]]
      });
      
      const currentCount = props.length;
      const limit = perShowLimits.props;
      
      return {
        withinLimit: currentCount < limit,
        currentCount,
        limit,
        isPerShow: true,
        message: currentCount >= limit 
          ? `This show has reached its props limit of ${limit}. Upgrade to create more props per show.`
          : undefined
      };
    } catch (error) {
      console.error('Error checking props limit for show:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: perShowLimits.props,
        isPerShow: true,
        message: 'Error checking props limit for show'
      };
    }
  };

  /**
   * Check if user can add more collaborators to a show
   */
  const checkCollaboratorsLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
    try {
      const collaborators = await firebaseService.getDocuments('collaborators', {
        where: [['showId', '==', showId]]
      });
      
      const currentCount = collaborators.length;
      const limit = perShowLimits.collaborators;
      
      return {
        withinLimit: currentCount < limit,
        currentCount,
        limit,
        isPerShow: true,
        message: currentCount >= limit 
          ? `This show has reached its collaborators limit of ${limit}. Upgrade to add more collaborators per show.`
          : undefined
      };
    } catch (error) {
      console.error('Error checking collaborators limit for show:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: perShowLimits.collaborators,
        isPerShow: true,
        message: 'Error checking collaborators limit for show'
      };
    }
  };

  /**
   * Check if user can create more packing boxes (per-plan limit)
   */
  const checkPackingBoxesLimit = async (userId: string): Promise<LimitCheckResult> => {
    try {
      const packingLists = await firebaseService.getDocuments('packing_lists', {
        where: [['userId', '==', userId]]
      });
      
      let totalBoxes = 0;
      for (const list of packingLists) {
        const boxes = await firebaseService.getDocuments(`packing_lists/${list.id}/boxes`);
        totalBoxes += boxes.length;
      }
      
      const currentCount = totalBoxes;
      const limit = limits.packingBoxes;
      
      return {
        withinLimit: currentCount < limit,
        currentCount,
        limit,
        isPerShow: false,
        message: currentCount >= limit 
          ? `You have reached your plan's packing boxes limit of ${limit}. Upgrade to create more packing boxes.`
          : undefined
      };
    } catch (error) {
      console.error('Error checking packing boxes limit:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: limits.packingBoxes,
        isPerShow: false,
        message: 'Error checking packing boxes limit'
      };
    }
  };

  /**
   * Check if user can create more packing boxes for a specific show (per-show limit)
   */
  const checkPackingBoxesLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
    try {
      const packingLists = await firebaseService.getDocuments('packing_lists', {
        where: [['showId', '==', showId]]
      });
      
      let totalBoxes = 0;
      for (const list of packingLists) {
        const boxes = await firebaseService.getDocuments(`packing_lists/${list.id}/boxes`);
        totalBoxes += boxes.length;
      }
      
      const currentCount = totalBoxes;
      const limit = perShowLimits.packingBoxes;
      
      return {
        withinLimit: currentCount < limit,
        currentCount,
        limit,
        isPerShow: true,
        message: currentCount >= limit 
          ? `This show has reached its packing boxes limit of ${limit}. Upgrade to create more packing boxes per show.`
          : undefined
      };
    } catch (error) {
      console.error('Error checking packing boxes limit for show:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: perShowLimits.packingBoxes,
        isPerShow: true,
        message: 'Error checking packing boxes limit for show'
      };
    }
  };

  /**
   * Check if user can archive more shows
   */
  const checkArchivedShowsLimit = async (userId: string): Promise<LimitCheckResult> => {
    try {
      const archives = await firebaseService.getDocuments('show_archives', {
        where: [['archivedBy', '==', userId]]
      });
      
      const currentCount = archives.length;
      const limit = limits.archivedShows;
      
      return {
        withinLimit: currentCount < limit,
        currentCount,
        limit,
        isPerShow: false,
        message: currentCount >= limit 
          ? `You have reached your plan's archived shows limit of ${limit}. Upgrade to archive more shows.`
          : undefined
      };
    } catch (error) {
      console.error('Error checking archived shows limit:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: limits.archivedShows,
        isPerShow: false,
        message: 'Error checking archived shows limit'
      };
    }
  };

  return {
    checkShowLimit,
    checkBoardLimit,
    checkBoardLimitForShow,
    checkPropsLimit,
    checkPropsLimitForShow,
    checkCollaboratorsLimitForShow,
    checkPackingBoxesLimit,
    checkPackingBoxesLimitForShow,
    checkArchivedShowsLimit,
    limits,
    perShowLimits,
  };
}
