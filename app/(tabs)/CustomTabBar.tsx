import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const tabIcons: Record<string, { focused: string; unfocused: string }> = {
  'index': { focused: 'home', unfocused: 'home-outline' },
  'props/index': { focused: 'cube', unfocused: 'cube-outline' },
  'shows/index': { focused: 'film', unfocused: 'film-outline' },
  'packing': { focused: 'cube', unfocused: 'cube-outline' },
  'todos/index': { focused: 'checkbox', unfocused: 'checkbox-outline' },
  'help': { focused: 'help-circle', unfocused: 'help-circle-outline' },
  'profile': { focused: 'person', unfocused: 'person-outline' },
};

const tabLabels: Record<string, string> = {
  'index': 'Home',
  'props/index': 'Props',
  'shows/index': 'Shows',
  'packing': 'Packing',
  'todos/index': 'Taskboard',
  'help': 'Help',
  'profile': 'Profile',
};

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  
  // Define the order of tabs
  const tabOrder = ['index', 'todos/index', 'props/index', 'shows/index', 'packing', 'help', 'profile'];
  
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
    <View style={[styles.tabBarContainer, { 
      paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 6) : 8,
      height: 60 + (Platform.OS === 'android' ? Math.max(insets.bottom, 0) : 0),
    }]}>
      {visibleRoutes.map((route, index) => {
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

        const icon = tabIcons[route.name] || { focused: 'circle', unfocused: 'circle-outline' };
        const label = tabLabels[route.name] || route.name;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={[styles.tabButton, { flex: 1 }]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFocused ? icon.focused as any : icon.unfocused as any}
              size={22}
              color={isFocused ? '#c084fc' : '#71717a'}
            />
            <Text style={[styles.tabLabel, { color: isFocused ? '#c084fc' : '#71717a' }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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

