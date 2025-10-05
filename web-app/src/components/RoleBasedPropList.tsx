import React, { useMemo } from 'react';
import { UserProfile } from '../../shared/types/auth';
import { Prop } from '../types/props';
import { RoleBasedPropCard } from './RoleBasedPropCard';
import { useRoleBasedDataView } from '@shared/hooks/useRoleBasedDataView';

interface RoleBasedPropListProps {
  props: Prop[];
  user: UserProfile | null;
  showId?: string;
  onPropPress?: (prop: Prop) => void;
  onQuickAction?: (action: string, prop: Prop) => void;
}

export function RoleBasedPropList({ 
  props, 
  user, 
  showId,
  onPropPress,
  onQuickAction,
}: RoleBasedPropListProps) {
  const { dataView, loading, error } = useRoleBasedDataView(user, showId);

  // Memoize the filtered props to avoid unnecessary re-renders
  const filteredProps = useMemo(() => {
    if (!user || !dataView) return props;
    
    // For now, return all props - filtering happens at the card level
    // In the future, we could add list-level filtering here
    return props;
  }, [props, user, dataView]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading role-based view...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error loading view: {error}</div>
      </div>
    );
  }

  if (filteredProps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <svg 
          className="h-10 w-10 text-gray-400 mb-2" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9 6 9-6" />
        </svg>
        <div className="text-gray-400">No props found.</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {filteredProps.map((prop) => (
        <RoleBasedPropCard
          key={prop.id}
          prop={prop}
          user={user}
          showId={showId}
          onPress={onPropPress}
          onQuickAction={onQuickAction}
        />
      ))}
    </div>
  );
}
