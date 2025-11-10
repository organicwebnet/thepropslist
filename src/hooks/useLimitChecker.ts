/**
 * useLimitChecker Hook for Android App
 * 
 * Limit checking that integrates with the 3-tier permission system:
 * 1. Role-based access control (RBAC) - Exempt users bypass all limits
 * 2. Subscription-based access control - From Stripe metadata
 * 3. Permission-based access control - Granular permission checks
 */

import { useSubscription } from './useSubscription';
import { useFirebase } from '../platforms/mobile/contexts/FirebaseContext';
import { usePermissions } from './usePermissions';
import { isValidUserId, isValidShowId } from '../shared/utils/limitUtils';

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
 * 
 * @returns Object with limit checking functions
 * 
 * @example
 * ```tsx
 * const { checkShowLimit } = useLimitChecker();
 * const result = await checkShowLimit(userId);
 * if (!result.withinLimit) {
 *   // Show upgrade prompt
 * }
 * ```
 */
export function useLimitChecker() {
  const { limits, perShowLimits, effectiveLimits } = useSubscription();
  const { service: firebaseService } = useFirebase();
  const { isExempt } = usePermissions();

  /**
   * Check if user can create more shows
   * 
   * @param userId - The user's unique identifier
   * @returns Promise resolving to limit check result
   * 
   * @remarks
   * - Exempt users bypass all limits
   * - On error, fails open (allows action) to prevent blocking users during network issues
   * - Validates input before making Firestore queries
   */
  const checkShowLimit = async (userId: string): Promise<LimitCheckResult> => {
    // Exempt users bypass all limits
    if (isExempt) {
      return {
        withinLimit: true,
        currentCount: 0,
        limit: Infinity,
        isPerShow: false,
      };
    }

    // Validate input
    if (!isValidUserId(userId)) {
      console.error('Invalid user ID provided to checkShowLimit:', userId);
      // Fail open - allow action if input is invalid (better UX than blocking)
      return {
        withinLimit: true,
        currentCount: 0,
        limit: effectiveLimits.shows,
        isPerShow: false,
      };
    }

    try {
      if (!firebaseService) {
        console.warn('Firebase service not available for limit check');
        // Fail open - allow action if service unavailable
        return {
          withinLimit: true,
          currentCount: 0,
          limit: effectiveLimits.shows,
          isPerShow: false,
        };
      }

      const shows = await firebaseService.getDocuments('shows', {
        where: [['ownerId', '==', userId]]
      });
      
      const currentCount = shows.length;
      const limit = effectiveLimits.shows;
      
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
      // Fail open - allow action on error to prevent blocking users during network issues
      // This is safer than blocking legitimate users due to temporary problems
      return {
        withinLimit: true,
        currentCount: 0,
        limit: effectiveLimits.shows,
        isPerShow: false,
      };
    }
  };

  /**
   * Check if user can create more boards (per-plan limit)
   * 
   * @param userId - The user's unique identifier
   * @returns Promise resolving to limit check result
   */
  const checkBoardLimit = async (userId: string): Promise<LimitCheckResult> => {
    // Exempt users bypass all limits
    if (isExempt) {
      return {
        withinLimit: true,
        currentCount: 0,
        limit: Infinity,
        isPerShow: false,
      };
    }

    // Validate input
    if (!isValidUserId(userId)) {
      console.error('Invalid user ID provided to checkBoardLimit:', userId);
      return {
        withinLimit: true,
        currentCount: 0,
        limit: effectiveLimits.boards,
        isPerShow: false,
      };
    }

    try {
      if (!firebaseService) {
        console.warn('Firebase service not available for limit check');
        return {
          withinLimit: true,
          currentCount: 0,
          limit: effectiveLimits.boards,
          isPerShow: false,
        };
      }

      const boards = await firebaseService.getDocuments('todo_boards', {
        where: [['ownerId', '==', userId]]
      });
      
      const currentCount = boards.length;
      const limit = effectiveLimits.boards;
      
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
        withinLimit: true,
        currentCount: 0,
        limit: effectiveLimits.boards,
        isPerShow: false,
      };
    }
  };

  /**
   * Check if user can create more boards for a specific show (per-show limit)
   * 
   * @param showId - The show's unique identifier
   * @returns Promise resolving to limit check result
   */
  const checkBoardLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
    // Exempt users bypass all limits
    if (isExempt) {
      return {
        withinLimit: true,
        currentCount: 0,
        limit: Infinity,
        isPerShow: true,
      };
    }

    // Validate input
    if (!isValidShowId(showId)) {
      console.error('Invalid show ID provided to checkBoardLimitForShow:', showId);
      return {
        withinLimit: true,
        currentCount: 0,
        limit: perShowLimits.boards,
        isPerShow: true,
      };
    }

    try {
      if (!firebaseService) {
        console.warn('Firebase service not available for limit check');
        return {
          withinLimit: true,
          currentCount: 0,
          limit: perShowLimits.boards,
          isPerShow: true,
        };
      }

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
        withinLimit: true,
        currentCount: 0,
        limit: perShowLimits.boards,
        isPerShow: true,
      };
    }
  };

  /**
   * Check if user can create more packing boxes (per-plan limit)
   * 
   * @param userId - The user's unique identifier
   * @returns Promise resolving to limit check result
   */
  const checkPackingBoxLimit = async (userId: string): Promise<LimitCheckResult> => {
    // Exempt users bypass all limits
    if (isExempt) {
      return {
        withinLimit: true,
        currentCount: 0,
        limit: Infinity,
        isPerShow: false,
      };
    }

    // Validate input
    if (!isValidUserId(userId)) {
      console.error('Invalid user ID provided to checkPackingBoxLimit:', userId);
      return {
        withinLimit: true,
        currentCount: 0,
        limit: effectiveLimits.packingBoxes,
        isPerShow: false,
      };
    }

    try {
      if (!firebaseService) {
        console.warn('Firebase service not available for limit check');
        return {
          withinLimit: true,
          currentCount: 0,
          limit: effectiveLimits.packingBoxes,
          isPerShow: false,
        };
      }

      const packingBoxes = await firebaseService.getDocuments('packingBoxes', {
        where: [['ownerId', '==', userId]]
      });
      
      const currentCount = packingBoxes.length;
      const limit = effectiveLimits.packingBoxes;
      
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
        withinLimit: true,
        currentCount: 0,
        limit: effectiveLimits.packingBoxes,
        isPerShow: false,
      };
    }
  };

  /**
   * Check if user can create more packing boxes for a specific show (per-show limit)
   * 
   * @param showId - The show's unique identifier
   * @returns Promise resolving to limit check result
   */
  const checkPackingBoxLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
    // Exempt users bypass all limits
    if (isExempt) {
      return {
        withinLimit: true,
        currentCount: 0,
        limit: Infinity,
        isPerShow: true,
      };
    }

    // Validate input
    if (!isValidShowId(showId)) {
      console.error('Invalid show ID provided to checkPackingBoxLimitForShow:', showId);
      return {
        withinLimit: true,
        currentCount: 0,
        limit: perShowLimits.packingBoxes,
        isPerShow: true,
      };
    }

    try {
      if (!firebaseService) {
        console.warn('Firebase service not available for limit check');
        return {
          withinLimit: true,
          currentCount: 0,
          limit: perShowLimits.packingBoxes,
          isPerShow: true,
        };
      }

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
        withinLimit: true,
        currentCount: 0,
        limit: perShowLimits.packingBoxes,
        isPerShow: true,
      };
    }
  };

  /**
   * Check if user can create more props (per-plan limit)
   * 
   * @param userId - The user's unique identifier
   * @returns Promise resolving to limit check result
   */
  const checkPropLimit = async (userId: string): Promise<LimitCheckResult> => {
    // Exempt users bypass all limits
    if (isExempt) {
      return {
        withinLimit: true,
        currentCount: 0,
        limit: Infinity,
        isPerShow: false,
      };
    }

    // Validate input
    if (!isValidUserId(userId)) {
      console.error('Invalid user ID provided to checkPropLimit:', userId);
      return {
        withinLimit: true,
        currentCount: 0,
        limit: effectiveLimits.props,
        isPerShow: false,
      };
    }

    try {
      if (!firebaseService) {
        console.warn('Firebase service not available for limit check');
        return {
          withinLimit: true,
          currentCount: 0,
          limit: effectiveLimits.props,
          isPerShow: false,
        };
      }

      const props = await firebaseService.getDocuments('props', {
        where: [['ownerId', '==', userId]]
      });
      
      const currentCount = props.length;
      const limit = effectiveLimits.props;
      
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
        withinLimit: true,
        currentCount: 0,
        limit: effectiveLimits.props,
        isPerShow: false,
      };
    }
  };

  /**
   * Check if user can create more props for a specific show (per-show limit)
   * 
   * @param showId - The show's unique identifier
   * @returns Promise resolving to limit check result
   */
  const checkPropLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
    // Exempt users bypass all limits
    if (isExempt) {
      return {
        withinLimit: true,
        currentCount: 0,
        limit: Infinity,
        isPerShow: true,
      };
    }

    // Validate input
    if (!isValidShowId(showId)) {
      console.error('Invalid show ID provided to checkPropLimitForShow:', showId);
      return {
        withinLimit: true,
        currentCount: 0,
        limit: perShowLimits.props,
        isPerShow: true,
      };
    }

    try {
      if (!firebaseService) {
        console.warn('Firebase service not available for limit check');
        return {
          withinLimit: true,
          currentCount: 0,
          limit: perShowLimits.props,
          isPerShow: true,
        };
      }

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
        withinLimit: true,
        currentCount: 0,
        limit: perShowLimits.props,
        isPerShow: true,
      };
    }
  };

  /**
   * Check if user can add more collaborators to a show (per-show limit)
   * 
   * @param showId - The show's unique identifier
   * @returns Promise resolving to limit check result
   */
  const checkCollaboratorLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
    // Exempt users bypass all limits
    if (isExempt) {
      return {
        withinLimit: true,
        currentCount: 0,
        limit: Infinity,
        isPerShow: true,
      };
    }

    // Validate input
    if (!isValidShowId(showId)) {
      console.error('Invalid show ID provided to checkCollaboratorLimitForShow:', showId);
      return {
        withinLimit: true,
        currentCount: 0,
        limit: perShowLimits.collaborators,
        isPerShow: true,
      };
    }

    try {
      if (!firebaseService) {
        console.warn('Firebase service not available for limit check');
        return {
          withinLimit: true,
          currentCount: 0,
          limit: perShowLimits.collaborators,
          isPerShow: true,
        };
      }

      // Get show document to count collaborators
      const showDoc = await firebaseService.getDocument('shows', showId);
      if (!showDoc?.data) {
        // Show not found - fail open to allow action
        console.warn('Show not found for collaborator limit check:', showId);
        return {
          withinLimit: true,
          currentCount: 0,
          limit: perShowLimits.collaborators,
          isPerShow: true,
        };
      }

      interface ShowData {
        teamMembers?: string[];
        collaborators?: string[];
        [key: string]: unknown;
      }

      const showData = showDoc.data as ShowData;
      const collaborators = showData.teamMembers || showData.collaborators || [];
      const currentCount = Array.isArray(collaborators) ? collaborators.length : 0;
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
        withinLimit: true,
        currentCount: 0,
        limit: perShowLimits.collaborators,
        isPerShow: true,
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
  };
}

