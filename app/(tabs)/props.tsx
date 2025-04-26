import React from 'react';
import { View, Text } from 'react-native';
import { PropList } from '../../src/components/PropList';
import { useProps } from '../../src/contexts/PropsContext';
import { useShows } from '../../src/contexts/ShowsContext';
import type { Filters } from '../../src/types';

export default function PropsScreen() {
  const { props } = useProps();
  const { selectedShow } = useShows();
  const [filters, setFilters] = React.useState<Filters>({
    search: '',
    act: undefined,
    scene: undefined,
    category: undefined
  });

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const handleFilterReset = () => {
    setFilters({
      search: '',
      act: undefined,
      scene: undefined,
      category: undefined
    });
  };

  if (!selectedShow) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Please select a show first</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <PropList
        props={props}
        show={selectedShow}
        filters={filters}
        onFilterChange={handleFilterChange}
        onFilterReset={handleFilterReset}
      />
    </View>
  );
} 