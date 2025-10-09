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
        .filter(doc => doc.id && doc.id.trim() !== '')
        .map(doc => ({ ...doc.data, id: doc.id } as Address));
      
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

    try {
      await firebaseService.updateDocument('addresses', id, {
        ...updates,
        name: updates.name?.trim(),
        street1: updates.street1?.trim(),
        city: updates.city?.trim(),
        region: updates.region?.trim(),
        postalCode: updates.postalCode?.trim(),
        street2: updates.street2?.trim() || '',
        companyName: updates.companyName?.trim() || '',
        nickname: updates.nickname?.trim() || '',
      });

      setAddresses(prev => 
        prev.map(addr => 
          addr.id === id ? { ...addr, ...updates } : addr
        )
      );
    } catch (err: any) {
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
