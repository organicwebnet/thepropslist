/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1a0404',
        'primary-dark': '#0d0202',
        'primary-light': '#ff1a1a',
        'primary-neon': '#ff0000',
        'primary-gradient-start': '#1a0404',
        'primary-gradient-end': '#0d0202',
        'neon-glow': '#ff000033'
      },
      boxShadow: {
        'neon': '0 0 20px 1px #ff000033',
        'neon-lg': '0 0 30px 2px #ff000033'
      }
    },
  },
  plugins: [],
};