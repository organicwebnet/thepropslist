import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function TabLayout() {
  const { user, loading } = useAuth();

  // Don't render tabs if user is not authenticated or still loading
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181b' }}>
        <ActivityIndicator color="#c084fc" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/auth" />;
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
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="props/index"
        options={{
          title: 'Props',
          tabBarIcon: ({ color }) => (
            <Ionicons name="cube" size={24} color={color} />
          ),
          href: '/props',
        }}
      />
      <Tabs.Screen
        name="shows/index"
        options={{
          title: 'Shows',
          tabBarIcon: ({ color }) => (
            <Ionicons name="film" size={24} color={color} />
          ),
          href: '/shows',
        }}
      />
      <Tabs.Screen
        name="packing"
        options={{
          title: 'Packing',
          tabBarIcon: ({ color }) => (
            <Ionicons name="cube-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shopping/index"
        options={{
          title: 'Shopping',
          tabBarIcon: ({ color }) => (
            <Ionicons name="bag" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />
      {/* Hide all nested routes from tab bar */}
      <Tabs.Screen
        name="todos/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="packing/createBox"
        options={{
          href: null,
        }}
      />
      {/* Mock route kept for reference but hidden; remove if no longer needed */}
      <Tabs.Screen name="packing/createBoxMock" options={{ href: null }} />
      <Tabs.Screen
        name="packing/find"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="packing/list"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="props/create"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="props/[id]/index"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="props/[id]/edit"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="shows/create"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="shows/new"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="shows/[id]/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="shopping/add"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="shopping/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="shopping/[id]/add-option"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
} 
