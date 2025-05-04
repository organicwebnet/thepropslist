import React from 'react';
import { Slot } from 'expo-router';
import { View } from 'react-native';
import { TopNavBar } from '../../src/components/navigation/TopNavBar';

export default function WebLayout() {
  return (
    <View style={{ flex: 1 }}>
      {/* <View style={{ height: 60, zIndex: 10 }}> */}
        <TopNavBar />
      {/* </View> */}
      {/* Slot renders the current page content within the (web) group */}
      <Slot /> 
    </View>
  );
} 