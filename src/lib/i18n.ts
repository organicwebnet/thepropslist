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
  
  // Biometric related translations
  'biometric.setup.title': string;
  'biometric.setup.description': string;
  'biometric.setup.unavailable': string;
  'biometric.setup.prompt': string;
  'biometric.setup.enabled': string;
  'biometric.setup.disabled': string;
  'biometric.setup.enable': string;
  'biometric.setup.disable': string;
  'biometric.setup.skip': string;
  'biometric.setup.success': string;
  'biometric.setup.failed': string;
  'biometric.setup.not_available': string;
  'biometric.setup.not_enrolled': string;
  'biometric.setup.no_hardware': string;
  'biometric.setup.checking': string;
  'biometric.setup.benefits.quick': string;
  'biometric.setup.benefits.secure': string;
  'biometric.setup.benefits.no_password': string;
  'biometric.setup.benefits.device_security': string;
  'biometric.auth.unlock': string;
  'biometric.auth.failed': string;
  'biometric.auth.cancelled': string;
  'biometric.auth.error': string;
  'biometric.settings.title': string;
  'biometric.settings.description': string;
  'biometric.settings.enable_button': string;
  'biometric.settings.disable_button': string;
  'biometric.settings.status.enabled': string;
  'biometric.settings.status.disabled': string;
  'biometric.types.fingerprint': string;
  'biometric.types.face_id': string;
  'biometric.types.iris': string;
  'biometric.types.biometric': string;
  
  // Common translations
  'common.error': string;
  'common.success': string;
  'common.loading': string;
  'common.cancel': string;
  'common.confirm': string;
  'common.yes': string;
  'common.no': string;
  'common.close': string;
  'common.retry': string;
  'common.skip': string;
  
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
  
  // Biometric
  'biometric.setup.title': 'Enable Biometric Sign-In',
  'biometric.setup.description': 'Sign in quickly and securely with your {type}',
  'biometric.setup.unavailable': 'Biometric authentication is not available on this device',
  'biometric.setup.prompt': 'Enable biometric sign-in for The Props List',
  'biometric.setup.enabled': 'Biometric sign-in has been enabled!',
  'biometric.setup.disabled': 'Biometric sign-in has been disabled.',
  'biometric.setup.enable': 'Enable {type}',
  'biometric.setup.disable': 'Disable Biometric Sign-In',
  'biometric.setup.skip': 'Skip for now',
  'biometric.setup.success': 'Biometric sign-in has been enabled! You can now use your fingerprint or face to sign in quickly.',
  'biometric.setup.failed': 'Biometric authentication failed. Please try again.',
  'biometric.setup.not_available': 'Your device does not support biometric authentication',
  'biometric.setup.not_enrolled': 'Please set up fingerprint or face recognition in your device settings first',
  'biometric.setup.no_hardware': 'Your device does not support biometric authentication',
  'biometric.setup.checking': 'Checking device capabilities...',
  'biometric.setup.benefits.quick': 'Quick and secure access',
  'biometric.setup.benefits.secure': 'No need to remember passwords',
  'biometric.setup.benefits.no_password': 'Works with your device\'s security',
  'biometric.setup.benefits.device_security': 'Works with your device\'s security',
  'biometric.auth.unlock': 'Unlock The Props List',
  'biometric.auth.failed': 'Authentication failed',
  'biometric.auth.cancelled': 'Authentication was cancelled',
  'biometric.auth.error': 'Authentication error',
  'biometric.settings.title': 'Biometric Sign-In',
  'biometric.settings.description': 'Use your {type} to sign in quickly and securely',
  'biometric.settings.enable_button': 'Enable Biometric Sign-In',
  'biometric.settings.disable_button': 'Disable Biometric Sign-In',
  'biometric.settings.status.enabled': 'Enabled',
  'biometric.settings.status.disabled': 'Disabled',
  'biometric.types.fingerprint': 'Fingerprint',
  'biometric.types.face_id': 'Face ID',
  'biometric.types.iris': 'Iris',
  'biometric.types.biometric': 'Biometric',
  
  // Common
  'common.error': 'Error',
  'common.success': 'Success',
  'common.loading': 'Loading...',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.close': 'Close',
  'common.retry': 'Retry',
  'common.skip': 'Skip',
  
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
    
    // Biometric
    'biometric.setup.title': 'Habilitar Inicio de Sesión Biométrico',
    'biometric.setup.description': 'Inicia sesión de forma rápida y segura con tu {type}',
    'biometric.setup.unavailable': 'La autenticación biométrica no está disponible en este dispositivo',
    'biometric.setup.prompt': 'Habilitar inicio de sesión biométrico para The Props List',
    'biometric.setup.enabled': '¡El inicio de sesión biométrico ha sido habilitado!',
    'biometric.setup.disabled': 'El inicio de sesión biométrico ha sido deshabilitado.',
    'biometric.setup.enable': 'Habilitar {type}',
    'biometric.setup.disable': 'Deshabilitar Inicio de Sesión Biométrico',
    'biometric.setup.skip': 'Omitir por ahora',
    'biometric.setup.success': '¡El inicio de sesión biométrico ha sido habilitado! Ahora puedes usar tu huella dactilar o rostro para iniciar sesión rápidamente.',
    'biometric.setup.failed': 'La autenticación biométrica falló. Por favor, inténtalo de nuevo.',
    'biometric.setup.not_available': 'Tu dispositivo no soporta autenticación biométrica',
    'biometric.setup.not_enrolled': 'Por favor, configura el reconocimiento de huella dactilar o rostro en la configuración de tu dispositivo primero',
    'biometric.setup.no_hardware': 'Tu dispositivo no soporta autenticación biométrica',
    'biometric.setup.checking': 'Verificando capacidades del dispositivo...',
    'biometric.setup.benefits.quick': 'Acceso rápido y seguro',
    'biometric.setup.benefits.secure': 'No necesitas recordar contraseñas',
    'biometric.setup.benefits.no_password': 'Funciona con la seguridad de tu dispositivo',
    'biometric.setup.benefits.device_security': 'Funciona con la seguridad de tu dispositivo',
    'biometric.auth.unlock': 'Desbloquear The Props List',
    'biometric.auth.failed': 'La autenticación falló',
    'biometric.auth.cancelled': 'La autenticación fue cancelada',
    'biometric.auth.error': 'Error de autenticación',
    'biometric.settings.title': 'Inicio de Sesión Biométrico',
    'biometric.settings.description': 'Usa tu {type} para iniciar sesión de forma rápida y segura',
    'biometric.settings.enable_button': 'Habilitar Inicio de Sesión Biométrico',
    'biometric.settings.disable_button': 'Deshabilitar Inicio de Sesión Biométrico',
    'biometric.settings.status.enabled': 'Habilitado',
    'biometric.settings.status.disabled': 'Deshabilitado',
    'biometric.types.fingerprint': 'Huella Dactilar',
    'biometric.types.face_id': 'Face ID',
    'biometric.types.iris': 'Iris',
    'biometric.types.biometric': 'Biométrico',
    
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.loading': 'Cargando...',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.yes': 'Sí',
    'common.no': 'No',
    'common.close': 'Cerrar',
    'common.retry': 'Reintentar',
    'common.skip': 'Omitir',
    
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
    
    // Biometric
    'biometric.setup.title': 'Activer la Connexion Biométrique',
    'biometric.setup.description': 'Connectez-vous rapidement et en toute sécurité avec votre {type}',
    'biometric.setup.unavailable': 'L\'authentification biométrique n\'est pas disponible sur cet appareil',
    'biometric.setup.prompt': 'Activer la connexion biométrique pour The Props List',
    'biometric.setup.enabled': 'La connexion biométrique a été activée !',
    'biometric.setup.disabled': 'La connexion biométrique a été désactivée.',
    'biometric.setup.enable': 'Activer {type}',
    'biometric.setup.disable': 'Désactiver la Connexion Biométrique',
    'biometric.setup.skip': 'Ignorer pour le moment',
    'biometric.setup.success': 'La connexion biométrique a été activée ! Vous pouvez maintenant utiliser votre empreinte digitale ou votre visage pour vous connecter rapidement.',
    'biometric.setup.failed': 'L\'authentification biométrique a échoué. Veuillez réessayer.',
    'biometric.setup.not_available': 'Votre appareil ne prend pas en charge l\'authentification biométrique',
    'biometric.setup.not_enrolled': 'Veuillez d\'abord configurer la reconnaissance d\'empreinte digitale ou faciale dans les paramètres de votre appareil',
    'biometric.setup.no_hardware': 'Votre appareil ne prend pas en charge l\'authentification biométrique',
    'biometric.setup.checking': 'Vérification des capacités de l\'appareil...',
    'biometric.setup.benefits.quick': 'Accès rapide et sécurisé',
    'biometric.setup.benefits.secure': 'Pas besoin de se souvenir des mots de passe',
    'biometric.setup.benefits.no_password': 'Fonctionne avec la sécurité de votre appareil',
    'biometric.setup.benefits.device_security': 'Fonctionne avec la sécurité de votre appareil',
    'biometric.auth.unlock': 'Déverrouiller The Props List',
    'biometric.auth.failed': 'L\'authentification a échoué',
    'biometric.auth.cancelled': 'L\'authentification a été annulée',
    'biometric.auth.error': 'Erreur d\'authentification',
    'biometric.settings.title': 'Connexion Biométrique',
    'biometric.settings.description': 'Utilisez votre {type} pour vous connecter rapidement et en toute sécurité',
    'biometric.settings.enable_button': 'Activer la Connexion Biométrique',
    'biometric.settings.disable_button': 'Désactiver la Connexion Biométrique',
    'biometric.settings.status.enabled': 'Activé',
    'biometric.settings.status.disabled': 'Désactivé',
    'biometric.types.fingerprint': 'Empreinte Digitale',
    'biometric.types.face_id': 'Face ID',
    'biometric.types.iris': 'Iris',
    'biometric.types.biometric': 'Biométrique',
    
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.loading': 'Chargement...',
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer',
    'common.yes': 'Oui',
    'common.no': 'Non',
    'common.close': 'Fermer',
    'common.retry': 'Réessayer',
    'common.skip': 'Ignorer',
    
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
    // Get language from storage (localStorage for web, AsyncStorage for mobile)
    let savedLanguage: string | null = null;
    
    if (typeof localStorage !== 'undefined') {
      // Web environment
      savedLanguage = localStorage.getItem('app_language');
    } else if (typeof require !== 'undefined') {
      // React Native environment - we'll handle this in the mobile-specific implementation
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        // Note: This is async, so we'll handle it in the mobile hook
        savedLanguage = null; // Will be set by mobile hook
      } catch (e) {
        // AsyncStorage not available
        savedLanguage = null;
      }
    }
    
    // Get browser/system language
    let systemLanguage = 'en';
    if (typeof navigator !== 'undefined' && navigator.language) {
      systemLanguage = navigator.language.split('-')[0];
    }
    
    this.setLanguage(savedLanguage || systemLanguage || 'en');
  }

  setLanguage(language: string): void {
    this.currentLanguage = language;
    this.currentTranslations = translations[language] || defaultTranslations;
    
    // Save to storage (localStorage for web, AsyncStorage for mobile)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('app_language', language);
    }
    
    // Update document language (web only)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }

  // Mobile-specific method to save language to AsyncStorage
  async setLanguageAsync(language: string): Promise<void> {
    this.setLanguage(language);
    
    // Save to AsyncStorage for mobile
    if (typeof require !== 'undefined') {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('app_language', language);
      } catch (e) {
        console.warn('Failed to save language to AsyncStorage:', e);
      }
    }
  }

  // Mobile-specific method to load language from AsyncStorage
  async loadLanguageFromStorage(): Promise<string> {
    if (typeof require !== 'undefined') {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const savedLanguage = await AsyncStorage.getItem('app_language');
        if (savedLanguage) {
          this.setLanguage(savedLanguage);
          return savedLanguage;
        }
      } catch (e) {
        console.warn('Failed to load language from AsyncStorage:', e);
      }
    }
    
    return this.currentLanguage;
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

  // Helper method for string interpolation
  tWithParams(key: keyof TranslationKeys, params: Record<string, string>, fallback?: string): string {
    let translation = this.translate(key, fallback);
    
    // Replace parameters in the format {param}
    Object.keys(params).forEach(param => {
      translation = translation.replace(new RegExp(`{${param}}`, 'g'), params[param]);
    });
    
    return translation;
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
