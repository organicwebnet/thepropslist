## Firestore and Storage Schema

This document captures the current Firestore collections/Storage paths observed in the codebase, plus target improvements aligned with security and maintainability best practices.

### Current Firestore Collections

- shows
  - Purpose: Top-level show/project entity
  - Key fields (observed from usage and rules):
    - ownerId, userId (legacy), name, collaborators[] (legacy), team { [uid]: role }
    - createdAt, updatedAt
  - Subcollections (rules/usage):
    - notes/{noteId}
    - props_private/{propId} (private costings; rules implemented)
    - team/{memberId} (optional legacy)

- props
  - Purpose: Main inventory items tied to a show
  - Key fields: see `src/shared/types/props.ts` `Prop`/`PropFormData` (name, showId, status, images[], digitalAssets[], cost fields, maintenance/usage data, etc.)
  - Typical queries: by showId; list, detail, update, delete

- todo_boards
  - Purpose: Per-show task boards
  - Fields: name, showId, owner/sharedWith (implied by rules), createdAt
  - Subcollections:
    - lists/{listId}
      - Fields: name, order
      - Subcollections:
        - cards/{cardId}
          - Fields: title/name, order, description, assignedTo[], dueDate, status

- invitations
  - Purpose: Invite users to a show with role
  - Fields: showId, email, role, status (pending|accepted|rejected|revoked), createdAt, acceptedAt
  - Access: public read for pending (for link open); writes gated in rules

- users, userProfiles
  - Purpose: Profile and role metadata per user
  - Notable fields (rules):
    - userProfiles.groups['system-admin'] = true (admin gate)
    - userProfiles.role (legacy global role), display info

- feedback
  - Purpose: Bug/feature/feedback submissions; optional screenshotUrl added post-upload

- emails
  - Purpose: Outbox collection for email extension (write-only client)

- tasks
  - Purpose: Standalone task docs tied to showId; createdBy/assignedTo; role-gated operations

- packingBoxes, packLists, packs, locations, labels
  - Purpose: Packing and location management; tied to showId, ownerId

- shopping_items
  - Purpose: Purchase requests/list items (public read for authenticated; writes gated per rules)

- requests, requests_private
  - Purpose: Change/purchase/maintenance requests and private cost breakdown
  - Access: requests readable by team; updates by elevated roles; requests_private readable by elevated roles only

### Known Queries/Listeners

- props filtered by showId
- todo_boards filtered by showId; nested reads for lists and cards
- shows by id; team updates
- invitations by id and list; emails enqueued to `emails`

### Storage Paths (Firebase Storage)

- profile_images/{uid}
- profileImages/{uid} (inconsistent casing; present in code)
- Generic uploader: `uploadImages(files, path)` stores to `{path}/{uuid}-{originalName}`
  - Used for images/documents; returns download URLs

### Security Rules Highlights (see `_docs/firestore.rules`)

- System admin gate via `userProfiles.groups['system-admin']` map
- Team membership checks for show access using `shows/{id}.team[uid]`
- `props_private` under shows restricted to god/props_supervisor/art_director
- Invitations allow public read when status is pending; writes gated to owners/elevated roles
- Emails collection: create-only for authenticated users (for extension enqueue)

### Target Improvements and Migrations

1) Normalize show.team to a map
   - Ensure every `shows/{id}` has `team: { [uid]: 'role' }`
   - Migrate legacy `collaborators[]` to `team {}` and stop writing collaborators
   - Update all UI to use `team`

2) Split sensitive costs
   - Move private prop cost fields to `shows/{showId}/props_private/{propId}`
   - Keep public fields in `props/{propId}`; read private only for elevated roles

3) Requests approval flow
   - Use `requests/{id}` for metadata and `requests_private/{id}` for cost details
   - Add status, approverId, timestamps

4) Cascade delete
   - When deleting `shows/{id}`, delete: `props` for show, `todo_boards` (and their lists/cards), `invitations`, `packingBoxes/packLists/packs`, Storage files linked by those docs

5) Orphan scan
   - Function to find Storage files with no referencing Firestore doc and Firestore docs referencing missing Storage URLs; dry-run then delete

6) Scheduled cleanups ✅ IMPLEMENTED
   - Expired invites, email outbox TTL, temp collections
   - See `DATABASE_MAINTENANCE_AND_GARBAGE_COLLECTION.md` for details

7) Indexes ✅ IMPLEMENTED
   - Composite indexes for:
     - props: showId + status/order
     - todo_boards: showId
     - nested cards lists: order (if queried with filters)
   - Cleanup indexes (required for garbage collection):
     - emails: ['processed', 'processingAt']
     - emails: ['delivery.state', 'delivery.failedAt']
     - pending_signups: ['expiresAt']
     - pending_password_resets: ['expiresAt']

8) Auth domains
   - Add custom subdomains to Firebase Auth Authorized domains (for web sign-in)

### Open Consistency Items

- Storage path casing: standardize on `profile_images/` and migrate any `profileImages/`
- Prefer `todo_boards` consistently; remove stray `boards` usage

### Example Document Shapes

shows/{id}
```json
{
  "name": "Show Name",
  "ownerId": "uid123",
  "team": { "uid123": "god", "uid456": "props_supervisor" },
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-02T00:00:00.000Z"
}
```

props/{id}
```json
{
  "showId": "show123",
  "name": "Chair",
  "status": "in_use",
  "images": [ { "id": "...", "url": "..." } ],
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-02T00:00:00.000Z"
}
```

shows/{showId}/props_private/{propId}
```json
{
  "cost": 120.0,
  "supplier": "Vendor Ltd",
  "quotes": [ { "amount": 100 }, { "amount": 120 } ]
}
```


