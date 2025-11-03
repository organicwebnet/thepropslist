/**
 * Shared utility for creating FirebaseService adapters
 * 
 * This utility extracts the common adapter creation logic to reduce duplication
 * between platform-specific permission hooks.
 */

import type { FirebaseServiceInterface } from './usePermissions';
import type { FirebaseDocument, DocumentData } from '../services/firebase/types';

/**
 * Minimal interface for FirebaseService that we need for the adapter
 * This allows the adapter to work with both web and mobile FirebaseService implementations
 */
interface MinimalFirebaseService {
  getDocuments: <T extends DocumentData = DocumentData>(
    collectionPath: string, 
    options?: { where?: [string, any, any][]; orderBy?: [string, 'asc' | 'desc'][]; limit?: number }
  ) => Promise<FirebaseDocument<T>[]>;
}

/**
 * Creates a FirebaseService adapter that converts platform-specific FirebaseService
 * to the interface expected by the shared permission hook.
 * 
 * The adapter extracts the `data` property from FirebaseDocument objects since
 * the permission system only needs the document data, not the full document wrapper.
 * 
 * @param firebaseService - The platform-specific FirebaseService instance
 * @returns A FirebaseServiceInterface adapter, or null if service is not available
 */
export function createFirebaseAdapter(
  firebaseService: MinimalFirebaseService | null
): FirebaseServiceInterface | null {
  if (!firebaseService) {
    return null;
  }

  return {
    getDocuments: async <T extends DocumentData = DocumentData>(
      collection: string, 
      options?: { where?: [string, string, any][] }
    ): Promise<T[]> => {
      try {
        const result = await firebaseService.getDocuments<T>(collection, {
          where: options?.where,
          orderBy: undefined,
          limit: undefined
        });
        
        // FirebaseDocument has { id, data } structure, extract data property
        return result.map((doc: FirebaseDocument<T>) => {
          // FirebaseDocument always has .data property
          return doc.data;
        });
      } catch (error) {
        console.error(`Error fetching documents from ${collection}:`, error);
        // Return empty array on error to prevent permission system from breaking
        return [];
      }
    }
  };
}

