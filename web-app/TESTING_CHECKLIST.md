## Props Bible Web App — Testing Checklist

Use this list to verify the restored/updated behaviors. Paths are relative to the web app routes.

### Dashboard Home (`/`)
- **Recent Props Activity**: Shows up to 8 most recent adds/updates for the selected show; each item links to `/props/:id`.
- **Urgent Tasks**: Tasks due soon/overdue appear; clicking navigates to the related item.
- **Your Tasks**: Tasks assigned to the current user appear.
- Preconditions: user signed in; a show selected in the app header/context.

### Prop Detail Page (`/props/:id`)
- **Layout**: Full-width content area; media at top is larger.
- **Lightbox**: Click the main image to open a swipeable lightbox; thumbnails with captions are visible.
- **Tabs**: Details / Images / Digital Assets / Maintenance (with inline maintenance form).

### Props PDF Export (`/props/pdf-export`)
- **Form UI**: Grouped controls — Fields, Branding (logo, header, footer), Layout (orientation), QR toggles.
- **Preview**: Click “Preview PDF”; an embedded A4 preview appears (portrait/landscape as chosen). Arrow keys navigate pages.
- **Download**: “Download PDF” generates a PDF file with correct title (show name), header/footer, fields, images, ToC.
- **Ordering**: Act/Scene vs Alphabetical changes the list order.

### Shows: Create/Edit/Detail
- **Add Show (`/shows/new`)**: Wider form (max-w-6xl). Tabs for Details and Team; logo upload preview.
- **Edit Show (`/shows/:id/edit`)**: Same wider form (max-w-6xl). Saving returns to detail page.
- **Show Detail (`/shows/:id`)**: Wider container (max-w-6xl). Sections for Production, Meta, Venues/Rehearsal/Storage addresses; Edit button present.

### Packing Lists (`/packing-lists`)
- **Layout**: Wider page container (max-w-7xl).
- **Create**: Use “Create New List” to add a list; newly created list navigates to its detail route.
- **Cards**: Lists render in a responsive grid.

### Boards (Kanban)
- **Boards Page (`/boards`)**: Opens straight to the current/first board.
  - Title area shows a dropdown if multiple boards exist; selecting switches boards.
  - “New Board” button appears next to the title; toggles an inline create form.
- **Board (`/boards` → renders the current board)**:
  - Horizontal scrolling behaves like Trello; drag-to-scroll works with mouse and touch.
  - Columns are draggable; reordering persists.
  - Cards are draggable within and across lists; ordering persists.
  - **Collapsed lists**: Collapse control reduces a column to a slim rail; title rotates; extra vertical space accommodates longer titles; expand works.
  - **Add List**: Floating “+” FAB creates a new list at the end.
  - **Add Card**: “+ Add Card” opens input; Enter adds another quickly (focus persists).
  - **Mentions in card titles**: Typing `@` shows a small menu (Prop / Box/Container / User). Pick one, search, and insert `@Name` into the title.
  - **Deep-link selected card**: Append `?selectedCardId=<cardId>` to `/boards` to open a specific card by default.

### General Layout Width Tweaks
- **Confirmed wider containers**:
  - `PackingListPage.tsx`: max-w-7xl.
  - `ShowDetailPage.tsx`: max-w-6xl.
  - `AddShowPage.tsx`: max-w-6xl.
  - `EditShowPage.tsx`: max-w-6xl.

### Quick Smoke Steps
1) Sign in; select a show.
2) Check `/` for recent activity and task sections.
3) Open a prop at `/props/:id`; verify full-width layout and lightbox.
4) Export at `/props/pdf-export`; preview and download.
5) Create a packing list at `/packing-lists`.
6) On `/boards`, drag lists/cards, collapse/expand a column, add a card with `@` lookup, and try `?selectedCardId=...`.
7) Create a new show at `/shows/new`, then edit it, and review its details page.

If anything doesn’t match, note the page, action, and the observed result.

