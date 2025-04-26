import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Props, Shows, Packing } from '../pages';
import PropDetailPage from '../pages/PropDetailPage';
import ShowDetailPage from '../pages/ShowDetailPage';
import { PackingPage } from '../pages/PackingPage';
import { Package, Theater, Box } from 'lucide-react-native';
import type { RootStackParamList } from './types';
import { Show } from '../types';
import { Prop } from '@/shared/types/props';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#262626',
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
      }}
    >
      <Tab.Screen
        name="Props"
        component={Props}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Package size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Shows"
        component={Shows}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Theater size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Packing"
        component={Packing}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Box size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#000000',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: '#000000',
          },
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PropDetail"
          component={PropDetailPage}
          options={({ route }) => ({
            title: route.params?.prop?.name ? `Prop - ${route.params.prop.name}` : 'Prop Detail',
          })}
        />
        <Stack.Screen
          name="ShowDetail"
          component={ShowDetailPage}
          options={({ route }) => ({
            title: route.params?.show?.name ? `Show - ${route.params.show.name}` : 'Show Detail',
          })}
        />
        {/* Comment out screens for potentially missing pages */}
        {/* <Stack.Screen
          name="AddProp"
          component={AddPropPage}
          options={({ route }) => ({
            title: route.params?.showId ? 'Add Prop to Show' : 'Add New Prop',
          })}
        /> */}
        {/* <Stack.Screen
          name="EditProp"
          component={EditPropPage}
          options={{ title: 'Edit Prop' }}
        /> */}
        {/* <Stack.Screen
          name="AddShow"
          component={AddShowPage}
          options={{ title: 'Add New Show' }}
        /> */}
        {/* <Stack.Screen
          name="EditShow"
          component={EditShowPage}
          options={{ title: 'Edit Show' }}
        /> */}
        {/* <Stack.Screen
          name="PackingDetail"
          component={PackingPage} // PackingPage might also be missing/renamed
          options={({ route }) => ({
            title: route.params?.show?.name ? `Packing - ${route.params.show.name}` : 'Packing',
          })}
        /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 