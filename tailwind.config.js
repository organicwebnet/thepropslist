/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Light theme colors
        'light-primary': '#0054a6',
        'light-primary-dark': '#003e8f',
        'light-primary-light': '#3b82f6',
        'light-primary-neon': '#60a5fa',
        'light-neon-glow': '#3b82f633',
        
        // Dark theme colors
        'dark-primary': '#d6001c',
        'dark-primary-dark': '#a30016',
        'dark-primary-light': '#ff1a1a',
        'dark-primary-neon': '#ff0000',
        'dark-neon-glow': '#ff000033',
        
        // Default colors (used by Tailwind classes)
        primary: '#0054a6',
        'primary-dark': '#003e8f',
        'primary-light': '#3b82f6',
        'primary-neon': '#60a5fa',
        'neon-glow': '#3b82f633'
      },
      boxShadow: {
        'neon': '0 0 20px 1px var(--neon-glow)',
        'neon-lg': '0 0 30px 2px var(--neon-glow)'
      }
    },
  },
  plugins: [],
};