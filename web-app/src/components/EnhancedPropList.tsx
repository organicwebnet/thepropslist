import React, { useState } from 'react';
import { UserProfile } from '../../shared/types/auth';
import { Prop } from '../types/props';
import { RoleBasedPropList } from './RoleBasedPropList';
import { quickActionsService } from '../services/QuickActionsService';
import { useWebAuth } from '../contexts/WebAuthContext';

interface EnhancedPropListProps {
  props: Prop[];
  showId?: string;
  onPropPress?: (prop: Prop) => void;
  onEdit?: (prop: Prop) => void;
  onDelete?: (prop: Prop) => void;
}

export function EnhancedPropList({ 
  props, 
  showId,
  onPropPress,
  onEdit,
  onDelete,
}: EnhancedPropListProps) {
  const { userProfile } = useWebAuth();
  const [loading, setLoading] = useState(false);

  const handleQuickAction = async (action: string, prop: Prop) => {
    if (!userProfile) {
      alert('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const result = await quickActionsService.executeQuickAction(action, prop, userProfile);
      
      if (result.success) {
        alert(result.message);
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Failed to execute action');
      console.error('Quick action error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePropPress = (prop: Prop) => {
    if (onPropPress) {
      onPropPress(prop);
    } else {
      // Default behavior - could navigate to prop detail page
      console.log('Navigate to prop detail:', prop.id);
    }
  };

  // Show role-based view if user is authenticated and has a role
  if (userProfile && userProfile.role) {
    return (
      <div className="w-full">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="text-sm font-semibold text-blue-800 text-center">
            {getRoleDisplayName(userProfile.role)} View
          </div>
        </div>
        <RoleBasedPropList
          props={props}
          user={userProfile}
          showId={showId}
          onPropPress={handlePropPress}
          onQuickAction={handleQuickAction}
        />
      </div>
    );
  }

  // Fallback to regular prop list for users without roles
  return (
    <div className="w-full">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
        <div className="text-sm font-semibold text-orange-800 text-center">
          Standard View (No role assigned)
        </div>
      </div>
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 text-center">
          Regular prop list would be displayed here
        </div>
      </div>
    </div>
  );
}

function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    'stage_manager': 'Stage Manager',
    'prop_maker': 'Prop Maker',
    'art_director': 'Art Director',
    'props_supervisor': 'Props Supervisor',
    'assistant_stage_manager': 'Assistant Stage Manager',
    'props_supervisor_assistant': 'Props Supervisor Assistant',
    'god': 'God User',
    'admin': 'Administrator',
    'editor': 'Editor',
    'viewer': 'Viewer',
  };

  return roleNames[role] || role;
}
