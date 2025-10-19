"use strict";
/**
 * Subscription Validation Cloud Functions
 *
 * Server-side validation for subscription limits and permissions
 * This approach is more efficient than complex Firestore rules
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.decrementPropCounts = exports.decrementBoardCounts = exports.decrementShowCounts = exports.updatePropCounts = exports.updateBoardCounts = exports.updateResourceCounts = exports.checkSubscriptionLimits = exports.validateTeamInvitation = exports.validatePropCreation = exports.validateBoardCreation = exports.validateShowCreation = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
const firestore_2 = require("firebase-admin/firestore");
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
async function getUserLimits(userId) {
    const userDoc = await admin.firestore().doc(`userProfiles/${userId}`).get();
    if (!userDoc.exists) {
        throw new Error('User profile not found');
    }
    const userData = userDoc.data();
    const plan = userData?.plan || 'free';
    const subscriptionStatus = userData?.subscriptionStatus || 'inactive';
    // God users and active subscribers are exempt from limits
    if (userData?.role === 'god' || subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
        return { exempt: true, limits: null };
    }
    return { exempt: false, limits: SUBSCRIPTION_LIMITS[plan] || SUBSCRIPTION_LIMITS.free };
}
/**
 * Count user's resources
 */
async function countUserResources(userId, collection, field = 'ownerId') {
    const snapshot = await admin.firestore()
        .collection(collection)
        .where(field, '==', userId)
        .get();
    return snapshot.size;
}
/**
 * Count show's resources
 */
async function countShowResources(showId, collection, field = 'showId') {
    const snapshot = await admin.firestore()
        .collection(collection)
        .where(field, '==', showId)
        .get();
    return snapshot.size;
}
/**
 * Validate show creation
 */
exports.validateShowCreation = (0, firestore_1.onDocumentCreated)('shows/{showId}', async (event) => {
    const showData = event.data?.data();
    // Input validation
    if (!showData) {
        firebase_functions_1.logger.error('Show creation validation failed: No show data found');
        await event.data?.ref.delete();
        return;
    }
    const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
    if (!userId || typeof userId !== 'string') {
        firebase_functions_1.logger.error('Show creation validation failed: Invalid user ID');
        await event.data?.ref.delete();
        return;
    }
    try {
        const { exempt, limits } = await getUserLimits(userId);
        if (exempt) {
            firebase_functions_1.logger.info(`User ${userId} is exempt from limits, allowing show creation`);
            return;
        }
        const currentCount = await countUserResources(userId, 'shows', 'createdBy');
        if (currentCount >= limits.shows) {
            firebase_functions_1.logger.warn(`User ${userId} exceeded show limit: ${currentCount}/${limits.shows}`);
            // Delete the show that was just created
            await event.data?.ref.delete();
            throw new https_1.HttpsError('permission-denied', `Show limit exceeded. You can create up to ${limits.shows} shows on your current plan.`);
        }
        firebase_functions_1.logger.info(`Show creation validated for user ${userId}: ${currentCount + 1}/${limits.shows}`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Show creation validation error:', error);
        // Delete the show if validation failed
        await event.data?.ref.delete();
        throw error;
    }
});
/**
 * Validate board creation
 */
exports.validateBoardCreation = (0, firestore_1.onDocumentCreated)('todo_boards/{boardId}', async (event) => {
    const boardData = event.data?.data();
    // Input validation
    if (!boardData) {
        firebase_functions_1.logger.error('Board creation validation failed: No board data found');
        await event.data?.ref.delete();
        return;
    }
    const userId = boardData?.ownerId;
    if (!userId || typeof userId !== 'string') {
        firebase_functions_1.logger.error('Board creation validation failed: Invalid user ID');
        await event.data?.ref.delete();
        return;
    }
    try {
        const { exempt, limits } = await getUserLimits(userId);
        if (exempt) {
            firebase_functions_1.logger.info(`User ${userId} is exempt from limits, allowing board creation`);
            return;
        }
        const currentCount = await countUserResources(userId, 'todo_boards', 'ownerId');
        if (currentCount >= limits.boards) {
            firebase_functions_1.logger.warn(`User ${userId} exceeded board limit: ${currentCount}/${limits.boards}`);
            await event.data?.ref.delete();
            throw new https_1.HttpsError('permission-denied', `Board limit exceeded. You can create up to ${limits.boards} boards on your current plan.`);
        }
        firebase_functions_1.logger.info(`Board creation validated for user ${userId}: ${currentCount + 1}/${limits.boards}`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Board creation validation error:', error);
        await event.data?.ref.delete();
        throw error;
    }
});
/**
 * Validate prop creation
 */
exports.validatePropCreation = (0, firestore_1.onDocumentCreated)('props/{propId}', async (event) => {
    const propData = event.data?.data();
    // Input validation
    if (!propData) {
        firebase_functions_1.logger.error('Prop creation validation failed: No prop data found');
        await event.data?.ref.delete();
        return;
    }
    const showId = propData?.showId;
    if (!showId || typeof showId !== 'string') {
        firebase_functions_1.logger.error('Prop creation validation failed: Invalid show ID');
        await event.data?.ref.delete();
        return;
    }
    try {
        // Get show owner
        const showDoc = await admin.firestore().doc(`shows/${showId}`).get();
        if (!showDoc.exists) {
            firebase_functions_1.logger.error('Show not found for prop validation');
            await event.data?.ref.delete();
            return;
        }
        const showData = showDoc.data();
        const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
        if (!userId) {
            firebase_functions_1.logger.error('Prop creation validation failed: No user ID found in show');
            await event.data?.ref.delete();
            return;
        }
        const { exempt, limits } = await getUserLimits(userId);
        if (exempt) {
            firebase_functions_1.logger.info(`User ${userId} is exempt from limits, allowing prop creation`);
            return;
        }
        const currentCount = await countUserResources(userId, 'props', 'ownerId');
        if (currentCount >= limits.props) {
            firebase_functions_1.logger.warn(`User ${userId} exceeded prop limit: ${currentCount}/${limits.props}`);
            await event.data?.ref.delete();
            throw new https_1.HttpsError('permission-denied', `Props limit exceeded. You can create up to ${limits.props} props on your current plan.`);
        }
        firebase_functions_1.logger.info(`Prop creation validated for user ${userId}: ${currentCount + 1}/${limits.props}`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Prop creation validation error:', error);
        await event.data?.ref.delete();
        throw error;
    }
});
/**
 * Validate team member invitation
 */
exports.validateTeamInvitation = (0, firestore_1.onDocumentCreated)('invitations/{inviteId}', async (event) => {
    const inviteData = event.data?.data();
    // Input validation
    if (!inviteData) {
        firebase_functions_1.logger.error('Team invitation validation failed: No invitation data found');
        await event.data?.ref.delete();
        return;
    }
    const showId = inviteData?.showId;
    if (!showId || typeof showId !== 'string') {
        firebase_functions_1.logger.error('Team invitation validation failed: Invalid show ID');
        await event.data?.ref.delete();
        return;
    }
    try {
        // Get show owner
        const showDoc = await admin.firestore().doc(`shows/${showId}`).get();
        if (!showDoc.exists) {
            firebase_functions_1.logger.error('Show not found for invitation validation');
            await event.data?.ref.delete();
            return;
        }
        const showData = showDoc.data();
        const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
        if (!userId) {
            firebase_functions_1.logger.error('Team invitation validation failed: No user ID found in show');
            await event.data?.ref.delete();
            return;
        }
        const { exempt, limits } = await getUserLimits(userId);
        if (exempt) {
            firebase_functions_1.logger.info(`User ${userId} is exempt from limits, allowing team invitation`);
            return;
        }
        // Count current team members
        const teamMembers = Object.keys(showData?.team || {}).length;
        if (teamMembers >= limits.collaboratorsPerShow) {
            firebase_functions_1.logger.warn(`User ${userId} exceeded collaborator limit: ${teamMembers}/${limits.collaboratorsPerShow}`);
            await event.data?.ref.delete();
            throw new https_1.HttpsError('permission-denied', `Collaborator limit exceeded. You can invite up to ${limits.collaboratorsPerShow} collaborators per show on your current plan.`);
        }
        firebase_functions_1.logger.info(`Team invitation validated for user ${userId}: ${teamMembers + 1}/${limits.collaboratorsPerShow}`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Team invitation validation error:', error);
        await event.data?.ref.delete();
        throw error;
    }
});
/**
 * Check subscription limits (callable function)
 */
exports.checkSubscriptionLimits = (0, https_1.onCall)(async (request) => {
    const { userId, resourceType } = request.data;
    if (!userId || !resourceType) {
        throw new https_1.HttpsError('invalid-argument', 'userId and resourceType are required');
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
                currentCount = await countUserResources(userId, 'todo_boards', 'ownerId');
                limit = limits.boards;
                break;
            case 'props':
                currentCount = await countUserResources(userId, 'props', 'ownerId');
                limit = limits.props;
                break;
            case 'packingBoxes':
                currentCount = await countUserResources(userId, 'packingBoxes', 'ownerId');
                limit = limits.packingBoxes;
                break;
            default:
                throw new https_1.HttpsError('invalid-argument', `Unknown resource type: ${resourceType}`);
        }
        return {
            exempt: false,
            withinLimit: currentCount < limit,
            currentCount,
            limit,
            message: currentCount >= limit
                ? `You have reached your plan's ${resourceType} limit of ${limit}. Upgrade to create more ${resourceType}.`
                : undefined
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error checking subscription limits:', error);
        throw error;
    }
});
/**
 * Update user resource counts (triggered on create/delete)
 */
exports.updateResourceCounts = (0, firestore_1.onDocumentCreated)('shows/{showId}', async (event) => {
    const showData = event.data?.data();
    const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
    if (!userId)
        return;
    try {
        const countRef = admin.firestore().doc(`userShowCounts/${userId}`);
        await countRef.set({
            count: firestore_2.FieldValue.increment(1),
            lastUpdated: firestore_2.FieldValue.serverTimestamp()
        }, { merge: true });
        firebase_functions_1.logger.info(`Updated show count for user ${userId}`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Error updating show count:', error);
    }
});
exports.updateBoardCounts = (0, firestore_1.onDocumentCreated)('todo_boards/{boardId}', async (event) => {
    const boardData = event.data?.data();
    const userId = boardData?.ownerId;
    if (!userId)
        return;
    try {
        const countRef = admin.firestore().doc(`userBoardCounts/${userId}`);
        await countRef.set({
            count: firestore_2.FieldValue.increment(1),
            lastUpdated: firestore_2.FieldValue.serverTimestamp()
        }, { merge: true });
        firebase_functions_1.logger.info(`Updated board count for user ${userId}`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Error updating board count:', error);
    }
});
exports.updatePropCounts = (0, firestore_1.onDocumentCreated)('props/{propId}', async (event) => {
    const propData = event.data?.data();
    const userId = propData?.ownerId;
    if (!userId)
        return;
    try {
        const countRef = admin.firestore().doc(`userPropCounts/${userId}`);
        await countRef.set({
            count: firestore_2.FieldValue.increment(1),
            lastUpdated: firestore_2.FieldValue.serverTimestamp()
        }, { merge: true });
        firebase_functions_1.logger.info(`Updated prop count for user ${userId}`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Error updating prop count:', error);
    }
});
// Decrement counts on delete
exports.decrementShowCounts = (0, firestore_1.onDocumentDeleted)('shows/{showId}', async (event) => {
    const showData = event.data?.data();
    const userId = showData?.createdBy || showData?.ownerId || showData?.userId;
    if (!userId)
        return;
    try {
        const countRef = admin.firestore().doc(`userShowCounts/${userId}`);
        await countRef.set({
            count: firestore_2.FieldValue.increment(-1),
            lastUpdated: firestore_2.FieldValue.serverTimestamp()
        }, { merge: true });
        firebase_functions_1.logger.info(`Decremented show count for user ${userId}`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Error decrementing show count:', error);
    }
});
exports.decrementBoardCounts = (0, firestore_1.onDocumentDeleted)('todo_boards/{boardId}', async (event) => {
    const boardData = event.data?.data();
    const userId = boardData?.ownerId;
    if (!userId)
        return;
    try {
        const countRef = admin.firestore().doc(`userBoardCounts/${userId}`);
        await countRef.set({
            count: firestore_2.FieldValue.increment(-1),
            lastUpdated: firestore_2.FieldValue.serverTimestamp()
        }, { merge: true });
        firebase_functions_1.logger.info(`Decremented board count for user ${userId}`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Error decrementing board count:', error);
    }
});
exports.decrementPropCounts = (0, firestore_1.onDocumentDeleted)('props/{propId}', async (event) => {
    const propData = event.data?.data();
    const userId = propData?.ownerId;
    if (!userId)
        return;
    try {
        const countRef = admin.firestore().doc(`userPropCounts/${userId}`);
        await countRef.set({
            count: firestore_2.FieldValue.increment(-1),
            lastUpdated: firestore_2.FieldValue.serverTimestamp()
        }, { merge: true });
        firebase_functions_1.logger.info(`Decremented prop count for user ${userId}`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Error decrementing prop count:', error);
    }
});
