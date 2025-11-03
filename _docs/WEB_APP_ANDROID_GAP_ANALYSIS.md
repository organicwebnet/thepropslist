# Web-App vs Android App Gap Analysis

**Date:** 2025-01-27  
**Purpose:** Identify gaps between web-app and Android app to ensure feature parity where needed

---

## Executive Summary

This document compares the web-app and Android app implementations to identify:
- Features present in web-app but missing in Android app
- Features present in Android app but missing in web-app
- Differences in implementation approaches
- Areas requiring alignment

**Note:** The Android app is not required to be a copy of the web-app, but should align on core functionality and user experience.

---

## 1. Authentication & User Management

### Web-App Features
- ✅ Email/Password authentication
- ✅ Google Sign-In
- ✅ Apple Sign-In
- ✅ Email link authentication (passwordless)
- ✅ Password reset functionality
- ✅ Email verification flow
- ✅ Complete signup flow
- ✅ User profile management
- ✅ Onboarding flow
- ✅ Biometric authentication support (via context)

### Android App Features
- ✅ Email/Password authentication
- ✅ Google Sign-In
- ❓ Apple Sign-In (may be iOS-specific)
- ❌ Email link authentication
- ❌ Password reset functionality (needs verification)
- ❌ Email verification flow
- ❌ Complete signup flow
- ✅ User profile management (needs verification)
- ❌ Onboarding flow
- ✅ Biometric authentication (implemented)

**Gaps:**
- ❌ **Email link authentication** - Not present in Android app
- ❌ **Password reset** - Needs verification if implemented
- ❌ **Email verification flow** - Missing in Android app
- ❌ **Complete signup flow** - Missing in Android app
- ❌ **Onboarding flow** - Missing in Android app

---

## 2. Subscription & Payment Features

### Web-App Features
- ✅ Full Stripe integration
- ✅ Subscription plans (Free, Starter, Standard, Pro)
- ✅ Subscription limits enforcement (`useLimitChecker`)
- ✅ Subscription validation guards (`SubscriptionValidationGuard`)
- ✅ Subscription resource panel (`SubscriptionResourcePanel`)
- ✅ Subscription hooks (`useSubscription`)
- ✅ Add-ons marketplace (`AddOnsMarketplace`)
- ✅ Discount codes
- ✅ Admin subscriber stats page
- ✅ Subscription analytics
- ✅ Plan upgrade/downgrade flows
- ✅ Subscription limit warnings

### Android App Features
- ❌ **No subscription features found** - This is a major gap

**Critical Gaps:**
- ❌ **No Stripe integration** - Android app cannot process payments
- ❌ **No subscription plans** - Users cannot subscribe
- ❌ **No subscription limits** - No enforcement of plan limits
- ❌ **No subscription UI** - No way to view/manage subscriptions
- ❌ **No add-ons marketplace** - Missing feature
- ❌ **No discount codes** - Missing feature

**Impact:** This is a critical business gap. Users cannot subscribe or manage subscriptions on Android.

---

## 3. Role-Based Permissions & Access Control

### Web-App Features
- ✅ Comprehensive permission system (`core/permissions/`)
- ✅ Role-based access control (RBAC)
- ✅ System roles: god, admin, props_supervisor, editor, viewer, etc.
- ✅ Permission hooks (`usePermissions`)
- ✅ Permission service (`PermissionService`)
- ✅ Job roles management (`jobRoles.ts`)
- ✅ Role management page (`/admin/roles`)
- ✅ Permission system test page (`/admin/permission-tests`)
- ✅ Role-based prop cards (`RoleBasedPropCard`)
- ✅ Role-based prop lists (`RoleBasedPropList`)
- ✅ Widget role defaults (`widgetRoleDefaults.ts`)

### Android App Features
- ❌ **No permission system found** - This is a major gap

**Critical Gaps:**
- ❌ **No role-based access control** - All users may have same access
- ❌ **No permission checks** - No enforcement of role-based permissions
- ❌ **No role management** - Cannot manage user roles
- ❌ **No permission testing** - No way to verify permissions

**Impact:** Security and access control gap. Android app may not enforce proper role-based restrictions.

---

## 4. Navigation & Routes

### Web-App Routes
```
/auth routes:
- /login
- /signup
- /complete-signup
- /forgot-password
- /reset-password

/core routes:
- / (Dashboard)
- /props
- /props/:id
- /props/:id/edit
- /props/add
- /props/import
- /props/pdf-export
- /shows
- /shows/list
- /shows/:id
- /shows/:id/edit
- /shows/:id/team
- /boards
- /packing-lists
- /packing-lists/:packListId
- /packing-lists/:packListId/containers/:containerId
- /shopping-list
- /shopping
- /profile
- /help
- /feedback

/admin routes (god role only):
- /admin/users
- /admin/roles
- /admin/permission-tests
- /admin/debug
- /admin/subscribers

/public routes:
- /c/:containerId (Public container viewer)
- /view/prop/:propId (Public prop viewer)
- /join/:token (Join invite)

/special routes:
- /branding (Branding studio)
- /test/issue-logger
```

### Android App Routes (Tabs)
```
Main tabs:
- / (Home)
- /props
- /props/:id
- /props/:id/edit
- /props/create
- /shows
- /shows/:id
- /shows/create
- /packing
- /packing/createBox
- /packing/find
- /packing/list
- /shopping
- /shopping/:id
- /shopping/add
- /shopping/:id/add-option
- /profile
- /help
- /todos (Task Board)

Missing routes:
- ❌ Admin routes (users, roles, debug, subscribers)
- ❌ Props import
- ❌ Props PDF export
- ❌ Public container viewer
- ❌ Public prop viewer
- ❌ Join invite
- ❌ Branding studio
- ❌ Team management
- ❌ Feedback page
```

**Gaps:**
- ❌ **Admin routes** - No admin functionality in Android app
- ❌ **Props import/export** - Missing bulk operations
- ❌ **Public sharing** - No public container/prop viewers
- ❌ **Team management** - Missing team page
- ❌ **Branding studio** - Missing feature
- ❌ **Feedback page** - Missing feature

---

## 5. Dashboard & Widgets

### Web-App Features
- ✅ Dashboard home with widgets (`DashboardHome.tsx`)
- ✅ Widget system with preferences (`useWidgetPreferences`)
- ✅ Widget types:
  - My Tasks Widget
  - Taskboard Quick Links Widget
  - Upcoming Deadlines Widget
  - Task Planning Assistant Widget
  - Taskboard Activity Summary Widget
  - Board Creation Prompt Widget
- ✅ Widget settings modal (`WidgetSettingsModal`)
- ✅ Role-based widget defaults
- ✅ Widget preferences persistence
- ✅ Issue Logger Widget (`IssueLoggerWidget`)
- ✅ Subscription Resource Panel
- ✅ Onboarding modal

### Android App Features
- ✅ Home screen (`HomeScreen.tsx`)
- ✅ Basic dashboard with:
  - Welcome header
  - Global search
  - Show selector
  - Quick action grid (Find, Packing, Task Board, Props, Shopping)
  - Upcoming Tasks card
  - To-Do Boards card
- ❌ **No widget system** - Fixed dashboard layout
- ❌ **No widget preferences** - Cannot customize dashboard
- ❌ **No Issue Logger** - Missing feature

**Gaps:**
- ❌ **Widget system** - Android app has fixed dashboard, no customizable widgets
- ❌ **Widget preferences** - Cannot customize dashboard layout
- ❌ **Issue Logger** - Missing feedback/reporting feature
- ❌ **Advanced widgets** - Missing task planning assistant, activity summary, etc.

---

## 6. Props Management

### Web-App Features
- ✅ Props list page (`PropsListPage`)
- ✅ Prop detail page (`PropDetailPage`)
- ✅ Add prop page (`AddPropPage`)
- ✅ Edit prop page (`EditPropPage`)
- ✅ Import props page (`ImportPropsPage`) - CSV import
- ✅ PDF export page (`PropsPdfExportPage`)
- ✅ Role-based prop cards (`RoleBasedPropCard`)
- ✅ Role-based prop lists (`RoleBasedPropList`)
- ✅ Enhanced prop list component
- ✅ Prop card component (`PropCardWeb`)
- ✅ Availability counter
- ✅ Image carousel
- ✅ Digital asset form
- ✅ Dimension input
- ✅ Weight input
- ✅ Maintenance inline form

### Android App Features
- ✅ Props list (`app/(tabs)/props/index.tsx`)
- ✅ Prop detail (`app/(tabs)/props/[id]/index.tsx`)
- ✅ Edit prop (`app/(tabs)/props/[id]/edit.tsx`)
- ✅ Create prop (`app/(tabs)/props/create.tsx`)
- ❌ **No import functionality** - Cannot bulk import props
- ❌ **No PDF export** - Cannot export props list
- ❌ **No role-based filtering** - May show all props to all users

**Gaps:**
- ❌ **Props import** - No CSV import capability
- ❌ **PDF export** - Cannot export props list as PDF
- ❌ **Role-based filtering** - May not filter props by role permissions

---

## 7. Shows Management

### Web-App Features
- ✅ Shows list page (`ShowsListPage`)
- ✅ Show detail page (`ShowDetailPage`)
- ✅ Add show page (`AddShowPage`)
- ✅ Edit show page (`EditShowPage`)
- ✅ Team page (`TeamPage`)
- ✅ Show selection context (`ShowSelectionContext`)
- ✅ Show actions modal (`ShowActionsModal`)
- ✅ Show user controls (`ShowUserControls`)
- ✅ Archived shows modal (`ArchivedShowsModal`)
- ✅ Archive service (`ArchiveService`)

### Android App Features
- ✅ Shows list (`app/(tabs)/shows/index.tsx`)
- ✅ Show detail (`app/(tabs)/shows/[id]/index.tsx`)
- ✅ Create show (`app/(tabs)/shows/create.tsx`)
- ❌ **No edit show page** - Cannot edit shows
- ❌ **No team management** - Missing team page
- ❌ **No archive functionality** - Cannot archive shows

**Gaps:**
- ❌ **Edit show** - Cannot edit existing shows
- ❌ **Team management** - Cannot manage team members
- ❌ **Archive shows** - Cannot archive shows

---

## 8. Task Boards

### Web-App Features
- ✅ Boards page (`BoardsPage`)
- ✅ Task board components (`TaskBoard/`)
- ✅ Board component
- ✅ Card component
- ✅ List column component
- ✅ Task board integration throughout app
- ✅ Dashboard widgets for task boards

### Android App Features
- ✅ Task board access (`app/(tabs)/todos/index.tsx`)
- ✅ Task board detail (`app/taskBoard/[boardId].tsx`)
- ✅ Board creation from home screen
- ✅ Task board cards on dashboard

**Status:** ✅ **Mostly aligned** - Both apps have task board functionality

---

## 9. Packing Lists

### Web-App Features
- ✅ Packing list page (`PackingListPage`)
- ✅ Packing list detail page (`PackingListDetailPage`)
- ✅ Container detail page (`ContainerDetailPage`)
- ✅ Public container page (`PublicContainerPage`)
- ✅ QR code scanning support
- ✅ Container management

### Android App Features
- ✅ Packing list (`app/(tabs)/packing.tsx`)
- ✅ Create box (`app/(tabs)/packing/createBox.tsx`)
- ✅ Find container (`app/(tabs)/packing/find.tsx`)
- ✅ Packing list (`app/(tabs)/packing/list.tsx`)
- ❌ **No public container viewer** - Missing public sharing

**Gaps:**
- ❌ **Public container viewer** - Cannot share containers publicly via link/QR

---

## 10. Shopping Lists

### Web-App Features
- ✅ Shopping list page (`ShoppingListPage`)
- ✅ Comprehensive shopping list management
- ✅ Shopping status button
- ✅ Shopping list integration

### Android App Features
- ✅ Shopping list (`app/(tabs)/shopping/index.tsx`)
- ✅ Shopping item detail (`app/(tabs)/shopping/[id].tsx`)
- ✅ Add shopping item (`app/(tabs)/shopping/add.tsx`)
- ✅ Add option (`app/(tabs)/shopping/[id]/add-option.tsx`)

**Status:** ✅ **Mostly aligned** - Both apps have shopping list functionality

---

## 11. Admin Features

### Web-App Admin Features (God Role Only)
- ✅ User Management Page (`/admin/users`)
- ✅ Role Management Page (`/admin/roles`)
- ✅ Permission System Test Page (`/admin/permission-tests`)
- ✅ Admin Debug Page (`/admin/debug`)
- ✅ Subscriber Stats Page (`/admin/subscribers`)
- ✅ Admin pricing service
- ✅ Admin analytics

### Android App Admin Features
- ❌ **No admin features** - Complete gap

**Critical Gaps:**
- ❌ **No user management** - Cannot manage users
- ❌ **No role management** - Cannot assign roles
- ❌ **No admin debugging** - No admin tools
- ❌ **No subscriber stats** - Cannot view subscription analytics

**Impact:** Administrators cannot perform admin tasks on Android app.

---

## 12. Import/Export Features

### Web-App Features
- ✅ CSV import for props (`ImportPropsPage`)
- ✅ PDF export for props (`PropsPdfExportPage`)
- ✅ Multiple PDF export services:
  - Simple PDF Service
  - Enterprise PDF Service
  - Product Catalog PDF Service
  - Unified PDF Service
- ✅ PDF export configuration
- ✅ Export panels (Simple, Enterprise)
- ✅ Branding in PDF exports
- ✅ Field mapping service
- ✅ Field configuration service

### Android App Features
- ❌ **No import functionality**
- ❌ **No export functionality**

**Gaps:**
- ❌ **Props import** - Cannot bulk import props from CSV
- ❌ **PDF export** - Cannot export props list as PDF
- ❌ **Data export** - No data export capabilities

---

## 13. Additional Features

### Web-App Only Features
- ✅ **Branding Studio** (`/branding`) - Custom branding for PDFs
- ✅ **Issue Logger Widget** - Report issues directly from app
- ✅ **Feedback Page** (`/feedback`) - User feedback collection
- ✅ **Help Page** (`/help`) - Help documentation
- ✅ **Public Prop Viewer** (`/view/prop/:propId`) - Share props via link
- ✅ **Public Container Viewer** (`/c/:containerId`) - Share containers via QR/link
- ✅ **Join Invite** (`/join/:token`) - Join shows via invite link
- ✅ **Mention Data Context** - @mention functionality
- ✅ **Onboarding Flow** - User onboarding
- ✅ **Notification Bell** - Notification system
- ✅ **Address Management** - Saved delivery addresses
- ✅ **Analytics Service** - Analytics tracking
- ✅ **Error Reporting** - Error logging and reporting

### Android App Only Features
- ✅ **Biometric Authentication** - Native biometric support
- ✅ **Camera Integration** - For QR code scanning (likely)
- ✅ **Native Navigation** - Expo Router navigation

**Gaps:**
- ❌ **Branding Studio** - Missing
- ❌ **Issue Logger** - Missing
- ❌ **Feedback Page** - Missing (help page exists)
- ❌ **Public Sharing** - Missing public prop/container viewers
- ❌ **Join Invite** - Missing invite link functionality
- ❌ **Onboarding** - Missing onboarding flow
- ❌ **Notifications** - Missing notification bell/system
- ❌ **Address Management** - Missing saved addresses
- ❌ **Analytics** - May be missing analytics tracking

---

## 14. Contexts & State Management

### Web-App Contexts
- ✅ `WebAuthContext` - Authentication
- ✅ `FirebaseContext` - Firebase services
- ✅ `ShowSelectionContext` - Show selection
- ✅ `MentionDataContext` - @mention data
- ✅ `ThemeContext` - Theme management

### Android App Contexts
- ✅ `AuthContext` - Authentication
- ✅ `FirebaseContext` - Firebase services
- ✅ `ShowsContext` - Shows management
- ✅ `PropsContext` - Props management
- ✅ `ThemeContext` - Theme management
- ✅ `FontContext` - Font management

**Status:** ✅ **Mostly aligned** - Both have necessary contexts

---

## 15. Hooks & Utilities

### Web-App Hooks
- ✅ `useSubscription` - Subscription management
- ✅ `usePermissions` - Permission checking
- ✅ `useLimitChecker` - Subscription limit checking
- ✅ `useWidgetPreferences` - Widget preferences
- ✅ `useAddresses` - Address management
- ✅ `useAddressSelection` - Address selection
- ✅ `useDebouncedSearch` - Search debouncing
- ✅ `useImageLoading` - Image loading

### Android App Hooks
- ❌ **No subscription hooks** - Missing
- ❌ **No permission hooks** - Missing
- ❌ **No limit checker hooks** - Missing
- ❌ **No widget preference hooks** - Missing

**Gaps:**
- ❌ **Subscription hooks** - No subscription management
- ❌ **Permission hooks** - No permission checking
- ❌ **Limit checker hooks** - No limit enforcement

---

## 16. Services

### Web-App Services
- ✅ `StripeService` - Payment processing
- ✅ `AddOnService` - Add-ons management
- ✅ `AdminPricingService` - Admin pricing
- ✅ `DiscountCodesService` - Discount codes
- ✅ `EmailService` - Email sending
- ✅ `ArchiveService` - Archive management
- ✅ `AnalyticsService` - Analytics
- ✅ `SubscriptionsAnalyticsService` - Subscription analytics
- ✅ `WebFirebaseService` - Firebase operations
- ✅ `widgetPreferencesService` - Widget preferences
- ✅ PDF services (multiple)

### Android App Services
- ❌ **No Stripe service** - Missing
- ❌ **No subscription services** - Missing
- ❌ **No add-ons service** - Missing
- ❌ **No discount codes service** - Missing
- ✅ Firebase services (via context)

**Gaps:**
- ❌ **All subscription-related services** - Missing
- ❌ **Payment services** - Missing
- ❌ **Email services** - May be missing

---

## Priority Recommendations

### Critical Priority (Business Impact)
1. **Subscription & Payment System** ⚠️
   - Implement Stripe integration
   - Add subscription plans and limits
   - Add subscription UI
   - Implement limit enforcement

2. **Role-Based Permissions** ⚠️
   - Implement permission system
   - Add role-based access control
   - Add permission checking hooks
   - Enforce permissions throughout app

3. **Admin Features** ⚠️
   - Add user management
   - Add role management
   - Add admin debugging tools
   - Add subscriber stats

### High Priority (User Experience)
4. **Import/Export** 📄
   - Add CSV import for props
   - Add PDF export for props
   - Add data export capabilities

5. **Authentication Flows** 🔐
   - Add password reset
   - Add email verification
   - Add complete signup flow
   - Add onboarding flow

6. **Dashboard Widgets** 📊
   - Implement widget system
   - Add widget preferences
   - Add customizable dashboard

### Medium Priority (Feature Parity)
7. **Public Sharing** 🔗
   - Add public container viewer
   - Add public prop viewer
   - Add join invite functionality

8. **Additional Features** ✨
   - Add Issue Logger
   - Add Feedback page
   - Add Branding Studio
   - Add Team management page

### Low Priority (Nice to Have)
9. **Advanced Features** 🎨
   - Address management
   - Advanced analytics
   - Notification system enhancements

---

## Implementation Notes

### Architecture Considerations
- Android app uses Expo Router, web-app uses React Router
- Android app has mobile-specific features (biometric, camera)
- Web-app has more comprehensive admin and subscription features
- Consider creating shared hooks/services for subscription and permissions

### Data Consistency
- Both apps use Firebase/Firestore - data should be consistent
- Permission rules in Firestore should apply to both apps
- Subscription data should be accessible from both platforms

### User Experience
- Android app should not be a copy of web-app
- Mobile-first design is appropriate for Android
- Some web-app features may not be necessary on mobile (e.g., complex PDF exports)
- Core functionality should be aligned

---

## Conclusion

The Android app has significant gaps in:
1. **Subscription & Payment System** - Critical business feature
2. **Role-Based Permissions** - Security and access control
3. **Admin Features** - Administrative functionality
4. **Import/Export** - Data management
5. **Advanced Features** - Various web-app features

The Android app excels in:
- Mobile-specific features (biometric auth, native navigation)
- Core functionality (props, shows, shopping, packing)
- User experience (mobile-optimized UI)

**Next Steps:**
1. Prioritize subscription and payment system implementation
2. Implement role-based permissions system
3. Add critical admin features
4. Gradually add other features based on user needs
5. Consider creating shared libraries for subscription and permissions

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-27

