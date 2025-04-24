import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  PropsList: undefined;
  PropForm: undefined;
};

type PropsListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PropsList'>;

type Prop = {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'in-use' | 'maintenance';
};

const mockProps: Prop[] = [
  {
    id: '1',
    name: 'Wooden Chair',
    description: 'Vintage wooden chair from the 1920s',
    status: 'available',
  },
  {
    id: '2',
    name: 'Crystal Vase',
    description: 'Decorative crystal vase',
    status: 'in-use',
  },
];

export function PropsListScreen() {
  const navigation = useNavigation<PropsListScreenNavigationProp>();

  const renderItem = ({ item }: { item: Prop }) => (
    <TouchableOpacity 
      style={styles.propItem}
      onPress={() => navigation.navigate('PropForm')}
    >
      <View>
        <Text style={styles.propName}>{item.name}</Text>
        <Text style={styles.propDescription}>{item.description}</Text>
        <Text style={[styles.propStatus, styles[item.status]]}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={mockProps}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('PropForm')}
      >
        <MaterialIcons name="add" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 16,
  },
  propItem: {
    backgroundColor: '#f8fafc',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  propName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  propDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  propStatus: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  available: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  'in-use': {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  maintenance: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  addButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
}); 