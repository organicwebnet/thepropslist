/**
 * CRITICAL Global Setup for React Native Bridge
 * This must run FIRST before any React Native initialization
 */

// More aggressive global setup to fix "Global was not installed" error
(function() {
  'use strict';
  
  // Immediately setup global object - no function wrapper to avoid any execution delays
  if (typeof global === 'undefined') {
    if (typeof globalThis !== 'undefined') {
      // eslint-disable-next-line no-global-assign
      global = globalThis;
    } else if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-global-assign
      global = window;
      window.global = window;
    } else if (typeof self !== 'undefined') {
      // eslint-disable-next-line no-global-assign
      global = self;
      self.global = self;
    } else {
      // eslint-disable-next-line no-global-assign
      global = {};
    }
  }

  // Ensure globalThis exists
  if (typeof globalThis === 'undefined') {
    // eslint-disable-next-line no-global-assign
    globalThis = global;
  }

  // Make absolutely sure global is accessible everywhere
  global.global = global;

  // For React Native bridge compatibility - critical setup
  if (typeof window !== 'undefined') {
    window.global = global;
    window.globalThis = global;
  }

  // Critical React Native globals that MUST exist before bridge initialization
  global.__DEV__ = global.__DEV__ || (typeof __DEV__ !== 'undefined' ? __DEV__ : false);
  global.HermesInternal = global.HermesInternal || (typeof HermesInternal !== 'undefined' ? HermesInternal : undefined);

  // React Native bridge expects these to exist
  global.nativePerformanceNow = global.nativePerformanceNow || (typeof nativePerformanceNow !== 'undefined' ? nativePerformanceNow : undefined);
  global.nativeCallSyncHook = global.nativeCallSyncHook || (typeof nativeCallSyncHook !== 'undefined' ? nativeCallSyncHook : undefined);

  // Basic process setup for React Native
  global.process = global.process || { 
    env: { NODE_ENV: 'development' },
    platform: 'react-native',
    version: '1.0.0'
  };

  // Ensure console exists
  global.console = global.console || console;

  // React Native navigator setup
  global.navigator = global.navigator || { product: 'ReactNative' };

  // Basic timers - React Native should have these but just in case
  global.setTimeout = global.setTimeout || (typeof setTimeout !== 'undefined' ? setTimeout : function() {});
  global.clearTimeout = global.clearTimeout || (typeof clearTimeout !== 'undefined' ? clearTimeout : function() {});
  global.setInterval = global.setInterval || (typeof setInterval !== 'undefined' ? setInterval : function() {});
  global.clearInterval = global.clearInterval || (typeof clearInterval !== 'undefined' ? clearInterval : function() {});

  console.log('CRITICAL: Enhanced global setup complete for React Native bridge');
})();

// Only import additional polyfills AFTER global is established
if (typeof require !== 'undefined') {
  try {
    require('react-native-get-random-values');
    const { Buffer } = require('buffer');
    global.Buffer = global.Buffer || Buffer;
    require('text-encoding-polyfill');
    console.log('Additional polyfills loaded successfully');
  } catch (error) {
    console.warn('Could not load additional polyfills:', error.message);
  }
} 