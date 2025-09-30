import { useCallback, useEffect, useState } from 'react';
import { i18n, TranslationKeys } from '../lib/i18n';

/**
 * React hook for accessing translations
 */
export function useTranslation() {
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize language from storage on mobile
  useEffect(() => {
    const initializeLanguage = async () => {
      if (typeof require !== 'undefined') {
        // React Native environment
        try {
          await i18n.loadLanguageFromStorage();
        } catch (e) {
          console.warn('Failed to initialize language:', e);
        }
      }
      setIsInitialized(true);
    };

    initializeLanguage();
  }, []);

  const t = useCallback((key: TranslationKeys, fallback?: string): string => {
    return i18n.t(key, fallback);
  }, []);

  const tWithParams = useCallback((key: TranslationKeys, params: Record<string, string>, fallback?: string): string => {
    return i18n.tWithParams(key, params, fallback);
  }, []);

  const setLanguage = useCallback(async (language: string): Promise<void> => {
    if (typeof require !== 'undefined') {
      // React Native environment
      await i18n.setLanguageAsync(language);
    } else {
      // Web environment
      i18n.setLanguage(language);
    }
  }, []);

  const getLanguage = useCallback((): string => {
    return i18n.getLanguage();
  }, []);

  const getAvailableLanguages = useCallback((): string[] => {
    return i18n.getAvailableLanguages();
  }, []);

  const isLanguageSupported = useCallback((language: string): boolean => {
    return i18n.isLanguageSupported(language);
  }, []);

  return {
    t,
    tWithParams,
    setLanguage,
    getLanguage,
    getAvailableLanguages,
    isLanguageSupported,
    isInitialized,
  };
}
