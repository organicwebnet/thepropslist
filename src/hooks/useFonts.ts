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
      
      if (Platform.OS === 'web') {
        // Web-specific font loading
        const fontFaces = Object.entries(FONT_ASSETS).map(([family, source]) => {
          return new FontFace(family, `url(${source})`);
        });

        await Promise.all(fontFaces.map(async (fontFace) => {
          const loadedFace = await fontFace.load();
          document.fonts.add(loadedFace);
        }));
      } else {
        // Native platforms font loading
        await Font.loadAsync(FONT_ASSETS);
      }

      setFontsLoaded(true);
    } catch (e) {
      console.error('Font loading error:', e);
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