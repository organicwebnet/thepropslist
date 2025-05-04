import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, Alert, Text } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';

export default function TabsLayout() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Navigation might automatically handle redirecting on auth state change,
      // or you might need explicit navigation here.
    } catch (error) {
      console.error("Error signing out:", error);
      // Optionally show an error message to the user
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ffd33d',
        headerStyle: {
          backgroundColor: '#25292e',
        },
        headerShadowVisible: false,
        headerTintColor: '#fff',
        tabBarStyle: {
          backgroundColor: '#25292e',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          display: Platform.OS === 'web' ? 'none' : 'flex',
        },
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontWeight: '500',
          fontSize: 12,
        },
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: Platform.OS === 'web' ? undefined : () => (
          <Pressable onPress={handleSignOut} style={{ marginRight: 15, padding: 5 }}>
            <Ionicons 
              name={'log-out-outline'}
              size={24}
              color={'#FFFFFF'}
            />
          </Pressable>
        ),
        headerShown: Platform.OS !== 'web',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="shows"
        options={{
          title: 'Shows',
          headerTitle: 'Shows',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons 
              name={focused ? 'calendar' : 'calendar-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="props"
        options={{
          href: Platform.OS === 'web' ? null : undefined,
          title: 'Props',
          headerTitle: 'Props Bible',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons 
              name={focused ? 'cube' : 'cube-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="packing"
        options={{
          title: 'Packing',
          headerTitle: 'Pack List',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons 
              name={focused ? 'archive' : 'archive-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          headerTitle: 'My Profile',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
} 