# Known Issues (Updated 2024)

## Critical Issues

### 1. Android App Hang/Crash After Loading
**Status**: Active (Investigating)
**Priority**: Critical
**Impact**: Android App Functionality
**Description**: The Android application loads the initial JS bundle (reaches 100% in Metro), shows the initial loading indicator from `_layout.tsx`, but then hangs or crashes (black screen) when attempting to render the initial route (`app/(tabs)/props.tsx`). This occurs even after fixing native Firebase initialization errors and major TypeScript errors.
**Required Changes**:
- Investigate the render cycle of `app/(tabs)/props.tsx` and its dependencies (`useFirebase`, `useAuth`, `PropList`, `useProps` hook, etc.).
- Check context provider behavior during initial render/update.
- Simplify the `app/(tabs)/props.tsx` render step-by-step to pinpoint the crashing component/hook.
- Examine native logs (`adb logcat`) closely *during* the transition from loading to the attempted screen render for any new native errors.
**Action Items**:
- [X] Restore `app/(tabs)/props.tsx` main return block.
- [ ] Systematically comment out sections within the restored `PropsScreen` render logic.
- [ ] Analyze native logs during the crash timeframe.
- [ ] Check context provider states and effects.

### 2. Build System Issues
**Status**: Active  
**Priority**: High  
**Impact**: Development & Production  

#### Description
1. Metro bundler configuration issues:
   - MIME type errors in web bundle loading
   - Incorrect configuration for web platform
   - Missing platform-specific entry points
   - ~~iOS GoogleService-Info.plist path warning~~ (Resolved by commenting out in app.config.js as file is missing)

2. Android SDK configuration:
   - Incorrect SDK path
   - Missing platform tools
   - Emulator setup issues

#### Required Changes
1. Metro Configuration Updates:
   ```javascript
   // metro.config.js needs:
   - Web platform support
   - Proper MIME type handling
   - Asset loading configuration
   ```

2. Android Setup:
   ```bash
   - Configure ANDROID_HOME
   - Install platform tools
   - Setup emulator
   ```

#### Action Items
- [ ] Update Metro configuration for web
- [ ] Fix MIME type handling
- [X] Setup proper Android environment (via app.config.js fix)
- [ ] Configure platform tools
- [ ] Investigate Android app launch failure after successful prebuild
- [X] Comment out missing iOS plist reference in app.config.js

### 3. Android Firebase Initialization Failure
**Status**: Resolved (Native initialization fixed)
**Priority**: Critical
**Impact**: Android App Functionality

#### Description
~~The Android application fails at runtime with errors like "No native Firebase app instance found" or "No Firebase App '[DEFAULT]' has been created". This occurs specifically when `@react-native-firebase/app` checks for initialized apps (`getApps().length`), which returns 0...~~
**Resolution**: The native Firebase initialization issue appears resolved, allowing the JS bundle to load further.

### 4. Dependency Conflicts
**Status**: Active  
**Priority**: High  
**Impact**: Build & Runtime  

#### Description
1. Version conflicts:
   - Multiple Metro versions (^0.73.5)
   - React version mismatches
   - Navigation library conflicts

2. Peer dependency issues:
   - React version requirements
   - Expo SDK compatibility
   - Navigation dependencies

#### Required Changes
1. Package.json updates:
   - Resolve version conflicts
   - Update peer dependencies
   - Standardize navigation implementation

2. Dependency cleanup:
   - Remove duplicate packages
   - Update to compatible versions
   - Fix peer dependency issues

#### Action Items
- [ ] Audit dependencies
- [ ] Update package versions
- [ ] Fix peer dependencies
- [ ] Test compatibility

### 5. Font Loading Issues
**Status**: Active  
**Priority**: Medium  
**Impact**: User Experience  

#### Description
1. Font loading implementation:
   - Incomplete error handling
   - Platform-specific issues
   - Loading performance

2. Asset management:
   - Font file accessibility
   - Platform-specific font loading
   - Cache management

#### Required Changes
1. Font loading system:
   - Implement proper error handling
   - Add platform-specific loading
   - Optimize performance

2. Asset configuration:
   - Update asset bundling
   - Configure caching
   - Implement fallbacks

#### Action Items
- [ ] Improve font loading
- [ ] Add error handling
- [ ] Setup proper caching
- [ ] Implement fallbacks

## Development Environment Issues

### 1. Build Tools
**Status**: Active  
**Priority**: Medium  
**Impact**: Development  

#### Description
- Inconsistent build behavior
- Missing development tools
- Configuration issues

#### Action Items
- [ ] Setup proper build tools
- [ ] Configure development environment
- [ ] Document setup process

### 2. Testing Infrastructure
**Status**: Pending  
**Priority**: Medium  
**Impact**: Quality Assurance  

#### Description
- Incomplete test coverage
- Platform-specific testing issues
- CI/CD configuration needed

#### Action Items
- [ ] Setup testing infrastructure
- [ ] Add platform-specific tests
- [ ] Configure CI/CD pipeline

## Documentation Issues

### 1. Setup Instructions
**Status**: Pending  
**Priority**: Medium  
**Impact**: Development  

#### Description
- Missing setup documentation
- Incomplete troubleshooting guides
- Platform-specific instructions needed

#### Action Items
- [ ] Create setup documentation
- [ ] Add troubleshooting guides
- [ ] Document platform specifics

## Test Setup and Mocking Issues
**Status**: Active
**Priority**: Medium
**Impact**: Quality Assurance / Developer Experience
**Description**: Numerous TypeScript errors (`TS2345: Argument of type ... is not assignable to parameter of type 'never'`) occur in test files (`src/components/__tests__/OfflineSync.test.ts`, `src/platforms/mobile/services/__tests__/MobileFirebaseService.test.ts`). This often involves complex types (e.g., Firebase SDK types) being mocked with `jest.fn()` and assertions like `as any`.
**Required Changes**:
- Review mock implementations for type correctness.
- Update Jest type definitions or configurations if necessary.
- Potentially relax type checking specifically for mocks where intentional simplification is used, or use more robust mocking utilities.
**Action Items**:
- [ ] Investigate type errors in `OfflineSync.test.ts`.
- [ ] Investigate type conversion errors (`TS2352`) in `MobileFirebaseService.test.ts`.
- [ ] Refine mocking strategy for Firebase and other complex services.

## Navigation Typing Issues
**Status**: Partially Resolved
**Priority**: High
**Impact**: Runtime / Developer Experience
**Description**: ~~Multiple errors related to `react-navigation`...~~ The specific error of passing `onPress` to `PropCard` in `PropsListScreen.tsx` has been resolved. Other potential issues remain.
**Required Changes**:
...
**Action Items**:
- [X] Fix `onPress` prop usage on `PropCard` in `PropsListScreen.tsx`.
- [ ] Audit all `navigation.navigate` calls against `RootStackParamList`.
- [ ] Correct screen names and parameters in navigation calls.
- [ ] Update `RootStackParamList` definition.

## Firebase Service Type Issues
**Status**: Partially Resolved
**Priority**: Medium
**Impact**: Code Quality / Developer Experience
**Description**: ~~TypeScript errors (`TS2416`, `TS2353`) in Firebase service implementations...~~ Missing auth methods (`signInWithEmailAndPassword`, etc.) have been added to `BaseFirebaseService` (stubs) and `MobileFirebaseService` (implementations). Other potential type issues might remain (e.g., `FirebaseDocument` usage).
**Required Changes**:
- Ensure `BaseFirebaseService` and platform-specific implementations correctly adhere to the `FirebaseService` interface.
- Align the structure of the custom `FirebaseDocument` type with how Firestore documents are accessed (e.g., using `.data()`).
- Correct method visibility and signatures across base and derived service classes.
**Action Items**:
- [X] Fix `BaseFirebaseService` implementation against `FirebaseService` interface (added missing auth methods).
- [X] Fix `MobileFirebaseService` implementation against `FirebaseService` interface (added missing auth methods).
- [ ] Correct `FirebaseDocument` type definition or usage in service methods.
- [ ] Resolve method signature/visibility mismatches between base and derived Firebase services.

## `import.meta.env` Usage Error
**Status**: Resolved
**Priority**: High
**Impact**: Build / Runtime
**Description**: Components were incorrectly using `import.meta.env` (Vite standard) instead of `process.env` (Expo/Node standard) to access environment variables.
**Resolution**: Replaced all instances of `import.meta.env.EXPO_PUBLIC_...` with `process.env.EXPO_PUBLIC_...` in affected files (`ConfigForm.tsx`, `FirebaseTest.tsx`, `google.ts`).

## Expo Camera Module Errors
**Status**: Resolved
**Priority**: Medium
**Impact**: Native Feature
**Description**: Errors in `CameraScreen.tsx` related to incorrect import of `MediaLibrary` and using `CameraType` as a value instead of a type.
**Resolution**: Fixed `MediaLibrary` import and usage, changed `CameraType` usage to string literals (`'back'`, `'front'`), and added check for potentially undefined `photo` variable after capture.

## Expo Router Link[href] Type Issue
**Status**: Active
**Priority**: Medium
**Impact**: Build / Developer Experience
**Description**: Using a typed object like `{ pathname: '/props/new' }` for the `href` prop of the `expo-router` `Link` component (as recommended for type safety) results in a `Type '{ pathname: string; }' is not assignable to type 'never'` error in files like `src/props/index.tsx`. String literals also cause errors. This indicates a potential problem with Expo Router type inference or project setup.
**Required Changes**:
- Investigate `tsconfig.json` paths and Expo Router type generation.
- Ensure the correct `Link` component is imported from `expo-router`.
- Verify compatibility between Expo SDK, Expo Router, and TypeScript versions.
**Action Items**:
- [ ] Review Expo Router setup and type generation.
- [ ] Check `Link` component import source.
- [ ] Investigate potential type conflicts or configuration issues.

## Performance Issues

### 1. Bundle Size
**Status**: Pending  
**Priority**: Low  
**Impact**: Production  

#### Description
- Large bundle sizes
- Slow initial load times
- Resource optimization needed

#### Action Items
- [ ] Optimize bundle size
- [ ] Implement code splitting
- [ ] Add performance monitoring

## Web Platform Issues

### 1. HTML Webpack Plugin Template Loading
**Status**: Active  
**Severity**: High  
**Platform**: Web  
**Description**: The HtmlWebpackPlugin is failing to properly process the HTML template with the error "The loader didn't return html".

**Root Cause**:
- Conflict between Expo's default HTML template handling and custom template configuration
- Issues with template variable interpolation
- Potential conflicts in webpack loader configuration

**Attempted Solutions**:
1. Modified webpack configuration to use Expo's default template system
2. Simplified HTML template syntax
3. Updated webpack loader configuration

**Potential Fixes**:
1. Use Expo's built-in template system without customization:
```javascript
// webpack.config.js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  return await createExpoWebpackConfigAsync(env, argv);
};
```

2. If custom template is needed, use a simpler template approach:
```javascript
// webpack.config.js
module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  config.plugins = config.plugins.filter(plugin => !(plugin instanceof HtmlWebpackPlugin));
  config.plugins.push(
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public/index.html'),
      inject: true
    })
  );
  return config;
};
```

### 2. Node.js VM Module Resolution
**Status**: Active  
**Severity**: High  
**Platform**: Web  
**Description**: Unable to resolve 'vm' module in the web environment, causing build failures.

**Root Cause**:
- Node.js core modules are not available in the browser environment
- Missing polyfills for Node.js core modules
- Webpack configuration issues with module resolution

**Attempted Solutions**:
1. Added Node.js polyfills using `node-polyfill-webpack-plugin`
2. Configured webpack fallbacks for core Node.js modules
3. Added webpack.ProvidePlugin for process and Buffer

**Potential Fixes**:
1. Complete Node.js polyfill solution:
```javascript
// webpack.config.js
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  config.plugins.push(
    new NodePolyfillPlugin(),
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    })
  );
  
  config.resolve.fallback = {
    ...config.resolve.fallback,
    vm: require.resolve('vm-browserify'),
    buffer: require.resolve('buffer/'),
    // Other Node.js core modules...
  };
  
  return config;
};
```

2. Alternative approach using browser-compatible alternatives:
- Replace Node.js-specific code with browser-compatible alternatives
- Use web workers for CPU-intensive operations
- Implement feature detection for platform-specific code

### 3. Font Loading Issues
**Status**: Active  
**Severity**: Medium  
**Platform**: Cross-platform  
**Description**: Font loading implementation is incomplete and not working correctly across platforms.

**Root Cause**:
- Inconsistent font loading implementation between web and mobile platforms
- Missing font files or incorrect paths
- Font context initialization issues

**Attempted Solutions**:
1. Created shared font loading hook
2. Updated FontContext for cross-platform compatibility
3. Modified font file paths in webpack configuration

**Potential Fixes**:
1. Implement unified font loading strategy:
```typescript
// hooks/useFonts.ts
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';

export function useFonts() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'OpenDyslexic-Regular': require('../assets/fonts/OpenDyslexic/OpenDyslexic-Regular.otf'),
          'OpenDyslexic-Bold': require('../assets/fonts/OpenDyslexic/OpenDyslexic-Bold.otf'),
          'OpenDyslexic-Italic': require('../assets/fonts/OpenDyslexic/OpenDyslexic-Italic.otf'),
        });
        setFontsLoaded(true);
      } catch (e) {
        setError(e as Error);
      }
    }
    loadFonts();
  }, []);

  return { fontsLoaded, error };
}
```

2. Ensure proper font file bundling:
```javascript
// app.config.js
module.exports = {
  // ...
  assetBundlePatterns: [
    "**/*",
    "assets/fonts/**/*"
  ],
  // ...
};
```

### 4. Webpack Deprecation Notice
**Status**: Active  
**Severity**: High  
**Platform**: Web  
**Description**: As of Expo SDK 50, Webpack support in Expo CLI is officially deprecated.

**Root Cause**:
- Expo is moving towards using Metro bundler for all platforms
- Need for unified bundling solution across platforms
- Better support for features like React Server Components

**Migration Path**:
1. Move to Expo Router (Recommended):
   - Uses Metro bundler universally
   - Provides file-based routing
   - Supports static rendering and API routes
   - Better integration with React Native features

2. Use Metro for Web without Expo Router:
   - Limited features compared to Expo Router
   - No file-based features or static rendering
   - Basic web bundling capabilities

**Alternative Solutions**:
1. For Storybook:
   - Use the official template: `npx create-expo -e with-storybook`
   - Continues to support Webpack for component development

2. For Next.js:
   - Use `@expo/next-adapter`
   - Note: Complex SDK features may not work without additional tooling

## Next Steps

1. **Android App Hang/Crash**:
   - [ ] Investigate `app/(tabs)/props.tsx` render cycle.
   - [ ] Analyze native logs (`adb logcat`).

2. **Remaining TypeScript Errors**:
   - [ ] Fix Module Resolution Errors (`src/services/firebase.ts`).
   - [ ] Fix Type Definition Issues (`auth.ts`).
   - [ ] Fix Test Setup/Mocking issues.

3. **Build System/Web Issues**:
   - [ ] Address remaining items in Build System Issues.
   - [ ] Address Web Platform Issues.

## References

1. [Expo Webpack Configuration Documentation](https://docs.expo.dev/guides/customizing-webpack/)
2. [React Native Web Font Loading](https://necolas.github.io/react-native-web/docs/font-family/)
3. [Webpack Node.js Polyfills](https://webpack.js.org/configuration/resolve/#resolvefallback)
4. [Expo Font Documentation](https://docs.expo.dev/versions/latest/sdk/font/)
5. [Expo Router Migration Guide](https://docs.expo.dev/router/migration)

## Resolution Timeline

### Immediate (24-48 hours)
1. Fix build system issues
2. Resolve dependency conflicts
3. Setup development environment

### Short Term (1 week)
1. Implement proper font loading
2. Setup testing infrastructure
3. Create documentation

### Long Term (2-4 weeks)
1. Optimize performance
2. Enhance user experience
3. Add advanced features 