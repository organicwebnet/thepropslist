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
import { useWebAuth } from '../contexts/WebAuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface LimitCheckResult {
  withinLimit: boolean;
  currentCount: number;
  limit: number;
  isPerShow: boolean;
  message?: string;
  usagePercent?: number;
  isAlmostOut?: boolean;
  isShowOwner?: boolean;
}

/**
 * Hook for checking various subscription limits
 * Supports both per-plan and per-show limits
 */
export function useLimitChecker() {
  const { limits, perShowLimits } = useSubscription();
  const { service: firebaseService } = useFirebase();
  const { user } = useWebAuth();


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
   * This checks the show owner's subscription limits, not the current user's
   */
  const checkBoardLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
    try {
      // Get show to find the owner
      const showDoc = await firebaseService.getDocument('shows', showId);
      if (!showDoc?.data) {
        return {
          withinLimit: true,
          currentCount: 0,
          limit: perShowLimits.boards,
          isPerShow: true,
          isShowOwner: false
        };
      }
      
      const showOwnerId = showDoc.data.createdBy || showDoc.data.ownerId || showDoc.data.userId;
      const isShowOwner = user?.uid === showOwnerId;
      
      // Use cloud function to check show owner's limits (counts all boards for all their shows)
      const functions = getFunctions();
      const checkLimits = httpsCallable(functions, 'checkSubscriptionLimits');
      const result = await checkLimits({ userId: showOwnerId, resourceType: 'boards' });
      const data = result.data as any;
      
      const currentCount = data.currentCount || 0;
      const limit = data.limit || perShowLimits.boards;
      const usagePercent = data.usagePercent || (limit > 0 ? (currentCount / limit) * 100 : 0);
      const isAlmostOut = data.isAlmostOut || (usagePercent >= 80 && usagePercent < 100);
      const isAtLimit = currentCount >= limit;
      
      let message: string | undefined;
      if (isAtLimit) {
        message = isShowOwner
          ? `You have reached your plan's boards limit of ${limit}. Upgrade your plan to create more boards.`
          : `This show has reached its boards limit of ${limit} on the show owner's plan. The show owner needs to upgrade their plan to create more boards.`;
      } else if (isAlmostOut) {
        message = isShowOwner
          ? `Warning: You're using ${currentCount} of ${limit} boards (${Math.round(usagePercent)}%). Consider upgrading your plan soon.`
          : `Warning: This show is using ${currentCount} of ${limit} boards (${Math.round(usagePercent)}%) on the show owner's plan. The show owner should consider upgrading soon.`;
      }
      
      return {
        withinLimit: !isAtLimit,
        currentCount,
        limit,
        isPerShow: true,
        usagePercent,
        isAlmostOut,
        isShowOwner,
        message
      };
    } catch (error) {
      console.error('Error checking board limit for show:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: perShowLimits.boards,
        isPerShow: true,
        isShowOwner: false,
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
   * This checks the show owner's subscription limits, not the current user's
   */
  const checkPackingBoxLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
    try {
      // Get show to find the owner
      const showDoc = await firebaseService.getDocument('shows', showId);
      if (!showDoc?.data) {
        return {
          withinLimit: true,
          currentCount: 0,
          limit: perShowLimits.packingBoxes,
          isPerShow: true,
          isShowOwner: false
        };
      }
      
      const showOwnerId = showDoc.data.createdBy || showDoc.data.ownerId || showDoc.data.userId;
      const isShowOwner = user?.uid === showOwnerId;
      
      // Use cloud function to check show owner's limits (counts all packing boxes for all their shows)
      const functions = getFunctions();
      const checkLimits = httpsCallable(functions, 'checkSubscriptionLimits');
      const result = await checkLimits({ userId: showOwnerId, resourceType: 'packingBoxes' });
      const data = result.data as any;
      
      const currentCount = data.currentCount || 0;
      const limit = data.limit || perShowLimits.packingBoxes;
      const usagePercent = data.usagePercent || (limit > 0 ? (currentCount / limit) * 100 : 0);
      const isAlmostOut = data.isAlmostOut || (usagePercent >= 80 && usagePercent < 100);
      const isAtLimit = currentCount >= limit;
      
      let message: string | undefined;
      if (isAtLimit) {
        message = isShowOwner
          ? `You have reached your plan's packing boxes limit of ${limit}. Upgrade your plan to create more packing boxes.`
          : `This show has reached its packing boxes limit of ${limit} on the show owner's plan. The show owner needs to upgrade their plan to create more packing boxes.`;
      } else if (isAlmostOut) {
        message = isShowOwner
          ? `Warning: You're using ${currentCount} of ${limit} packing boxes (${Math.round(usagePercent)}%). Consider upgrading your plan soon.`
          : `Warning: This show is using ${currentCount} of ${limit} packing boxes (${Math.round(usagePercent)}%) on the show owner's plan. The show owner should consider upgrading soon.`;
      }
      
      return {
        withinLimit: !isAtLimit,
        currentCount,
        limit,
        isPerShow: true,
        usagePercent,
        isAlmostOut,
        isShowOwner,
        message
      };
    } catch (error) {
      console.error('Error checking packing box limit for show:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: perShowLimits.packingBoxes,
        isPerShow: true,
        isShowOwner: false,
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
   * This checks the show owner's subscription limits, not the current user's
   */
  const checkPropLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
    try {
      // Get show to find the owner
      const showDoc = await firebaseService.getDocument('shows', showId);
      if (!showDoc?.data) {
        return {
          withinLimit: true,
          currentCount: 0,
          limit: perShowLimits.props,
          isPerShow: true,
          isShowOwner: false
        };
      }
      
      const showOwnerId = showDoc.data.createdBy || showDoc.data.ownerId || showDoc.data.userId;
      const isShowOwner = user?.uid === showOwnerId;
      
      // Use cloud function to check show owner's limits (counts all props for all their shows)
      const functions = getFunctions();
      const checkLimits = httpsCallable(functions, 'checkSubscriptionLimits');
      const result = await checkLimits({ userId: showOwnerId, resourceType: 'props' });
      const data = result.data as any;
      
      const currentCount = data.currentCount || 0;
      const limit = data.limit || perShowLimits.props;
      const usagePercent = data.usagePercent || (limit > 0 ? (currentCount / limit) * 100 : 0);
      const isAlmostOut = data.isAlmostOut || (usagePercent >= 80 && usagePercent < 100);
      const isAtLimit = currentCount >= limit;
      
      let message: string | undefined;
      if (isAtLimit) {
        message = isShowOwner
          ? `You have reached your plan's props limit of ${limit}. Upgrade your plan to create more props.`
          : `This show has reached its props limit of ${limit} on the show owner's plan. The show owner needs to upgrade their plan to create more props.`;
      } else if (isAlmostOut) {
        message = isShowOwner
          ? `Warning: You're using ${currentCount} of ${limit} props (${Math.round(usagePercent)}%). Consider upgrading your plan soon.`
          : `Warning: This show is using ${currentCount} of ${limit} props (${Math.round(usagePercent)}%) on the show owner's plan. The show owner should consider upgrading soon.`;
      }
      
      return {
        withinLimit: !isAtLimit,
        currentCount,
        limit,
        isPerShow: true,
        usagePercent,
        isAlmostOut,
        isShowOwner,
        message
      };
    } catch (error) {
      console.error('Error checking prop limit for show:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: perShowLimits.props,
        isPerShow: true,
        isShowOwner: false,
        message: 'Error checking prop limit for show'
      };
    }
  };

  /**
   * Check if user can add more collaborators to a show (per-show limit)
   * This checks the show owner's subscription limits
   */
  const checkCollaboratorLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
    try {
      const showDoc = await firebaseService.getDocument('shows', showId);
      if (!showDoc?.data) {
        return {
          withinLimit: true,
          currentCount: 0,
          limit: perShowLimits.collaborators,
          isPerShow: true,
          isShowOwner: false
        };
      }
      
      const showOwnerId = showDoc.data.createdBy || showDoc.data.ownerId || showDoc.data.userId;
      const isShowOwner = user?.uid === showOwnerId;
      const currentCount = Object.keys(showDoc.data.team || {}).length;
      
      // Use cloud function to check show owner's limits
      const functions = getFunctions();
      const checkLimits = httpsCallable(functions, 'checkSubscriptionLimits');
      const result = await checkLimits({ userId: showOwnerId, resourceType: 'collaboratorsPerShow' });
      const data = result.data as any;
      
      const limit = data.limit || perShowLimits.collaborators;
      const usagePercent = limit > 0 ? (currentCount / limit) * 100 : 0;
      const isAlmostOut = usagePercent >= 80 && usagePercent < 100;
      const isAtLimit = currentCount >= limit;
      
      let message: string | undefined;
      if (isAtLimit) {
        message = isShowOwner
          ? `You have reached your plan's collaborator limit of ${limit} per show. Upgrade your plan to invite more collaborators.`
          : `This show has reached its collaborator limit of ${limit} on the show owner's plan. The show owner needs to upgrade their plan to invite more collaborators.`;
      } else if (isAlmostOut) {
        message = isShowOwner
          ? `Warning: This show is using ${currentCount} of ${limit} collaborators (${Math.round(usagePercent)}%). Consider upgrading your plan soon.`
          : `Warning: This show is using ${currentCount} of ${limit} collaborators (${Math.round(usagePercent)}%) on the show owner's plan. The show owner should consider upgrading soon.`;
      }
      
      return {
        withinLimit: !isAtLimit,
        currentCount,
        limit,
        isPerShow: true,
        usagePercent,
        isAlmostOut,
        isShowOwner,
        message
      };
    } catch (error) {
      console.error('Error checking collaborator limit for show:', error);
      return {
        withinLimit: false,
        currentCount: 0,
        limit: perShowLimits.collaborators,
        isPerShow: true,
        isShowOwner: false,
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
    // Alias for backward compatibility
    checkPackingBoxesLimit: checkPackingBoxLimit,
    checkPackingBoxesLimitForShow: checkPackingBoxLimitForShow,
    checkPropLimit,
    checkPropLimitForShow,
    checkCollaboratorLimitForShow,
    checkArchivedShowLimit,
  };
}