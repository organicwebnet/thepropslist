/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['attr', 'data-theme'],
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // NEW Light theme colors (Hyer Blue base)
        'light-primary': '#0054a6',        // Base Blue
        'light-primary-dark': '#003e8f',   // Darker shade
        'light-primary-light': '#3b82f6',  // Lighter shade (Tailwind blue-600)
        'light-primary-neon': '#60a5fa',   // Brighter shade (Tailwind blue-500)
        'light-neon-glow': '#3b82f633',    // Glow effect for lighter shade

        // NEW Dark theme colors (Hyer Blue base, adjusted for dark)
        'dark-primary': '#3b82f6',         // Brighter blue as primary on dark
        'dark-primary-dark': '#0054a6',    // Base blue as darker variant
        'dark-primary-light': '#60a5fa',   // Brighter blue as lighter variant
        'dark-primary-neon': '#93c5fd',    // Even lighter blue (Tailwind blue-400)
        'dark-neon-glow': '#60a5fa33',     // Glow effect for brighter blue
        // Hyer-inspired Dark Theme UI Colors - REFINE with Dribbble inspiration
        'dark-bg': '#111827',             // Very Dark Gray (Tailwind gray-900)
        'dark-card-bg': '#1f2937',         // Slightly lighter dark gray (Tailwind gray-800)
        'dark-text-primary': '#f9fafb',   // Light gray/white text (Tailwind gray-50)
        'dark-text-secondary': '#9ca3af', // Dimmer gray text (Tailwind gray-400)
        'dark-border': '#374151',       // Subtle border (Tailwind gray-700)

        // Update Default aliases to match light theme
        // primary: 'var(--light-primary)', // Use CSS variable referencing light theme
        primary: '#3b82f6', // Set a concrete color (Tailwind blue-500) for native compatibility
        'primary-dark': 'var(--light-primary-dark)',
        'primary-light': 'var(--light-primary-light)',
        'primary-neon': 'var(--light-primary-neon)',
        'neon-glow': 'var(--light-neon-glow)'
        // You might also want explicit background/text colors if needed elsewhere
        // 'background-light': '#f3f4f6', // Example gray-100
        // 'text-light': '#1f2937', // Example gray-800
        // 'background-dark': '#111827', // Example gray-900 - Replaced by dark-bg
        // 'text-dark': '#f9fafb', // Example gray-50 - Replaced by dark-text-primary
      },
      boxShadow: {
        // Keep neon shadows, they will use the corresponding neon-glow variable
        'neon': '0 0 20px 1px var(--neon-glow)',
        'neon-lg': '0 0 30px 2px var(--neon-glow)'
      }
    },
  },
  plugins: [],
};