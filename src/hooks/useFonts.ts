import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface FontLoadingState {
  fontsLoaded: boolean;
  error: Error | null;
  retry: () => Promise<void>;
}

const FONT_ASSETS = {
  'OpenDyslexic-Regular': require('../../assets/fonts/OpenDyslexic/OpenDyslexic-Regular.otf'),
  'OpenDyslexic-Bold': require('../../assets/fonts/OpenDyslexic/OpenDyslexic-Bold.otf'),
  'OpenDyslexic-Italic': require('../../assets/fonts/OpenDyslexic/OpenDyslexic-Italic.otf'),
};

export function useFonts(): FontLoadingState {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadFonts = async () => {
    try {
      setError(null);
      
      // Use Font.loadAsync for all platforms, letting Expo handle web specifics
      await Font.loadAsync(FONT_ASSETS);

      setFontsLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load fonts'));
      setFontsLoaded(false);
    }
  };

  useEffect(() => {
    loadFonts();
  }, []);

  return {
    fontsLoaded,
    error,
    retry: loadFonts
  };
} 
