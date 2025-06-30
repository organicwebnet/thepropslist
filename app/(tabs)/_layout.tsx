import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';

export default function TabLayout() {
  const { user, loading } = useAuth();

  // Don't render tabs if user is not authenticated or still loading
  if (loading || !user) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#18181b',
          borderTopColor: '#c084fc',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#c084fc',
        tabBarInactiveTintColor: '#a3a3a3',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="props"
        options={{
          title: 'Props',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shows"
        options={{
          title: 'Shows',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="film" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="packing"
        options={{
          title: 'Packing',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="todos"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="packing/createBox"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="packing/find"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
} 
