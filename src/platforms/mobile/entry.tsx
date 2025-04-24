import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../../contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { HomeScreen } from './screens/HomeScreen';
import { PropsListScreen } from './screens/PropsListScreen';
import { PropFormScreen } from './screens/PropFormScreen';
import { NotificationHandler } from './features/notifications/NotificationHandler';

const Stack = createNativeStackNavigator();

export default function MobileApp() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Home">
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{
                title: 'Props Bible',
                headerStyle: {
                  backgroundColor: '#1e40af',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen 
              name="PropsList" 
              component={PropsListScreen}
              options={{
                title: 'Props',
                headerStyle: {
                  backgroundColor: '#1e40af',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
            <Stack.Screen 
              name="PropForm" 
              component={PropFormScreen}
              options={{
                title: 'Add/Edit Prop',
                headerStyle: {
                  backgroundColor: '#1e40af',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}
            />
          </Stack.Navigator>
          <NotificationHandler />
        </NavigationContainer>
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
} 