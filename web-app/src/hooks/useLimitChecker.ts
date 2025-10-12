/**
 * useLimitChecker Hook
 * 
 * Limit checking that integrates with the 3-tier permission system:
 * 1. Role-based access control (RBAC) - Exempt users bypass all limits
 * 2. Subscription-based access control - From Stripe metadata
 * 3. Permission-based access control - Granular permission checks
 */

import { useSubscription } from './useSubscription';
import { useFirebase } from '../contexts/FirebaseContext';

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
        where: [['ownerId', '==', userId]]
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
        where: [['ownerId', '==', userId]]
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
          ? `This show has reached its board limit of ${limit}. Upgrade to create more boards.`
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
   * Check if user can create more packing boxes (per-plan limit)
   */
  const checkPackingBoxLimit = async (userId: string): Promise<LimitCheckResult> => {
    try {
      const packingBoxes = await firebaseService.getDocuments('packingBoxes', {
        where: [['ownerId', '==', userId]]
      });
      
      const currentCount = packingBoxes.length;
      const limit = limits.packingBoxes;
      
      return {
        withinLimit: currentCount < limit,
        currentCount,
        limit,
        isPerShow: false,
        message: currentCount >= limit 
          ? `You have reached your plan's packing box limit of ${limit}. Upgrade to create more packing boxes.`
          : undefined
      };
    } catch (error) {
      console.error('Error checking packing box limit:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: limits.packingBoxes,
        isPerShow: false,
        message: 'Error checking packing box limit'
      };
    }
  };

  /**
   * Check if user can create more packing boxes for a specific show (per-show limit)
   */
  const checkPackingBoxLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
    try {
      const packingBoxes = await firebaseService.getDocuments('packingBoxes', {
        where: [['showId', '==', showId]]
      });
      
      const currentCount = packingBoxes.length;
      const limit = perShowLimits.packingBoxes;
      
      return {
        withinLimit: currentCount < limit,
        currentCount,
        limit,
        isPerShow: true,
        message: currentCount >= limit 
          ? `This show has reached its packing box limit of ${limit}. Upgrade to create more packing boxes.`
          : undefined
      };
    } catch (error) {
      console.error('Error checking packing box limit for show:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: perShowLimits.packingBoxes,
        isPerShow: true,
        message: 'Error checking packing box limit for show'
      };
    }
  };

  /**
   * Check if user can create more props (per-plan limit)
   */
  const checkPropLimit = async (userId: string): Promise<LimitCheckResult> => {
    try {
      const props = await firebaseService.getDocuments('props', {
        where: [['ownerId', '==', userId]]
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
      console.error('Error checking prop limit:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: limits.props,
        isPerShow: false,
        message: 'Error checking prop limit'
      };
    }
  };

  /**
   * Check if user can create more props for a specific show (per-show limit)
   */
  const checkPropLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
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
          ? `This show has reached its props limit of ${limit}. Upgrade to create more props.`
          : undefined
      };
    } catch (error) {
      console.error('Error checking prop limit for show:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: perShowLimits.props,
        isPerShow: true,
        message: 'Error checking prop limit for show'
      };
    }
  };

  /**
   * Check if user can add more collaborators to a show (per-show limit)
   */
  const checkCollaboratorLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
    try {
      const showDoc = await firebaseService.getDocument('shows', showId);
      const currentCount = Object.keys(showDoc?.data?.team || {}).length;
      const limit = perShowLimits.collaborators;
      
      return {
        withinLimit: currentCount < limit,
        currentCount,
        limit,
        isPerShow: true,
        message: currentCount >= limit 
          ? `This show has reached its collaborator limit of ${limit}. Upgrade to add more collaborators.`
          : undefined
      };
    } catch (error) {
      console.error('Error checking collaborator limit for show:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: perShowLimits.collaborators,
        isPerShow: true,
        message: 'Error checking collaborator limit for show'
      };
    }
  };

  /**
   * Check if user can archive more shows (per-plan limit)
   */
  const checkArchivedShowLimit = async (userId: string): Promise<LimitCheckResult> => {
    try {
      const archivedShows = await firebaseService.getDocuments('shows', {
        where: [['createdBy', '==', userId], ['status', '==', 'archived']]
      });
      
      const currentCount = archivedShows.length;
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
      console.error('Error checking archived show limit:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: limits.archivedShows,
        isPerShow: false,
        message: 'Error checking archived show limit'
      };
    }
  };

  return {
    checkShowLimit,
    checkBoardLimit,
    checkBoardLimitForShow,
    checkPackingBoxLimit,
    checkPackingBoxLimitForShow,
    checkPropLimit,
    checkPropLimitForShow,
    checkCollaboratorLimitForShow,
    checkArchivedShowLimit,
  };
}