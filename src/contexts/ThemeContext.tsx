import React, { createContext, useContext, useState, /* useEffect */ } from 'react';
// import AsyncStorage from '@react-native-async-storage/async-storage'; // Commented out
import { Platform } from 'react-native'; // Platform is still used for web document update

export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentThemeState] = useState<Theme>('dark'); // Renamed to avoid conflict with theme in value
  // const [isLoading, setIsLoading] = useState(true); // REMOVE isLoading state

  // All useEffect hooks REMOVED for now
  // useEffect(() => { ... loadTheme ... });
  // useEffect(() => { ... saveTheme ... });

  const setTheme = (newTheme: Theme) => {
    setCurrentThemeState(newTheme);
    // Actual saving logic removed for now, but update document for web if possible
    if (Platform.OS === 'web') { 
       document.documentElement.setAttribute('data-theme', newTheme);
       const metaThemeColor = document.querySelector('meta[name="theme-color"]');
       if (metaThemeColor) {
         metaThemeColor.setAttribute('content', newTheme === 'light' ? '#ffffff' : '#0A0A0A');
       }
    }
  };

  // REMOVE isLoading check
  // if (isLoading) {
  //    return null; 
  // }


  return (
    // Use the state-managed currentTheme here to allow setTheme to reflect visually if possible
    <ThemeContext.Provider value={{ theme: currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 
