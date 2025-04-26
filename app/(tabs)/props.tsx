import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PropList } from '../../src/components/PropList';
import { useProps } from '../../src/contexts/PropsContext';
import { useShows } from '../../src/contexts/ShowsContext';
import type { Filters } from '../../src/types';
import type { Show } from '../../src/types';

export default function PropsScreen() {
  const { props } = useProps();
  const { selectedShow } = useShows(); 
  const [filters, setFilters] = React.useState<Filters>({
    search: '',
    act: undefined,
    scene: undefined,
    category: undefined,
    status: undefined, 
  });

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const handleFilterReset = () => {
    setFilters({
      search: '',
      act: undefined,
      scene: undefined,
      category: undefined,
      status: undefined, 
    });
  };

  // Restore check for selectedShow
  if (!selectedShow) {
    return (
      <View style={styles.container} >
        <Text style={styles.messageText}>Please select a show first</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullFlexContainer}> // Use a different style for the main view
      <Text style={{ color: 'red', padding: 10, fontWeight: 'bold' }}>Restored PropsScreen Active!</Text>
      <PropList
        props={props}
        show={selectedShow} // Use the actual selectedShow
        filters={filters}
        onFilterChange={handleFilterChange}
        onFilterReset={handleFilterReset}
      /> 
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullFlexContainer: { // New style
    flex: 1,
  },
  messageText: { // Style for the message
    fontSize: 16,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
}); 