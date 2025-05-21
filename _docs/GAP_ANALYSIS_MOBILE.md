# Mobile App Gap Analysis (vs. PRD)

## 1. Introduction

This document outlines the current state of the native Android application compared to the requirements specified in the Product Requirements Document (`PRD.md`). The goal is to identify key features that are missing, partially implemented, or require further development specifically for the mobile platform, while ensuring web functionality remains unaffected.

## 2. Core Foundation Features (PRD Phase 1 & Section 3.1)

*   **User Authentication (PRD 3.1):**
    *   **Status:** Partially Implemented
    *   **Details:** Email/Password sign-in/sign-up flow exists (`NativeAuthScreen`, `AuthContext`). Google Sign-In mentioned in PRD, mobile implementation status unclear.
    *   **Gap:** Verify/Implement Google Sign-In for mobile.

*   **Show Management Essentials (PRD 3.1.8):**
    *   **Status:** Partially Implemented
    *   **Details:** "Shows" tab exists (`app/(tabs)/shows.tsx`). `ShowsContext` likely handles listing/selecting shows. Viewing show details functionality needs verification/implementation.
    *   **Gap:** Implement/verify viewing show details on mobile. Implement Add/Edit Show functionality if required for Phase 1 mobile.

*   **Props Management (Basic CRUD) (PRD 3.1.1):**
    *   **Status:** Mostly Implemented
    *   **Details:** "Props" tab (`app/(tabs)/propsTab/index.tsx`) lists props for the selected show. Add/Edit/View/Delete flow is established using `NativePropForm` hosted in `app/props_shared_details/`. `PropDetailScreen` (`app/(tabs)/propsTab/[id].tsx`) displays details.
    *   **Gap:** Minor fields ("Materials", "Historical Period") recently added to types/forms, require testing. `PropDetailScreen` needs further enhancement to display all relevant fields.

*   **Basic Offline Functionality (PRD Phase 1 & 3.2.1):**
    *   **Status:** Partially Implemented (Needs Verification)
    *   **Details:** `MobileFirebaseService` mentions offline sync initialization. Firestore offline persistence might be enabled.
    *   **Gap:** Requires systematic testing to determine the extent and reliability of offline access for core features (viewing shows/props, potentially editing/adding while offline).

*   **Packing List & Labels Management (Basic) (PRD 3.1.2):**
    *   **Status:** Partially Implemented / Needs Clarification
    *   **Details:** "Packing" tab exists (`app/(tabs)/packing.tsx`). Label generation logic exists but was associated with a web component (`app/(web)/packing/label/[id].tsx`).
    *   **Gap:** Define mobile functionality for the Packing tab. How are lists viewed/managed? How is QR scanning (PRD 3.2.1) integrated for packing? How are labels accessed/referenced?

*   **Camera Integration (PRD 3.2.1):**
    *   **Status:** Partially Implemented
    *   **Details:** Camera screen (`app/camera/index.tsx`) exists. `NativePropForm` includes image selection/upload.
    *   **Gap:** Implement multi-angle photo documentation (PRD 3.1.1). Integrate camera for QR scanning if not already done.

*   **Address Management & Selection (PRD 3.1.9):**
    *   **Status:** Partially Implemented (Needs Verification)
    *   **Details:** Reusable `AddressSelectionModal` exists (`src/shared/components/AddressSelectionModal.tsx`), previously integrated for web label generation.
    *   **Gap:** Verify availability and usage of the common modal for mobile use cases (e.g., Show Setup, potentially setting prop locations if address-based).

## 3. Key Mobile Features & Enhancements (Beyond Basic CRUD)

*   **Props Management - AI Features (PRD 3.1.1 - Mobile):**
    *   **Status:** Not Implemented
    *   **Gap:** Google Vision API for title suggestion; Speech-to-Text for form filling.

*   **Props Management - Multi-Image/Digital Assets (PRD 3.1.1):**
    *   **Status:** Not Implemented
    *   **Details:** Current form/detail screens handle single `imageUrl`.
    *   **Gap:** Implement UI and data handling for multiple images/assets per prop.

*   **Barcode/QR Code Integration (PRD 3.1.1 & 3.2.1):**
    *   **Status:** Partially Implemented (Needs Verification)
    *   **Details:** QR Scanner features exist (`app/props_shared_details/qr_scanner.tsx`, `src/platforms/mobile/features/qr/`).
    *   **Gap:** Integrate scanning into relevant workflows (Packing, Prop Finder, potentially checking props in/out).

*   **Prop Finder (PRD 3.2.1.1):**
    *   **Status:** Not Implemented
    *   **Gap:** Implement workflow for scanning multiple box QR codes; Image recognition for finding props in photos; Displaying results.

*   **Prop Lifecycle Management (Mobile Aspects) (PRD 3.1.3):**
    *   **Status:** Mostly Not Implemented (on Mobile UI)
    *   **Gap:** Mobile-friendly UI for check-in/out, condition updates, location updates, viewing/adding maintenance/repair records.

*   **Scene Management (Mobile Aspects) (PRD 3.1.4):**
    *   **Status:** Not Implemented (on Mobile UI)
    *   **Gap:** UI for viewing scene prop requirements; Potentially updating placement/continuity notes.

*   **Collaboration Tools (Mobile Aspects) (PRD 3.1.5 & 3.2.1):**
    *   **Status:** Partially Implemented (Needs Setup)
    *   **Details:** Push notification features exist (`src/platforms/mobile/features/notifications/`).
    *   **Gap:** Complete setup and implementation of push notifications for relevant events (task assignments, status changes, etc.).

*   **User Profile / Preferences (PRD 5.6):**
    *   **Status:** Partially Implemented
    *   **Details:** Profile tab exists (`app/(tabs)/profile/index.tsx`). ThemeContext exists. Font loading exists.
    *   **Gap:** Build out the profile screen UI for viewing/editing details and setting preferences (theme, font).

*   **PDF Generation (PRD 3.1.2):**
    *   **Status:** Not Implemented (on Mobile UI)
    *   **Gap:** Determine how mobile users access/preview/trigger PDF generation.

## 4. Current State Summary

The core Create, Read, Update, Delete (CRUD) functionality for Props on the native Android app is now largely in place, utilizing a shared `NativePropForm`. The navigation flow between the props list, detail view, add screen, and edit screen has been established. Key data fields, including 'Materials' and 'Period', have been added to the types and forms.

## 5. Recommended Next Steps (Mobile)

1.  **Testing:** Thoroughly test the complete native Props CRUD cycle (Add, View Detail, Edit, Delete) including image uploads and the new 'Materials'/'Period' fields.
2.  **Enhance `PropDetailScreen`:** Add display for remaining important fields from the `Prop` type (e.g., dimensions, source details, specific notes fields) to provide a more comprehensive view.
3.  **Implement Profile Screen:** Build the UI for `app/(tabs)/profile/index.tsx` allowing users to view/edit their profile and set app preferences (Theme, Font).
4.  **Packing Tab Definition:** Define and implement the core functionality for the native "Packing" tab. How are lists displayed? How is QR scanning integrated?
5.  **Shows Tab Definition:** Implement/verify viewing show details. Add Add/Edit Show functionality if needed.
6.  **Address Higher Priority Gaps:** Based on project priorities, tackle:
    *   QR Code Scanning integration (Prop Finder, Check-in/out).
    *   Multi-Image support for props.
    *   Push Notifications setup.
    *   Offline functionality validation and refinement.
    *   Other missing features from the PRD (AI, Scene Management, etc.). 