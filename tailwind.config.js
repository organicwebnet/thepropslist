/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#d6001c',
        'primary-dark': '#a30016'
      }
    },
  },
  plugins: [],
};