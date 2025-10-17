import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type FontChoice = 'default' | 'openDyslexic';

export interface FontContextType {
  font: FontChoice;
  setFont: (font: FontChoice) => void;
  isLoadingFont: boolean; // To know when the font preference has been loaded
}

const FontContext = createContext<FontContextType | undefined>(undefined);

// const FONT_STORAGE_KEY = 'appFontPreference'; // Temporarily unused

export function FontProvider({ children }: { children: ReactNode }) {
  const [font, setFontState] = useState<FontChoice>('default');
  const [isLoadingFont, setIsLoadingFont] = useState(false); // Set to false for web compatibility

  const setFont = (newFont: FontChoice) => {
    setFontState(newFont);
  };

  // useEffect(() => { // Temporarily unused
  //   const loadFontPreference = async () => {
  //     setIsLoadingFont(true);
  //     let savedFont: FontChoice = 'default'; // Default font
  //     try {
  //       const storedValue = Platform.OS === 'web' 
  //         ? localStorage.getItem(FONT_STORAGE_KEY)
  //         : await AsyncStorage.getItem(FONT_STORAGE_KEY);
        
  //       if (storedValue === 'default' || storedValue === 'openDyslexic') {
  //         savedFont = storedValue;
  //       }
  //     } catch (error) {
  //       console.error("Failed to load font preference from storage", error);
  //     } finally {
  //       setFontState(savedFont);
  //       setIsLoadingFont(false);
  //     }
  //   };
  //   loadFontPreference();
  // }, []);

  // const setFont = async (newFont: FontChoice) => { // Temporarily unused
  //   setFontState(newFont);
  //   try {
  //     if (Platform.OS === 'web') {
  //       localStorage.setItem(FONT_STORAGE_KEY, newFont);
  //       // Optionally, apply to a root element attribute if CSS depends on it
  //       // document.documentElement.setAttribute('data-font', newFont);
  //     } else {
  //       await AsyncStorage.setItem(FONT_STORAGE_KEY, newFont);
  //     }
  //   } catch (error) {
  //     console.error("Failed to save font preference to storage", error);
  //   }
  // };

  return (
    <FontContext.Provider value={{ font, setFont, isLoadingFont }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFont(): FontContextType {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
} 
