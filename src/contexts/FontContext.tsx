import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type FontOption = 
  | 'system' 
  | 'opendyslexic' 
  | 'opendyslexic-alta'
  | 'opendyslexic-mono'
  | 'arial' 
  | 'verdana';

export type FontContextType = {
  font: FontOption;
  setFont: (font: FontOption) => Promise<void>;
  isLoading: boolean;
};

const FontContext = createContext<FontContextType | undefined>(undefined);

const FONT_STORAGE_KEY = '@props_bible/font_preference';

function getFontFamily(font: FontOption): string {
  switch (font) {
    case 'opendyslexic':
      return 'OpenDyslexic';
    case 'opendyslexic-alta':
      return 'OpenDyslexicAlta';
    case 'opendyslexic-mono':
      return 'OpenDyslexicMono';
    case 'arial':
      return 'Arial';
    case 'verdana':
      return 'Verdana';
    default:
      return 'system-ui';
  }
}

export function FontProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [font, setFontState] = useState<FontOption>('system');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved font preference
    const loadFontPreference = async () => {
      try {
        const savedFont = await AsyncStorage.getItem(FONT_STORAGE_KEY);
        if (savedFont) {
          setFontState(savedFont as FontOption);
        }
      } catch (error) {
        console.error('Error loading font preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFontPreference();
  }, []);

  const setFont = async (newFont: FontOption) => {
    try {
      await AsyncStorage.setItem(FONT_STORAGE_KEY, newFont);
      setFontState(newFont);
      
      // Web-specific style updates
      if (Platform.OS === 'web') {
        document.documentElement.style.setProperty('--font-family', getFontFamily(newFont));
        document.documentElement.setAttribute('data-font', newFont);
      }
    } catch (error) {
      console.error('Error saving font preference:', error);
    }
  };

  return (
    <FontContext.Provider value={{ font, setFont, isLoading }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFontContext() {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error('useFontContext must be used within a FontProvider');
  }
  return context;
} 