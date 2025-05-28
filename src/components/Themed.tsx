/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import { Text as DefaultText, View as DefaultView } from 'react-native';

// import Colors from '@/constants/Colors'; // OLD - from todo-list-master, path needs to be specific to THIS project
// import { useColorScheme } from './useColorScheme'; // OLD - this also needs to be specific to THIS project

// TODO: ADAPT THIS TO YOUR PROJECT'S THEME SYSTEM
// For now, these will use hardcoded or default theme values from your existing ThemeContext.
// This component needs to be refactored to properly use your app's ThemeContext and theme structure.

import { useTheme } from '../contexts/ThemeContext.tsx'; // Assuming this is your app's theme context

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

// This function needs to be adapted or removed if your ThemeContext provides colors directly.
// For now, it won't work as expected because `Colors` and `useColorScheme` are from the other project.
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: string // Simplified colorName, as `keyof typeof Colors.light` won't work here
) {
  const { theme } = useTheme(); // Your app's theme object or theme name
  
  // This logic is highly dependent on how your `theme` object is structured
  // and whether it differentiates light/dark internally or if `theme` itself is 'light' or 'dark'.
  // Placeholder logic:
  const currentScheme = typeof theme === 'string' ? theme : (theme as any)?.mode || 'light'; // Guessing theme structure

  const colorFromProps = props[currentScheme as 'light' | 'dark'];

  if (colorFromProps) {
    return colorFromProps;
  }
  // This part is problematic as `Colors` is not defined in this project context.
  // You need to access colors from your `theme` object from `useTheme()`.
  // Example: return (theme as any).colors[colorName] || '#000000'; 
  // This needs to be replaced with actual access to your theme colors.
  console.warn("useThemeColor in Themed.tsx needs to be adapted to the host project's theme system.");
  if (colorName === 'text') return (theme as any)?.colors?.text || '#000000';
  if (colorName === 'background') return (theme as any)?.colors?.background || '#ffffff';
  return '#000000'; // Default fallback
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  // const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text'); // Original
  const { theme: appTheme } = useTheme();
  const color = (appTheme as any)?.colors?.text || '#000'; // Directly use your app's theme

  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  // const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background'); // Original
  const { theme: appTheme } = useTheme();
  const backgroundColor = (appTheme as any)?.colors?.background || '#fff'; // Directly use your app's theme

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
} 