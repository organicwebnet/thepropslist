import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useShows } from '../../../src/contexts/ShowsContext.tsx';
import { useAuth } from '../../../src/contexts/AuthContext.tsx';
import ShowForm from '../../../src/components/ShowForm';
import type { ShowFormData, Show } from '../../../src/types/index.ts';

export default function EditShowScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shows, updateShow, getShowById } = useShows();
  const { user } = useAuth();
  const router = useRouter();
  const [initialData, setInitialData] = useState<Show | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchShow() {
      setLoading(true);
      let show = shows.find(s => s.id === id);
      if (!show && getShowById) {
        const fetched = await getShowById(id);
        show = fetched === null ? undefined : fetched;
      }
      if (!show) {
        Alert.alert('Error', 'Show not found.');
        router.back();
        return;
      }
      setInitialData({ ...show, acts: show.acts ?? [] });
      setLoading(false);
    }
    if (id && user) fetchShow();
  }, [id, user, shows, getShowById, router]);

  const handleSubmit = async (data: Show) => {
    try {
      setLoading(true);
      await updateShow(id, { ...data, acts: data.acts ?? [] });
      Alert.alert('Success', 'Show updated successfully!');
      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to update show.');
    } finally {
      setLoading(false);
    }
  };

  if (loading || initialData === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#18181b' }}>
      <Stack.Screen options={{ title: `Edit Show: ${initialData.name}` }} />
      <ShowForm
        initialData={initialData}
        mode="edit"
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
      />
    </View>
  );
} 