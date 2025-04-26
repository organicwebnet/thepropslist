import React from 'react';
import { View } from 'react-native';
import { ShowList } from '../../src/components/ShowList';
import { useShows } from '../../src/contexts/ShowsContext';

export default function ShowsScreen() {
  const { shows, selectedShow, setSelectedShow } = useShows();

  return (
    <View style={{ flex: 1 }}>
      <ShowList
        shows={shows}
        selectedShowId={selectedShow?.id}
        onSelect={(show) => setSelectedShow(show)}
      />
    </View>
  );
} 