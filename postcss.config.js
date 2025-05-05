export default {
  plugins: {
    // Rely solely on NativeWind for Tailwind processing
    "nativewind/postcss": {
      output: "nativewind-output.js",
    },
    // Remove the explicit plugins we added previously
    // 'tailwindcss': {},
    // 'autoprefixer': {},
  },
};
