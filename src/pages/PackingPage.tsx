import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { PackingList } from '../components/packing/PackingList.tsx';
import { usePacking } from '../hooks/usePacking.ts';
import type { Prop } from '../shared/types/props.ts';
import type { Show } from '../shared/services/firebase/types.ts';
import type { PackedProp, PackingBox } from '../types/packing.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';
import { lightTheme, darkTheme } from '../styles/theme.ts';
import LinearGradient from 'react-native-linear-gradient';

interface PackingPageProps {
  props: Prop[];
  show: Show;
}

export function PackingPage({ props: allProps, show }: PackingPageProps) {
  const router = useRouter();
  const { boxes, loading: boxesLoading, error, operations } = usePacking(show.id);
  const { createBox, updateBox, deleteBox } = operations;

  const handleCreateBox = (packedProps: PackedProp[], act: number, scene: number): void => {
    const selectedFullProps = packedProps.map(packedProp => {
      const fullProp = allProps.find(p => p.id === packedProp.propId);
      if (!fullProp) {
        return null;
      }
      return fullProp;
    }).filter((p): p is Prop => p !== null);

    if (selectedFullProps.length !== packedProps.length) {
      return;
    }

    createBox(packedProps, `Box for Act ${act}, Scene ${scene}`)
      .then((newBoxId: string | undefined) => {
        // Optionally handle success (e.g., navigate or show a message)
      })
      .catch((error: Error) => {
        // Optionally handle error (e.g., show a toast)
      });
  };

  if (error) {
    return <View><Text>Error loading packing data: {error.message}</Text></View>;
  }

  if (boxesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="var(--highlight-color)" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#2B2E8C', '#3A4ED6', '#6C3A8C', '#3A8CC1', '#1A2A6C']}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          <View className="pt-6 px-4 md:px-6">
            <PackingList
              show={show}
              props={allProps}
              boxes={boxes}
              onCreateBox={handleCreateBox}
              onUpdateBox={updateBox}
              onDeleteBox={deleteBox}
            />
          </View>
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  contentContainer: {
    // Add padding or other layout styles if needed
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center'
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(30,30,30,0.7)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
});

export default PackingPage; 