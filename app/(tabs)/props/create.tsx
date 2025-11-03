import React, { useEffect } from 'react';
import { View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { NativePropForm } from '../../../src/components/NativePropForm';
import { PropFormData } from '../../../src/shared/types/props';
import { useFirebase } from '../../../src/platforms/mobile/contexts/FirebaseContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useShows } from '../../../src/contexts/ShowsContext';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { Permission } from '../../../src/shared/permissions';
import LinearGradient from 'react-native-linear-gradient';

export default function CreatePropScreen() {
  const router = useRouter();
  const { service } = useFirebase();
  const { user } = useAuth();
  const { selectedShow } = useShows();
  const { hasPermission, canPerformAction } = usePermissions();

  // Validate user and userProfile are available
  if (!user) {
    return null; // Will redirect via auth guard
  }

  // Check permissions and redirect if no show is selected
  // Use permission value instead of function to avoid dependency issues
  const canCreateProps = hasPermission(Permission.CREATE_PROPS);

  useEffect(() => {
    // Check if user can create props
    if (!canCreateProps) {
      Alert.alert(
        "Permission Denied",
        "You don't have permission to create props.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
      return;
    }

    if (!selectedShow) {
      Alert.alert(
        "No Show Selected",
        "Please select a show first before adding props.",
        [
          {
            text: "Go to Shows",
            onPress: () => router.navigate('/(tabs)/shows'),
          },
          {
            text: "Cancel",
            onPress: () => router.back(),
            style: "cancel",
          },
        ]
      );
    }
  }, [selectedShow, router, canCreateProps]);

  const handleSubmit = async (data: PropFormData): Promise<boolean> => {
    if (!service || !user) {
      Alert.alert('Error', 'Service or user not available. Please try again.');
      return false;
    }

    // Check permission before creating
    try {
      const permissionCheck = canPerformAction('create_prop');
      if (!permissionCheck.allowed) {
        Alert.alert(
          'Permission Denied',
          permissionCheck.reason || 'You cannot create more props due to subscription limits.',
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      Alert.alert('Error', 'Unable to verify permissions. Please try again.');
      return false;
    }

    try {
      const propData = {
        ...data,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await service.addDocument('props', propData);
      router.navigate('/(tabs)/props');
      return true;
    } catch (error) {
      console.error('Error creating prop:', error);
      return false;
    }
  };

  return (
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        <NativePropForm 
          onFormSubmit={handleSubmit}
          submitButtonText="Create Prop"
          showAddAnotherButton={true}
        />
      </View>
    </LinearGradient>
  );
} 