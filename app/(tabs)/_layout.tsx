import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import CustomTabBar from './CustomTabBar';

export default function TabLayout() {
  const { user, loading } = useAuth();

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
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="props/index"
        options={{
          title: 'Props',
        }}
      />
      <Tabs.Screen
        name="shows/index"
        options={{
          title: 'Shows',
        }}
      />
      <Tabs.Screen
        name="packing"
        options={{
          title: 'Packing',
        }}
      />
      <Tabs.Screen
        name="todos/index"
        options={{
          title: 'Taskboard',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          title: 'Help',
        }}
      />
      {/* Hide all other routes from tab bar */}
      <Tabs.Screen
        name="shopping/index"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="shopping/[id]"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="shopping/[id]/add-option"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="shopping/add"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="props/create"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="props/[id]/index"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="props/[id]/edit"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="shows/create"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="shows/new"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="shows/[id]/index"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="shows/[id]/edit"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="shows/[id]/team"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="packing/createBox"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="packing/createBoxMock"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="packing/find"
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="packing/list"
        options={{
          tabBarButton: () => null,
        }}
      />
    </Tabs>
  );
}
