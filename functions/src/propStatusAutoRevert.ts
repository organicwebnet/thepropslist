/**
 * Prop Status Auto-Revert Function
 * 
 * Automatically reverts props from "repaired_back_in_show" to "confirmed" 
 * after 48 hours if they haven't been manually updated.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Scheduled function that runs every hour to check for props that need status reversion
 * Props with status "repaired_back_in_show" that haven't been updated in 48 hours
 * will be automatically changed to "confirmed"
 */
export const autoRevertRepairedProps = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('UTC')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const fortyEightHoursAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - (48 * 60 * 60 * 1000)
    );

    try {
      // Find all props with status "repaired_back_in_show" that were last updated more than 48 hours ago
      const propsQuery = await db.collection('props')
        .where('status', '==', 'repaired_back_in_show')
        .where('lastStatusUpdate', '<', fortyEightHoursAgo)
        .limit(500) // Process in batches to avoid timeout
        .get();

      if (propsQuery.empty) {
        functions.logger.info('No props found that need status reversion');
        return null;
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
      } else {
        functions.logger.info('No props needed status reversion');
      }

      return null;
    } catch (error) {
      functions.logger.error('Error in autoRevertRepairedProps:', error);
      throw error;
    }
  });

