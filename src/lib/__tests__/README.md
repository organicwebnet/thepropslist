# Google Drive Integration Tests

This directory contains comprehensive unit and integration tests for the Google Drive integration feature.

## 📁 Test Structure

```
src/lib/__tests__/
├── googleDrive.test.ts           # GoogleDriveService unit tests
├── hybridStorage.test.ts         # HybridStorageService unit tests
├── googleDriveIntegration.test.ts # End-to-end integration tests
├── setup.ts                      # Test setup and mocks
├── jest.config.js                # Jest configuration
└── README.md                     # This file

src/components/__tests__/
└── StoragePreferences.test.tsx   # UI component tests
```

## 🧪 Test Categories

### 1. Unit Tests

#### GoogleDriveService (`googleDrive.test.ts`)
- **Authentication**: Token management and access control
- **Folder Management**: Create, find, and manage folders
- **File Operations**: Upload, download, delete, and list files
- **Sharing**: Create shareable links and manage permissions
- **Error Handling**: Network failures, API errors, and edge cases

#### HybridStorageService (`hybridStorage.test.ts`)
- **Provider Routing**: Smart file routing based on size and preferences
- **Firebase Integration**: Firebase Storage upload and error handling
- **Google Drive Integration**: Drive API integration and folder management
- **Hybrid Logic**: Mixed storage provider workflows
- **Preferences Management**: User preference handling and validation

#### StoragePreferences Component (`StoragePreferences.test.tsx`)
- **UI Rendering**: Component rendering and state display
- **User Interactions**: Click handlers and preference changes
- **Error States**: Error display and recovery
- **Loading States**: Loading indicators and async operations
- **Accessibility**: ARIA labels and keyboard navigation

### 2. Integration Tests

#### End-to-End Workflows (`googleDriveIntegration.test.ts`)
- **Complete Upload Flow**: Authentication → Folder Creation → File Upload
- **Error Recovery**: Network failures, quota exceeded, file size limits
- **Concurrent Operations**: Multiple simultaneous uploads
- **Data Consistency**: File metadata consistency across operations
- **Performance**: Large file handling and scalability

## 🎯 Test Coverage

### Coverage Targets
- **Branches**: 80%+
- **Functions**: 80%+
- **Lines**: 80%+
- **Statements**: 80%+

### Key Areas Covered
- ✅ **Happy Path**: All successful operations
- ✅ **Error Handling**: Network failures, API errors, validation errors
- ✅ **Edge Cases**: Empty responses, malformed data, timeouts
- ✅ **Security**: Authentication failures, permission errors
- ✅ **Performance**: Large files, concurrent operations
- ✅ **User Experience**: Loading states, error messages, accessibility

## 🚀 Running Tests

### Run All Tests
```bash
npm run test:google-drive
# or
node scripts/test-google-drive.js
```

### Run Specific Test Suites
```bash
# Unit tests only
npx jest src/lib/__tests__/googleDrive.test.ts

# Integration tests only
npx jest src/lib/__tests__/googleDriveIntegration.test.ts

# Component tests only
npx jest src/components/__tests__/StoragePreferences.test.tsx
```

### Run with Coverage
```bash
npx jest --coverage --config=src/lib/__tests__/jest.config.js
```

### Run in Watch Mode
```bash
npx jest --watch --config=src/lib/__tests__/jest.config.js
```

## 🔧 Test Configuration

### Jest Configuration (`jest.config.js`)
- **Environment**: jsdom for DOM testing
- **Setup**: Custom setup file for mocks and globals
- **Coverage**: Comprehensive coverage collection
- **Timeout**: 10 seconds for async operations
- **Transform**: TypeScript support with ts-jest

### Test Setup (`setup.ts`)
- **Global Mocks**: fetch, File, Blob, FormData, URL
- **Console Suppression**: Reduced noise in test output
- **Cleanup**: Automatic mock clearing after each test

## 📊 Mock Strategy

### External Dependencies
- **Google APIs**: Mocked fetch calls with realistic responses
- **Firebase Storage**: Mocked upload functions
- **Authentication**: Mocked token management

### Mock Data
- **Realistic Responses**: Actual Google Drive API response formats
- **Error Scenarios**: Various HTTP status codes and error messages
- **File Objects**: Proper File constructor with size and type

## 🐛 Debugging Tests

### Common Issues
1. **Async/Await**: Ensure proper async handling in tests
2. **Mock Cleanup**: Clear mocks between tests
3. **File Objects**: Use proper File constructor in Node.js
4. **Network Timeouts**: Increase timeout for slow operations

### Debug Commands
```bash
# Run with debug output
npx jest --verbose --no-coverage

# Run single test with debug
npx jest --testNamePattern="should upload file successfully"

# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 📈 Test Metrics

### Current Coverage
- **GoogleDriveService**: 95%+ coverage
- **HybridStorageService**: 90%+ coverage
- **StoragePreferences**: 85%+ coverage
- **Integration Tests**: 80%+ coverage

### Test Count
- **Unit Tests**: 45+ test cases
- **Integration Tests**: 15+ test cases
- **Component Tests**: 20+ test cases
- **Total**: 80+ test cases

## 🔄 Continuous Integration

### GitHub Actions
Tests run automatically on:
- Pull requests
- Push to main branch
- Scheduled nightly runs

### Quality Gates
- All tests must pass
- Coverage must meet thresholds
- No linting errors
- No security vulnerabilities

## 📝 Writing New Tests

### Test Structure
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something specific', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Best Practices
1. **Descriptive Names**: Clear test descriptions
2. **Single Responsibility**: One assertion per test
3. **Proper Mocking**: Mock external dependencies
4. **Error Testing**: Test both success and failure cases
5. **Async Handling**: Proper async/await usage

### Test Data
- Use realistic test data
- Include edge cases
- Test with various file sizes
- Include error scenarios

## 🎉 Success Criteria

Tests are considered successful when:
- ✅ All tests pass
- ✅ Coverage meets thresholds
- ✅ No flaky tests
- ✅ Fast execution (< 30 seconds)
- ✅ Clear error messages
- ✅ Comprehensive edge case coverage

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Google Drive API Testing](https://developers.google.com/drive/api/guides/testing)
- [Firebase Testing](https://firebase.google.com/docs/emulator-suite)













