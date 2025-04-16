import { useState } from 'react';
import { doc, updateDoc, arrayUnion, Timestamp, getDoc } from 'firebase/firestore';
import { db, auth, storage } from '../lib/firebase';
import { PropLifecycleStatus, MaintenanceRecord, PropStatusUpdate } from '../types/lifecycle';
import { v4 as uuidv4 } from 'uuid';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface UsePropLifecycleProps {
  propId: string;
}

export function usePropLifecycle({ propId }: UsePropLifecycleProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddingMaintenance, setIsAddingMaintenance] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload images and get their URLs
  const uploadDamageImages = async (images: File[]): Promise<string[]> => {
    if (!images.length) return [];
    
    const imageUrls: string[] = [];
    
    for (const image of images) {
      const imageRef = ref(storage, `props/${propId}/damage-images/${Date.now()}-${image.name}`);
      await uploadBytes(imageRef, image);
      const url = await getDownloadURL(imageRef);
      imageUrls.push(url);
    }
    
    return imageUrls;
  };

  // Update prop status
  const updatePropStatus = async (
    newStatus: PropLifecycleStatus, 
    notes: string, 
    notifyTeam: boolean,
    damageImages?: File[]
  ): Promise<void> => {
    if (!auth.currentUser) {
      setError('You must be signed in to update prop status');
      return;
    }

    setIsUpdatingStatus(true);
    setError(null);

    try {
      const propRef = doc(db, 'props', propId);
      
      // Get the current prop data to get the current status
      const propSnap = await getDoc(propRef);
      if (!propSnap.exists()) {
        throw new Error('Prop not found');
      }
      const propData = propSnap.data();
      const currentStatus = propData.status as PropLifecycleStatus || 'confirmed'; // Default to 'confirmed' if no status
      
      const now = new Date().toISOString();
      
      // Upload damage images if provided
      let damageImageUrls: string[] = [];
      if (damageImages && damageImages.length > 0) {
        damageImageUrls = await uploadDamageImages(damageImages);
      }
      
      // Create base status update record with required fields
      const statusUpdate: PropStatusUpdate = {
        id: uuidv4(),
        date: now,
        previousStatus: currentStatus,
        newStatus,
        updatedBy: auth.currentUser.uid,
        createdAt: now
      };

      // Only add optional fields if they have non-empty values
      if (notes && notes.trim()) {
        statusUpdate.notes = notes.trim();
      }

      if (notifyTeam) {
        statusUpdate.notified = []; // Initialize as empty array
      }

      if (damageImageUrls.length > 0) {
        statusUpdate.damageImageUrls = damageImageUrls;
      }

      // Update the prop document
      const updateData: Record<string, any> = {
        status: newStatus,
        lastStatusUpdate: now
      };

      // Only add non-empty notes to the main document
      if (notes && notes.trim()) {
        updateData.statusNotes = notes.trim();
      }

      // Add the status update to history
      updateData.statusHistory = arrayUnion(statusUpdate);

      // Only add damage image URLs if they exist
      if (damageImageUrls.length > 0) {
        updateData.damageImageUrls = arrayUnion(...damageImageUrls);
      }

      await updateDoc(propRef, updateData);

      // If we should notify the team, we would handle that here
      if (notifyTeam) {
        // Implement notification logic
        console.log('Notification would be sent to team for status update');
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