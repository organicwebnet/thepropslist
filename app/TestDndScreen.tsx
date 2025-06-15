import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';

const initialData = [
  { key: '1', label: 'Item 1' },
  { key: '2', label: 'Item 2' },
  { key: '3', label: 'Item 3' },
  { key: '4', label: 'Item 4' },
];

export default function TestDndScreen() {
  const [data, setData] = useState(initialData);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Minimal DnD Test</Text>
      <DraggableFlatList
        data={data}
        keyExtractor={item => item.key}
        renderItem={({ item, drag, isActive }) => (
          <View style={[styles.item, isActive && styles.activeItem]}>
            <Pressable onLongPress={drag} style={styles.pressable} android_ripple={{ color: '#bde0fe' }}>
              <Text style={styles.label}>{item.label}</Text>
            </Pressable>
          </View>
        )}
        onDragEnd={({ data }) => setData(data)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  item: {
    padding: 20,
    marginVertical: 8,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  activeItem: {
    backgroundColor: '#cceeff',
  },
  label: { fontSize: 18 },
  pressable: { flex: 1, alignItems: 'center', justifyContent: 'center' },
}); 