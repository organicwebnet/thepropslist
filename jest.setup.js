import '@testing-library/jest-dom';
import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock React Native Firebase
jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: () => ({
    app: jest.fn(),
  }),
}));

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({
    currentUser: null,
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
  }),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({
    collection: jest.fn(),
    doc: jest.fn(),
    batch: jest.fn(),
    runTransaction: jest.fn(),
  }),
}));

jest.mock('@react-native-firebase/storage', () => ({
  __esModule: true,
  default: () => ({
    ref: jest.fn(),
    uploadBytes: jest.fn(),
    getDownloadURL: jest.fn(),
  }),
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useAnimatedStyle: () => ({}),
  useSharedValue: (initial) => ({ value: initial }),
  withTiming: (toValue, config, callback) => {
    callback && callback(true);
    return toValue;
  },
  withSpring: (toValue, config, callback) => {
    callback && callback(true);
    return toValue;
  },
  withSequence: (...animations) => animations[animations.length - 1],
  withDelay: (delay, animation) => animation,
  createAnimatedComponent: (component) => component,
  call: () => {},
  default: {
    addWhitelistedNativeProps: {},
    createAnimatedComponent: (component) => component,
    call: () => {},
  },
}));

// Silence the warning: Animated: `useNativeDriver` is not supported
try {
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch (e) {
  // Ignore if React Native is not available (web environment)
}

// Mock expo-font
jest.mock('expo-font');

// Mock expo-asset
jest.mock('expo-asset');

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  SafeAreaProvider: ({ children }) => children,
}));

// Mock react-native-screens
jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  Constants: {
    manifest: {
      extra: {
        firebaseConfig: {
          apiKey: 'test-api-key',
          authDomain: 'test-auth-domain',
          projectId: 'test-project-id',
          storageBucket: 'test-storage-bucket',
          messagingSenderId: 'test-messaging-sender-id',
          appId: 'test-app-id',
          measurementId: 'test-measurement-id'
        }
      }
    }
  }
}));

// Mock firebase
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Set up global test utilities
global.fetch = jest.fn();
global.console.error = jest.fn();
global.console.warn = jest.fn();