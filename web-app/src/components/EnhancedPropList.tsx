import React, { useState } from 'react';
import { UserProfile } from '../../shared/types/auth';
import { Prop } from '../types/props';
import { RoleBasedPropList } from './RoleBasedPropList';
import { quickActionsService } from '../../../src/shared/services/QuickActionsService';
import { useWebAuth } from '../contexts/WebAuthContext';
import { QuickActionModal } from './QuickActionModal';
import { LocationPickerModal } from './LocationPickerModal';

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
  
  // Modal states
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [currentProp, setCurrentProp] = useState<Prop | null>(null);

  const handleQuickAction = async (action: string, prop: Prop) => {
    if (!userProfile) {
      alert('User not authenticated');
      return;
    }

    setCurrentProp(prop);

    // Handle modal-based actions
    switch (action) {
      case 'addNote':
        setShowNoteModal(true);
        return;
      case 'updateLocation':
        setShowLocationModal(true);
        return;
      case 'addMaintenanceNote':
        setShowMaintenanceModal(true);
        return;
      case 'reportIssue':
        setShowIssueModal(true);
        return;
      default:
        // Handle direct actions
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
    }
  };

  const handleSaveNote = async (note: string) => {
    if (!currentProp || !userProfile) return;
    
    setLoading(true);
    try {
      const result = await quickActionsService.executeQuickAction('addNote', currentProp, userProfile);
      if (result.success) {
        alert(`Note added: "${note}"`);
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Failed to add note');
      console.error('Add note error:', error);
    } finally {
      setLoading(false);
      setShowNoteModal(false);
      setCurrentProp(null);
    }
  };

  const handleSaveLocation = async (location: string) => {
    if (!currentProp || !userProfile) return;
    
    setLoading(true);
    try {
      const result = await quickActionsService.executeQuickAction('updateLocation', currentProp, userProfile);
      if (result.success) {
        alert(`Location updated to: "${location}"`);
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Failed to update location');
      console.error('Update location error:', error);
    } finally {
      setLoading(false);
      setShowLocationModal(false);
      setCurrentProp(null);
    }
  };

  const handleSaveMaintenanceNote = async (note: string) => {
    if (!currentProp || !userProfile) return;
    
    setLoading(true);
    try {
      const result = await quickActionsService.executeQuickAction('addMaintenanceNote', currentProp, userProfile);
      if (result.success) {
        alert(`Maintenance note added: "${note}"`);
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Failed to add maintenance note');
      console.error('Add maintenance note error:', error);
    } finally {
      setLoading(false);
      setShowMaintenanceModal(false);
      setCurrentProp(null);
    }
  };

  const handleSaveIssue = async (issue: string) => {
    if (!currentProp || !userProfile) return;
    
    setLoading(true);
    try {
      const result = await quickActionsService.executeQuickAction('reportIssue', currentProp, userProfile);
      if (result.success) {
        alert(`Issue reported: "${issue}"`);
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Failed to report issue');
      console.error('Report issue error:', error);
    } finally {
      setLoading(false);
      setShowIssueModal(false);
      setCurrentProp(null);
    }
  };

  const handleCancelModal = () => {
    setShowNoteModal(false);
    setShowLocationModal(false);
    setShowMaintenanceModal(false);
    setShowIssueModal(false);
    setCurrentProp(null);
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
      
      {/* Modals */}
      <QuickActionModal
        visible={showNoteModal}
        title="Add Note"
        placeholder="Enter your note..."
        onSave={handleSaveNote}
        onCancel={handleCancelModal}
        multiline
        maxLength={500}
      />
      
      <LocationPickerModal
        visible={showLocationModal}
        currentLocation={currentProp?.currentLocation}
        onSave={handleSaveLocation}
        onCancel={handleCancelModal}
      />
      
      <QuickActionModal
        visible={showMaintenanceModal}
        title="Add Maintenance Note"
        placeholder="Describe the maintenance performed or needed..."
        onSave={handleSaveMaintenanceNote}
        onCancel={handleCancelModal}
        multiline
        maxLength={1000}
      />
      
      <QuickActionModal
        visible={showIssueModal}
        title="Report Issue"
        placeholder="Describe the issue with this prop..."
        onSave={handleSaveIssue}
        onCancel={handleCancelModal}
        multiline
        maxLength={1000}
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
