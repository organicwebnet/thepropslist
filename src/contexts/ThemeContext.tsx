import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      let savedTheme: Theme = 'dark';
      try {
        const storedValue = Platform.OS === 'web' 
          ? localStorage.getItem('theme') 
          : await AsyncStorage.getItem('theme');
        
        if (storedValue === 'light' || storedValue === 'dark') {
          savedTheme = storedValue;
        }
      } catch (error) {
        console.error("Failed to load theme from storage", error);
      } finally {
        setThemeState(savedTheme);
        setIsLoading(false);
        if (Platform.OS === 'web') {
           document.documentElement.setAttribute('data-theme', savedTheme);
           const metaThemeColor = document.querySelector('meta[name="theme-color"]');
           if (metaThemeColor) {
             metaThemeColor.setAttribute('content', savedTheme === 'light' ? '#ffffff' : '#0A0A0A');
           }
        }
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const saveTheme = async () => {
      try {
        if (Platform.OS === 'web') {
          localStorage.setItem('theme', theme);
          document.documentElement.setAttribute('data-theme', theme);
          const metaThemeColor = document.querySelector('meta[name="theme-color"]');
          if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'light' ? '#ffffff' : '#0A0A0A');
          }
        } else {
          await AsyncStorage.setItem('theme', theme);
        }
      } catch (error) {
        console.error("Failed to save theme to storage", error);
      }
    };
    saveTheme();
  }, [theme, isLoading]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  if (isLoading) {
     return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
} 