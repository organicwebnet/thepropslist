/**
 * Internationalization (i18n) service for managing translations
 */

export interface TranslationKeys {
  // Show deletion related translations
  'show.delete.confirm': string;
  'show.delete.warning': string;
  'show.delete.success': string;
  'show.delete.error': string;
  'show.delete.failed': string;
  'show.delete.cancel': string;
  'show.delete.proceed': string;
  
  // Common translations
  'common.error': string;
  'common.success': string;
  'common.loading': string;
  'common.cancel': string;
  'common.confirm': string;
  'common.yes': string;
  'common.no': string;
  
  // Platform specific
  'platform.mobile': string;
  'platform.web': string;
}

export interface Translations {
  [key: string]: string;
}

// Default English translations
const defaultTranslations: Translations = {
  // Show deletion
  'show.delete.confirm': 'Confirm Delete',
  'show.delete.warning': 'Are you sure you want to delete this show and all its props? This action cannot be undone.',
  'show.delete.success': 'Show Deleted',
  'show.delete.error': 'Failed to delete show.',
  'show.delete.failed': 'Failed to delete show.',
  'show.delete.cancel': 'Cancel',
  'show.delete.proceed': 'Delete',
  
  // Common
  'common.error': 'Error',
  'common.success': 'Success',
  'common.loading': 'Loading...',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.yes': 'Yes',
  'common.no': 'No',
  
  // Platform
  'platform.mobile': 'Mobile',
  'platform.web': 'Web',
};

// Additional language translations
const translations: Record<string, Translations> = {
  en: defaultTranslations,
  es: {
    // Spanish translations
    'show.delete.confirm': 'Confirmar Eliminación',
    'show.delete.warning': '¿Estás seguro de que quieres eliminar este espectáculo y todas sus propiedades? Esta acción no se puede deshacer.',
    'show.delete.success': 'Espectáculo Eliminado',
    'show.delete.error': 'Error al eliminar el espectáculo.',
    'show.delete.failed': 'Error al eliminar el espectáculo.',
    'show.delete.cancel': 'Cancelar',
    'show.delete.proceed': 'Eliminar',
    
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.loading': 'Cargando...',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.yes': 'Sí',
    'common.no': 'No',
    
    'platform.mobile': 'Móvil',
    'platform.web': 'Web',
  },
  fr: {
    // French translations
    'show.delete.confirm': 'Confirmer la Suppression',
    'show.delete.warning': 'Êtes-vous sûr de vouloir supprimer ce spectacle et toutes ses propriétés ? Cette action ne peut pas être annulée.',
    'show.delete.success': 'Spectacle Supprimé',
    'show.delete.error': 'Échec de la suppression du spectacle.',
    'show.delete.failed': 'Échec de la suppression du spectacle.',
    'show.delete.cancel': 'Annuler',
    'show.delete.proceed': 'Supprimer',
    
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.loading': 'Chargement...',
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer',
    'common.yes': 'Oui',
    'common.no': 'Non',
    
    'platform.mobile': 'Mobile',
    'platform.web': 'Web',
  },
};

class I18nService {
  private currentLanguage: string = 'en';
  private currentTranslations: Translations = defaultTranslations;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Get language from localStorage or browser settings
    const savedLanguage = localStorage.getItem('app_language');
    const browserLanguage = navigator.language.split('-')[0];
    
    this.setLanguage(savedLanguage || browserLanguage || 'en');
  }

  setLanguage(language: string): void {
    this.currentLanguage = language;
    this.currentTranslations = translations[language] || defaultTranslations;
    
    // Save to localStorage
    localStorage.setItem('app_language', language);
    
    // Update document language
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }

  getLanguage(): string {
    return this.currentLanguage;
  }

  translate(key: keyof TranslationKeys, fallback?: string): string {
    const translation = this.currentTranslations[key];
    
    if (translation) {
      return translation;
    }
    
    // Fallback to default translations
    const defaultTranslation = defaultTranslations[key];
    if (defaultTranslation) {
      return defaultTranslation;
    }
    
    // Return fallback or key if no translation found
    return fallback || key;
  }

  // Convenience method for React components
  t(key: keyof TranslationKeys, fallback?: string): string {
    return this.translate(key, fallback);
  }

  // Get all available languages
  getAvailableLanguages(): string[] {
    return Object.keys(translations);
  }

  // Check if a language is supported
  isLanguageSupported(language: string): boolean {
    return language in translations;
  }
}

// Export singleton instance
export const i18n = new I18nService();

// Export types for use in other modules
export type { TranslationKeys, Translations };
