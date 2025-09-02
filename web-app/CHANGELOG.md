## Changelog — Web App

This file summarizes the user-requested changes that were verified and/or re-implemented from the attached chat history files. Use this alongside `TESTING_CHECKLIST.md` for validation.

### Dashboard Home
- `src/DashboardHome.tsx`
  - Real “Recent Props Activity” (adds/updates) for the selected show; items link to `/props/:id`.
  - "Urgent Tasks" and "Your Tasks" sections driven by Firestore.

### Prop Detail
- `src/pages/PropDetailPage.tsx`
  - Full-width layout, larger media at top.
  - Lightbox with swipe and captioned thumbnails.
  - Sticky summary header and sticky section nav; collapsible sections.
  - “Set location” banner and quick-save.
  - Thumbnails moved under description; digital assets grouped by type.
- `src/pages/PropDetailMockPage.tsx`
  - Mock preview of the redesigned layout.

### Add/Edit Prop
- `src/pages/AddPropPage.tsx`, `src/pages/EditPropPage.tsx`
  - Status options expanded (including “to be bought”, “awaiting delivery”, etc.).
  - Wider form layout to match mobile parity.

### Props PDF Export
- `src/pages/PropsPdfExportPage.tsx`
  - Modernized UI with form, preview, and download flow.

### Shows
- `src/ShowsListPage.tsx`
  - Removed debug info block; widened container to `max-w-7xl`.
- `src/pages/AddShowPage.tsx`, `src/pages/EditShowPage.tsx`
  - Widened containers to `max-w-6xl`.
- `src/pages/ShowDetailPage.tsx`
  - Widened container to `max-w-6xl`.

### Packing Lists
- `src/pages/PackingListPage.tsx`
  - Widened containers to `max-w-7xl`.
- `src/pages/PackingListDetailPage.tsx`
  - Default dimensions per container type with auto-fill.
  - Unified DnD context for reliable cross-column drops.
  - Save Container action persists to Firestore; Saved Containers list.
  - Removed fixed heights; optional zero height persisted when omitted.

### Task Boards (Kanban)
- `src/components/TaskBoard/Board.tsx`, `ListColumn.tsx`
  - Trello-like horizontal scroll, drag-to-scroll, cross-list drag.
  - FAB to add list; rotated titles on collapsed lists.
- `src/components/TaskBoard/Card.tsx`
  - Card modal supports Assign to, images (cover and gallery), labels, due date, checklists, comments/activity, and color.
- `src/types/taskManager.ts`
  - `CardData` extended with `color` and `images: PropImage[]`.

### Layout/Header
- `src/PropsBibleHomepage.tsx`
  - Cleaned navigation icons; removed ticking clock.
  - App title set to “The Props List”.
  - Placeholder "Open App (Coming Soon)" link.
  - Selected show title styled for readability; profile avatar link to `/profile`.

### Rich Text Editor
- `shared/components/RichTextEditor.tsx`
  - Improved web styling for dark theme (rounded, borders, colors).

### Utilities/Other
- `web-app/TESTING_CHECKLIST.md`
  - Added comprehensive checklist to validate features and flows.

If anything is missing or mismatched with your expectations from the chat history, please highlight the section and I’ll reconcile it.


