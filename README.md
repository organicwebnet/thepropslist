# The Props List

A comprehensive, production-ready props management system for theatrical productions built with React Native and Expo.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-https://props--bible--app--1c1cb.web.app-blue)](https://props-bible-app-1c1cb.web.app)
[![Repository](https://img.shields.io/badge/Repository-thepropslist-green)](https://github.com/organicwebnet/thepropslist)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎭 About

The Props List is a comprehensive digital solution for managing theatrical props throughout the entire production lifecycle. From initial planning and procurement to show night and post-production archiving, this system streamlines prop management for theater companies of all sizes.

## ✨ Features

### Core Functionality
- **Multi-Show Management**: Organize props across multiple productions
- **Detailed Prop Tracking**: Dimensions, weight, usage instructions, and maintenance history
- **Collaborative Team Features**: Role-based access control and team management
- **Pre-Show Setup Tracking**: Ensure everything is in place before curtain
- **QR Code Integration**: Generate and scan QR codes for quick prop identification
- **Camera Integration**: Capture and manage prop photos
- **PDF Generation**: Export prop lists and reports for offline use

### Advanced Features
- **Task Board**: Trello-like kanban boards for show and prop management
- **Real-time Collaboration**: Multiple team members can work simultaneously
- **Offline Support**: Full functionality on mobile devices without internet
- **Export Capabilities**: CSV exports for offline use and backup
- **Role-Based Permissions**: Granular access control for different team roles
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

## 🛠 Tech Stack

- **Framework**: Expo SDK 53 with React Native 0.79.4
- **Language**: TypeScript 5.8.3
- **Backend**: Firebase (Auth, Firestore, Storage, Functions)
- **UI**: React Native Paper, Material UI (web), NativeWind/Tailwind CSS
- **State Management**: React Context API
- **Navigation**: Expo Router 5.1.1
- **Testing**: Jest with React Native Testing Library
- **CI/CD**: GitHub Actions with automated deployments

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Git**: For version control
- **Android Studio**: For Android development (includes Android SDK and emulator)
- **Java Development Kit (JDK)**: Version 17 (required for Android builds)
- **Xcode**: For iOS development (macOS only, version 14.0+)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/organicwebnet/thepropslist.git
   cd thepropslist
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your Firebase configuration
   ```

4. **Start development server:**
   ```bash
   npm start
   ```

## 🔧 Development

### Available Scripts

```bash
# Development
npm start                 # Start Expo development server
npm run android          # Run on Android emulator
npm run ios              # Run on iOS simulator (macOS only)
npm run web              # Run on web browser

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues

# Building
npm run build:android    # Build Android APK
npm run build:ios        # Build iOS app (macOS only)
```

### Project Structure

```
thepropslist/
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
├── web-app/               # Web application build
├── android/               # Android native code
├── ios/                   # iOS native code
├── assets/                # Static assets (images, fonts)
├── public/                # Web public assets
├── functions/             # Firebase Cloud Functions
├── _docs/                 # Project documentation
└── .github/workflows/     # GitHub Actions CI/CD
```

## 🔥 Firebase Configuration

### Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase API key | Yes |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Yes |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | Yes |

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password, Google Sign-In)
3. Create a Firestore database
4. Enable Storage
5. Download `google-services.json` and place it in the root directory
6. Add your domain to Firebase Auth authorized domains

## 🚀 Deployment

### Automatic Deployment

The project uses GitHub Actions for automated deployment:

- **Web App**: Automatically deploys to Firebase Hosting on push to `master`
- **Firebase Functions**: Deploy with `npm run deploy:functions`
- **Firestore Rules**: Deploy with `npm run deploy:rules`

### Manual Deployment

```bash
# Deploy web app
npm run deploy:web

# Deploy Firebase functions
npm run deploy:functions

# Deploy Firestore rules
npm run deploy:rules
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=ComponentName
```

## 📱 Platform Support

- **Web**: Full functionality with responsive design
- **Android**: Native app with offline support
- **iOS**: Native app with offline support (macOS development required)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run linting: `npm run lint`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## 📚 Documentation

- [Setup Guide](_docs/SETUP.md)
- [iOS Setup](_docs/IOS_SETUP.md)
- [Firebase Configuration](_docs/FIREBASE_DEPLOYMENT_SETUP.md)
- [Known Issues](_docs/KNOWN_ISSUES.md)
- [API Documentation](_docs/API.md)

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**: Run `npx expo prebuild --clean`
2. **Dependency Conflicts**: Run `npx expo install --fix`
3. **Metro Bundle Errors**: Clear cache with `npx expo start --clear`
4. **Android Emulator Issues**: Ensure Android SDK is properly configured

### Getting Help

- Check [Known Issues](_docs/KNOWN_ISSUES.md) for documented problems
- Review build logs for specific error messages
- Ensure all environment variables are properly set
- Verify Firebase configuration and permissions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/) and [React Native](https://reactnative.dev/)
- Powered by [Firebase](https://firebase.google.com/)
- UI components from [React Native Paper](https://reactnativepaper.com/)
- Icons from [Lucide React](https://lucide.dev/)

## 📞 Support

- **Live Demo**: [https://props-bible-app-1c1cb.web.app](https://props-bible-app-1c1cb.web.app)
- **Issues**: [GitHub Issues](https://github.com/organicwebnet/thepropslist/issues)
- **Documentation**: [Project Docs](_docs/)

---

**Made with ❤️ for the theater community**