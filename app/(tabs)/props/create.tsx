import React, { useEffect } from 'react';
import { View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { NativePropForm } from '../../../src/components/NativePropForm';
import { PropFormData } from '../../../src/shared/types/props';
import { useFirebase } from '../../../src/platforms/mobile/contexts/FirebaseContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useShows } from '../../../src/contexts/ShowsContext';
import LinearGradient from 'react-native-linear-gradient';

export default function CreatePropScreen() {
  const router = useRouter();
  const { service } = useFirebase();
  const { user } = useAuth();
  const { selectedShow } = useShows();

  // Redirect if no show is selected
  useEffect(() => {
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
  }, [selectedShow, router]);

  const handleSubmit = async (data: PropFormData): Promise<boolean> => {
    if (!service || !user) {
      console.error('Service or user not available');
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