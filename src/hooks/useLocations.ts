import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import {
  collection as webCollection,
  query as webQuery,
  where as webWhere,
  onSnapshot as webOnSnapshot,
  serverTimestamp as webServerTimestamp,
  writeBatch as webWriteBatch,
  doc as webDoc,
  Firestore as WebFirestore,
  FieldValue as WebFieldValue
} from 'firebase/firestore';
import {
  FirebaseFirestoreTypes,
  collection as rnCollection,
  query as rnQuery,
  where as rnWhere,
  onSnapshot as rnOnSnapshot,
} from '@react-native-firebase/firestore';

import { useFirebase } from '../contexts/FirebaseContext.tsx';
import type { Location } from '../types/locations.ts';
import type { CustomFirestore, FirebaseDocument, QueryOptions } from '../shared/services/firebase/types.ts';
import { QRScannerService } from '../platforms/mobile/features/qr/QRScannerService.ts';

interface NewLocationFirestoreData {
  name: string;
  showId: string;
  description?: string;
  qrData: string;
  createdAt: any;
  updatedAt: any;
}

interface LocationOperations {
  createLocation: (name: string, showId: string, description?: string) => Promise<string | undefined>;
  updateLocation: (locationId: string, updates: Partial<Omit<Location, 'id' | 'showId' | 'createdAt'>>) => Promise<void>;
  deleteLocation: (locationId: string) => Promise<void>;
  getLocationById: (locationId: string) => Promise<FirebaseDocument<Location> | null>;
}

export function useLocations(showId?: string): {
  locations: Location[];
  loading: boolean;
  error: Error | null;
  operations: LocationOperations;
} {
  const { service } = useFirebase();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const qrScannerServiceInstance = useMemo(() => QRScannerService.getInstance(), []);

  useEffect(() => {
    if (!showId || !service?.listenToCollection) {
      setLoading(false);
      setLocations([]);
      setError(null);
      return;
    }
    
    setLoading(true);
    setError(null);

    const queryOptions: QueryOptions = {
      where: [["showId", "==", showId]],
    };

    const unsubscribe = service.listenToCollection<Location>(
      'locations',
      (docs: FirebaseDocument<Location>[]) => {
        const locationsData = docs
          .map(docSnapshot => {
            const data = docSnapshot.data;
            if (!data) {
              return null;
            }
            const { id: dataId, ...restOfData } = data as Location;
            return {
              id: docSnapshot.id,
              ...restOfData,
              createdAt: data.createdAt ? (data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt as any)) : new Date(),
              updatedAt: data.updatedAt ? (data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt as any)) : new Date(),
            } as Location;
          })
          .filter(loc => loc !== null) as Location[];
          
        setLocations(locationsData);
        setLoading(false);
      },
      (err: Error) => {
        setError(err);
        setLoading(false);
      },
      queryOptions
    );

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [showId, service]);

  const operations = useMemo((): LocationOperations => ({
    createLocation: async (name: string, currentShowId: string, description = '') => {
      if (!service?.addDocument || !currentShowId) {
        setError(new Error('Failed to create location: Service not ready.'));
        return undefined;
      }

      const newLocationData: NewLocationFirestoreData = {
        name,
        showId: currentShowId,
        description,
        qrData: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        const docRef = await service.addDocument<Location>('locations', newLocationData as any);
        if (docRef && docRef.id) {
          const qrDataString = qrScannerServiceInstance.generateQRData({ type: 'location', id: docRef.id, name, showId: currentShowId });
          await service.updateDocument('locations', docRef.id, { qrData: qrDataString, updatedAt: new Date().toISOString() });
          return docRef.id;
        }
        return undefined;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error creating location'));
        return undefined;
      }
    },
    updateLocation: async (locationId, updates) => {
      if (!service?.updateDocument) {
        setError(new Error('Failed to update location: Service not ready.'));
        return;
      }
      const dataToUpdate = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      try {
        await service.updateDocument('locations', locationId, dataToUpdate);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error updating location'));
        throw err;
      }
    },
    deleteLocation: async (locationId) => {
      if (!service?.deleteDocument) {
        setError(new Error('Failed to delete location: Service not ready.'));
        return;
      }
      try {
        await service.deleteDocument('locations', locationId);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error deleting location'));
        throw err;
      }
    },
    getLocationById: async (locationId: string): Promise<FirebaseDocument<Location> | null> => {
      if (!service?.getDocument) {
        setError(new Error('Failed to get location: Service not ready.'));
        return null;
      }
      try {
        return await service.getDocument<Location>('locations', locationId);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error fetching location'));
        return null;
      }
    },
  }), [service, showId, qrScannerServiceInstance]);

  return { locations, loading, error, operations };
} 
