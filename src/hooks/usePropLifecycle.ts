import { useState, useEffect, useCallback } from 'react';
import { serverTimestamp, Timestamp as FirebaseTimestamp } from 'firebase/firestore';
import { useFirebase } from '../platforms/mobile/contexts/FirebaseContext';
import { User } from 'firebase/auth';
import { Prop } from '../shared/types/props.ts';
import type { PropStatusUpdate, MaintenanceRecord, PropLifecycleStatus } from '../types/lifecycle.ts';
import { lifecycleStatusLabels } from '../types/lifecycle.ts';
import { FirebaseDocument, QueryOptions } from '../shared/services/firebase/types.ts';
import { PropStatusService } from '../shared/services/PropStatusService';

// Local interface matching Firestore data for status history
// This matches PropStatusUpdate from lifecycle types
interface PropStatusFirestoreData {
  previousStatus?: string;
  newStatus: string;
  date: string | FirebaseTimestamp; // Can be ISO string or Firestore Timestamp
  createdAt: string | FirebaseTimestamp;
  updatedBy: string;
  notes?: string;
  damageImageUrls?: string[];
}

// Local interface matching state for status history
interface PropStatusState {
  id: string; // Add id for React keys
  status: string;
  timestamp: Date; // State uses Date object
  notes?: string;
  images?: string[];
  updatedBy: string;
}

// MaintenanceRecord in '../types/lifecycle.ts' expects dates as strings.
// If Firestore stores Timestamps for MaintenanceRecord, we need a Firestore-specific type or careful mapping.
// For now, assume MaintenanceRecord's date fields (date, createdAt) are stored as Timestamps in Firestore.

interface UsePropLifecycleProps {
  propId?: string;
  currentUser: User | null;
}

export function usePropLifecycle({ propId, currentUser }: UsePropLifecycleProps) {
  const { service } = useFirebase();
  const [statusHistory, setStatusHistory] = useState<PropStatusState[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!propId || !service?.listenToCollection) {
      setLoading(false);
      setStatusHistory([]);
      setMaintenanceHistory([]);
      return;
    }

    setLoading(true);
    setError(null);

    const statusPath = `props/${propId}/statusHistory`;
    const maintenancePath = `props/${propId}/maintenanceHistory`;

    // Listener for status history
    const unsubscribeStatus = service.listenToCollection<PropStatusFirestoreData>(
      statusPath,
      (docs: FirebaseDocument<PropStatusFirestoreData>[]) => {
        const statuses = docs
          .map(docSnapshot => {
            const data = docSnapshot.data;
            if (!data) {
              return null; // Return null for invalid data
            }
            // Handle both old format (status, timestamp) and new format (previousStatus, newStatus, date)
            const status = data.newStatus || (data as any).status || 'confirmed';
            const dateValue = data.date || (data as any).timestamp;
            const timestamp = dateValue && typeof dateValue === 'object' && 'toDate' in dateValue
              ? dateValue.toDate()
              : typeof dateValue === 'string'
              ? new Date(dateValue)
              : new Date();
            
            return {
              id: docSnapshot.id,
              status,
              notes: data.notes,
              images: data.damageImageUrls || (data as any).images,
              updatedBy: data.updatedBy,
              timestamp,
            } as PropStatusState;
          })
          .filter(Boolean as any as (value: PropStatusState | null) => value is PropStatusState); // Filter out nulls
        setStatusHistory(statuses);
      },
      (err: Error) => {
        setError(err); // Or accumulate errors
        setLoading(false);
      }
    );

    // Listener for maintenance history
    const unsubscribeMaintenance = service.listenToCollection<MaintenanceRecord>(
      maintenancePath,
      (docs: FirebaseDocument<MaintenanceRecord>[]) => {
        const records = docs
          .map(docSnapshot => {
            const data = docSnapshot.data;
            if (!data) {
              return null; // Return null for invalid data
            }
            // Ensure all required fields of MaintenanceRecord are present after spread
            return {
              id: docSnapshot.id,
              ...(data as Partial<MaintenanceRecord>), // Spread data
              type: data.type || 'inspection', // Default to a valid type if missing
              description: data.description || '',
              performedBy: data.performedBy || 'Unknown',
              createdBy: data.createdBy || 'Unknown',
              // cost and notes can be undefined if optional, handle type conversion if present
              cost: data.cost !== undefined ? Number(data.cost) : undefined,
              notes: data.notes !== undefined ? String(data.notes) : undefined,

              // Timestamp conversions
              date: data.date && typeof (data.date as any).toDate === 'function' 
                      ? (data.date as any).toDate().toISOString() 
                      : (typeof data.date === 'string' ? data.date : new Date().toISOString()),
              createdAt: data.createdAt && typeof (data.createdAt as any).toDate === 'function' 
                           ? (data.createdAt as any).toDate().toISOString() 
                           : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
              estimatedReturnDate: data.estimatedReturnDate && typeof (data.estimatedReturnDate as any).toDate === 'function' 
                                     ? (data.estimatedReturnDate as any).toDate().toISOString() 
                                     : (typeof data.estimatedReturnDate === 'string' ? data.estimatedReturnDate : undefined),
              repairDeadline: data.repairDeadline && typeof (data.repairDeadline as any).toDate === 'function' 
                                  ? (data.repairDeadline as any).toDate().toISOString() 
                                  : (typeof data.repairDeadline === 'string' ? data.repairDeadline : undefined),
            } as MaintenanceRecord;
          })
          .filter(Boolean as any as (value: MaintenanceRecord | null) => value is MaintenanceRecord); // Filter out nulls
        setMaintenanceHistory(records);
        setLoading(false);
      },
      (err: Error) => {
        setError(err); // Or accumulate errors
        setLoading(false);
      }
    );

    return () => {
      if (typeof unsubscribeStatus === 'function') unsubscribeStatus();
      if (typeof unsubscribeMaintenance === 'function') unsubscribeMaintenance();
    };
  }, [propId, service]);

  const updatePropStatus = async (
    status: string,
    notes?: string,
    images?: File[], // Assuming File type for web, adjust for native if needed
    videos?: File[],
    reason?: string
  ): Promise<void> => {
    if (!propId || !currentUser || !service?.addDocument || !service?.updateDocument) {
      throw new Error('PropId, currentUser, and Firebase service (addDocument and updateDocument) are required.');
    }

    try {
      // Validate status is a valid PropLifecycleStatus
      const validStatuses = Object.keys(lifecycleStatusLabels);
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status value: ${status}`);
      }

      // Get current prop to track previous status
      const propDoc = await service.getDocument<Prop>('props', propId);
      if (!propDoc || !propDoc.data) {
        throw new Error('Prop not found');
      }
      const prop = { ...propDoc.data, id: propId } as Prop;
      const previousStatus = (prop.status || 'confirmed') as PropLifecycleStatus;
      const newStatus = status as PropLifecycleStatus;

      // Validate status transition
      const validation = PropStatusService.validateStatusTransition(previousStatus, newStatus, false);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid status transition');
      }

      // Upload images and videos using Firebase Storage
      const imageUrls: string[] = [];
      const videoUrls: string[] = [];
      
      // Helper to check if value is a File object (web) vs string URI (mobile)
      const isFileObject = (file: any): file is File => {
        return file instanceof File || (typeof file === 'object' && file !== null && 'name' in file && 'type' in file && 'size' in file);
      };
      
      if (images && images.length > 0) {
        for (const image of images) {
          try {
            if (isFileObject(image)) {
              // File object (web) - try to upload
              const storagePath = `props/${propId}/status/images/${Date.now()}-${image.name}`;
              const url = await service.uploadFile(storagePath, image as any);
              imageUrls.push(url);
            } else if (typeof image === 'string') {
              // String URI (mobile)
              const fileName = image.split('/').pop() || `image-${Date.now()}`;
              const storagePath = `props/${propId}/status/images/${Date.now()}-${fileName}`;
              const url = await service.uploadFile(storagePath, image);
              imageUrls.push(url);
            }
          } catch (error: any) {
            // Log but don't fail - file upload errors shouldn't block status updates
            const errorMsg = error?.message || 'Unknown upload error';
            console.warn('Failed to upload image (continuing with status update):', errorMsg);
            // Continue with other uploads even if one fails
          }
        }
      }

      if (videos && videos.length > 0) {
        for (const video of videos) {
          try {
            if (isFileObject(video)) {
              // File object (web) - try to upload
              const storagePath = `props/${propId}/status/videos/${Date.now()}-${video.name}`;
              const url = await service.uploadFile(storagePath, video as any);
              videoUrls.push(url);
            } else if (typeof video === 'string') {
              // String URI (mobile)
              const fileName = video.split('/').pop() || `video-${Date.now()}`;
              const storagePath = `props/${propId}/status/videos/${Date.now()}-${fileName}`;
              const url = await service.uploadFile(storagePath, video);
              videoUrls.push(url);
            }
          } catch (error: any) {
            // Log but don't fail - file upload errors shouldn't block status updates
            const errorMsg = error?.message || 'Unknown upload error';
            console.warn('Failed to upload video (continuing with status update):', errorMsg);
            // Continue with other uploads even if one fails
          }
        }
      }

      // Get data cleanup updates
      const cleanupUpdates = PropStatusService.getDataCleanupUpdates(newStatus);

      // Update prop document status with cleanup
      await service.updateDocument('props', propId, {
        status,
        lastStatusUpdate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...cleanupUpdates,
      });

      // Create enhanced status history entry
      const statusUpdate = PropStatusService.createStatusHistoryEntry({
        prop,
        previousStatus,
        newStatus,
        updatedBy: currentUser.uid,
        notes,
        reason,
        firebaseService: service as any,
      });

      // Add damage images and videos if provided
      if (imageUrls.length > 0) {
        (statusUpdate as any).damageImageUrls = imageUrls;
      }
      if (videoUrls.length > 0) {
        (statusUpdate as any).damageVideoUrls = videoUrls;
      }

      const statusHistoryDoc = await service.addDocument(`props/${propId}/statusHistory`, statusUpdate);

      // Handle automated workflows
      try {
        const workflowResult = await PropStatusService.handleAutomatedWorkflows({
          prop,
          previousStatus,
          newStatus,
          updatedBy: currentUser.uid,
          notes,
          reason,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          videoUrls: videoUrls.length > 0 ? videoUrls : undefined,
          firebaseService: service as any,
        });

        // Update status history with related task ID if one was created
        if (workflowResult.taskCreated && statusHistoryDoc?.id) {
          await service.updateDocument(`props/${propId}/statusHistory`, statusHistoryDoc.id, {
            relatedTaskId: workflowResult.taskCreated,
          });
        }
      } catch (workflowErr) {
        console.warn('Error in automated workflows:', workflowErr);
      }

      // Send notifications
      try {
        await PropStatusService.sendStatusChangeNotifications({
          prop,
          previousStatus,
          newStatus,
          updatedBy: currentUser.uid,
          notes,
          firebaseService: service as any,
          notifyTeam: true,
        });
      } catch (notifErr) {
        console.warn('Error sending notifications:', notifErr);
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update status');
      setError(error);
      throw error;
    }
  };

  const addMaintenanceRecord = async (
    recordData: Omit<MaintenanceRecord, 'id' | 'date' | 'createdAt' | 'performedBy' | 'createdBy'>,
  ): Promise<string | null> => {
    if (!propId || !currentUser || !service?.addDocument) {
      throw new Error('PropId, currentUser, and Firebase service (addDocument) are required.');
    }
    try {
      const dataToSave = {
        ...recordData,
        propId: propId, // Ensure propId is part of the record if it's not in recordData
        date: new Date().toISOString(),
        performedBy: currentUser.uid,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
      };
      // The data being passed to addDocument does not and should not have an 'id'.
      // The type argument for addDocument should reflect the data being passed in.
      // The service.addDocument method will return a DocumentReference which contains the id.
      const newDoc = await service.addDocument<Omit<MaintenanceRecord, 'id'>>(
        `props/${propId}/maintenanceHistory`,
        dataToSave as any // Keep 'as any' for now if serverTimestamp causes issues with strict type matching, or refine to Omit<MaintenanceRecord, 'id'>
      );
      return newDoc.id;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add maintenance record');
      setError(error);
      throw error;
    }
  };

  const updateMaintenanceRecord = async (
    recordId: string,
    recordData: Partial<Omit<MaintenanceRecord, 'id' | 'createdAt' | 'createdBy'>>,
  ): Promise<void> => {
    if (!propId || !currentUser || !service?.updateDocument) {
      throw new Error('PropId, currentUser, and Firebase service (updateDocument) are required.');
    }
    try {
      // Convert date strings to ISO strings if provided
      const updateData: any = { ...recordData };
      if (updateData.date && typeof updateData.date === 'string') {
        updateData.date = new Date(updateData.date).toISOString();
      }
      if (updateData.estimatedReturnDate && typeof updateData.estimatedReturnDate === 'string') {
        updateData.estimatedReturnDate = new Date(updateData.estimatedReturnDate).toISOString();
      }
      if (updateData.repairDeadline && typeof updateData.repairDeadline === 'string') {
        updateData.repairDeadline = new Date(updateData.repairDeadline).toISOString();
      }

      await service.updateDocument(
        `props/${propId}/maintenanceHistory`,
        recordId,
        updateData
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update maintenance record');
      setError(error);
      throw error;
    }
  };

  const deleteMaintenanceRecord = async (recordId: string): Promise<void> => {
    if (!propId || !currentUser || !service?.deleteDocument) {
      throw new Error('PropId, currentUser, and Firebase service (deleteDocument) are required.');
    }
    try {
      await service.deleteDocument(`props/${propId}/maintenanceHistory`, recordId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete maintenance record');
      setError(error);
      throw error;
    }
  };

  return {
    statusHistory,
    maintenanceHistory,
    loading,
    error,
    updatePropStatus,
    addMaintenanceRecord,
    updateMaintenanceRecord,
    deleteMaintenanceRecord,
  };
} 
