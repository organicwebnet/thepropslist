import { useState, useEffect, useCallback } from 'react';
import { useFirebase } from '../contexts/FirebaseContext';

export interface Address {
  id: string;
  name: string;
  type: 'venue' | 'rehearsal' | 'storage';
  companyName?: string;
  street1: string;
  street2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  nickname?: string;
}

export interface AddressError {
  type: 'network' | 'validation' | 'permission' | 'unknown';
  message: string;
  recoverable: boolean;
  retryable: boolean;
}

const createAddressError = (error: any): AddressError => {
  if (error.code === 'permission-denied') {
    return {
      type: 'permission',
      message: 'You do not have permission to perform this action',
      recoverable: false,
      retryable: false
    };
  }
  
  if (error.code === 'unavailable') {
    return {
      type: 'network',
      message: 'Network error. Please check your connection and try again',
      recoverable: true,
      retryable: true
    };
  }
  
  return {
    type: 'unknown',
    message: 'An unexpected error occurred. Please try again',
    recoverable: true,
    retryable: true
  };
};

export const useAddresses = (type: 'venue' | 'rehearsal' | 'storage') => {
  const { service: firebaseService } = useFirebase();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AddressError | null>(null);

  const fetchAddresses = useCallback(async () => {
    if (!firebaseService) {
      setError({
        type: 'network',
        message: 'Firebase service not available',
        recoverable: true,
        retryable: true
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const docs = await firebaseService.getDocuments('addresses', { 
        where: [['type', '==', type]] 
      });
      
      const validAddresses = docs
        .filter(doc => {
          const isValid = doc.id && doc.id.trim() !== '' && doc.id.length >= 10;
          if (!isValid) {
            console.warn('Filtering out invalid document:', {
              id: doc.id,
              idLength: doc.id?.length,
              data: doc.data
            });
          }
          return isValid;
        })
        .map(doc => {
          const address = { ...doc.data, id: doc.id } as Address;
          console.log('Mapped address:', {
            id: address.id,
            name: address.name,
            type: address.type
          });
          return address;
        });
      
      setAddresses(validAddresses);
    } catch (err: any) {
      const addressError = createAddressError(err);
      setError(addressError);
    } finally {
      setLoading(false);
    }
  }, [firebaseService, type]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const addAddress = useCallback(async (addressData: Omit<Address, 'id'>): Promise<Address> => {
    if (!firebaseService) {
      throw new Error('Firebase service not available');
    }

    try {
      const result = await firebaseService.addDocument('addresses', {
        ...addressData,
        name: addressData.name.trim(),
        street1: addressData.street1.trim(),
        city: addressData.city.trim(),
        region: addressData.region.trim(),
        postalCode: addressData.postalCode.trim(),
        street2: addressData.street2?.trim() || '',
        companyName: addressData.companyName?.trim() || '',
        nickname: addressData.nickname?.trim() || '',
      });

      const newAddress = { ...addressData, id: result.id };
      setAddresses(prev => [...prev, newAddress]);
      return newAddress;
    } catch (err: any) {
      const addressError = createAddressError(err);
      throw addressError;
    }
  }, [firebaseService]);

  const updateAddress = useCallback(async (id: string, updates: Partial<Address>): Promise<void> => {
    if (!firebaseService) {
      throw new Error('Firebase service not available');
    }

    if (!id || id.trim() === '') {
      throw new Error('Invalid address ID');
    }

    // Validate that the ID looks like a proper Firestore document ID
    if (id.length < 10 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error(`Invalid document ID format: ${id}`);
    }

    try {
      // Remove the id field from updates to prevent conflicts
      const { id: _, ...updateData } = updates;
      
      await firebaseService.updateDocument('addresses', id, {
        ...updateData,
        name: updateData.name?.trim(),
        street1: updateData.street1?.trim(),
        city: updateData.city?.trim(),
        region: updateData.region?.trim(),
        postalCode: updateData.postalCode?.trim(),
        street2: updateData.street2?.trim() || '',
        companyName: updateData.companyName?.trim() || '',
        nickname: updateData.nickname?.trim() || '',
      });

      setAddresses(prev => 
        prev.map(addr => 
          addr.id === id ? { ...addr, ...updateData } : addr
        )
      );
    } catch (err: any) {
      console.error('Update address error:', {
        id,
        idLength: id.length,
        idType: typeof id,
        updates,
        error: err
      });
      const addressError = createAddressError(err);
      throw addressError;
    }
  }, [firebaseService]);

  return {
    addresses,
    loading,
    error,
    refetch: fetchAddresses,
    addAddress,
    updateAddress
  };
};
