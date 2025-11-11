# Code Review: Subscription Model Changes for Collaborators

**Date:** 2025-01-27  
**Reviewer:** AI Code Review  
**Scope:** Subscription validation changes to make collaborators use show owner's subscription resources

---

## Executive Summary

✅ **Overall Assessment:** The changes successfully implement the requirement that collaborators use the show owner's subscription resources. The core logic is sound and addresses the main issue.

⚠️ **Critical Issues Found:** Several issues require immediate attention:
1. **Missing resource type handling** - `checkSubscriptionLimits` doesn't handle `collaboratorsPerShow`
2. **Inconsistent implementation** - `checkBoardLimitForShow` and `checkPackingBoxLimitForShow` don't use cloud function
3. **Missing "almost out" warnings** - Boards and packing boxes don't show 80% warnings
4. **Potential performance issues** - Multiple Firestore queries in loops could be slow
5. **Missing error handling** - Some edge cases not handled

---

## 1. Did We Truly Fix the Issue?

**YES** ✅ - The core issue is fixed:
- ✅ Props now count against show owner's subscription (not prop creator's)
- ✅ Boards now count against show owner's subscription (not board creator's)
- ✅ Packing boxes now count against show owner's subscription (not creator's)
- ✅ Error messages distinguish between show owner and collaborator
- ✅ "Almost out" warnings (80% threshold) added for props

**However**, the implementation is incomplete:
- ❌ Boards and packing boxes don't use cloud function for limit checking
- ❌ `collaboratorsPerShow` not handled in `checkSubscriptionLimits`
- ❌ Missing "almost out" warnings for boards and packing boxes in client-side checks

---

## 2. Critical Issues

### 2.1 ❌ Missing Resource Type: `collaboratorsPerShow`

**Location:** `functions/src/subscriptionValidation.ts:569-640`

**Problem:**
The `checkSubscriptionLimits` function doesn't handle `collaboratorsPerShow` as a resource type, but `checkCollaboratorLimitForShow` in `useLimitChecker.ts` tries to call it with this resource type.

```typescript
// Line 325 in useLimitChecker.ts
const result = await checkLimits({ userId: showOwnerId, resourceType: 'collaboratorsPerShow' });
```

But `checkSubscriptionLimits` only handles:
- `shows`
- `boards`
- `props`
- `packingBoxes`

**Impact:**
- Cloud function will throw an error when checking collaborator limits
- Client-side code will fall back to local counting (which may be incorrect)
- No "almost out" warnings for collaborators

**Fix Required:**
```typescript
// In checkSubscriptionLimits function, add:
case 'collaboratorsPerShow':
  // Get all shows owned by user and count collaborators
  const showIds = await getUserShowIds(userId);
  let totalCollaborators = 0;
  for (const showId of showIds) {
    const showDoc = await admin.firestore().doc(`shows/${showId}`).get();
    if (showDoc.exists) {
      const team = showDoc.data()?.team || {};
      totalCollaborators += Object.keys(team).length;
    }
  }
  currentCount = totalCollaborators;
  limit = limits.collaboratorsPerShow;
  break;
```

**Priority:** 🔴 Critical - Breaks collaborator limit checking

---

### 2.2 ❌ Inconsistent Implementation: Boards and Packing Boxes

**Location:** `web-app/src/hooks/useLimitChecker.ts:105-199`

**Problem:**
`checkBoardLimitForShow` and `checkPackingBoxLimitForShow` don't use the cloud function like `checkPropLimitForShow` does. They still use client-side counting which:
1. Doesn't count across all shows owned by the user
2. Doesn't provide "almost out" warnings
3. Doesn't distinguish between show owner and collaborator messages

**Current Implementation:**
```typescript
const checkBoardLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
  // Only counts boards for THIS show, not all shows owned by show owner
  const boards = await firebaseService.getDocuments('todo_boards', {
    where: [['showId', '==', showId]]
  });
  // ...
}
```

**Should be:**
```typescript
const checkBoardLimitForShow = async (showId: string): Promise<LimitCheckResult> => {
  // Get show to find the owner
  const showDoc = await firebaseService.getDocument('shows', showId);
  if (!showDoc?.data) {
    return { /* ... */ };
  }
  
  const showOwnerId = showDoc.data.createdBy || showDoc.data.ownerId || showDoc.data.userId;
  const isShowOwner = user?.uid === showOwnerId;
  
  // Use cloud function to check show owner's limits
  const functions = getFunctions();
  const checkLimits = httpsCallable(functions, 'checkSubscriptionLimits');
  const result = await checkLimits({ userId: showOwnerId, resourceType: 'boards' });
  // ... rest similar to checkPropLimitForShow
}
```

**Priority:** 🔴 Critical - Inconsistent behaviour, incorrect counting

---

### 2.3 ⚠️ Missing "Almost Out" Warnings for Boards and Packing Boxes

**Location:** `web-app/src/pages/BoardsPage.tsx:57-62`, `web-app/src/pages/PackingListPage.tsx`

**Problem:**
The client-side limit checking for boards and packing boxes doesn't check for `isAlmostOut` like props do. The pages only check `withinLimit`, not `isAlmostOut`.

**Current:**
```typescript
if (!showLimitCheck.withinLimit) {
  setLimitWarning(showLimitCheck.message || 'Show board limit reached');
}
```

**Should be:**
```typescript
if (!showLimitCheck.withinLimit || showLimitCheck.isAlmostOut) {
  setLimitWarning(showLimitCheck.message || 'Show board limit reached');
}
```

**Priority:** 🟡 High - Inconsistent UX, missing warnings

---

### 2.4 ⚠️ Performance Concerns: Multiple Firestore Queries

**Location:** `functions/src/subscriptionValidation.ts:102-202`

**Problem:**
The `getUserShowIds` function makes 3 separate Firestore queries, and then the counting functions make additional queries in batches. For users with many shows, this could be slow.

**Current Implementation:**
```typescript
async function getUserShowIds(userId: string): Promise<string[]> {
  const [ownerShows, userShows, createdShows] = await Promise.all([
    admin.firestore().collection('shows').where('ownerId', '==', userId).get(),
    admin.firestore().collection('shows').where('userId', '==', userId).get(),
    admin.firestore().collection('shows').where('createdBy', '==', userId).get()
  ]);
  // ...
}
```

**Issues:**
1. Three separate queries (even though parallel)
2. Then counting functions query in batches of 10 (Firestore 'in' query limit)
3. For a user with 100 shows, this means 10 additional queries per resource type

**Recommendations:**
1. Consider caching show IDs per user (with TTL)
2. Consider using a composite index if possible
3. Consider denormalising show ownership into a single field
4. Add performance monitoring/logging

**Priority:** 🟡 Medium - Could be slow for power users

---

### 2.5 ⚠️ Missing Error Handling

**Location:** Multiple locations

**Problems:**

1. **No handling for missing show document:**
   ```typescript
   // In validatePropCreation, if show doesn't exist, we delete the prop
   // But what if the show was deleted between prop creation and validation?
   // Should we handle this more gracefully?
   ```

2. **No handling for race conditions:**
   - If two collaborators create props simultaneously, both might pass validation
   - The count might be off by 1

3. **No handling for invalid showId:**
   - What if `showId` is an empty string or malformed?
   - Should validate format before querying

**Priority:** 🟡 Medium - Edge cases that could cause issues

---

## 3. Code Quality Issues

### 3.1 Code Readability and Consistency

**Good:**
- ✅ Clear function names (`countUserProps`, `countUserBoards`, etc.)
- ✅ Good separation of concerns
- ✅ Consistent error messages
- ✅ Helpful comments

**Issues:**
- ⚠️ Some code duplication in counting functions (could extract common logic)
- ⚠️ Long functions (e.g., `validatePropCreation` is 68 lines)
- ⚠️ Magic number `10` for Firestore batch size (should be a constant)

**Recommendations:**
```typescript
// Extract common counting logic
const FIRESTORE_IN_QUERY_LIMIT = 10;

async function countResourcesForUserShows<T>(
  userId: string,
  collection: string,
  showIdField: string = 'showId'
): Promise<number> {
  const showIds = await getUserShowIds(userId);
  if (showIds.length === 0) return 0;
  
  let totalCount = 0;
  for (let i = 0; i < showIds.length; i += FIRESTORE_IN_QUERY_LIMIT) {
    const batch = showIds.slice(i, i + FIRESTORE_IN_QUERY_LIMIT);
    const snapshot = await admin.firestore()
      .collection(collection)
      .where(showIdField, 'in', batch)
      .get();
    totalCount += snapshot.size;
  }
  return totalCount;
}
```

---

### 3.2 Function Size and Naming

**Good:**
- ✅ Functions are appropriately named
- ✅ Single responsibility for most functions

**Issues:**
- ⚠️ `validatePropCreation`, `validateBoardCreation`, etc. are long (60+ lines)
- ⚠️ Could extract show owner lookup into helper function

**Recommendations:**
```typescript
async function getShowOwner(showId: string): Promise<string | null> {
  const showDoc = await admin.firestore().doc(`shows/${showId}`).get();
  if (!showDoc.exists) return null;
  const showData = showDoc.data();
  return showData?.createdBy || showData?.ownerId || showData?.userId || null;
}
```

---

### 3.3 Comments

**Good:**
- ✅ File headers explain purpose
- ✅ Complex logic has inline comments

**Issues:**
- ⚠️ Missing JSDoc for exported functions
- ⚠️ Some comments could be more descriptive

**Recommendations:**
Add JSDoc comments:
```typescript
/**
 * Counts props for all shows owned by a user.
 * 
 * This is used because props count against the show owner's subscription,
 * not the prop creator's subscription. When a collaborator creates a prop,
 * it counts against the show owner's plan limits.
 * 
 * @param userId - The ID of the show owner
 * @returns The total count of props across all shows owned by the user
 * 
 * @example
 * ```ts
 * const count = await countUserProps('user123');
 * // Returns total props for all shows owned by user123
 * ```
 */
async function countUserProps(userId: string): Promise<number> {
  // ...
}
```

---

## 4. Data Flow Analysis

### Current Flow:

**Prop Creation (Collaborator):**
```
Collaborator creates prop
  ↓
Client: checkPropLimitForShow() - checks show owner's limits
  ↓
Cloud Function: validatePropCreation triggered
  ↓
Get show owner from show document
  ↓
Count all props for all shows owned by show owner
  ↓
Check if count >= limit
  ↓
If exceeded: Delete prop, throw error with collaborator message
  ↓
If OK: Allow prop creation
  ↓
Cloud Function: updatePropCounts - increments show owner's count
```

**Analysis:**
✅ Data flow is logical and correct
⚠️ Two separate limit checks (client-side and server-side) - could be optimised
⚠️ Client-side check might be stale if another user creates props simultaneously

**Recommendations:**
1. Client-side check is for UX (show warnings early)
2. Server-side check is authoritative (enforces limits)
3. This is correct architecture, but could add optimistic updates

---

## 5. Edge Cases

### ✅ Handled:
- Show doesn't exist (deletes resource, logs error)
- Show owner not found (deletes resource, logs error)
- User exempt from limits (allows creation)
- Legacy boards without showId (falls back to board creator's limits)

### ❌ Not Handled:

1. **Race conditions:**
   - Two collaborators create props simultaneously
   - Both pass validation, both get created
   - Count might exceed limit by 1

2. **Show deleted during validation:**
   - Prop created, show deleted, validation runs
   - Currently deletes prop (correct), but error message might be confusing

3. **Invalid showId format:**
   - Empty string, null, undefined
   - Should validate before querying

4. **Show ownership changes:**
   - What if show owner changes between prop creation and validation?
   - Currently uses owner at validation time (correct)

5. **Network timeout:**
   - Firestore queries could timeout
   - No retry logic

**Recommendations:**
1. Add input validation for showId
2. Consider using Firestore transactions for critical operations
3. Add retry logic for network failures
4. Add timeout handling

---

## 6. Effect on Rest of Codebase

### ✅ Positive:
- No breaking changes to existing code
- Follows existing patterns
- Uses existing contexts and hooks
- Backward compatible (legacy boards still work)

### ⚠️ Potential Issues:

1. **Client-side limit checking is inconsistent:**
   - Props use cloud function
   - Boards and packing boxes use local counting
   - This could cause confusion

2. **Missing updates in other pages:**
   - `PackingListPage.tsx` might not check limits correctly
   - Other pages that create resources might not check show owner's limits

3. **Count cache might be stale:**
   - `userPropCounts`, `userBoardCounts` collections are updated
   - But client-side code doesn't use them (queries directly)
   - Could be optimised

**Recommendations:**
1. Update all "for show" limit checks to use cloud function
2. Consider using count cache collections for faster reads
3. Add real-time listeners for count updates

---

## 7. Security Concerns

### ✅ Good Practices:
- Server-side validation (authoritative)
- Checks user authentication
- Validates input data
- No secrets exposed

### ⚠️ Potential Issues:

1. **No rate limiting:**
   - Cloud function could be called many times
   - Should add rate limiting

2. **No input sanitisation:**
   - `showId` used directly in Firestore queries
   - Should validate format (Firestore ID format)

3. **No permission checks:**
   - Validation functions don't check if user has permission to create resource
   - Relies on Firestore rules (which is fine, but should be documented)

**Recommendations:**
1. Add rate limiting to cloud functions
2. Validate showId format (Firestore ID regex)
3. Document that permission checks are handled by Firestore rules

---

## 8. Error Handling

### ✅ Good:
- Try-catch blocks around async operations
- User-friendly error messages
- Proper cleanup (deletes resource on validation failure)
- Distinguishes between show owner and collaborator messages

### ⚠️ Issues:

1. **Generic error messages:**
   - Some errors don't provide specific information
   - "Show not found" - but which show?

2. **No error recovery:**
   - Failed operations require manual retry
   - No automatic retry for transient failures

3. **Error logging:**
   - Errors logged to console (good)
   - But no structured logging or error tracking service

**Recommendations:**
```typescript
// Add structured error logging
logger.error('Prop creation validation failed', {
  showId,
  userId,
  creatorId: propData?.userId,
  error: error.message,
  stack: error.stack
});
```

---

## 9. Testing

### ❌ Missing:
- No unit tests for new functions
- No integration tests for limit checking
- No tests for collaborator vs show owner scenarios
- No tests for "almost out" warnings

**Recommendations:**
1. Add unit tests for:
   - `countUserProps()`
   - `countUserBoards()`
   - `countUserPackingBoxes()`
   - `getUserShowIds()`

2. Add integration tests for:
   - Collaborator creating prop (should count against show owner)
   - Show owner creating prop (should count against own limits)
   - Limit exceeded scenarios
   - "Almost out" warning scenarios

3. Add E2E tests for:
   - Complete prop creation flow as collaborator
   - Limit warning display
   - Error message display

---

## 10. Performance

### ✅ Good:
- Uses Promise.all for parallel queries
- Batches Firestore queries (respects 'in' query limit)
- Server-side validation (efficient)

### ⚠️ Potential Issues:

1. **Multiple queries per validation:**
   - Get show owner (1 query)
   - Get user limits (1 query)
   - Count resources (1-10+ queries depending on show count)
   - Total: 3-12+ queries per validation

2. **No caching:**
   - User limits fetched every time
   - Show ownership checked every time
   - Could cache with TTL

3. **Client-side limit checking:**
   - Makes additional cloud function call
   - Could be optimised with caching

**Recommendations:**
1. Cache user limits (5 minute TTL)
2. Cache show ownership (1 minute TTL)
3. Consider using count cache collections
4. Add performance monitoring

---

## 11. Dependencies

### ✅ Good:
- No new dependencies added
- Uses existing Firebase services
- No breaking changes

### ⚠️ Note:
- Uses `firebase/functions` in web-app (already a dependency)
- No new infrastructure required

---

## 12. Code Style and Conventions

### ✅ Good:
- Follows TypeScript conventions
- Consistent naming (camelCase for functions)
- UK English in comments (mostly)

### ⚠️ Issues:
- Some magic numbers (10 for batch size)
- Some inconsistent spacing
- Missing type definitions (using `any` in some places)

**Recommendations:**
1. Extract magic numbers to constants
2. Use proper types instead of `any`
3. Ensure consistent formatting

---

## 13. Accessibility and UI/UX

### ✅ Good:
- Error messages are clear
- Distinguishes between show owner and collaborator
- Shows warnings before limits are reached

### ⚠️ Issues:
- **Inconsistent warnings:**
  - Props show "almost out" warnings
  - Boards and packing boxes don't (if using old implementation)
- **No visual indicators:**
  - Could show progress bar for resource usage
  - Could show percentage in UI

**Recommendations:**
1. Add progress bars for resource usage
2. Show percentage in limit warnings
3. Make warnings more prominent (not just text)

---

## 14. Infrastructure Impact

### ✅ No Impact:
- No database schema changes required
- No new API endpoints (uses existing cloud functions)
- No new infrastructure services

### ⚠️ Considerations:
- **Firestore queries:**
  - More queries per validation (3-12+)
  - Should monitor read usage
  - May need composite indexes (if not already created)

- **Cloud Functions:**
  - More function invocations (one per resource creation)
  - Should monitor execution time
  - May need to increase timeout for users with many shows

**Recommendations:**
1. Monitor Firestore read usage
2. Monitor Cloud Function execution time
3. Set up alerts for high usage
4. Consider adding indexes if queries are slow

---

## 15. Redundant Code

### Found:

1. **Duplicate show owner lookup:**
   - Repeated in `validatePropCreation`, `validateBoardCreation`, `validatePackingBoxCreation`, `validateTeamInvitation`
   - Should extract to helper function

2. **Duplicate counting logic:**
   - `countUserProps`, `countUserBoards`, `countUserPackingBoxes` are nearly identical
   - Should extract common logic

3. **Duplicate error message building:**
   - Similar logic in all validation functions
   - Could extract to helper

**Recommendations:**
```typescript
// Extract common patterns
async function getShowOwner(showId: string): Promise<string | null> { /* ... */ }

async function countResourcesForUserShows(
  userId: string,
  collection: string
): Promise<number> { /* ... */ }

function buildLimitErrorMessage(
  resourceType: string,
  limit: number,
  isCollaborator: boolean
): string { /* ... */ }
```

---

## 16. Infinite Loops

### ✅ No Infinite Loops Found:
- All `useEffect` hooks have proper dependency arrays
- No recursive function calls
- All intervals/timeouts are cleaned up

### ⚠️ Potential Issues:
- `useEffect` in `AddPropPage.tsx:66` depends on `checkPropsLimitForShow`
- If `checkPropsLimitForShow` is recreated on every render, this could cause issues
- Should memoize the function or use `useCallback`

**Recommendations:**
```typescript
// In useLimitChecker, memoize functions:
const checkPropLimitForShow = useCallback(async (showId: string) => {
  // ...
}, [user?.uid, firebaseService]);
```

---

## 17. Input Validation and Sanitisation

### ⚠️ Issues:

1. **showId validation:**
   - Not validated before use in Firestore queries
   - Should check format (Firestore ID regex: `^[a-zA-Z0-9_-]{1,}$`)

2. **userId validation:**
   - Not validated in some places
   - Should check format (Firebase UID format)

**Fix Required:**
```typescript
function isValidFirestoreId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{1,}$/.test(id);
}

function isValidFirebaseUid(uid: string): boolean {
  return /^[a-zA-Z0-9_-]{28,}$/.test(uid);
}
```

**Priority:** 🟡 High - Security and data integrity

---

## 18. UK English Check

### ✅ Mostly Good:
- Comments use UK English
- User-facing strings use UK English ("organise", "colour")

### ⚠️ Issues Found:
- Some technical terms use US spelling (acceptable in code)
- "organize" vs "organise" - check user-facing strings

**Recommendations:**
- Review all user-facing error messages for UK English
- Keep technical terms as-is (standard in programming)

---

## 19. Responsiveness

### ✅ Good:
- Uses web app (responsive by design)
- Error messages are readable
- Warnings are displayed clearly

### ⚠️ Potential Issues:
- Long error messages might wrap awkwardly on mobile
- Progress bars (if added) should be responsive

**Recommendations:**
1. Test on mobile devices
2. Ensure error messages wrap properly
3. Make warnings responsive

---

## 20. DRY Principles

### ❌ Issues:

1. **Duplicate show owner lookup** - 4 places
2. **Duplicate counting logic** - 3 functions nearly identical
3. **Duplicate error message building** - Similar in all validations

**Recommendations:**
Extract common code as shown in section 15.

---

## 21. Recommendations Priority

### 🔴 Critical (Must Fix):
1. **Add `collaboratorsPerShow` to `checkSubscriptionLimits`** - Breaks collaborator limit checking
2. **Update `checkBoardLimitForShow` to use cloud function** - Inconsistent, incorrect counting
3. **Update `checkPackingBoxLimitForShow` to use cloud function** - Inconsistent, incorrect counting

### 🟡 High (Should Fix):
4. **Add "almost out" warnings for boards and packing boxes** - Inconsistent UX
5. **Extract duplicate code** - Show owner lookup, counting logic
6. **Add input validation** - showId, userId format validation
7. **Memoize functions in useLimitChecker** - Prevent unnecessary re-renders

### 🟢 Medium (Nice to Have):
8. **Add JSDoc comments** - Better documentation
9. **Add caching** - Performance optimisation
10. **Add unit tests** - Critical functions
11. **Add progress bars** - Better UX
12. **Optimise Firestore queries** - Reduce query count

---

## 22. Conclusion

✅ **The implementation successfully addresses the core requirement** - collaborators now use the show owner's subscription resources. The architecture is sound and follows best practices.

⚠️ **However, there are critical gaps that must be fixed:**
- Missing `collaboratorsPerShow` handling in cloud function
- Inconsistent implementation for boards and packing boxes
- Missing "almost out" warnings for some resources

**Overall Assessment:** The implementation is **75% complete**. The core functionality works, but needs refinement for production quality.

**Recommendation:** Fix critical issues (especially `collaboratorsPerShow` and board/packing box limit checking) before merging to main branch.

---

## 23. Action Items

- [ ] Add `collaboratorsPerShow` case to `checkSubscriptionLimits` function
- [ ] Update `checkBoardLimitForShow` to use cloud function (like `checkPropLimitForShow`)
- [ ] Update `checkPackingBoxLimitForShow` to use cloud function
- [ ] Add "almost out" warnings for boards and packing boxes in client-side checks
- [ ] Extract `getShowOwner` helper function
- [ ] Extract common counting logic to reduce duplication
- [ ] Add input validation for showId and userId
- [ ] Memoize functions in `useLimitChecker` hook
- [ ] Add JSDoc comments for exported functions
- [ ] Add unit tests for counting functions
- [ ] Add integration tests for collaborator scenarios
- [ ] Add performance monitoring/logging
- [ ] Consider adding caching for user limits and show ownership
- [ ] Review and fix UK English in user-facing strings
- [ ] Test on mobile devices for responsiveness

---

**Review Completed:** 2025-01-27

