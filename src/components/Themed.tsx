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
import { lightTheme, darkTheme } from '../styles/theme.ts';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

// Define a type for all valid color keys in the theme
export type ThemeColorKey =
  | 'bg'
  | 'cardBg'
  | 'inputBg'
  | 'text'
  | 'textPrimary'
  | 'textSecondary'
  | 'primary'
  | 'border'
  | 'iconDefault'
  | 'iconDanger'
  | 'iconWarning'
  | 'disabledButtonBg'
  | 'buttonText'
  | 'highlight'
  | 'highlightBg'
  | 'error'
  | 'card'
  | 'background';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ThemeColorKey
) {
  const { theme } = useTheme();
  const themeColors = theme === 'dark' ? darkTheme.colors : lightTheme.colors;

  // Prefer explicit prop override
  const colorFromProps = props[theme as 'light' | 'dark'];
  if (colorFromProps) {
    return colorFromProps;
  }
  // Use centralized theme colors
  return themeColors[colorName] || '#000000';
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, ...otherProps } = props;
  // Remove backgroundColor so the view is transparent by default
  return <DefaultView style={style} {...otherProps} />;
} 
