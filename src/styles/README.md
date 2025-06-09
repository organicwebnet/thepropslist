# Styles Directory

This folder contains all global and shared styling resources for the app, including:

- `theme.ts`: Theme variables, color palettes, and shared constants for JS/TS styling.
- `index.css`: Global CSS for web builds (variables, resets, etc.).

## Usage

- **React Native:** Import from `src/styles/theme.ts` for shared colors, spacing, etc.
- **Web:** Use CSS variables from `index.css` or import shared constants from `theme.ts`.

## Centralized Styling & Best Practices

- All theme variables and color palettes are defined in `theme.ts`.
- Update or extend the theme by editing `theme.ts` and using the provided color keys.
- For new components, always use theme variables instead of hardcoded colors.
- For web, use CSS variables for consistency with the JS/TS theme.
- Keep all global and shared styles in this directory for maintainability.

## Updating the Theme

1. Edit `theme.ts` to add or change color variables.
2. Update any relevant CSS variables in `index.css` for web parity.
3. Refactor components to use the new or updated theme variables.
4. Test on both web and mobile for consistency.

## Reference

- See the main `README.md` for project-wide style and code cleanliness guidelines.
- For troubleshooting or contributing to styles, open an issue or PR.

Centralizing styles here ensures consistency and makes it easier to update the app's look and feel globally. 