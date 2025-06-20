import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, Alert, Text, View, SafeAreaView } from 'react-native'; 
import { useAuth } from '../../src/contexts/AuthContext.tsx';
import { useTheme } from '../../src/contexts/ThemeContext.tsx';
import { lightTheme as appLightTheme, darkTheme as appDarkTheme } from '../../src/styles/theme'; // Import theme objects

// Removed local darkThemeColors definition

export default function TabsLayout() {
  const { signOut } = useAuth();
  const { theme: themeName } = useTheme(); // Get theme name from context
  const currentThemeColors = themeName === 'light' ? appLightTheme.colors : appDarkTheme.colors;

  const activeColor = currentThemeColors.primary;
  const inactiveColor = currentThemeColors.text; // Or a specific secondary text color if available in theme
  const tabBarStyleBackground = currentThemeColors.card; // Using card color for tab bar background
  const tabBorderColor = currentThemeColors.border;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      // It might be good to show an Alert here too, like in ProfileScreen
      Alert.alert('Error', 'Failed to sign out.'); 
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: tabBarStyleBackground,
          borderTopColor: tabBorderColor, 
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        headerShown: false, // Default, but individual screens can override
      }}
    >
      <Tabs.Screen
        name="index" 
        options={{
          title: 'Home', 
          tabBarIcon: ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'} 
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shows"
        options={{
          headerShown: true, // Show header for this specific screen to have headerRight
          headerStyle: { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0, borderBottomWidth: 0 },
          headerTransparent: true,
          headerTitle: () => (
            <SafeAreaView style={{ backgroundColor: 'transparent', alignItems: 'center', width: '100%' }}>
              <View style={{ paddingTop: 8, paddingBottom: 16, alignItems: 'center', width: '100%' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 22, textAlign: 'center' }}>Shows</Text>
              </View>
            </SafeAreaView>
          ),
          headerTintColor: currentThemeColors.primary, // Color for back button if ever shown
          tabBarIcon: ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
            <Ionicons
              name={focused ? 'people' : 'people-outline'}
              size={size}
              color={color} 
            />
          ),
          headerRight: () => (
            <Pressable onPress={handleSignOut} style={{ marginRight: 15 }}>
              <Ionicons name="exit-outline" size={24} color={currentThemeColors.primary} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="props/index"
        options={{
          title: 'Props',
          headerShown: true,
          headerStyle: { backgroundColor: tabBarStyleBackground },
          headerTitleStyle: { color: currentThemeColors.text },
          headerTintColor: currentThemeColors.primary,
          tabBarIcon: ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
            <Ionicons
              name={focused ? 'rose' : 'rose-outline'}
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
          headerShown: true,
          headerStyle: { backgroundColor: tabBarStyleBackground },
          headerTitleStyle: { color: currentThemeColors.text },
          headerTintColor: currentThemeColors.primary,
          tabBarIcon: ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
            <Ionicons
              name={focused ? 'cube' : 'cube-outline'}
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
          headerShown: true, // Profile screen sets its own title via Stack.Screen
          headerStyle: { backgroundColor: tabBarStyleBackground },
          headerTitleStyle: { color: currentThemeColors.text },
          headerTintColor: currentThemeColors.primary, 
          tabBarIcon: ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
            <Ionicons
              name={focused ? 'id-card' : 'id-card-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
     
      {/* Screens to hide from tab bar */}
      <Tabs.Screen name="todos/index" options={{ href: null }} />
      <Tabs.Screen name="propsTab/index" options={{ href: null }} />
      <Tabs.Screen name="props/create" options={{ href: null }} />
      <Tabs.Screen name="props/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="props/[id]/edit" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      {/* <Tabs.Screen name="propsTab/[id]" options={{ href: null }} /> */}
    </Tabs>
  );
} 