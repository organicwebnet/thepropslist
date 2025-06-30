import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Props from '../pages/Props.tsx';
import Shows from '../pages/Shows.tsx';
import Packing from '../pages/Packing.tsx';
import PropDetailPage from '../pages/PropDetailPage.tsx';
import ShowDetailPage from '../pages/ShowDetailPage.tsx';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { RootStackParamList } from './types.ts';
import { Show } from '../types/index.ts';
import { Prop } from '../shared/types/props.ts';

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
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="package-variant" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Shows"
        component={Shows}
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="theater" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Packing"
        component={Packing}
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Feather name="box" size={size} color={color} />
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
          options={({ route }: NativeStackScreenProps<RootStackParamList, 'PropDetail'>) => ({
            title: route.params?.prop?.name ? `Prop - ${route.params.prop.name}` : 'Prop Detail',
          })}
        />
        <Stack.Screen
          name="ShowDetail"
          component={ShowDetailPage}
          options={({ route }: NativeStackScreenProps<RootStackParamList, 'ShowDetail'>) => ({
            title: route.params?.show?.name ? `Show - ${route.params.show.name}` : 'Show Detail',
          })}
        />
        {/* Comment out screens for potentially missing pages */}
        {/* <Stack.Screen
          name="AddProp"
          component={AddPropPage}
          options={({ route }: { route: RouteProp<RootStackParamList, 'AddProp'> }) => ({
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
          options={({ route }: { route: RouteProp<RootStackParamList, 'PackingDetail'> }) => ({
            title: route.params?.show?.name ? `Packing - ${route.params.show.name}` : 'Packing',
          })}
        /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 
