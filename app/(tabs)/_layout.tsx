import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, Alert } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { LogOut } from 'lucide-react';

export default function TabsLayout() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
      Alert.alert(
          "Confirm Sign Out",
          "Are you sure you want to sign out?",
          [
              { text: "Cancel", style: "cancel" },
              {
                  text: "Sign Out",
                  style: "destructive",
                  onPress: async () => {
                      try {
                          await signOut();
                      } catch (error) {
                          console.error("Sign out error:", error);
                          Alert.alert("Error", "Failed to sign out. Please try again.");
                      }
                  },
              },
          ]
      );
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
          <Pressable onPress={handleSignOut} style={{ marginRight: 15 }}>
            <LogOut size={24} color="#FFF" /> 
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
        name="props"
        options={{
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
    </Tabs>
  );
} 