# Props Bible

A comprehensive, production-ready props management system for theatrical productions.

## Features

- Manage props for multiple shows
- Track prop details including dimensions, weight, and usage instructions
- Collaborative features for team management
- Pre-show setup tracking
- Export to CSV for offline use
- Centralized styling and theme management
- Robust offline support (mobile)
- Role-based access control
- Task board (Trello-like) for show and prop management

## Project Structure

```
project/
  app/                # Main app folder (navigation, screens, features)
  src/                # Source code (components, contexts, services, types, hooks, etc.)
  assets/             # Images, fonts, and other static assets
  public/             # Public assets (web)
  _docs/              # Project documentation
  package.json        # Project dependencies and scripts
  tsconfig.json       # TypeScript configuration
  App.tsx             # Main app entry point
  index.js            # Main web entry point
  README.md           # Project documentation
  yarn.lock           # Dependency lock (if using yarn)
  ...
```

## Setup

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd props-bible
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file:
   - Copy `.env.example` to `.env`
   - Fill in your Firebase and API configuration details

4. Start the development server:
   ```bash
   npm run dev # For web
   npm start   # For mobile (Expo)
   ```

## Environment Variables

The following environment variables are required (see `.env.example`):

- `EXPO_PUBLIC_FIREBASE_API_KEY`: Your Firebase API key
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`: Your Firebase auth domain
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`: Your Firebase project ID
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase messaging sender ID
- `EXPO_PUBLIC_FIREBASE_APP_ID`: Your Firebase app ID
- `EXPO_PUBLIC_TICKETMASTER_API_KEY`: (Optional) Ticketmaster API key

## Centralized Styling & Theme

- All global and shared styles are in `src/styles/`.
- Use `src/styles/theme.ts` for theme variables and color palettes.
- For web, use CSS variables from `src/styles/index.css`.
- See `src/styles/README.md` for details.

## Code Cleanliness & Best Practices

- No commented-out code or debug logs in production.
- All context/providers are minimal and clear.
- Only one source of truth for each feature.
- Consistent formatting (Prettier/ESLint).
- Centralized error handling and type-safe APIs.
- See `_docs/REFACTORING_CLEANUP_PLAN.md` for ongoing cleanup progress.

## Testing

Run tests with:
```bash
npm test
```

## Troubleshooting

- For build errors: `expo start -c` (mobile), check environment setup, see logs.
- For TypeScript errors: `npm run lint`, verify imports and types.
- For emulator issues: Ensure Android Studio/Xcode is configured, ANDROID_HOME is set.
- For Firebase issues: Check `.env` and Firebase Console settings.

## Contributing

- Please read `_docs/REFACTORING_PLAN.md` and `_docs/KNOWN_ISSUES.md` before contributing.
- Follow the code cleanliness and best practices outlined above.
- Open issues or pull requests for bugs, features, or documentation improvements.

## License

MIT