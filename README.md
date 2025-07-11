# The Props List

A comprehensive, production-ready props management system for theatrical productions built with React Native and Expo.

## Tech Stack

- **Framework**: Expo SDK 53 with React Native 0.79.4
- **Language**: TypeScript 5.8.3
- **Backend**: Firebase (Auth, Firestore, Storage)
- **UI**: React Native Paper, Material UI (web), NativeWind/Tailwind CSS
- **State Management**: React Context API
- **Navigation**: Expo Router 5.1.1
- **Development**: Metro bundler, Jest testing

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
- QR code generation and scanning
- Camera integration for prop photos
- PDF generation and printing

## Prerequisites

Before setting up the project, ensure you have:

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher (comes with Node.js)
- **Git**: For version control
- **Android Studio**: For Android development (includes Android SDK and emulator)
- **Java Development Kit (JDK)**: Version 17 (required for Android builds)

### Android Development Setup

1. **Install Android Studio**: Download from [developer.android.com](https://developer.android.com/studio)
2. **Set up Android SDK**: Install SDK platforms 24-35 (minimum SDK 24, target SDK 35)
3. **Configure environment variables**:
   ```bash
   # Add to your system PATH or .bashrc/.zshrc
   export ANDROID_HOME=$HOME/Android/Sdk  # or C:\Users\USERNAME\AppData\Local\Android\Sdk on Windows
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
4. **Create an AVD**: Set up an Android Virtual Device in Android Studio

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd props-bible
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Optional APIs
EXPO_PUBLIC_TICKETMASTER_API_KEY=your_ticketmaster_key
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_name
```

### 3. Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password, Google)
3. Create a Firestore database
4. Enable Storage
5. Download `google-services.json` and place it in the root directory
6. Add your domain to Firebase Auth authorized domains

### 4. Development Commands

```bash
# Start Expo development server
npm start

# Run on Android emulator
npm run android

# Run on iOS simulator (macOS only)
npm run ios

# Run tests
npm test

# Lint code
npm run lint
```

## Building for Production

### Android Build

```bash
# Clean previous builds (if needed)
cd android
./gradlew clean
cd ..

# Build APK
npx expo run:android --variant release

# Or build with limited parallel workers (Windows fix)
cd android
./gradlew assembleRelease --max-workers=2
```

**Note for Windows users**: If you encounter build issues with file locking, use the `--max-workers=2` flag to limit parallel processes.

## Project Structure

```
project/
├── app/                    # Expo Router app directory
│   ├── (tabs)/            # Tab navigation screens
│   ├── (web)/             # Web-specific screens
│   └── _layout.tsx        # Root layout
├── src/                   # Source code
│   ├── components/        # Reusable UI components
│   ├── contexts/          # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # External service integrations
│   ├── platforms/         # Platform-specific code
│   ├── services/          # Business logic services
│   ├── shared/            # Shared utilities and types
│   ├── styles/            # Global styles and themes
│   └── types/             # TypeScript type definitions
├── android/               # Android native code
├── assets/                # Static assets (images, fonts)
├── public/                # Web public assets
├── _docs/                 # Project documentation
└── package.json           # Dependencies and scripts
```

## Development Workflow

### Starting Development

1. Start the development server: `npm start`
2. Choose your platform:
   - Press `a` for Android
   - Press `w` for web
   - Press `i` for iOS (macOS only)

### Making Changes

1. Code changes are hot-reloaded automatically
2. For native changes, you may need to rebuild: `npx expo run:android`
3. Use `r` in the terminal to reload the app manually

## Transferring Project to New Machine

If you need to move the project to a more powerful machine (recommended for Android emulator performance), follow these steps:

### 📦 Preparing for Transfer

1. **Commit your current changes:**
   ```bash
   git add .
   git commit -m "WIP: Latest development changes"
   git push
   ```

### 🖥️ Setting Up New Machine

1. **Clone the repository:**
   ```bash
   git clone [your-repo-url]
   cd props-bible
   ```

2. **Install dependencies with pnpm (recommended):**
   ```bash
   # Install pnpm globally
   npm install -g pnpm
   
   # Install project dependencies
   pnpm install
   ```

3. **Install global development tools:**
   ```bash
   # Modern Expo CLI
   pnpm add -g @expo/cli
   
   # EAS CLI for cloud builds
   pnpm add -g eas-cli
   
   # Firebase CLI
   pnpm add -g firebase-tools
   ```

4. **Set up Android Studio and emulator** (follow Android Development Setup above)

5. **Copy environment files:**
   - Transfer your `.env` file
   - Transfer `google-services.json`
   - Transfer any other config files

### 🔄 Post-Transfer Steps

1. **Clean installation:**
   ```bash
   pnpm install --frozen-lockfile
   npx expo prebuild --clean
   ```

2. **Test the setup:**
   ```bash
   npx expo start --clear
   ```

3. **If needed, re-enable Firebase** (if temporarily disabled for testing):
   - Uncomment FirebaseProvider in `app/_layout.tsx`

### Common Issues & Solutions

#### "Global was not installed" Error
This React Native bridge initialization error is fixed by polyfills loaded in `app/_layout.tsx`. If you encounter this:

```bash
# Clear all caches
npx expo start --clear
cd android && ./gradlew clean && cd ..

# Rebuild completely
npx expo run:android
```

The project includes polyfills in `polyfills.js` that are loaded early in the app initialization to prevent this issue.

#### Build Failures
```bash
# Clean and rebuild
npx expo prebuild --clean
cd android && ./gradlew clean && cd ..
npm run android
```

#### Metro Bundle Issues
```bash
# Clear Metro cache
npx expo start --clear
```

#### Dependency Issues
```bash
# Fix Expo SDK compatibility
npx expo install --fix
```

#### Windows File Locking Issues
```bash
# Use limited workers for Gradle builds
cd android && ./gradlew assembleDebug --max-workers=2
```

#### Emulator Connection Issues
If the emulator can't connect to Metro bundler:
- Ensure emulator and Metro are on the same network
- Try restarting both emulator and Metro server
- Check Windows firewall settings for Metro (port 8081)

## Environment Variables

Required environment variables (see `.env.example`):

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase API key | Yes |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Yes |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | Yes |
| `EXPO_PUBLIC_TICKETMASTER_API_KEY` | Ticketmaster API key | No |
| `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | No |

## Styling & Theming

- **Global Styles**: `src/styles/`
- **Theme Configuration**: `src/styles/theme.ts`
- **Web Styles**: CSS variables in `src/styles/index.css`
- **Mobile Styles**: NativeWind (Tailwind CSS for React Native)

See `src/styles/README.md` for detailed styling guidelines.

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Code Quality

- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier (configured in `.prettierrc`)
- **Type Safety**: Strict TypeScript configuration
- **Code Standards**: See `_docs/REFACTORING_CLEANUP_PLAN.md`

## Contributing

1. Read `_docs/REFACTORING_PLAN.md` and `_docs/KNOWN_ISSUES.md`
2. Follow the established code patterns and styling guidelines
3. Write tests for new features
4. Ensure all linting passes before committing
5. Open issues or pull requests for bugs, features, or documentation improvements

## Troubleshooting

### Common Build Issues

1. **CMake/Native Build Failures**: Run `npx expo prebuild --clean`
2. **Dependency Conflicts**: Run `npx expo install --fix`
3. **Metro Bundle Errors**: Clear cache with `npx expo start --clear`
4. **Android Emulator Issues**: Ensure Android SDK is properly configured

### Platform-Specific Issues

- **Windows**: Use `--max-workers=2` for Gradle builds to avoid file locking
- **macOS**: Ensure Xcode is installed for iOS development
- **Linux**: Install required build tools (`build-essential`, `python3`)

### Getting Help

- Check `_docs/KNOWN_ISSUES.md` for documented issues
- Review build logs for specific error messages
- Ensure all environment variables are properly set
- Verify Firebase configuration and permissions

## License

MIT