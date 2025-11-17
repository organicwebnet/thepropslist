/**
 * Subscription Validation Cloud Functions
 * 
 * Server-side validation for subscription limits and permissions
 * This approach is more efficient than complex Firestore rules
 */

import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp();
}

// Subscription limits by plan
const SUBSCRIPTION_LIMITS = {
  free: {
    shows: 1,
    boards: 2,
    packingBoxes: 20,
    collaboratorsPerShow: 3,
    props: 10,
    archivedShows: 0
  },
  starter: {
    shows: 3,
    boards: 5,
    packingBoxes: 200,
    collaboratorsPerShow: 5,
    props: 50,
    archivedShows: 2
  },
  standard: {
    shows: 10,
    boards: 20,
    packingBoxes: 1000,
    collaboratorsPerShow: 15,
    props: 100,
    archivedShows: 5
  },
  pro: {
    shows: 100,
    boards: 200,
    packingBoxes: 10000,
    collaboratorsPerShow: 100,
    props: 1000,
    archivedShows: 10
  }
};

/**
 * Get user's subscription limits
 */
async function getUserLimits(userId: string): Promise<any> {
  const userDoc = await admin.firestore().doc(`userProfiles/${userId}`).get();
  if (!userDoc.exists) {
    // If user profile doesn't exist, default to free plan limits
    // This is more graceful than throwing an error
    logger.warn(`User profile not found for ${userId}, using free plan limits`);
    return { exempt: false, limits: SUBSCRIPTION_LIMITS.free };
  }
  
  const userData = userDoc.data();
  const plan = userData?.plan || 'free';
  const subscriptionStatus = userData?.subscriptionStatus || 'inactive';
  
  // God users and active subscribers are exempt from limits
  if (userData?.role === 'god' || subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    return { exempt: true, limits: null };
  }
  
  return { exempt: false, limits: SUBSCRIPTION_LIMITS[plan as keyof typeof SUBSCRIPTION_LIMITS] || SUBSCRIPTION_LIMITS.free };
}

/**
 * Count user's resources
 */
async function countUserResources(userId: string, collection: string, field: string = 'ownerId'): Promise<number> {
  const snapshot = await admin.firestore()
    .collection(collection)
    .where(field, '==', userId)
    .get();
  return snapshot.size;
}

/**
 * Count show's resources
 */
async function countShowResources(showId: string, collection: string, field: string = 'showId'): Promise<number> {
  const snapshot = await admin.firestore()
    .collection(collection)
    .where(field, '==', showId)
    .get();
  return snapshot.size;
}

/**
 * Get all show IDs owned by a user
 * Helper function to avoid code duplication
 */
async function getUserShowIds(userId: string): Promise<string[]> {
  // Get all shows owned by this user
  // Shows may use ownerId, userId, or createdBy field
  const [ownerShows, userShows, createdShows] = await Promise.all([
    admin.firestore().collection('shows').where('ownerId', '==', userId).get(),
    admin.firestore().collection('shows').where('userId', '==', userId).get(),
    admin.firestore().collection('shows').where('createdBy', '==', userId).get()
  ]);
  
  // Combine all show IDs (using Set to avoid duplicates)
  const showIdsSet = new Set<string>();
  ownerShows.docs.forEach(doc => showIdsSet.add(doc.id));
  userShows.docs.forEach(doc => showIdsSet.add(doc.id));
  createdShows.docs.forEach(doc => showIdsSet.add(doc.id));
  
  return Array.from(showIdsSet);
}

/**
 * Count props for all shows owned by a user
 * This is used because props count against the show owner's subscription,
 * not the prop creator's subscription
 */
async function countUserProps(userId: string): Promise<number> {
  const showIds = await getUserShowIds(userId);
  
  // If no shows, return 0
  if (showIds.length === 0) {
    return 0;
  }
  
  // Count props for all these shows
  // Note: We need to query in batches if there are many shows (Firestore 'in' query limit is 10)
  let totalCount = 0;
  for (let i = 0; i < showIds.length; i += 10) {
    const batch = showIds.slice(i, i + 10);
    const propsSnapshot = await admin.firestore()
      .collection('props')
      .where('showId', 'in', batch)
      .get();
    totalCount += propsSnapshot.size;
  }
  
  return totalCount;
}

/**
 * Count boards for all shows owned by a user
 * This is used because boards count against the show owner's subscription,
 * not the board creator's subscription
 */
async function countUserBoards(userId: string): Promise<number> {
  const showIds = await getUserShowIds(userId);
  
  // If no shows, return 0
  if (showIds.length === 0) {
    return 0;
  }
  
  // Count boards for all these shows
  // Note: We need to query in batches if there are many shows (Firestore 'in' query limit is 10)
  let totalCount = 0;
  for (let i = 0; i < showIds.length; i += 10) {
    const batch = showIds.slice(i, i + 10);
    const boardsSnapshot = await admin.firestore()
      .collection('todo_boards')
      .where('showId', 'in', batch)
      .get();
    totalCount += boardsSnapshot.size;
  }
  
  return totalCount;
}

/**
 * Count packing boxes for all shows owned by a user
 * This is used because packing boxes count against the show owner's subscription,
 * not the packing box creator's subscription
 */
async function countUserPackingBoxes(userId: string): Promise<number> {
  const showIds = await getUserShowIds(userId);
  
  // If no shows, return 0
  if (showIds.length === 0) {
    return 0;
  }
  
  // Count packing boxes for all these shows
  // Note: We need to query in batches if there are many shows (Firestore 'in' query limit is 10)
  let totalCount = 0;
  for (let i = 0; i < showIds.length; i += 10) {
    const batch = showIds.slice(i, i + 10);
    const packingBoxesSnapshot = await admin.firestore()
      .collection('packingBoxes')
      .where('showId', 'in', batch)
      .get();
    totalCount += packingBoxesSnapshot.size;
  }
  
  return totalCount;
}

/**
 * Validate show creation
 */
export const validateShowCreation = onDocumentCreated('shows/{showId}', async (event: any) => {
  const showData = event.data?.data();
  
  // Input validation
  if (!showData) {
    logger.error('Show creation validation failed: No show data found');
    await event.data?.ref.delete();
    return;
  }
  
  const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
  
  if (!userId || typeof userId !== 'string') {
    logger.error('Show creation validation failed: Invalid user ID');
    await event.data?.ref.delete();
    return;
  }
  
  try {
    const { exempt, limits } = await getUserLimits(userId);
    
    if (exempt) {
      logger.info(`User ${userId} is exempt from limits, allowing show creation`);
      return;
    }
    
    const currentCount = await countUserResources(userId, 'shows', 'createdBy');
    
    if (currentCount >= limits.shows) {
      logger.warn(`User ${userId} exceeded show limit: ${currentCount}/${limits.shows}`);
      // Delete the show that was just created
      await event.data?.ref.delete();
      throw new HttpsError('permission-denied', `Show limit exceeded. You can create up to ${limits.shows} shows on your current plan.`);
    }
    
    logger.info(`Show creation validated for user ${userId}: ${currentCount + 1}/${limits.shows}`);
  } catch (error) {
    logger.error('Show creation validation error:', error);
    // Delete the show if validation failed
    await event.data?.ref.delete();
    throw error;
  }
});

/**
 * Validate board creation
 */
export const validateBoardCreation = onDocumentCreated('todo_boards/{boardId}', async (event: any) => {
  const boardData = event.data?.data();
  
  // Input validation
  if (!boardData) {
    logger.error('Board creation validation failed: No board data found');
    await event.data?.ref.delete();
    return;
  }
  
  const showId = boardData?.showId;
  
  // If board has no showId, it's a legacy board - check board creator's limits
  if (!showId || typeof showId !== 'string') {
    const userId = boardData?.ownerId;
    if (!userId || typeof userId !== 'string') {
      logger.error('Board creation validation failed: No showId or ownerId found');
      await event.data?.ref.delete();
      return;
    }
    
    try {
      const { exempt, limits } = await getUserLimits(userId);
      if (exempt) {
        logger.info(`User ${userId} is exempt from limits, allowing board creation`);
        return;
      }
      const currentCount = await countUserResources(userId, 'todo_boards', 'ownerId');
      if (currentCount >= limits.boards) {
        logger.warn(`User ${userId} exceeded board limit: ${currentCount}/${limits.boards}`);
        await event.data?.ref.delete();
        throw new HttpsError('permission-denied', `Board limit exceeded. You can create up to ${limits.boards} boards on your current plan.`);
      }
      logger.info(`Board creation validated for user ${userId}: ${currentCount + 1}/${limits.boards}`);
    } catch (error) {
      logger.error('Board creation validation error:', error);
      await event.data?.ref.delete();
      throw error;
    }
    return;
  }
  
  try {
    // Get show owner - boards count against show owner's subscription
    const showDoc = await admin.firestore().doc(`shows/${showId}`).get();
    if (!showDoc.exists) {
      logger.error('Show not found for board validation');
      await event.data?.ref.delete();
      return;
    }
    
    const showData = showDoc.data();
    const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
    
    if (!userId) {
      logger.error('Board creation validation failed: No user ID found in show');
      await event.data?.ref.delete();
      return;
    }
    
    const { exempt, limits } = await getUserLimits(userId);
    
    if (exempt) {
      logger.info(`User ${userId} is exempt from limits, allowing board creation`);
      return;
    }
    
    // Count boards for all shows owned by this user
    // Boards created by collaborators count against the show owner's subscription
    const currentCount = await countUserBoards(userId);
    
    if (currentCount >= limits.boards) {
      // Check if the creator is the show owner or a collaborator
      const creatorId = boardData?.userId || boardData?.ownerId;
      const isCollaborator = creatorId && creatorId !== userId;
      
      logger.warn(`User ${userId} exceeded board limit: ${currentCount}/${limits.boards}`);
      await event.data?.ref.delete();
      
      const errorMessage = isCollaborator
        ? `This show has reached its boards limit of ${limits.boards} on the show owner's plan. The show owner needs to upgrade their plan to create more boards.`
        : `You have reached your plan's boards limit of ${limits.boards}. Upgrade your plan to create more boards.`;
      
      throw new HttpsError('permission-denied', errorMessage);
    }
    
    logger.info(`Board creation validated for user ${userId}: ${currentCount + 1}/${limits.boards}`);
  } catch (error) {
    logger.error('Board creation validation error:', error);
    await event.data?.ref.delete();
    throw error;
  }
});

/**
 * Validate packing box creation
 */
export const validatePackingBoxCreation = onDocumentCreated('packingBoxes/{boxId}', async (event: any) => {
  const boxData = event.data?.data();
  
  // Input validation
  if (!boxData) {
    logger.error('Packing box creation validation failed: No box data found');
    await event.data?.ref.delete();
    return;
  }
  
  const showId = boxData?.showId;
  
  if (!showId || typeof showId !== 'string') {
    logger.error('Packing box creation validation failed: Invalid show ID');
    await event.data?.ref.delete();
    return;
  }
  
  try {
    // Get show owner
    const showDoc = await admin.firestore().doc(`shows/${showId}`).get();
    if (!showDoc.exists) {
      logger.error('Show not found for packing box validation');
      await event.data?.ref.delete();
      return;
    }
    
    const showData = showDoc.data();
    const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
    
    if (!userId) {
      logger.error('Packing box creation validation failed: No user ID found in show');
      await event.data?.ref.delete();
      return;
    }
    
    const { exempt, limits } = await getUserLimits(userId);
    
    if (exempt) {
      logger.info(`User ${userId} is exempt from limits, allowing packing box creation`);
      return;
    }
    
    // Count packing boxes for all shows owned by this user
    // Packing boxes created by collaborators count against the show owner's subscription
    const currentCount = await countUserPackingBoxes(userId);
    
    if (currentCount >= limits.packingBoxes) {
      // Check if the creator is the show owner or a collaborator
      const creatorId = boxData?.userId || boxData?.ownerId;
      const isCollaborator = creatorId && creatorId !== userId;
      
      logger.warn(`User ${userId} exceeded packing box limit: ${currentCount}/${limits.packingBoxes}`);
      await event.data?.ref.delete();
      
      const errorMessage = isCollaborator
        ? `This show has reached its packing boxes limit of ${limits.packingBoxes} on the show owner's plan. The show owner needs to upgrade their plan to create more packing boxes.`
        : `You have reached your plan's packing boxes limit of ${limits.packingBoxes}. Upgrade your plan to create more packing boxes.`;
      
      throw new HttpsError('permission-denied', errorMessage);
    }
    
    logger.info(`Packing box creation validated for user ${userId}: ${currentCount + 1}/${limits.packingBoxes}`);
  } catch (error) {
    logger.error('Packing box creation validation error:', error);
    await event.data?.ref.delete();
    throw error;
  }
});

/**
 * Validate prop creation
 */
export const validatePropCreation = onDocumentCreated('props/{propId}', async (event: any) => {
  const propData = event.data?.data();
  
  // Input validation
  if (!propData) {
    logger.error('Prop creation validation failed: No prop data found');
    await event.data?.ref.delete();
    return;
  }
  
  const showId = propData?.showId;
  
  if (!showId || typeof showId !== 'string') {
    logger.error('Prop creation validation failed: Invalid show ID');
    await event.data?.ref.delete();
    return;
  }
  
  try {
    // Get show owner
    const showDoc = await admin.firestore().doc(`shows/${showId}`).get();
    if (!showDoc.exists) {
      logger.error('Show not found for prop validation');
      await event.data?.ref.delete();
      return;
    }
    
    const showData = showDoc.data();
    const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
    
    if (!userId) {
      logger.error('Prop creation validation failed: No user ID found in show');
      await event.data?.ref.delete();
      return;
    }
    
    const { exempt, limits } = await getUserLimits(userId);
    
    if (exempt) {
      logger.info(`User ${userId} is exempt from limits, allowing prop creation`);
      return;
    }
    
    // Count props for all shows owned by this user
    // Props created by collaborators count against the show owner's subscription
    const currentCount = await countUserProps(userId);
    
    if (currentCount >= limits.props) {
      // Check if the creator is the show owner or a collaborator
      const creatorId = propData?.userId;
      const isCollaborator = creatorId && creatorId !== userId;
      
      logger.warn(`User ${userId} exceeded prop limit: ${currentCount}/${limits.props}`);
      await event.data?.ref.delete();
      
      const errorMessage = isCollaborator
        ? `This show has reached its props limit of ${limits.props} on the show owner's plan. The show owner needs to upgrade their plan to create more props.`
        : `You have reached your plan's props limit of ${limits.props}. Upgrade your plan to create more props.`;
      
      throw new HttpsError('permission-denied', errorMessage);
    }
    
    logger.info(`Prop creation validated for user ${userId}: ${currentCount + 1}/${limits.props}`);
  } catch (error) {
    logger.error('Prop creation validation error:', error);
    await event.data?.ref.delete();
    throw error;
  }
});

/**
 * Validate team member invitation
 */
export const validateTeamInvitation = onDocumentCreated('invitations/{inviteId}', async (event: any) => {
  const inviteData = event.data?.data();
  
  // Input validation
  if (!inviteData) {
    logger.error('Team invitation validation failed: No invitation data found');
    await event.data?.ref.delete();
    return;
  }
  
  const showId = inviteData?.showId;
  
  if (!showId || typeof showId !== 'string') {
    logger.error('Team invitation validation failed: Invalid show ID');
    await event.data?.ref.delete();
    return;
  }
  
  try {
    // Get show owner
    const showDoc = await admin.firestore().doc(`shows/${showId}`).get();
    if (!showDoc.exists) {
      logger.error('Show not found for invitation validation');
      await event.data?.ref.delete();
      return;
    }
    
    const showData = showDoc.data();
    const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
    
    if (!userId) {
      logger.error('Team invitation validation failed: No user ID found in show');
      await event.data?.ref.delete();
      return;
    }
    
    const { exempt, limits } = await getUserLimits(userId);
    
    if (exempt) {
      logger.info(`User ${userId} is exempt from limits, allowing team invitation`);
      return;
    }
    
    // Count current team members
    const teamMembers = Object.keys(showData?.team || {}).length;
    
    if (teamMembers >= limits.collaboratorsPerShow) {
      // Check if the inviter is the show owner or a collaborator
      const inviterId = inviteData?.invitedBy || inviteData?.userId;
      const isCollaborator = inviterId && inviterId !== userId;
      
      logger.warn(`User ${userId} exceeded collaborator limit: ${teamMembers}/${limits.collaboratorsPerShow}`);
      await event.data?.ref.delete();
      
      const errorMessage = isCollaborator
        ? `This show has reached its collaborator limit of ${limits.collaboratorsPerShow} on the show owner's plan. The show owner needs to upgrade their plan to invite more collaborators.`
        : `You have reached your plan's collaborator limit of ${limits.collaboratorsPerShow} per show. Upgrade your plan to invite more collaborators.`;
      
      throw new HttpsError('permission-denied', errorMessage);
    }
    
    logger.info(`Team invitation validated for user ${userId}: ${teamMembers + 1}/${limits.collaboratorsPerShow}`);
  } catch (error) {
    logger.error('Team invitation validation error:', error);
    await event.data?.ref.delete();
    throw error;
  }
});

/**
 * Check subscription limits (callable function)
 */
export const checkSubscriptionLimits = onCall(async (request) => {
  const { userId, resourceType } = request.data;
  
  if (!userId || !resourceType) {
    throw new HttpsError('invalid-argument', 'userId and resourceType are required');
  }
  
  try {
    const { exempt, limits } = await getUserLimits(userId);
    
    if (exempt) {
      return {
        exempt: true,
        withinLimit: true,
        currentCount: 0,
        limit: 0,
        message: 'User is exempt from limits'
      };
    }
    
    let currentCount = 0;
    let limit = 0;
    
    switch (resourceType) {
      case 'shows':
        currentCount = await countUserResources(userId, 'shows', 'createdBy');
        limit = limits.shows;
        break;
      case 'boards':
        // Boards count against show owner's subscription, not board creator's
        currentCount = await countUserBoards(userId);
        limit = limits.boards;
        break;
      case 'props':
        // Props count against show owner's subscription, not prop creator's
        currentCount = await countUserProps(userId);
        limit = limits.props;
        break;
      case 'packingBoxes':
        // Packing boxes count against show owner's subscription, not creator's
        currentCount = await countUserPackingBoxes(userId);
        limit = limits.packingBoxes;
        break;
      case 'collaboratorsPerShow':
        // Count collaborators across all shows owned by user
        const showIds = await getUserShowIds(userId);
        let totalCollaborators = 0;
        for (const showId of showIds) {
          const showDoc = await admin.firestore().doc(`shows/${showId}`).get();
          if (showDoc.exists) {
            const team = showDoc.data()?.team || {};
            totalCollaborators += Object.keys(team).length;
          }
        }
        currentCount = totalCollaborators;
        limit = limits.collaboratorsPerShow;
        break;
      default:
        throw new HttpsError('invalid-argument', `Unknown resource type: ${resourceType}`);
    }
    
    const usagePercent = limit > 0 ? (currentCount / limit) * 100 : 0;
    const isAlmostOut = usagePercent >= 80 && usagePercent < 100;
    const isAtLimit = currentCount >= limit;
    
    let message: string | undefined;
    if (isAtLimit) {
      message = `You have reached your plan's ${resourceType} limit of ${limit}. Upgrade to create more ${resourceType}.`;
    } else if (isAlmostOut) {
      message = `Warning: You're using ${currentCount} of ${limit} ${resourceType} (${Math.round(usagePercent)}%). Consider upgrading your plan soon.`;
    }
    
    return {
      exempt: false,
      withinLimit: currentCount < limit,
      currentCount,
      limit,
      usagePercent,
      isAlmostOut,
      message
    };
  } catch (error) {
    logger.error('Error checking subscription limits:', error);
    // Provide more helpful error information
    if (error instanceof Error) {
      throw new HttpsError('internal', `Failed to check subscription limits: ${error.message}`);
    }
    throw new HttpsError('internal', 'Failed to check subscription limits');
  }
});

/**
 * Update user resource counts (triggered on create/delete)
 */
export const updateResourceCounts = onDocumentCreated('shows/{showId}', async (event: any) => {
  const showData = event.data?.data();
  const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
  
  if (!userId) return;
  
  try {
    const countRef = admin.firestore().doc(`userShowCounts/${userId}`);
    await countRef.set({
      count: FieldValue.increment(1),
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });
    
    logger.info(`Updated show count for user ${userId}`);
  } catch (error) {
    logger.error('Error updating show count:', error);
  }
});

export const updateBoardCounts = onDocumentCreated('todo_boards/{boardId}', async (event: any) => {
  const boardData = event.data?.data();
  const showId = boardData?.showId;
  
  // If board has no showId, it's a legacy board - use board creator
  if (!showId) {
    const userId = boardData?.ownerId;
    if (!userId) return;
    
    try {
      const countRef = admin.firestore().doc(`userBoardCounts/${userId}`);
      await countRef.set({
        count: FieldValue.increment(1),
        lastUpdated: FieldValue.serverTimestamp()
      }, { merge: true });
      
      logger.info(`Updated board count for user ${userId} (legacy board)`);
    } catch (error) {
      logger.error('Error updating board count:', error);
    }
    return;
  }
  
  try {
    // Get show owner - boards count against show owner's subscription
    const showDoc = await admin.firestore().doc(`shows/${showId}`).get();
    if (!showDoc.exists) {
      logger.warn(`Show ${showId} not found for board count update`);
      return;
    }
    
    const showData = showDoc.data();
    const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
    
    if (!userId) {
      logger.warn(`No owner found for show ${showId}`);
      return;
    }
    
    const countRef = admin.firestore().doc(`userBoardCounts/${userId}`);
    await countRef.set({
      count: FieldValue.increment(1),
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });
    
    logger.info(`Updated board count for user ${userId} (show owner)`);
  } catch (error) {
    logger.error('Error updating board count:', error);
  }
});

export const updatePropCounts = onDocumentCreated('props/{propId}', async (event: any) => {
  const propData = event.data?.data();
  const showId = propData?.showId;
  
  if (!showId) return;
  
  try {
    // Get show owner - props count against show owner's subscription
    const showDoc = await admin.firestore().doc(`shows/${showId}`).get();
    if (!showDoc.exists) {
      logger.warn(`Show ${showId} not found for prop count update`);
      return;
    }
    
    const showData = showDoc.data();
    const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
    
    if (!userId) {
      logger.warn(`No owner found for show ${showId}`);
      return;
    }
    
    const countRef = admin.firestore().doc(`userPropCounts/${userId}`);
    await countRef.set({
      count: FieldValue.increment(1),
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });
    
    logger.info(`Updated prop count for user ${userId} (show owner)`);
  } catch (error) {
    logger.error('Error updating prop count:', error);
  }
});

// Decrement counts on delete
export const decrementShowCounts = onDocumentDeleted('shows/{showId}', async (event: any) => {
  const showData = event.data?.data();
  const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
  
  if (!userId) return;
  
  try {
    const countRef = admin.firestore().doc(`userShowCounts/${userId}`);
    await countRef.set({
      count: FieldValue.increment(-1),
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });
    
    logger.info(`Decremented show count for user ${userId}`);
  } catch (error) {
    logger.error('Error decrementing show count:', error);
  }
});

export const decrementBoardCounts = onDocumentDeleted('todo_boards/{boardId}', async (event: any) => {
  const boardData = event.data?.data();
  const showId = boardData?.showId;
  
  // If board has no showId, it's a legacy board - use board creator
  if (!showId) {
    const userId = boardData?.ownerId;
    if (!userId) return;
    
    try {
      const countRef = admin.firestore().doc(`userBoardCounts/${userId}`);
      await countRef.set({
        count: FieldValue.increment(-1),
        lastUpdated: FieldValue.serverTimestamp()
      }, { merge: true });
      
      logger.info(`Decremented board count for user ${userId} (legacy board)`);
    } catch (error) {
      logger.error('Error decrementing board count:', error);
    }
    return;
  }
  
  try {
    // Get show owner - boards count against show owner's subscription
    const showDoc = await admin.firestore().doc(`shows/${showId}`).get();
    if (!showDoc.exists) {
      logger.warn(`Show ${showId} not found for board count decrement`);
      return;
    }
    
    const showData = showDoc.data();
    const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
    
    if (!userId) {
      logger.warn(`No owner found for show ${showId}`);
      return;
    }
    
    const countRef = admin.firestore().doc(`userBoardCounts/${userId}`);
    await countRef.set({
      count: FieldValue.increment(-1),
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });
    
    logger.info(`Decremented board count for user ${userId} (show owner)`);
  } catch (error) {
    logger.error('Error decrementing board count:', error);
  }
});

export const decrementPropCounts = onDocumentDeleted('props/{propId}', async (event: any) => {
  const propData = event.data?.data();
  const showId = propData?.showId;
  
  if (!showId) return;
  
  try {
    // Get show owner - props count against show owner's subscription
    const showDoc = await admin.firestore().doc(`shows/${showId}`).get();
    if (!showDoc.exists) {
      logger.warn(`Show ${showId} not found for prop count decrement`);
      return;
    }
    
    const showData = showDoc.data();
    const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
    
    if (!userId) {
      logger.warn(`No owner found for show ${showId}`);
      return;
    }
    
    const countRef = admin.firestore().doc(`userPropCounts/${userId}`);
    await countRef.set({
      count: FieldValue.increment(-1),
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });
    
    logger.info(`Decremented prop count for user ${userId} (show owner)`);
  } catch (error) {
    logger.error('Error decrementing prop count:', error);
  }
});

export const updatePackingBoxCounts = onDocumentCreated('packingBoxes/{boxId}', async (event: any) => {
  const boxData = event.data?.data();
  const showId = boxData?.showId;
  
  if (!showId) return;
  
  try {
    // Get show owner - packing boxes count against show owner's subscription
    const showDoc = await admin.firestore().doc(`shows/${showId}`).get();
    if (!showDoc.exists) {
      logger.warn(`Show ${showId} not found for packing box count update`);
      return;
    }
    
    const showData = showDoc.data();
    const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
    
    if (!userId) {
      logger.warn(`No owner found for show ${showId}`);
      return;
    }
    
    const countRef = admin.firestore().doc(`userPackingBoxCounts/${userId}`);
    await countRef.set({
      count: FieldValue.increment(1),
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });
    
    logger.info(`Updated packing box count for user ${userId} (show owner)`);
  } catch (error) {
    logger.error('Error updating packing box count:', error);
  }
});

export const decrementPackingBoxCounts = onDocumentDeleted('packingBoxes/{boxId}', async (event: any) => {
  const boxData = event.data?.data();
  const showId = boxData?.showId;
  
  if (!showId) return;
  
  try {
    // Get show owner - packing boxes count against show owner's subscription
    const showDoc = await admin.firestore().doc(`shows/${showId}`).get();
    if (!showDoc.exists) {
      logger.warn(`Show ${showId} not found for packing box count decrement`);
      return;
    }
    
    const showData = showDoc.data();
    const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
    
    if (!userId) {
      logger.warn(`No owner found for show ${showId}`);
      return;
    }
    
    const countRef = admin.firestore().doc(`userPackingBoxCounts/${userId}`);
    await countRef.set({
      count: FieldValue.increment(-1),
      lastUpdated: FieldValue.serverTimestamp()
    }, { merge: true });
    
    logger.info(`Decremented packing box count for user ${userId} (show owner)`);
  } catch (error) {
    logger.error('Error decrementing packing box count:', error);
  }
});
