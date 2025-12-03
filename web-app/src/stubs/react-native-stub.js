// Minimal stub for react-native Platform API and common components
// Used when shared code imports react-native but we're on web
// Updated: Added NativeModules, PixelRatio, Dimensions exports

export const Platform = {
  OS: 'web',
  select: (obj) => obj.web || obj.default,
};

// Minimal component stubs (these shouldn't be used in web code)
export const View = 'div';
export const Text = 'span';
export const TextInput = 'input';
export const TouchableOpacity = 'button';
export const ScrollView = 'div';
export const FlatList = 'div';
export const Image = 'img';
export const Modal = 'div';
export const ActivityIndicator = 'div';
export const StyleSheet = {
  create: (styles) => styles,
};
export const Alert = {
  alert: (title, message, buttons) => {
    if (window.confirm(message || title)) {
      buttons?.[0]?.onPress?.();
    } else {
      buttons?.[1]?.onPress?.();
    }
  },
};

// AppRegistry stub (used by expo-notifications and other React Native modules)
export const AppRegistry = {
  registerComponent: () => {},
  registerConfig: () => {},
  registerRunnable: () => {},
  runApplication: () => {},
  setComponentProviderInstrumentationHook: () => {},
  getAppKeys: () => [],
  unmountApplicationComponentAtRootTag: () => {},
};

// LogBox stub (used by expo-notifications and other React Native modules for debugging)
export const LogBox = {
  ignoreLogs: () => {},
  ignoreAllLogs: () => {},
  uninstall: () => {},
  install: () => {},
};

// NativeEventEmitter stub (used by expo-notifications and other React Native modules)
// This is a simple EventEmitter-like stub for web
class NativeEventEmitterStub {
  constructor() {
    this.listeners = new Map();
  }
  addListener(eventType, listener) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(listener);
    return { remove: () => this.removeListener(eventType, listener) };
  }
  removeListener(eventType, listener) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  removeAllListeners(eventType) {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }
  emit(eventType, ...args) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }
}

export const NativeEventEmitter = NativeEventEmitterStub;

// NativeModules stub (used by expo modules to access native functionality)
// On web, native modules are not available, so we return an empty object
export const NativeModules = {};

// PixelRatio stub (used for device pixel ratio calculations)
export const PixelRatio = {
  get: () => typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (layoutSize) => layoutSize * (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1),
  roundToNearestPixel: (layoutSize) => layoutSize,
};

// Dimensions stub (used for screen dimensions)
export const Dimensions = {
  get: (dimension) => {
    if (typeof window === 'undefined') return { width: 0, height: 0 };
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  },
  addEventListener: () => ({ remove: () => {} }),
  removeEventListener: () => {},
};

export default {
  Platform,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Alert,
  AppRegistry,
  LogBox,
  NativeEventEmitter,
  NativeModules,
  PixelRatio,
  Dimensions,
};

