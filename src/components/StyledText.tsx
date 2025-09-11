import React from 'react';
import { Text, StyleSheet, type TextProps } from 'react-native';
import { useFont } from '../contexts/FontContext';
import { useTheme } from '../contexts/ThemeContext';
import { lightTheme, darkTheme } from '../styles/theme';

// Extend TextProps to allow passing all standard Text component props
interface StyledTextProps extends TextProps {
  type?: 'primary' | 'secondary' | 'custom'; // Optional: to specify text type for different coloring
  customColor?: string; // Optional: for a completely custom color not from theme
}

export const StyledText: React.FC<StyledTextProps> = ({ style, type = 'primary', customColor, ...props }) => {
  const { font } = useFont();
  const { theme } = useTheme();
  const themeColors = theme === 'dark' ? darkTheme.colors : lightTheme.colors;

  const fontFamily = font === 'openDyslexic' ? 'OpenDyslexic-Regular' : undefined; // undefined uses system default
  
  let color;
  if (customColor) {
    color = customColor;
  } else {
    color = type === 'secondary' 
      ? themeColors.textSecondary 
      : themeColors.textPrimary;
  }

  const textStyle = [
    styles.base,
    { fontFamily },
    { color },
    style, // Allow overriding with custom styles
  ];

  return <Text style={textStyle} {...props} />;
};

const styles = StyleSheet.create({
  base: {
    // You can add any truly global base text styles here if needed
    // For example, a default font size if not overridden
    // fontSize: 16, 
  },
});

export default StyledText; 
