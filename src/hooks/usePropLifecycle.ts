import { useState } from 'react';
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { PropLifecycleStatus, MaintenanceRecord, PropStatusUpdate } from '../types/lifecycle';
import { v4 as uuidv4 } from 'uuid';

interface UsePropLifecycleProps {
  propId: string;
}

export function usePropLifecycle({ propId }: UsePropLifecycleProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddingMaintenance, setIsAddingMaintenance] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update prop status
  const updatePropStatus = async (
    newStatus: PropLifecycleStatus, 
    notes: string, 
    notifyTeam: boolean
  ): Promise<void> => {
    if (!auth.currentUser) {
      setError('You must be signed in to update prop status');
      return;
    }

    setIsUpdatingStatus(true);
    setError(null);

    try {
      const propRef = doc(db, 'props', propId);
      const now = new Date().toISOString();
      
      // Get current values from the component that renders this hook
      // We don't fetch the document here to avoid unnecessary reads
      
      // Create status update record
      const statusUpdate: PropStatusUpdate = {
        id: uuidv4(),
        date: now,
        previousStatus: 'confirmed', // This will be set by the component using the hook
        newStatus,
        updatedBy: auth.currentUser.uid,
        notes: notes || undefined,
        notified: notifyTeam ? [] : undefined, // We'd add actual notification data here
        createdAt: now
      };

      // Update the prop document
      await updateDoc(propRef, {
        status: newStatus,
        statusNotes: notes || '',
        lastStatusUpdate: now,
        statusHistory: arrayUnion(statusUpdate)
      });

      // If we should notify the team, we would handle that here
      // This could include sending emails, creating notifications, etc.
      if (notifyTeam) {
        // Implement notification logic
        console.log('Notification would be sent to team for status update');
        // Update the status update with notified information
        // This would be done in a real implementation
      }
    } catch (err) {
      console.error('Error updating prop status:', err);
      setError('Failed to update prop status');
      throw err;
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Add maintenance record
  const addMaintenanceRecord = async (
    record: Omit<MaintenanceRecord, 'id' | 'createdAt' | 'createdBy'>
  ): Promise<void> => {
    if (!auth.currentUser) {
      setError('You must be signed in to add maintenance records');
      return;
    }

    setIsAddingMaintenance(true);
    setError(null);

    try {
      const propRef = doc(db, 'props', propId);
      const now = new Date().toISOString();
      
      // Create maintenance record
      const maintenanceRecord: MaintenanceRecord = {
        id: uuidv4(),
        ...record,
        createdAt: now,
        createdBy: auth.currentUser.uid
      };

      // Update additional fields based on the type of maintenance
      const updates: Record<string, any> = {
        maintenanceHistory: arrayUnion(maintenanceRecord)
      };

      // Update relevant dates based on the type of record
      if (record.type === 'maintenance') {
        updates.lastMaintenanceDate = record.date;
      } else if (record.type === 'inspection') {
        updates.lastInspectionDate = record.date;
      }

      // Update the prop document
      await updateDoc(propRef, updates);
    } catch (err) {
      console.error('Error adding maintenance record:', err);
      setError('Failed to add maintenance record');
      throw err;
    } finally {
      setIsAddingMaintenance(false);
    }
  };

  // Schedule next maintenance/inspection
  const scheduleNextAction = async (
    type: 'maintenance' | 'inspection',
    date: string
  ): Promise<void> => {
    if (!auth.currentUser) {
      setError('You must be signed in to schedule actions');
      return;
    }

    try {
      const propRef = doc(db, 'props', propId);
      
      // Update the field based on type
      if (type === 'maintenance') {
        await updateDoc(propRef, { nextMaintenanceDue: date });
      } else {
        await updateDoc(propRef, { nextInspectionDue: date });
      }
    } catch (err) {
      console.error(`Error scheduling next ${type}:`, err);
      setError(`Failed to schedule next ${type}`);
      throw err;
    }
  };

  // Update prop location
  const updateLocation = async (
    location: string,
    expectedReturnDate?: string
  ): Promise<void> => {
    if (!auth.currentUser) {
      setError('You must be signed in to update location');
      return;
    }

    try {
      const propRef = doc(db, 'props', propId);
      
      // Create update object
      const updates: Record<string, any> = { currentLocation: location };
      
      // Add expected return date if provided
      if (expectedReturnDate) {
        updates.expectedReturnDate = expectedReturnDate;
      }
      
      await updateDoc(propRef, updates);
    } catch (err) {
      console.error('Error updating location:', err);
      setError('Failed to update location');
      throw err;
    }
  };

  return {
    updatePropStatus,
    addMaintenanceRecord,
    scheduleNextAction,
    updateLocation,
    isUpdatingStatus,
    isAddingMaintenance,
    error
  };
} 