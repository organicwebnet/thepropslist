import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { PackingList } from '../components/packing/PackingList';
import { usePacking } from '../hooks/usePacking';
import type { Prop } from '@shared/types';
import type { Show, PackedProp } from '../types';

interface PackingPageProps {
  props: Prop[];
  show: Show;
}

export function PackingPage({ props: allProps, show }: PackingPageProps) {
  const router = useRouter();
  const { boxes, loading: boxesLoading, createBox, updateBox, deleteBox } = usePacking(show.id);

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

    createBox(selectedFullProps, act, scene)
      .then(newBox => {
        if (newBox) {
          console.log('Box created successfully:', newBox.id);
        } else {
          console.warn('createBox function returned undefined');
        }
      })
      .catch(error => {
        console.error('Error creating box:', error);
      });
  };

  if (boxesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="var(--highlight-color)" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PackingList
        show={show}
        props={allProps}
        boxes={boxes}
        isLoading={boxesLoading}
        onCreateBox={handleCreateBox}
        onUpdateBox={updateBox}
        onDeleteBox={deleteBox}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'var(--bg-primary)'
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: 'var(--bg-primary)',
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default PackingPage; 