import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useFirebase } from './FirebaseContext';
import { useShowSelection } from './ShowSelectionContext';
import { logger } from '../utils/logger';

interface MentionItem {
  id: string;
  name: string;
}

interface MentionData {
  propsList: MentionItem[];
  containersList: MentionItem[];
  usersList: MentionItem[];
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

interface MentionDataContextType extends MentionData {
  refreshData: () => Promise<void>;
}

const MentionDataContext = createContext<MentionDataContextType | undefined>(undefined);

interface MentionDataProviderProps {
  children: ReactNode;
}

export const MentionDataProvider: React.FC<MentionDataProviderProps> = ({ children }) => {
  const { service } = useFirebase();
  const { currentShowId } = useShowSelection();
  const [propsList, setPropsList] = useState<MentionItem[]>([]);
  const [containersList, setContainersList] = useState<MentionItem[]>([]);
  const [usersList, setUsersList] = useState<MentionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(0);

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const loadMentionData = async (forceRefresh = false) => {
    // Check if we have recent cached data
    if (!forceRefresh && Date.now() - lastUpdated < CACHE_DURATION && propsList.length > 0) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build query options for props - filter by current show if available
      const propsQueryOptions = currentShowId 
        ? { where: [['showId', '==', currentShowId] as [string, any, any]] }
        : undefined;

      // Only load data that the user has permission to access
      const [props, containers, users] = await Promise.allSettled([
        service.getDocuments<{ name?: string; showId?: string }>('props', propsQueryOptions).catch(() => []),
        service.getDocuments<{ name?: string }>('packing_boxes').catch(() => []),
        service.getDocuments<{ displayName?: string; name?: string; email?: string }>('userProfiles').catch(() => [])
      ]);

      const propsData = props.status === 'fulfilled' ? props.value : [];
      const containersData = containers.status === 'fulfilled' ? containers.value : [];
      const usersData = users.status === 'fulfilled' ? users.value : [];

      // Filter props by showId if currentShowId is set (additional client-side filter for safety)
      const filteredPropsData = currentShowId 
        ? propsData.filter(d => d.data?.showId === currentShowId)
        : propsData;

      setPropsList(filteredPropsData.map(d => ({ 
        id: d.id, 
        name: d.data?.name || 'Prop' 
      })));

      setContainersList(containersData.map(d => ({ 
        id: d.id, 
        name: d.data?.name || 'Box' 
      })));

      setUsersList(usersData.map(d => ({ 
        id: d.id, 
        name: d.data?.displayName || d.data?.name || d.data?.email || 'User' 
      })));

      setLastUpdated(Date.now());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load mention data';
      setError(errorMessage);
      logger.error('Failed to load mention data', err, 'MentionDataContext');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await loadMentionData(true);
  };

  useEffect(() => {
    loadMentionData();
  }, [service, currentShowId]);

  const value: MentionDataContextType = {
    propsList,
    containersList,
    usersList,
    loading,
    error,
    lastUpdated,
    refreshData
  };

  return (
    <MentionDataContext.Provider value={value}>
      {children}
    </MentionDataContext.Provider>
  );
};

export const useMentionData = (): MentionDataContextType => {
  const context = useContext(MentionDataContext);
  if (context === undefined) {
    throw new Error('useMentionData must be used within a MentionDataProvider');
  }
  return context;
};
