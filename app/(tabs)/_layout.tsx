import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, Alert, Text } from 'react-native'; 
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';

// Define colors based on your tailwind config for clarity
const darkThemeColors = {
  cardBg: '#1F2937', 
  textPrimary: '#F9FAFB', 
  textSecondary: '#9CA3AF', 
  primary: '#3B82F6', 
  border: '#374151', 
};

export default function TabsLayout() {
  const { signOut } = useAuth();
  const { theme } = useTheme();

  const activeColor = darkThemeColors.primary;
  const inactiveColor = darkThemeColors.textSecondary;
  const tabBarStyleBackground = darkThemeColors.cardBg;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: tabBarStyleBackground,
          borderTopColor: darkThemeColors.border, 
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        headerShown: false, 
      }}
    >
      <Tabs.Screen
        name="shows"
        options={{
          title: 'Shows',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'list-circle' : 'list-circle-outline'}
              size={size}
              color={color} 
            />
          ),
          headerRight: () => (
            <Pressable onPress={handleSignOut} style={{ marginRight: 15 }}>
              <Ionicons name="exit-outline" size={24} color={darkThemeColors.primary} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="propsTab/index"
        options={{
          title: 'Props',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'briefcase' : 'briefcase-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home', 
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'} 
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