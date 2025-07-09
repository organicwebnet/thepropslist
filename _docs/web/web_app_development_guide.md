# Web Application Development Guide: The Props List

## 1. High-Level Overview

**Project Goal:** To extend the comprehensive props management capabilities of "The Props List" Android application to a web platform. The new web application will provide a seamless and intuitive user experience for theatrical production teams to manage props, shows, and related tasks.

**Core Objectives:**

*   **Replicate Core Functionality:** Implement all essential features of the Android application on the web, acting as the primary source of truth for functionality.
*   **Maintain Existing Web Design:** Adhere strictly to the established design, UI/UX patterns, and visual aesthetics of the current web application's template (located in `the_props_bible/web-app`). This includes leveraging its React, Tailwind CSS, and Framer Motion foundation.
*   **Clean and High-Quality Code:** Develop with a strong emphasis on clean, well-structured, modular, and maintainable code, following best practices for modern web development.
*   **User-Friendly Experience:** Ensure the web application is highly intuitive, responsive across devices, and provides clear, consistent feedback to users.
*   **No Android Code Modification:** The existing Android application codebase must remain untouched.

## 2. Functional Requirements (Derived from Android Application)

The following functionalities, derived from the "Props List" Android application, must be replicated in the web application.

### 2.1. Core Entities and Data Models

The application revolves around several key entities, managed via Firebase Firestore. The web app must mirror these data structures and relationships:

*   **`User` & `UserProfile`:** User accounts, authentication details, roles (`editor`, `viewer`), and permissions.
*   **`Show`:** Represents a theatrical production.
    *   **Fields:** Name, description, start/end dates, image URL, acts/scenes, collaborators, team members, stage manager/props supervisor contact details, production company, venues, touring status, contacts, logo image, status (`planning`, `active`, `completed`), rehearsal/storage addresses.
    *   **Relationships:** Contains `Act`s, `Scene`s, `Venue`s, `Contact`s, `ShowCollaborator`s.
*   **`Prop`:** Represents a single theatrical prop.
    *   **Fields:** Name, description, category, images, digital assets (manuals, receipts, blueprints), location, lifecycle status (e.g., `in-use`, `in-storage`, `in-maintenance`, `missing`), source details (bought, made, rented), act/scene assignment, price, quantity, purchase URL, dimensions, weight, handling instructions, usage instructions, maintenance notes, safety notes, pre-show setup details, shipping crate info, transport notes, modification history, rental details, inspection dates, replacement costs, repair priority, subcategory, custom fields, manufacturer, model, serial number, barcode, warranty, materials, color, period, style, scene/usage notes, handedness, breakability, hazardous status, storage requirements, return due date, availability, public notes, assignment to box/location, checkout details, assigned for maintenance.
    *   **Relationships:** Linked to a `Show` (via `showId`).
*   **`Act`:** Division within a `Show`, containing `Scene`s.
*   **`Scene`:** Specific segment within an `Act`.
*   **`Venue`:** Location where a `Show` is performed.
*   **`Contact`:** General contact information associated with a `Show`.
*   **`ShowCollaborator`:** Defines user access and roles for a specific `Show`.
*   **`Address`:** Reusable address structure for venues, rehearsals, storage.
*   **`DigitalAsset`:** Represents files (image, video, document, other) associated with props.
*   **`Task` (within Task Board):** Individual task items within a list on a board.
    *   **Fields:** Title, description, due date, image/link URL, assigned users, labels, members, checklists, comments, activity log, attachments, completion status, linked `propId`.
*   **`List` (within Task Board):** Column within a board that holds `Task`s.
*   **`Board` (Task Board):** Represents a Kanban-style board for managing tasks, often linked to a `Show`.

### 2.2. User Management and Authentication

*   **Sign-In:** Users can sign in using their email and password.
*   **Sign-Up:** New users can create accounts with email and password.
*   **Password Reset:** Functionality to request and receive password reset emails.
*   **Session Management:** Maintain user session state (Firebase Authentication).
*   **User Profiles:** Display and allow updates to user profile information (display name, email, etc.).
*   **Role-Based Access Control:** Implement permissions based on user roles (`admin`, `editor`, `viewer`) for various functionalities, reflecting Firebase Custom Claims and Firestore Security Rules.

### 2.3. Show Management

*   **Create/Edit Show:** Form-based interface to add new shows or modify existing show details (name, description, dates, contacts, venues, collaborators, etc.).
*   **View Show Details:** Dedicated page for each show, displaying all associated information, including lists of props, tasks, and team members.
*   **Show Listing:** A dashboard or list view of all shows, with filtering and sorting capabilities.

### 2.4. Prop Management

*   **Create/Edit Prop:** Comprehensive form to add new props with all their detailed attributes (dimensions, weight, status, images, digital assets, instructions, etc.).
*   **View Prop Details:** Dedicated page for each prop, displaying all details, including associated images, digital assets, and historical data (e.g., maintenance history, status updates).
*   **Prop Listing:** A list or grid view of all props, with robust filtering (by category, status, show, location), searching, and sorting capabilities.
*   **Image & Digital Asset Management:** Uploading, displaying, and managing multiple images and digital assets per prop (e.g., manuals, receipts, videos).
*   **Prop Status & Location Tracking:** Update prop lifecycle status and current location.

### 2.5. Task Board Management (Trello-like)

*   **Board View:** Display Kanban-style boards, typically linked to a show, with multiple lists (columns).
*   **List Management:** Create, rename, reorder, and delete lists within a board.
*   **Card (Task) Management:**
    *   **Create/Edit Card:** Add new tasks with title, description, due date, attachments, assigned members, labels, checklists, and comments.
    *   **Drag-and-Drop:** Intuitive drag-and-drop functionality for reordering cards within a list and moving cards between lists.
    *   **Checklists:** Add/manage sub-tasks within a card.
    *   **Comments & Activity Log:** Record and display comments and an activity feed for each card.
    *   **Attachments:** Upload and manage files (images, documents) attached to cards.
    *   **Prop Linking:** Ability to link a task/card to a specific prop, potentially syncing statuses.

### 2.6. Media and Asset Handling

*   **Image Upload:** Robust system for uploading images for props, shows (logo/banner), and user profiles to Firebase Storage.
*   **File Upload:** Support for uploading various digital asset types (PDFs, documents, videos) to Firebase Storage.
*   **Display:** Display images and provide links for viewing/downloading other digital assets.

### 2.7. Reporting and Export

*   **PDF Generation:** Ability to generate PDF reports (e.g., for prop lists, packing lists) based on selected data.
*   **CSV Export:** Export data (e.g., prop lists) to CSV format for offline use.

### 2.8. QR Code Integration

*   **QR Code Generation:** Generate unique QR codes for individual props.
*   **Scanning (Conceptual for Web):** While direct web camera scanning is less common than mobile, consider how QR code data could be input or read (e.g., by manual input or an integrated scanning solution if technically feasible and user-friendly).

## 3. Design Guidelines (Derived from Existing Web App)

The new web application must strictly adhere to the existing design principles and aesthetics established in the provided `the_props_bible/web-app` template. This ensures a consistent brand identity and user experience.

### 3.1. Overall Aesthetic and Layout

*   **Modern and Clean:** The current design favors a modern, clean aesthetic with ample whitespace and clear typography.
*   **Dashboard-Centric:** The primary interface seems to be dashboard-oriented, with a prominent header, a persistent sidebar navigation, and a main content area. This layout should be maintained across all core application pages.
*   **Responsive Design:** The application must be fully responsive, adapting gracefully across various screen sizes (mobile, tablet, desktop) as outlined in `DEMO.md`'s "Responsive Behavior" section.
    *   **Mobile (< 768px):** Sidebar becomes a full-width overlay, statistics grid changes to 2x2, production management cards stack vertically, activity feed takes full width.
    *   **Tablet (768px - 1024px):** Sidebar maintains fixed width, statistics in 2x2 or 4x1, production management in 2x2 grid, activity panel adjusts width.
    *   **Desktop (> 1024px):** Full three-column layout (sidebar, main content, activity panel).

### 3.2. Color Palette

Strictly use the defined color palette to maintain visual consistency:

*   **Primary:** `#6366f1` (Indigo)
*   **Secondary:** `#8b5cf6` (Purple)
*   **Accent:** `#ec4899` (Pink)
*   **Success:** `#10b981` (Emerald)
*   **Warning:** `#f59e0b` (Amber)
*   **Blues:** `#3b82f6`, `#2B2E8C`, `#3A4ED6`, `#3A8CC1`, `#1A2A6C` (for gradients)
*   **Greens:** `#22c55e`
*   **Oranges:** `#f97316`
*   **Specific for Notifications/Accent:** `#c084fc` (Purple tone for icons/badges)
*   **Background:** Predominantly dark (`#1F2937`) based on `NativeAuthScreen` and observed styling.

### 3.3. Typography

*   **Font Family:** `Inter` (wght 300-900) as imported in `index.html`.
*   **Scale:**
    *   **Heading XL:** `2xl` (24px)
    *   **Heading LG:** `lg` (18px)
    *   **Body:** `sm` (14px)
    *   **Caption:** `xs` (12px)

### 3.4. Spacing System

*   **Base Unit:** 4px
*   **Small:** 8px (e.g., `space-y-2`)
*   **Medium:** 16px (e.g., `space-y-4`)
*   **Large:** 24px (e.g., `space-y-6`)

### 3.5. Component Styling and Interaction

*   **Buttons:** Consistent styling for primary, secondary, and destructive actions.
*   **Forms:** Inputs, labels, and validation feedback should follow a uniform design.
*   **Cards:** Widely used for displaying information (e.g., Quick Actions, Statistics, Production Management, Recent Props Activity).
    *   **Hover Effects:** Cards should lift slightly, with shadow increases and subtle background changes.
    *   **Color-Coding:** Utilize gradients and solid colors for visual distinction (e.g., for Production Management cards).
    *   **Animations:** Smooth transitions (`200ms` for hover, `300ms` for color changes, `0.4s` for card scaling).
*   **Icons:** Use `Lucide React` for consistency, with animated effects where appropriate (e.g., scaling on hover).
*   **Progress Bars:** Animated filling with smooth easing, color-coded for status.
*   **Animations:** Leverage `Framer Motion` for all interactive elements and page transitions to maintain the existing lively and polished feel (`DEMO.md` provides detailed animation timelines). Prioritize hardware-accelerated transforms.
*   **Error/Success Messages:** Clear visual feedback for errors and successful operations, following the design principles (e.g., red for errors as seen in `AuthForm`).

### 3.6. Accessibility (A11y)

*   Ensure proper ARIA labels, keyboard navigation, and focus management for all interactive elements.
*   Respect user's motion preferences (`prefers-reduced-motion`).

## 4. Technical Considerations

The web application will be built using modern React best practices, integrating with Firebase, and prioritizing performance and maintainability.

### 4.1. Technology Stack

*   **Frontend Framework:** React (as per `the_props_bible/web-app/package.json`)
*   **Build Tool:** Vite
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (configured in `postcss.config.js`, `tailwind.config.js`, and `index.css` in `web-app/src`)
*   **Animations:** Framer Motion
*   **Routing:** React Router DOM
*   **Backend & Database:** Firebase (Authentication, Firestore, Storage)
*   **Icon Library:** Lucide React

### 4.2. Firebase Integration

The existing `WebFirebaseService` (`the_props_bible/src/platforms/web/services/firebase.ts`) will be the foundation for Firebase interactions.

*   **Authentication:**
    *   Utilize `WebFirebaseService.auth` for `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `sendPasswordResetEmail`, and `signOut`.
    *   Implement `onAuthStateChanged` listener to manage user session and update UI.
    *   Map `CustomUser` and `UserProfile` to web-specific Firebase `User` objects, ensuring consistency with the Android app's `AuthContext` (including `isAdmin` and `permissions` based on custom claims or user profile roles).
*   **Firestore (Database):**
    *   **Data Models:** Ensure strict adherence to the `Prop`, `Show`, `Task`, `Board`, `List`, `User`, `Address`, `Contact`, `Venue`, `Act`, `Scene`, `DigitalAsset`, `ShowCollaborator` data models defined in `the_props_bible/src/shared/types/` and `the_props_bible/src/types/`.
    *   **CRUD Operations:** Implement `getDocument`, `getDocuments`, `addDocument`, `setDocument`, `updateDocument`, `deleteDocument` using the `WebFirebaseService.firestore` instance for all entities (Props, Shows, Tasks, etc.).
    *   **Real-time Updates:** Leverage `listenToDocument` and `listenToCollection` (Firebase `onSnapshot`) for real-time synchronization of data across connected clients, crucial for collaborative features.
    *   **Queries:** Implement filtering, sorting, and limiting using Firestore queries for efficient data retrieval.
    *   **Transactions & Batches:** Use `runTransaction` and `batch` for atomic operations, especially for complex data updates (e.g., moving cards between lists, updating multiple related documents).
*   **Storage (File Storage):**
    *   Utilize `WebFirebaseService.storage` for `uploadFile` (for images and digital assets) and `deleteFile`.
    *   Ensure proper handling of file paths and metadata.
*   **`WebFirebaseService` Completion:** The existing `WebFirebaseService` has "Not implemented" methods for task board operations (`updateCard`, `deleteCard`, `reorderCardsInList`, `addList`, `addCard`, `moveCardToList`, `reorderLists`). These *must* be fully implemented to match the Android app's `MobileFirebaseService` behavior, leveraging Firebase Firestore transactions and batch writes where necessary for atomic updates.

### 4.3. State Management

*   **React Context API:** The Android app uses React Context API for `AuthContext` and `FirebaseContext`. This pattern should be replicated or adapted for the web app, ensuring global state (user authentication, Firebase service instance) is consistently managed.
*   **Local Component State:** Use React's `useState` and `useReducer` for managing local component-specific state.
*   **Data Fetching & Caching:** Consider using a library like React Query or SWR for efficient data fetching, caching, and synchronization with Firebase Firestore, especially for lists and detailed views.

### 4.4. Component Architecture

*   **Modular Components:** Break down UI into small, reusable, and well-defined React components (e.g., for forms, cards, navigation elements, modals).
*   **Atomic Design Principles:** Consider applying atomic design principles (atoms, molecules, organisms, templates, pages) to structure components effectively.
*   **Props and Type Safety:** Use TypeScript extensively to define props interfaces for components, ensuring type safety and improving developer experience.

### 4.5. Code Quality and Best Practices

*   **TypeScript:** Strict TypeScript usage for all new and modified code.
*   **ESLint:** Configure ESLint (as per `web-app/.eslintrc.cjs`) for consistent code style and to catch potential issues.
*   **Code Organization:** Maintain a clear and logical file structure.
*   **Error Handling:** Implement robust error handling mechanisms, providing user-friendly feedback for API failures, network issues, and invalid inputs.
*   **Performance Optimization:**
    *   **Lazy Loading:** Implement lazy loading for routes and larger components to reduce initial bundle size.
    *   **Memoization:** Use `React.memo`, `useCallback`, and `useMemo` to prevent unnecessary re-renders of components.
    *   **Optimized Images:** Compress and optimize images for web delivery.
    *   **Bundle Analysis:** Regularly analyze the build bundle to identify and address size regressions.
*   **Testing:** Implement unit and integration tests for critical functionalities and components to ensure correctness and prevent regressions.

---

## 5. Development Roadmap (User-Friendly & Clean Code Focus)

This roadmap outlines a phased approach to building the web application, prioritizing a user-friendly experience, maintaining high code quality, and adhering to the existing design.

### Phase 1: Foundation & Core Services (High Priority)

**Objective:** Establish the basic web application structure, integrate core Firebase services, and implement the authentication flow.

*   **Task 1.1: Project Setup & Dependencies**
    *   Verify `the_props_bible/web-app` project setup (Vite, React, TypeScript, Tailwind CSS).
    *   Ensure all `package.json` dependencies are correctly installed.
    *   Familiarize with existing build (`vite`) and dev (`npm run dev`) scripts.
*   **Task 1.2: Firebase Service Implementation**
    *   **Complete `WebFirebaseService.ts`:** Fully implement all "Not implemented" methods within `the_props_bible/src/platforms/web/services/firebase.ts`, especially `updateCard`, `deleteCard`, `reorderCardsInList`, `addList`, `addCard`, `moveCardToList`, `reorderLists` using Firebase Firestore batch writes and transactions for atomicity.
    *   Ensure `uploadFile` and `deleteFile` work correctly with Firebase Storage.
*   **Task 1.3: Authentication Flow**
    *   Implement `AuthContext` (similar to Android's `AuthContext.tsx`) for web.
    *   Create `AuthForm` components (sign-in, sign-up, password reset) within `web-app/src/components` that utilize `WebFirebaseService` and adhere to the existing web app's styling and form patterns.
    *   Implement routing for authenticated and unauthenticated states using `react-router-dom`.
    *   Ensure proper error and loading state feedback during authentication.
*   **Task 1.4: Basic Layout & Navigation**
    *   Replicate the global header and persistent sidebar navigation based on the existing web app's `index.html` and `App.tsx` structure.
    *   Implement the core routing for main sections (e.g., Dashboard, Shows, Props).

### Phase 2: Core Data Management & Listing Pages

**Objective:** Enable users to view, create, edit, and manage Shows and Props.

*   **Task 2.1: Show Management**
    *   **Data Models:** Ensure accurate TypeScript interfaces for `Show`, `Act`, `Scene`, `Venue`, `Contact`, `ShowCollaborator` based on `the_props_bible/src/types/index.ts`.
    *   **Show Listing Page (`ShowsListPage.tsx`):**
        *   Fetch all shows from Firestore using `WebFirebaseService.getDocuments` and `listenToCollection`.
        *   Display shows in a user-friendly list or grid view, adhering to existing card designs if available.
        *   Implement basic filtering and sorting (e.g., by status, name).
    *   **Create/Edit Show Form:**
        *   Develop a comprehensive form for creating new shows and editing existing ones.
        *   Integrate with `WebFirebaseService.addDocument` and `updateDocument`.
        *   Implement input validation and error handling.
*   **Task 2.2: Prop Management**
    *   **Data Models:** Ensure accurate TypeScript interface for `Prop` based on `the_props_bible/src/shared/types/props.ts`.
    *   **Prop Listing Page (`PropsListPage.tsx`):**
        *   Fetch props from Firestore using `WebFirebaseService.getDocuments` and `listenToCollection`, potentially filtering by `showId`.
        *   Display props using the `PropCardWeb.tsx` component, maintaining its design.
        *   Implement robust filtering (category, status, location, show) and searching.
    *   **Create/Edit Prop Form:**
        *   Develop a comprehensive form for creating/editing props.
        *   Integrate with Firebase Firestore for saving data.
        *   Implement image/digital asset upload using `WebFirebaseService.uploadFile` to Firebase Storage.
*   **Task 2.3: Detail Pages**
    *   Create dedicated detail pages for `Show` and `Prop` entities, displaying all relevant information from their respective data models.
    *   Enable editing functionality directly from the detail pages.

### Phase 3: Advanced Features & Task Board

**Objective:** Implement the Trello-like task board and other complex features.

*   **Task 3.1: Task Board Implementation**
    *   **Data Models:** Use `BoardData`, `ListData`, `CardData` from `the_props_bible/src/shared/types/taskManager.ts`.
    *   **Board View:** Create the Kanban board layout with draggable lists and cards.
    *   **List Operations:** Implement creation, renaming, and deletion of lists using `WebFirebaseService`.
    *   **Card Operations:**
        *   Implement creation, editing, and deletion of cards (tasks).
        *   Ensure drag-and-drop functionality for reordering cards within a list (`reorderCardsInList`) and moving cards between lists (`moveCardToList`).
        *   Develop sub-components for checklists, comments, and attachments within cards.
        *   Integrate prop linking to cards.
*   **Task 3.2: User Profiles & Permissions**
    *   Allow users to view and update their profiles.
    *   Implement role-based access control (using `isAdmin` flag and `permissions` from `AuthContext`) to restrict features based on user roles (`editor`, `viewer`).
*   **Task 3.3: Reporting & Export**
    *   Implement PDF generation and CSV export features for relevant data (e.g., prop lists, show summaries). Research suitable client-side libraries compatible with React and Tailwind CSS.
*   **Task 3.4: QR Code Integration**
    *   Implement QR code generation for props.
    *   For QR code scanning on the web, provide a user-friendly input method (e.g., text input for QR code data) or explore browser-based webcam access for direct scanning (with clear user permissions and fallback).

### Phase 4: Polish, Optimization & Deployment

**Objective:** Refine the user experience, optimize performance, ensure cross-browser compatibility, and prepare for deployment.

*   **Task 4.1: UI/UX Refinements**
    *   Thoroughly review all pages and components against the design guidelines from `DEMO.md` (`Animation Timeline`, `Interaction Feedback`, `Responsive Behavior`).
    *   Ensure all animations are smooth and consistent.
    *   Address any usability issues or inconsistencies.
*   **Task 4.2: Performance Optimization**
    *   Implement lazy loading for routes and large components.
    *   Apply React memoization (`React.memo`, `useCallback`, `useMemo`) where appropriate to optimize re-renders.
    *   Optimize image assets.
    *   Monitor and reduce bundle size.
*   **Task 4.3: Cross-Browser Compatibility**
    *   Test the application across major web browsers (Chrome, Firefox, Edge, Safari).
*   **Task 4.4: Accessibility (A11y)**
    *   Conduct a comprehensive accessibility audit.
    *   Ensure proper ARIA attributes, keyboard navigation, and focus management.
*   **Task 4.5: Error Handling & Logging**
    *   Implement global error boundaries and robust client-side logging.
    *   Provide clear and helpful error messages to users.
*   **Task 4.6: Documentation & Testing**
    *   Add comprehensive inline code comments for complex logic.
    *   Write unit and integration tests for critical components and services.
    *   Update the `web-app/README.md` with detailed setup, development, and deployment instructions. 