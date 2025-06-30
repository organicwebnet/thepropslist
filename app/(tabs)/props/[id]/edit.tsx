import React, { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function PropEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  useEffect(() => {
    // Redirect to detail page with edit parameter
    if (id) {
      router.replace(`/props/${id}?edit=true`);
    }
  }, [id, router]);

  return null;
} 