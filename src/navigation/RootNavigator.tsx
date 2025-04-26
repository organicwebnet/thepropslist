import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home } from '../pages/Home';
import PropDetailPage from '../pages/PropDetailPage';
import ShowDetailPage from '../pages/ShowDetailPage';
import type { RootStackParamList } from './types';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#000000',
              },
              headerTintColor: '#FFFFFF',
              headerTitleStyle: {
                fontWeight: '600',
              },
              contentStyle: {
                backgroundColor: '#000000',
              },
            }}
          >
            <Stack.Screen 
              name="Home" 
              component={Home}
              options={{
                title: 'Props Bible',
              }}
            />
            <Stack.Screen
              name="PropDetail"
              component={PropDetailPage}
              options={{
                title: 'Prop Details',
              }}
            />
            <Stack.Screen
              name="ShowDetail"
              component={ShowDetailPage}
              options={{
                title: 'Show Details',
              }}
            />
            {/* Add PackingPage route if necessary */}
            {/* <Stack.Screen name="PackingDetail" component={PackingPage} /> */}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 