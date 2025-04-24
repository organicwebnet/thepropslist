# Known Issues

## TypeScript and Jest Mocking Issues

### 1. Test File: `src/components/__tests__/OfflineSync.test.ts`

#### Issue Description
The test file contains several TypeScript type inference issues related to Jest mocks and Firebase service interfaces. These issues don't affect the functionality of the tests but cause TypeScript compiler warnings.

#### Specific Issues

1. **Jest Mock Type Constraints**
   ```typescript
   type MockedPromise<T> = jest.Mock<Promise<T>>;
   ```
   - Error: Type 'Promise<T>' does not satisfy the constraint 'FunctionLike'
   - Impact: TypeScript compiler cannot properly infer return types for mocked promises
   - Current Workaround: Using type assertions

2. **Generic Type Parameters**
   ```typescript
   const createMockPromise = <T>(value: T): MockedPromise<T>
   ```
   - Error: Argument of type 'T' is not assignable to parameter of type 'never'
   - Impact: Type safety for mock function parameters is reduced
   - Current Workaround: Type assertions on mock implementations

3. **Firebase Service Interface Mocks**
   ```typescript
   const mockFirebaseService: FirebaseService
   ```
   - Error: Type mismatches between mock implementations and Firebase service interfaces
   - Impact: TypeScript cannot verify mock implementations match service contracts
   - Current Workaround: Using type assertions with `as` keyword

4. **Mock Function Return Types**
   ```typescript
   jest.fn().mockReturnValue(value)
   ```
   - Error: Type 'Mock<UnknownFunction>' not assignable to expected types
   - Impact: Return type inference for mock functions is incomplete
   - Current Workaround: Explicit type assertions

#### Root Causes

1. Jest's TypeScript definitions don't fully support all mocking scenarios
2. Complex Firebase service interfaces with nested types
3. Generic type constraints in TypeScript's type system
4. Limitations in type inference for mock functions

#### Proposed Solutions

1. **Short Term**
   - Add `@ts-ignore` comments for specific error cases
   - Use type assertions where necessary
   - Document type issues in test files

2. **Medium Term**
   - Create custom type definitions for mock functions
   - Implement test utilities to handle common mocking patterns
   - Refactor test setup to use more TypeScript-friendly patterns

3. **Long Term**
   - Consider using a mocking library with better TypeScript support
   - Simplify service interfaces to reduce type complexity
   - Create dedicated test utility package with proper types

#### Priority
- **Severity**: Low (Tests are functional, only TypeScript warnings)
- **Impact**: Developer experience only
- **Urgency**: Can be addressed in future sprints

#### Related Files
- `src/components/__tests__/OfflineSync.test.ts`
- `src/shared/services/firebase/types.ts`

#### Next Steps
1. Create a dedicated task in the issue tracker
2. Add comments in affected test files
3. Document workarounds for other developers
4. Research alternative mocking approaches
5. Plan for comprehensive fix in future sprint

#### References
- [Jest TypeScript Documentation](https://jestjs.io/docs/getting-started#using-typescript)
- [TypeScript Handbook - Generic Constraints](https://www.typescriptlang.org/docs/handbook/generics.html#generic-constraints)
- [Firebase TypeScript Support](https://firebase.google.com/docs/reference/js) 