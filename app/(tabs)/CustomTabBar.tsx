import React from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MainNavigationBar } from '../../src/components/navigation/MainNavigationBar';

export default function CustomTabBar(props: BottomTabBarProps) {
  return <MainNavigationBar {...props} />;
}

