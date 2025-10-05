import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Prop } from '../shared/types/props';
import { UserProfile } from '../shared/types/auth';
import { RoleBasedPropList } from './RoleBasedPropList';
import { quickActionsService } from '../shared/services/QuickActionsService';
import { useAuth } from '../contexts/AuthContext';

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

  const handleQuickAction = async (action: string, prop: Prop) => {
    if (!userProfile) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

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
