# Known Issues (Updated 2024)

## Critical Issues

### 1. Build System Issues
**Status**: Active  
**Priority**: High  
**Impact**: Development & Production  

#### Description
1. Metro bundler configuration issues:
   - MIME type errors in web bundle loading
   - Incorrect configuration for web platform
   - Missing platform-specific entry points

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
- [ ] Setup proper Android environment
- [ ] Configure platform tools

### 2. Dependency Conflicts
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

### 3. Font Loading Issues
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

1. **HTML Template Issue**:
   - [ ] Test with Expo's default template
   - [ ] If needed, create minimal custom template
   - [ ] Verify template variable interpolation

2. **VM Module Issue**:
   - [ ] Implement complete Node.js polyfill solution
   - [ ] Test with minimal configuration
   - [ ] Verify all required modules are properly polyfilled

3. **Font Loading**:
   - [ ] Implement unified font loading strategy
   - [ ] Verify font file paths and bundling
   - [ ] Add error handling and fallback fonts

4. **Webpack Migration**:
   - [ ] Evaluate migration to Expo Router
   - [ ] Test Metro bundler compatibility
   - [ ] Update build configurations

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