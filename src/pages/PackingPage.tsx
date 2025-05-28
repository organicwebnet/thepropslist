import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { PackingList } from '../components/packing/PackingList.tsx';
import { usePacking } from '../hooks/usePacking.ts';
import type { Prop } from '../shared/types/props.ts';
import type { Show } from '../shared/services/firebase/types.ts';
import type { PackedProp, PackingBox } from '../types/packing.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';
import { lightTheme, darkTheme } from '../theme.ts';

interface PackingPageProps {
  props: Prop[];
  show: Show;
}

export function PackingPage({ props: allProps, show }: PackingPageProps) {
  const router = useRouter();
  const { boxes, loading: boxesLoading, error, operations } = usePacking(show.id);
  const { createBox, updateBox, deleteBox } = operations;

  const handleCreateBox = (packedProps: PackedProp[], act: number, scene: number): void => {
    console.log(`Creating box for Act ${act}, Scene ${scene} with ${packedProps.length} items`);

    const selectedFullProps = packedProps.map(packedProp => {
      const fullProp = allProps.find(p => p.id === packedProp.propId);
      if (!fullProp) {
        console.warn(`Could not find full prop data for packed prop ID: ${packedProp.propId}`);
        return null;
      }
      return fullProp;
    }).filter((p): p is Prop => p !== null);

    if (selectedFullProps.length !== packedProps.length) {
      console.error('Mismatch finding full props for packing list items.');
      return;
    }

    createBox(packedProps, `Box for Act ${act}, Scene ${scene}`)
      .then((newBoxId: string | undefined) => {
        if (newBoxId) {
          console.log('Box created successfully:', newBoxId);
        } else {
          console.warn('createBox function returned undefined ID');
        }
      })
      .catch((error: Error) => {
        console.error('Error creating box:', error);
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
  }
});

export default PackingPage; 