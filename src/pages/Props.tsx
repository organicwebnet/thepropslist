import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { PropList } from '../components/PropList';
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../navigation/types';
import type { Prop, Filters } from '../types';
import { useProps } from '../contexts/PropsContext';

export default function Props() {
  const navigation = useNavigation<RootStackScreenProps<'MainTabs'>['navigation']>();
  const { props, loading } = useProps();
  const [filters, setFilters] = React.useState<Filters>({
    search: '',
    act: undefined,
    scene: undefined,
    category: undefined,
    status: undefined
  });

  const handlePropPress = (prop: Prop) => {
    navigation.navigate('PropDetail', { prop });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <PropList
        props={props}
        onPropPress={handlePropPress}
        filters={filters}
        onFilterChange={setFilters}
        isLoading={loading}
      />
    </View>
  );
} 