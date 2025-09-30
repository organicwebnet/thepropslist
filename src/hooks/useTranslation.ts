import { useCallback } from 'react';
import { i18n, TranslationKeys } from '../lib/i18n';

/**
 * React hook for accessing translations
 */
export function useTranslation() {
  const t = useCallback((key: TranslationKeys, fallback?: string): string => {
    return i18n.t(key, fallback);
  }, []);

  const setLanguage = useCallback((language: string): void => {
    i18n.setLanguage(language);
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
    setLanguage,
    getLanguage,
    getAvailableLanguages,
    isLanguageSupported,
  };
}
