"use strict";
/**
 * Prop Status Auto-Revert Function
 *
 * Automatically reverts props from "repaired_back_in_show" to "confirmed"
 * after 48 hours if they haven't been manually updated.
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
exports.autoRevertRepairedProps = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Scheduled function that runs every hour to check for props that need status reversion
 * Props with status "repaired_back_in_show" that haven't been updated in 48 hours
 * will be automatically changed to "confirmed"
 */
exports.autoRevertRepairedProps = functions.scheduler.onSchedule('every 1 hours', async (event) => {
    const now = admin.firestore.Timestamp.now();
    const fortyEightHoursAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - (48 * 60 * 60 * 1000));
    try {
        // Find all props with status "repaired_back_in_show" that were last updated more than 48 hours ago
        const propsQuery = await db.collection('props')
            .where('status', '==', 'repaired_back_in_show')
            .where('lastStatusUpdate', '<', fortyEightHoursAgo)
            .limit(500) // Process in batches to avoid timeout
            .get();
        if (propsQuery.empty) {
            functions.logger.info('No props found that need status reversion');
            return;
        }
        const batch = db.batch();
        let updateCount = 0;
        for (const propDoc of propsQuery.docs) {
            const prop = propDoc.data();
            const propId = propDoc.id;
            // Double-check the lastStatusUpdate is still old (in case it was updated during processing)
            if (prop.lastStatusUpdate && prop.lastStatusUpdate.toMillis() < fortyEightHoursAgo.toMillis()) {
                // Update prop status to confirmed
                batch.update(propDoc.ref, {
                    status: 'confirmed',
                    lastStatusUpdate: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                // Create status history entry
                const statusHistoryRef = db.collection(`props/${propId}/statusHistory`).doc();
                batch.set(statusHistoryRef, {
                    previousStatus: 'repaired_back_in_show',
                    newStatus: 'confirmed',
                    updatedBy: 'system',
                    date: admin.firestore.FieldValue.serverTimestamp(),
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    notes: 'Status automatically reverted to confirmed after 48 hours',
                    automated: true,
                });
                updateCount++;
            }
        }
        if (updateCount > 0) {
            await batch.commit();
            functions.logger.info(`Successfully reverted ${updateCount} props from repaired_back_in_show to confirmed`);
        }
        else {
            functions.logger.info('No props needed status reversion');
        }
    }
    catch (error) {
        functions.logger.error('Error in autoRevertRepairedProps:', error);
        throw error;
    }
});
