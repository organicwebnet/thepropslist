import { useState, useEffect } from 'react';
import * as ExpoFont from 'expo-font';

export function useFonts() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFonts() {
      try {
        await ExpoFont.loadAsync({
          'OpenDyslexic': require('../../../assets/fonts/OpenDyslexic/OpenDyslexic-Regular.otf'),
          'OpenDyslexic-Bold': require('../../../assets/fonts/OpenDyslexic/OpenDyslexic-Bold.otf'),
          'OpenDyslexic-Italic': require('../../../assets/fonts/OpenDyslexic/OpenDyslexic-Italic.otf'),
          'OpenDyslexic-BoldItalic': require('../../../assets/fonts/OpenDyslexic/OpenDyslexic-BoldItalic.otf'),
          'OpenDyslexicAlta': require('../../../assets/fonts/OpenDyslexic/OpenDyslexicAlta-Regular.otf'),
          'OpenDyslexicAlta-Bold': require('../../../assets/fonts/OpenDyslexic/OpenDyslexicAlta-Bold.otf'),
          'OpenDyslexicAlta-Italic': require('../../../assets/fonts/OpenDyslexic/OpenDyslexicAlta-Italic.otf'),
          'OpenDyslexicAlta-BoldItalic': require('../../../assets/fonts/OpenDyslexic/OpenDyslexicAlta-BoldItalic.otf'),
          'OpenDyslexicMono': require('../../../assets/fonts/OpenDyslexic/OpenDyslexicMono-Regular.otf'),
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        setFontError(error instanceof Error ? error.message : 'Failed to load fonts');
        setFontsLoaded(false);
      }
    }

    loadFonts();
  }, []);

  return { fontsLoaded, fontError };
} 