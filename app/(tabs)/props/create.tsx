import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { PropForm } from '../../../src/components/PropForm';
import { PropFormData } from '../../../src/shared/types/props';
import { useFirebase } from '../../../src/contexts/FirebaseContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import LinearGradient from 'react-native-linear-gradient';

export default function CreatePropScreen() {
  const router = useRouter();
  const { service } = useFirebase();
  const { user } = useAuth();

  const handleSubmit = async (data: PropFormData) => {
    if (!service || !user) {
      console.error('Service or user not available');
      return;
    }

    try {
      const propData = {
        ...data,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await service.addDocument('props', propData);
      router.navigate('/props');
    } catch (error) {
      console.error('Error creating prop:', error);
    }
  };

  const handleCancel = () => {
    router.back();
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
        <PropForm 
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </View>
    </LinearGradient>
  );
} 