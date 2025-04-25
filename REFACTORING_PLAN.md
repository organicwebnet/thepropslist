# Props Bible Refactoring Plan (Updated)

## Current State Analysis (Updated 2024)

### Immediate Issues Identified

1. **Build and Runtime Issues**
   - Metro bundler configuration issues with web platform
   - MIME type errors in web bundle loading
   - Android SDK path configuration issues
   - Dependency version conflicts
   - Font loading implementation incomplete

2. **Dependencies Analysis**
   - Multiple versions of Metro (^0.73.5)
   - Mixed React versions (18.3.1)
   - Expo SDK version 52.0.46
   - Conflicting React Native Navigation implementations
   - Peer dependency conflicts in development dependencies

3. **Configuration Issues**
   - Incomplete Metro web configuration
   - Missing platform-specific entry points
   - Babel configuration needs enhancement for web support
   - Environment variable handling needs standardization

## Immediate Stabilization Plan

### Phase 1: Environment Setup (Day 1)
1. **Fix Development Environment**
   ```bash
   # Steps to execute
   1. Configure correct Android SDK path
   2. Install required Android tools
   3. Setup Android emulator
   4. Configure Metro bundler for web
   ```

2. **Dependency Cleanup**
   - Audit and fix package versions
   - Resolve peer dependency conflicts
   - Standardize React Navigation implementation
   - Update Expo SDK dependencies

3. **Configuration Standardization**
   - Update Metro configuration for web support
   - Enhance Babel configuration
   - Setup proper environment variable handling
   - Configure proper entry points for web and mobile

### Phase 2: Platform-Specific Fixes (Day 2)

1. **Web Platform**
   - Implement proper web entry point
   - Configure webpack for web builds
   - Setup proper MIME type handling
   - Implement web-specific navigation

2. **Android Platform**
   - Setup proper Android configuration
   - Implement native module handling
   - Configure proper permissions
   - Setup deep linking

3. **Shared Components**
   - Implement platform-specific component rendering
   - Setup proper styling system
   - Configure font loading for both platforms
   - Implement proper navigation guards

### Phase 3: Testing and Validation (Day 3)

1. **Testing Infrastructure**
   - Setup Jest configuration for both platforms
   - Implement platform-specific test utilities
   - Configure CI/CD pipeline
   - Setup E2E testing

2. **Performance Optimization**
   - Implement code splitting
   - Setup proper caching
   - Optimize bundle size
   - Implement lazy loading

3. **Documentation**
   - Update README with setup instructions
   - Document known issues and workarounds
   - Create development guidelines
   - Setup proper logging system

## Action Items (Priority Order)

1. **Immediate Fixes**
   - [ ] Fix Metro bundler configuration for web
   - [ ] Resolve MIME type issues
   - [ ] Setup proper Android SDK configuration
   - [ ] Fix font loading implementation

2. **Environment Setup**
   - [ ] Setup proper development environment
   - [ ] Configure build tools
   - [ ] Setup emulators
   - [ ] Configure debugging tools

3. **Dependency Management**
   - [ ] Audit and update dependencies
   - [ ] Resolve version conflicts
   - [ ] Setup proper peer dependencies
   - [ ] Configure proper module resolution

4. **Platform Configuration**
   - [ ] Setup web platform
   - [ ] Configure Android platform
   - [ ] Setup shared components
   - [ ] Implement proper navigation

## Success Metrics

1. **Build Success**
   - Web build completes successfully
   - Android build completes successfully
   - No MIME type errors
   - Proper font loading

2. **Runtime Performance**
   - App loads under 3 seconds
   - No runtime errors
   - Smooth navigation
   - Proper font rendering

3. **Development Experience**
   - Clear error messages
   - Fast rebuild times
   - Proper hot reloading
   - Consistent behavior across platforms

## Risk Mitigation

1. **Build Issues**
   - Regular dependency audits
   - Version locking for critical packages
   - Proper error handling
   - Clear build documentation

2. **Platform Compatibility**
   - Platform-specific testing
   - Proper feature detection
   - Fallback implementations
   - Clear platform boundaries

3. **Performance**
   - Regular performance monitoring
   - Bundle size optimization
   - Proper caching strategies
   - Load time optimization

## Current State Analysis
The project currently has mixed web and mobile implementations with several architectural challenges:

### Issues Identified
1. **Platform Mixing**
   - Mixed web (Vite) and mobile (Expo) code
   - Conflicting navigation systems (react-router-dom and @react-navigation/native)
   - Inconsistent styling approaches (CSS and React Native StyleSheet)

2. **Firebase Integration**
   - Multiple Firebase SDKs present
   - Potential initialization conflicts
   - Environment variable handling needs standardization

3. **Dependencies**
   - Redundant packages
   - Version conflicts
   - Mixed web and mobile specific libraries

## Research Findings

### 1. Component Analysis
Current component structure shows:
- 30+ components with mixed platform responsibilities
- Complex form components (PropForm, ShowForm) with platform-specific logic
- Media handling components (ImageUpload, VideoPlayer) needing platform-specific implementations
- Authentication and user management components requiring different SDKs

### 2. Firebase Implementation Status
Current setup includes:
- Multiple initialization methods across platforms
- Inconsistent environment variable usage
- Duplicate service instantiation
- Mixed usage of web and native Firebase SDKs

### 3. Navigation Architecture
Current state:
- React Router for web (`react-router-dom`)
- React Navigation for mobile (`@react-navigation/native`)
- Shared route patterns but different implementations
- Deep linking configuration needed

### 4. Build System Analysis
- Vite configuration for web (v6.2.6)
- Expo configuration for mobile
- Shared dependencies causing conflicts
- Environment variable handling needs standardization

## New Requirements Impact Analysis

### 1. AI Integration Requirements
- Google Vision API integration for props identification
- Speech-to-text for prop form filling
- AI chatbot assistance
- Impact: Requires new service layer and platform-specific implementations

### 2. Enhanced PDF Generation
- Custom layout options (portrait/landscape)
- Selective data display
- Preview functionality
- Impact: Requires platform-specific PDF generation solutions

### 3. Extended Firebase Requirements
- Real-time collaboration features
- Offline data synchronization
- Secure file storage for digital assets
- User roles and permissions

### 4. Payment Integration
- Subscription management
- WordPress integration
- Payment processing
- User plan management

## Enhanced Refactoring Phases

### Phase 1: Foundation Setup (Week 1)
#### Infrastructure
```
src/
├── platforms/
│   ├── web/
│   │   ├── navigation/
│   │   ├── styles/
│   │   ├── pdf/
│   │   └── entry.tsx
│   └── mobile/
│       ├── navigation/
│       ├── styles/
│       ├── pdf/
│       └── entry.tsx
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   │   ├── firebase/
│   │   ├── ai/
│   │   ├── payment/
│   │   └── pdf/
│   └── types/
├── config/
└── assets/
```

#### Tasks:
1. Setup monorepo structure
2. Configure build systems for both platforms
3. Setup CI/CD pipelines
4. Configure environment management

### Phase 2: Core Services (Week 2)
#### Firebase Service Layer
```typescript
// src/services/firebase/types.ts
interface FirebaseService {
  initialize(): Promise<void>;
  auth(): FirebaseAuth;
  firestore(): FirebaseFirestore;
  storage(): FirebaseStorage;
  offline(): OfflineSync;
}

// src/services/ai/types.ts
interface AIService {
  visionAPI: VisionAPIService;
  speechToText: SpeechService;
  chatbot: ChatbotService;
}
```

#### Completed Tasks
1. Created base Firebase service class (`BaseFirebaseService`)
   - Implements common Firebase functionality
   - Reduces code duplication across platforms
   - Provides consistent interface for auth, firestore, and storage
   - Moves shared code to central location

2. Updated web implementation
   - Web service now extends base class
   - Platform-specific storage handling
   - Web-specific offline sync behavior
   - Reduced code duplication by ~60%

#### Remaining Tasks
1. Create mobile Firebase service implementation
2. Implement platform-specific offline sync for mobile
3. Add comprehensive error handling
4. Complete test coverage for both implementations

#### Tasks:
1. Implement Firebase services
2. Setup offline synchronization
3. Configure real-time updates
4. Implement role-based access control

### Phase 3: Feature Implementation (Weeks 3-4)
#### Core Features
1. Props Management
   - Digital inventory system
   - AI-powered identification
   - QR code integration
   
2. Pack List System
   - Dynamic list generation
   - Label management
   - Container tracking

3. Show Management
   - Production details
   - Venue management
   - Schedule coordination

#### Platform-Specific Features
1. Mobile (Android)
   - Offline mode
   - Camera integration
   - Push notifications
   - QR code scanning

2. Web
   - Advanced reporting
   - PDF generation
   - Bulk operations
   - Administrative interface

### Phase 4: Integration Layer (Week 5)
1. Payment System
   - Subscription management
   - WordPress integration
   - Payment processing

2. External Services
   - Google Vision API
   - Speech-to-text services
   - Show/Venue API integrations

### Phase 5: Testing and Optimization (Week 6)
0. codebase review
    - remove duplicat/redundant code
    - remove duplicat/redundant folders and files
    - check the code is well commented
    - ensure good codeing practices are being used.
    - chack tests are inplace

1. Performance Testing
   - Load testing (1000+ concurrent users)
   - Offline capability testing
   - Cross-platform testing

2. Security Audit
   - End-to-end encryption verification
   - Role-based access testing
   - Data protection compliance

## Success Metrics
1. Technical Metrics
   - App size < 100MB
   - Launch time < 3 seconds
   - 99.9% uptime
   - <1% crash rate

2. User Experience Metrics
   - 80% user satisfaction
   - 50% reduction in prop management time
   - Smooth handling of 1000+ concurrent users

## Risk Mitigation
1. Data Management
   - Implement robust backup systems
   - Regular data integrity checks
   - Automated recovery procedures

2. Performance
   - Implement lazy loading
   - Optimize image processing
   - Cache frequently accessed data

3. Security
   - Regular security audits
   - Penetration testing
   - Compliance monitoring

## Maintenance Plan
1. Regular Updates
   - Monthly security patches
   - Quarterly feature updates
   - Annual major version releases

2. Monitoring
   - Real-time performance monitoring
   - Error tracking and logging
   - Usage analytics

3. Documentation
   - API documentation
   - User guides
   - Developer documentation
   - Technical specification
    - issues log

## Progress Updates

### Phase 2: Core Services - Firebase Refactoring
#### Completed Tasks
1. Created base Firebase service class (`BaseFirebaseService`)
   - Implements common Firebase functionality
   - Reduces code duplication across platforms
   - Provides consistent interface for auth, firestore, and storage
   - Moves shared code to central location

2. Updated web implementation
   - Web service now extends base class
   - Platform-specific storage handling
   - Web-specific offline sync behavior
   - Reduced code duplication by ~60%

#### Remaining Tasks
1. Create mobile Firebase service implementation
2. Implement platform-specific offline sync for mobile
3. Add comprehensive error handling
4. Complete test coverage for both implementations

## Issues Log

### 1. TypeScript Type Issues in Firebase Services
**Status**: In Progress  
**Priority**: Medium  
**Impact**: Developer Experience  

#### Description
Several TypeScript type issues have been identified in the Firebase service implementation:

1. Method Visibility Conflict
   ```typescript
   Class 'WebFirebaseService' incorrectly extends base class 'BaseFirebaseService'.
   Property 'createDocumentWrapper' is private in type 'WebFirebaseService' but not in type 'BaseFirebaseService'.
   ```

2. Storage Reference Type Issues
   ```typescript
   Property 'getStorageRef' does not exist on type 'FirebaseStorage'.
   ```

#### Required Changes
1. Align method visibility between base and derived classes
2. Update type definitions for Firebase storage methods
3. Add proper generic type constraints for mock functions in tests

#### Action Items
- [ ] Fix method visibility in WebFirebaseService
- [ ] Update FirebaseStorage interface to include storage reference methods
- [ ] Add proper type definitions for mock functions
- [ ] Update test utilities with correct TypeScript types
- [ ] Add documentation for type usage in services

#### Impact Assessment
- No impact on runtime functionality
- Affects developer experience and code maintainability
- May impact future mobile implementation

### 2. Test Coverage for Firebase Services
**Status**: In Progress  
**Priority**: High  
**Impact**: Code Quality

#### Description
Current test implementation has several issues:
1. TypeScript errors in mock implementations
2. Incomplete coverage of error scenarios
3. Need for platform-specific test cases

#### Action Items
- [ ] Create shared test utilities for Firebase mocks
- [ ] Add platform-specific test cases
- [ ] Implement error scenario coverage
- [ ] Add integration tests for offline sync
- [ ] Document testing patterns for Firebase services

## Timeline
- Week 1: Foundation Setup ✓
- Week 2: Core Services (In Progress)
  - Firebase Service Refactoring ✓
  - TypeScript Issues Resolution (Pending)
  - Mobile Implementation (Pending)
- Weeks 3-4: Feature Implementation
- Week 5: Integration Layer
- Week 6: Testing and Optimization
- Week 7: Beta Release
- Week 8: Production Release

# Props Bible Technical Specification
Version 1.0.0 | Last Updated: 2024

## 1. System Architecture

### 1.1 Overview
Props Bible is a cross-platform application built using:
- Web: React + Vite
- Mobile: React Native + Expo
- Backend: Firebase
- Shared: TypeScript

### 1.2 Architecture Diagram
```
src/
├── platforms/
│   ├── web/
│   │   ├── navigation/
│   │   ├── styles/
│   │   ├── pdf/
│   │   └── entry.tsx
│   └── mobile/
│       ├── navigation/
│       ├── styles/
│       ├── pdf/
│       └── entry.tsx
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   │   ├── firebase/
│   │   ├── ai/
│   │   ├── payment/
│   │   └── pdf/
│   └── types/
├── config/
└── assets/
```

## 2. Platform-Specific Implementations

### 2.1 Web Implementation
- **Framework**: React 18+ with Vite
- **State Management**: Context API
- **Routing**: react-router-dom
- **Styling**: Tailwind CSS
- **Build Tool**: Vite 6.2.6

#### 2.1.1 Web Firebase Service
```typescript
class WebFirebaseService extends BaseFirebaseService {
  initialize(): Promise<void>;
  storage(): FirebaseStorage;
  offline(): OfflineSync;
}
```

### 2.2 Mobile Implementation
- **Framework**: React Native with Expo
- **State Management**: Context API
- **Routing**: @react-navigation/native
- **Styling**: React Native StyleSheet
- **Build Tool**: Expo CLI

#### 2.2.1 Mobile Firebase Service
```typescript
class MobileFirebaseService extends BaseFirebaseService {
  initialize(): Promise<void>;
  storage(): FirebaseStorage;
  offline(): OfflineSync;
}
```

## 3. Core Services

### 3.1 Authentication
```typescript
interface FirebaseAuth {
  currentUser: User | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  createUser(email: string, password: string): Promise<void>;
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
}
```

### 3.2 Firestore Operations
```typescript
interface FirebaseFirestore {
  collection(path: string): FirestoreCollection;
  doc(path: string): FirestoreDocument;
}
```

### 3.3 Storage Management
```typescript
interface FirebaseStorage {
  upload(path: string, file: File): Promise<string>;
  getDownloadURL(path: string): Promise<string>;
  delete(path: string): Promise<void>;
}
```

### 3.4 Offline Sync
```typescript
interface OfflineSync {
  enableSync(): Promise<void>;
  disableSync(): Promise<void>;
  getSyncStatus(): Promise<boolean>;
}
```

## 4. Data Models

### 4.1 Props
```typescript
interface Prop {
  id: string;
  name: string;
  description: string;
  category: string;
  images: string[];
  location: string;
  status: 'available' | 'in-use' | 'maintenance';
  lastUpdated: Timestamp;
}
```

### 4.2 Shows
```typescript
interface Show {
  id: string;
  name: string;
  startDate: Timestamp;
  endDate: Timestamp;
  venue: string;
  props: PropReference[];
  status: 'planning' | 'active' | 'completed';
}
```

## 5. Performance Requirements

### 5.1 Web Performance
- Initial load time: < 3 seconds
- Time to interactive: < 4 seconds
- First contentful paint: < 2 seconds
- Offline support: Full CRUD operations

### 5.2 Mobile Performance
- Cold start time: < 2 seconds
- Storage operations: < 1 second
- Offline sync: < 5 minutes
- Battery impact: < 5% per hour

## 6. Security

### 6.1 Authentication
- JWT-based authentication
- Secure token storage
- Biometric authentication (Mobile)
- Session management

### 6.2 Data Security
- End-to-end encryption for sensitive data
- Role-based access control
- Data validation layers
- Secure file storage

## 7. Error Handling

### 7.1 Network Errors
```typescript
class NetworkError extends Error {
  code: string;
  retry(): Promise<void>;
}
```

### 7.2 Offline Handling
```typescript
interface OfflineHandler {
  queueOperation(operation: Operation): void;
  processPendingOperations(): Promise<void>;
  getQueueStatus(): QueueStatus;
}
```

## 8. Testing Strategy

### 8.1 Unit Testing
- Jest for both platforms
- React Testing Library
- Firebase emulator suite
- Coverage target: 80%

### 8.2 Integration Testing
- End-to-end with Cypress (Web)
- Device testing with Detox (Mobile)
- API integration tests
- Offline scenario testing

## 9. Deployment

### 9.1 Web Deployment
- Platform: Firebase Hosting
- CI/CD: GitHub Actions
- Environment: Production/Staging
- Cache strategy: Service Workers

### 9.2 Mobile Deployment
- Platform: Google Play Store
- Build: EAS Build
- Distribution: Internal/Production
- Updates: OTA via Expo

## 10. Monitoring

### 10.1 Analytics
- Firebase Analytics
- Performance monitoring
- Error tracking
- User behavior analysis

### 10.2 Logging
- Structured logging
- Error reporting
- Performance metrics
- Usage statistics

## 11. Dependencies

### 11.1 Web Dependencies
```json
{
  "react": "^18.0.0",
  "firebase": "^10.0.0",
  "react-router-dom": "^6.0.0",
  "tailwindcss": "^3.0.0"
}
```

### 11.2 Mobile Dependencies
```json
{
  "expo": "^50.0.0",
  "@react-native-firebase/app": "^18.0.0",
  "@react-navigation/native": "^6.0.0",
  "@react-native-async-storage/async-storage": "^1.0.0"
}
```

## 12. Future Considerations

### 12.1 Scalability
- Implement data pagination
- Add caching layers
- Optimize large datasets
- Background processing

### 12.2 Features
- Real-time collaboration
- Advanced search capabilities
- AI-powered categorization
- Automated inventory management

## 13. Version History

### 1.0.0 (Current)
- Initial technical specification
- Base architecture defined
- Core services documented
- Platform implementations specifie

## check for known issues in the KNOWN_ISSUES.md

# Set ANDROID_HOME
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\$env:USERNAME\AppData\Local\Android\Sdk', 'User')

# Add platform-tools to PATH
$platformTools = 'C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\platform-tools'
$currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
if ($currentPath -notlike "*$platformTools*") {
    [System.Environment]::SetEnvironmentVariable('Path', "$currentPath;$platformTools", 'User')
}

# List available AVDs
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -list-avds

# Start the emulator (replace Pixel_4_API_33 with your AVD name)
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Pixel_4_API_33

List of devices attached
emulator-5554    device

# Install a test app
adb install -r path_to_your_apk.apk