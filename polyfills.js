/**
 * Global Polyfills for React Native
 * This file must be imported FIRST before any other modules
 */

// CRITICAL: Set up global object immediately
(function() {
  // Ensure global exists in all contexts
  if (typeof global === 'undefined') {
    if (typeof globalThis !== 'undefined') {
      // @ts-ignore
      global = globalThis;
    } else if (typeof window !== 'undefined') {
      // @ts-ignore
      global = window;
    } else if (typeof self !== 'undefined') {
      // @ts-ignore
      global = self;
    } else {
      // @ts-ignore
      global = this || {};
    }
  }

  // Ensure globalThis is available
  if (typeof globalThis === 'undefined') {
    // @ts-ignore
    globalThis = global;
  }

  // Make sure global is actually global
  if (typeof window !== 'undefined') {
    window.global = global;
  }
})();

// React Native global polyfills
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import 'text-encoding-polyfill';

// Ensure Buffer is available globally
global.Buffer = global.Buffer || Buffer;

// Critical React Native globals
global.__DEV__ = global.__DEV__ || (typeof __DEV__ !== 'undefined' ? __DEV__ : false);
global.HermesInternal = global.HermesInternal || (typeof HermesInternal !== 'undefined' ? HermesInternal : undefined);

// Polyfill for process.env if needed
if (typeof global.process === 'undefined') {
  global.process = { 
    env: process?.env || {},
    platform: 'react-native'
  };
}

// Ensure console is available
if (typeof global.console === 'undefined') {
  global.console = console;
}

// Polyfill for URL if needed
if (typeof global.URL === 'undefined' && typeof URL !== 'undefined') {
  global.URL = URL;
}

// Polyfill for URLSearchParams if needed  
if (typeof global.URLSearchParams === 'undefined' && typeof URLSearchParams !== 'undefined') {
  global.URLSearchParams = URLSearchParams;
}

// Ensure fetch is available globally
if (typeof global.fetch === 'undefined' && typeof fetch !== 'undefined') {
  global.fetch = fetch;
  global.Headers = Headers;
  global.Request = Request;
  global.Response = Response;
}

// React Native specific setup
global.navigator = global.navigator || {};
global.navigator.product = 'ReactNative';

// Ensure setTimeout/setInterval are available
global.setTimeout = global.setTimeout || setTimeout;
global.setInterval = global.setInterval || setInterval;
global.clearTimeout = global.clearTimeout || clearTimeout;
global.clearInterval = global.clearInterval || clearInterval;

console.log('Global polyfills loaded successfully - global object:', typeof global); 