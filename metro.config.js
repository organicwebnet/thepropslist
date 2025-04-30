const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');
const { withNativeWind } = require('nativewind/metro');

// Find the project root (directory containing package.json)
const projectRoot = __dirname;
// Find the workspace root (if using Yarn workspaces)
// const workspaceRoot = path.resolve(projectRoot, '../..'); // Adjust if needed

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// --- Add path alias resolution --- 
// 1. Watch all files in the monorepo (if applicable)
// config.watchFolders = [workspaceRoot]; // Uncomment if using workspaces
// 2. Let Metro know where to resolve packages, searching projectRoot first
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  // path.resolve(workspaceRoot, 'node_modules'), // Uncomment if using workspaces
];
// 3. Force Metro to resolve specified packages from the projectRoot
// config.resolver.resolveRequest = (context, moduleName, platform) => {
//   if (moduleName.startsWith('@shared/')) { // Example
//     const resolvedPath = path.resolve(projectRoot, 'src/shared', moduleName.substring(8));
//     return {
//       filePath: resolvedPath,
//       type: 'sourceFile',
//     };
//   }
//   // Optionally, chain to the standard Metro resolver.
//   return context.resolveRequest(context, moduleName, platform);
// };

// Add aliases from tsconfig.json - Restore dynamic reading
const tsconfig = require('./tsconfig.json'); // Load tsconfig
const aliases = tsconfig.compilerOptions.paths;

// UNCOMMENTING DYNAMIC ALIAS PROXY
/* START: Commenting out Proxy for diagnostics
config.resolver.extraNodeModules = new Proxy({}, {
  get: (target, name) => {
    if (typeof name !== 'string') {
      return target[name]; // Handle non-string properties
    }

    // Check against tsconfig paths
    for (const alias in aliases) {
        // Ensure the alias from tsconfig ends with /* for proper matching
        if (!alias.endsWith('/*')) continue; 
        const aliasPattern = alias.substring(0, alias.length - 2); // e.g., '@' or '@shared'
        
        // Ensure the target path from tsconfig ends with /*
        const targetPathPatternWithStar = aliases[alias]?.[0];
        if (!targetPathPatternWithStar || !targetPathPatternWithStar.endsWith('/*')) continue; 
        const targetPathPattern = targetPathPatternWithStar.substring(0, targetPathPatternWithStar.length - 2); // e.g., 'src' or 'src/shared'

        if (name === aliasPattern || name.startsWith(aliasPattern + '/')) {
          const relativePath = name.substring(aliasPattern.length);
          const resolvedPath = path.join(projectRoot, targetPathPattern, relativePath);
          // Check if the resolved path exists before returning
          // Note: fs.existsSync can be slow, consider alternatives if performance is critical
          const fs = require('fs');
          if (fs.existsSync(resolvedPath) || fs.existsSync(resolvedPath + '.ts') || fs.existsSync(resolvedPath + '.tsx') || fs.existsSync(path.join(resolvedPath, 'index.ts')) || fs.existsSync(path.join(resolvedPath, 'index.tsx'))) {
            // console.log(`[Metro Alias] Resolved: ${name} -> ${resolvedPath}`);
            return resolvedPath;
          }
        }
    }

    // Fallback to node_modules for unhandled modules
    try {
      // Attempt to resolve through Node's default mechanism first
      const resolvedNodeModule = require.resolve(name, { paths: [path.join(projectRoot, 'node_modules')] });
      if (resolvedNodeModule) {
         // console.log(`[Metro Alias] Fallback node_modules: ${name} -> ${resolvedNodeModule}`);
         return path.dirname(resolvedNodeModule); // extraNodeModules expects directory path
      } 
    } catch (e) {
       // Module not found in node_modules, do nothing, let Metro handle it
    }

    // If not resolved via alias or node_modules, let Metro try its default resolution
    // console.log(`[Metro Alias] Default resolution for: ${name}`);
    return undefined; // Let Metro handle modules not found in aliases or direct node_modules check
  },
});
END: Commenting out Proxy for diagnostics */

// You might need to add basic aliases back here if the app fails to start, e.g.:
config.resolver.extraNodeModules = {
  '@shared': path.resolve(projectRoot, 'src/shared'),
  // Add other critical aliases if needed
};


// --- Polyfills for Node.js core modules ---
// Add buffer explicitly
// config.resolver.extraNodeModules.buffer = require.resolve('buffer/'); // This needs to be added to the object above now
if (config.resolver.extraNodeModules) { // Ensure extraNodeModules exists
  config.resolver.extraNodeModules.buffer = require.resolve('buffer/');
} else {
  config.resolver.extraNodeModules = { buffer: require.resolve('buffer/') };
}


// --- End path alias resolution --- 

// --- SVG Transformer Configuration --- 
// Commenting out SVG transformer temporarily for diagnostics
// config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
// config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
// config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];
// --- End SVG --- 

// Remove the old resolver overrides within withNativeWind
// const { transformer, resolver } = config; 

// Apply withNativeWind wrapper, passing the already modified config
module.exports = withNativeWind(config, {
  // NativeWind options only
  input: './global.css',
  projectRoot: projectRoot,
  // Do NOT override resolver here, as it's already configured in the base 'config' object
});