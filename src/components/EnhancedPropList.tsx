import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Prop } from '../shared/types/props';
import { UserProfile } from '../shared/types/auth';
import { RoleBasedPropList } from './RoleBasedPropList';
import { quickActionsService } from '../shared/services/QuickActionsService';
import { useAuth } from '../contexts/AuthContext';
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
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [currentProp, setCurrentProp] = useState<Prop | null>(null);

  const handleQuickAction = async (action: string, prop: Prop) => {
    if (!userProfile) {
      Alert.alert('Error', 'User not authenticated');
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
            Alert.alert('Success', result.message);
          } else {
            Alert.alert('Error', result.message);
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to execute action');
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
        Alert.alert('Success', `Note added: "${note}"`);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add note');
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
        Alert.alert('Success', `Location updated to: "${location}"`);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update location');
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
        Alert.alert('Success', `Maintenance note added: "${note}"`);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add maintenance note');
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
        Alert.alert('Success', `Issue reported: "${issue}"`);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to report issue');
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
    <View style={styles.container}>
      <View style={styles.roleIndicator}>
        <Text style={styles.roleText}>
          {getRoleDisplayName(userProfile.role)} View
        </Text>
      </View>
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
    </View>
  );
  }

  // Fallback to regular prop list for users without roles
  return (
    <View style={styles.container}>
      <View style={styles.fallbackIndicator}>
        <Text style={styles.fallbackText}>
          Standard View (No role assigned)
        </Text>
      </View>
      {/* TODO: Import and use regular PropList component here */}
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackMessage}>
          Regular prop list would be displayed here
        </Text>
      </View>
    </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  roleIndicator: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    textAlign: 'center',
  },
  fallbackIndicator: {
    backgroundColor: '#fff3e0',
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f57c00',
    textAlign: 'center',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fallbackMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
