import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

// Tab configuration - shared across all uses
export const tabIcons: Record<string, { focused: string; unfocused: string }> = {
  'index': { focused: 'home', unfocused: 'home-outline' },
  'props/index': { focused: 'cube', unfocused: 'cube-outline' },
  'shows/index': { focused: 'film', unfocused: 'film-outline' },
  'packing': { focused: 'cube', unfocused: 'cube-outline' },
  'todos/index': { focused: 'checkbox', unfocused: 'checkbox-outline' },
  'help': { focused: 'help-circle', unfocused: 'help-circle-outline' },
  'profile': { focused: 'person', unfocused: 'person-outline' },
};

export const tabLabels: Record<string, string> = {
  'index': 'Home',
  'props/index': 'Props',
  'shows/index': 'Shows',
  'packing': 'Packing',
  'todos/index': 'Taskboard',
  'help': 'Help',
  'profile': 'Profile',
};

export const tabOrder = ['index', 'todos/index', 'props/index', 'shows/index', 'packing', 'help', 'profile'];

// Route name mapping for standalone mode (maps route names to navigation paths)
// These paths match Expo Router's file-based routing structure
const routeToPath: Record<string, string> = {
  'index': '/(tabs)',
  'props/index': '/(tabs)/props',
  'shows/index': '/(tabs)/shows',
  'packing': '/(tabs)/packing',
  'todos/index': '/(tabs)/todos',
  'help': '/(tabs)/help',
  'profile': '/(tabs)/profile',
};

interface NavigationItem {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

interface StandaloneNavigationBarProps {
  currentRoute?: string;
  onNavigate?: (route: string) => void;
  style?: any;
}

// Shared styles
const sharedStyles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderTopWidth: 0,
    paddingTop: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});

// Render a single navigation item
const renderNavItem = (
  routeName: string,
  isFocused: boolean,
  onPress: () => void,
  accessibilityLabel?: string,
  usePressable: boolean = false
) => {
  const icon = tabIcons[routeName] || { focused: 'circle', unfocused: 'circle-outline' };
  const label = tabLabels[routeName] || routeName;
  const iconName = isFocused ? icon.focused : icon.unfocused;
  const iconColor = isFocused ? '#c084fc' : '#71717a';
  const textColor = isFocused ? '#c084fc' : '#71717a';

  const content = (
    <>
      <Ionicons
        name={iconName as any}
        size={22}
        color={iconColor}
      />
      <Text style={[sharedStyles.tabLabel, { color: textColor }]}>
        {label}
      </Text>
    </>
  );

  if (usePressable) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={accessibilityLabel || label}
        onPress={onPress}
        style={[sharedStyles.tabButton, { flex: 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel || label}
      onPress={onPress}
      style={[sharedStyles.tabButton, { flex: 1 }]}
      activeOpacity={0.7}
    >
      {content}
    </TouchableOpacity>
  );
};

// React Navigation Tab Bar Mode
export function MainNavigationBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  
  // Filter and sort to only show the main tabs in the correct order
  const visibleRoutes = state.routes
    .filter((route) => {
      return tabOrder.includes(route.name);
    })
    .sort((a, b) => {
      const indexA = tabOrder.indexOf(a.name);
      const indexB = tabOrder.indexOf(b.name);
      return indexA - indexB;
    });

  return (
    <View style={[sharedStyles.tabBarContainer, { 
      paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 6) : 8,
      height: 60 + (Platform.OS === 'android' ? Math.max(insets.bottom, 0) : 0),
    }]}>
      {visibleRoutes.map((route) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === state.routes.findIndex(r => r.key === route.key);

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <React.Fragment key={route.name}>
            {renderNavItem(
              route.name,
              isFocused,
              onPress,
              options.tabBarAccessibilityLabel
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// Standalone Mode (for pages outside the tab navigator)
export function StandaloneNavigationBar({ currentRoute, onNavigate, style }: StandaloneNavigationBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleNavigate = (routeName: string) => {
    const path = routeToPath[routeName];
    if (path) {
      if (onNavigate) {
        onNavigate(path);
      } else {
        router.navigate(path as any);
      }
    }
  };

  // Determine which route is currently active
  const getActiveRoute = (): string => {
    if (currentRoute) {
      // Try to match currentRoute to a tab route
      if (currentRoute.includes('/tabs')) {
        // Extract route name from path
        const pathParts = currentRoute.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart === '' || lastPart === 'tabs') {
          return 'index';
        }
        // Map common paths to route names
        if (lastPart === 'props') return 'props/index';
        if (lastPart === 'shows') return 'shows/index';
        if (lastPart === 'packing') return 'packing';
        if (lastPart === 'todos') return 'todos/index';
        if (lastPart === 'help') return 'help';
        if (lastPart === 'profile') return 'profile';
      }
    }
    // Default to Home tab when on non-tab routes (e.g., taskBoard page)
    // This provides visual feedback that Home is the main entry point
    return 'index';
  };

  const activeRoute = getActiveRoute();

  return (
    <View style={[
      sharedStyles.tabBarContainer,
      {
        paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 6) : 8,
        height: 60 + (Platform.OS === 'android' ? Math.max(insets.bottom, 0) : 0),
        borderTopWidth: 1,
        borderTopColor: '#c084fc',
      },
      style
    ]}>
      {tabOrder.map((routeName) => {
        // For standalone mode, we might want to show fewer tabs
        // For now, show all tabs but you can filter if needed
        const isFocused = routeName === activeRoute;
        
        return (
          <React.Fragment key={routeName}>
            {renderNavItem(
              routeName,
              isFocused,
              () => handleNavigate(routeName),
              undefined,
              true // Use Pressable for standalone mode
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

