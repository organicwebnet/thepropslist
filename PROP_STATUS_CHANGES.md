# Prop Status Changes - System Effects and Actions

This document outlines the effects that changing a prop's status has on the system, including automated actions, data cleanup, notifications, and UI visibility.

## Overview

When a prop's status is updated, the system performs several actions:
1. Updates the prop document in Firestore
2. Creates a status history entry
3. Performs data cleanup based on the new status
4. Updates UI visibility (dashboard widgets, filters)
5. Optionally sends notifications (if implemented)

---

## Status Update Process

### Core Actions Performed

Every status change triggers these core actions:

1. **Prop Document Update**
   - Updates `status` field
   - Updates `lastStatusUpdate` timestamp
   - Updates `updatedAt` timestamp
   - May update `statusNotes` if provided

2. **Status History Entry**
   - Creates a new document in `props/{propId}/statusHistory` subcollection
   - Records:
     - `previousStatus`: The status before the change
     - `newStatus`: The new status
     - `updatedBy`: User ID who made the change
     - `date`: Timestamp of the change
     - `createdAt`: Creation timestamp
     - `notes`: Optional notes about the status change
     - `damageImageUrls`: Optional array of damage documentation images

3. **Local State Update**
   - Updates the prop object in local state
   - Refreshes status history display

---

## Status-Specific Actions

### Cut from Show (`cut`)

**Data Cleanup:**
- Removes `assignment` field (if present)
- Removes `checkedOutDetails` field (if present)

**UI Effects:**
- **Cut Props Packing Widget**: Props with status `cut` automatically appear in the "Cut Props Packing" dashboard widget
- **Grouping Logic**: The widget groups cut props by source:
  - **Return to Source**: Props with source `hired`, `rented`, or `borrowed` are grouped for return
  - **Cut Box - Keep**: Props with source `bought`, `made`, `owned`, or `created` stay with the company
- **Filtering**: Can be filtered in props list using `?status=cut`

**Workflow:**
- Cut props are intended to be packed and either returned to their source or stored in a cut box
- The widget helps props supervisors organize packing by showing which props need to be returned vs. kept

---

### Missing (`missing`)

**Data Cleanup:**
- Removes `assignment` field (if present)
- Removes `checkedOutDetails` field (if present)

**Priority:**
- Status priority: `critical` (highest priority for UI display)

**UI Effects:**
- Displayed with critical priority styling (red borders/backgrounds)
- Should be prominently visible in dashboards and lists

---

### Ready for Disposal (`ready_for_disposal`)

**Data Cleanup:**
- Removes `assignment` field (if present)
- Removes `checkedOutDetails` field (if present)

**Workflow:**
- Typically transitions from `temporarily_retired`
- Can transition to `cut` status

---

### Available in Storage (`available_in_storage`)

**Data Cleanup:**
- Removes `checkedOutDetails` field (if present)
- Does NOT remove `assignment` field

**Workflow:**
- Indicates prop is in its assigned storage location and ready for use
- Common transition from `checked_out`, `in_use_on_set`, or `under_maintenance`

---

### Checked Out (`checked_out`)

**Data Cleanup:**
- Removes `assignment` field (if present)
- Does NOT remove `checkedOutDetails` field

**Priority:**
- Status priority: `active` (cyan borders/backgrounds)

**Workflow:**
- Indicates prop is checked out to an actor/scene but not currently on set
- Transition point between storage and active use

---

### In Use on Set (`in_use_on_set`)

**Priority:**
- Status priority: `active` (cyan borders/backgrounds)

**Workflow:**
- Indicates prop is actively being used on set/stage
- Common transition from `checked_out` or `available_in_storage`

---

### Out for Repair (`out_for_repair`)

**Required Fields:**
- `assignment`: Must assign at least one user
- `repair`: Repair information fields
- `imageUpload`: Damage documentation images
- `notes`: Status change notes

**Priority:**
- Status priority: `medium`

**Workflow:**
- Prop is sent to external repair service
- Requires assignment to track who is handling the repair
- Damage images should be uploaded for documentation

---

### Damaged - Awaiting Repair (`damaged_awaiting_repair`)

**Required Fields:**
- `assignment`: Must assign at least one user
- `repair`: Repair information fields
- `imageUpload`: Damage documentation images
- `notes`: Status change notes

**Priority:**
- Status priority: `high`

**Workflow:**
- Prop is damaged and waiting for repair to be scheduled/performed
- Requires assignment to track who is responsible
- Damage images should be uploaded for documentation

---

### Damaged - Awaiting Replacement (`damaged_awaiting_replacement`)

**Required Fields:**
- `assignment`: Must assign at least one user
- `repair`: Repair information fields
- `imageUpload`: Damage documentation images
- `notes`: Status change notes

**Priority:**
- Status priority: `high`

**Workflow:**
- Prop is damaged beyond repair and needs replacement
- Can transition to `on_order` or `to_buy` to initiate replacement purchase

---

### Under Maintenance (`under_maintenance`)

**Required Fields:**
- `assignment`: Must assign at least one user
- `repair`: Maintenance information fields
- `notes`: Status change notes

**Priority:**
- Status priority: `medium`

**Workflow:**
- Prop is undergoing routine maintenance
- Requires assignment to track who is performing maintenance

---

### Repaired - Back in Show (`repaired_back_in_show`)

**Workflow:**
- Indicates prop has been repaired and is ready to return to active use
- Common transitions: `available_in_storage` or `in_use_on_set`

---

## Status Field Requirements

Different statuses require different fields when updating:

| Status | Assignment Required | Repair Info | Image Upload | Notes |
|--------|---------------------|-------------|--------------|-------|
| `out_for_repair` | ✅ | ✅ | ✅ | ✅ |
| `damaged_awaiting_repair` | ✅ | ✅ | ✅ | ✅ |
| `damaged_awaiting_replacement` | ✅ | ✅ | ✅ | ✅ |
| `under_maintenance` | ✅ | ✅ | ❌ | ✅ |
| All other statuses | ❌ | ❌ | ❌ | ✅ |

---

## Status Transitions

The system defines valid status transitions (used in QuickActionsService):

### Common Transitions:
- `confirmed` → `available_in_storage`, `in_use_on_set`, `under_review`
- `available_in_storage` → `checked_out`, `in_use_on_set`, `under_maintenance`
- `checked_out` → `in_use_on_set`, `available_in_storage`
- `in_use_on_set` → `available_in_storage`, `checked_out`, `under_maintenance`
- `under_maintenance` → `available_in_storage`, `out_for_repair`
- `out_for_repair` → `repaired_back_in_show`, `damaged_awaiting_repair`
- `damaged_awaiting_repair` → `repaired_back_in_show`, `damaged_awaiting_replacement`
- `damaged_awaiting_replacement` → `on_order`, `to_buy`
- `repaired_back_in_show` → `available_in_storage`, `in_use_on_set`
- `missing` → `available_in_storage`, `under_review`
- `in_transit` → `available_in_storage`, `checked_out`
- `loaned_out` → `available_in_storage`
- `on_hold` → `available_in_storage`, `under_review`
- `under_review` → `available_in_storage`, `confirmed`, `cut`
- `being_modified` → `available_in_storage`, `under_maintenance`
- `backup` → `available_in_storage`, `confirmed`
- `temporarily_retired` → `available_in_storage`, `ready_for_disposal`
- `ready_for_disposal` → `cut`
- `cut` → `confirmed`, `temporarily_retired`
- `on_order` → `to_buy`, `confirmed`
- `to_buy` → `on_order`, `confirmed`

---

## Notifications

### Notification Infrastructure

The system has notification infrastructure in place, but **notifications are not currently automatically triggered** when prop status changes in the main update handlers.

**Available Notification Services:**
- `NotificationService.schedulePropStatusNotification()`: Sends mobile push notifications
- `NotificationHelper.sendPropStatusNotification()`: Helper that checks user preferences before sending

**Notification Preferences:**
- Users can enable/disable prop status update notifications via `NotificationPreferences.propStatusUpdates`
- Default: `true` (notifications enabled)

**Notification Content:**
- Title: "Prop Status Update"
- Body: "{propName} is now {newStatus}"
- Data: `{ type: 'PROP_STATUS_UPDATE', propName, status: newStatus }`

**Note:** To enable automatic notifications on status changes, the notification service would need to be called in:
- `web-app/src/pages/PropDetailPage.tsx` → `handleStatusChange()`
- `app/actions/checkinout.tsx` → `processStatusUpdate()`
- `src/platforms/mobile/screens/PropsListScreen.tsx` → `handleBulkStatusUpdate()`
- `web-app/src/PropsListPage.tsx` → `handleBulkStatusUpdate()`

---

## Status Priority Levels

Statuses are assigned priority levels for UI display:

| Priority | Statuses | UI Treatment |
|----------|----------|--------------|
| `critical` | `missing` | Red borders/backgrounds |
| `high` | `damaged_awaiting_repair`, `damaged_awaiting_replacement` | Orange borders/backgrounds |
| `medium` | `out_for_repair`, `under_maintenance`, `in_transit`, `loaned_out`, `being_modified` | Yellow borders/backgrounds |
| `low` | `under_review`, `on_hold`, `backup`, `temporarily_retired`, `ready_for_disposal` | Blue borders/backgrounds |
| `active` | `checked_out`, `in_use_on_set` | Cyan borders/backgrounds |
| `info` | `confirmed`, `cut`, `repaired_back_in_show`, `available_in_storage`, `on_order`, `to_buy` | Default gray borders/backgrounds |

---

## Dashboard Widgets

### Cut Props Packing Widget

**Location:** Dashboard home page

**Functionality:**
- Automatically displays all props with status `cut`
- Groups props by source:
  - **Return to Source**: Props from `hired`, `rented`, or `borrowed` sources
  - **Cut Box - Keep**: Props from `bought`, `made`, `owned`, or `created` sources
- Shows prop images, names, categories, and sources
- Provides link to view all cut props: `/props?status=cut`
- Displays count of props in each group

**Use Case:**
Helps props supervisors organize packing at the end of a production by showing:
- Which props need to be returned to rental companies
- Which props should be kept in the cut box for future use

---

## Implementation Locations

### Status Update Handlers

1. **Web App - Prop Detail Page**
   - File: `web-app/src/pages/PropDetailPage.tsx`
   - Function: `handleStatusChange()`
   - Lines: 140-187

2. **Mobile App - Check In/Out Screen**
   - File: `app/actions/checkinout.tsx`
   - Function: `processStatusUpdate()`
   - Lines: 236-265

3. **Mobile App - Props List Screen**
   - File: `src/platforms/mobile/screens/PropsListScreen.tsx`
   - Function: `handleBulkStatusUpdate()`
   - Lines: 194-245

4. **Web App - Props List Page**
   - File: `web-app/src/PropsListPage.tsx`
   - Function: `handleBulkStatusUpdate()`
   - Lines: 254-302

5. **Prop Lifecycle Hook**
   - File: `src/hooks/usePropLifecycle.ts`
   - Function: `updatePropStatus()`
   - Lines: 152-217

### Status Field Configuration

- File: `src/components/lifecycle/PropStatusUpdate.tsx`
- Lines: 124-146
- Defines which fields are required/available for each status

### Status Types and Labels

- File: `src/types/lifecycle.ts`
- Defines all status types, labels, and priorities

### Cut Props Widget

- File: `web-app/src/components/DashboardWidgets/CutPropsPackingWidget.tsx`
- Displays and groups cut props for packing workflow

---

## Summary

### When a prop status is changed to "Cut from Show":

1. ✅ **Data Cleanup**: Removes `assignment` and `checkedOutDetails` fields
2. ✅ **Status History**: Creates history entry with previous/new status
3. ✅ **Dashboard Widget**: Appears in "Cut Props Packing" widget
4. ✅ **Grouping**: Automatically grouped by source (return vs. keep)
5. ❌ **Notifications**: Not currently automatically sent (infrastructure exists but not called)
6. ✅ **Filtering**: Can be filtered in props list

### General Status Change Effects:

- All status changes create history entries
- Status changes update timestamps (`lastStatusUpdate`, `updatedAt`)
- Some statuses trigger data cleanup (removing assignments/checkout details)
- Status priority affects UI display (colors, borders)
- Required fields vary by status (assignment, repair info, images)
- Dashboard widgets may show props based on status (e.g., cut props widget)

---

## Implemented Features

### ✅ Notifications

**Status:** Fully Implemented

Notifications are now automatically sent to relevant team members when prop status changes:

- **Notification Targets:**
  - All team members associated with the prop's show
  - Users assigned to the prop (if applicable)
  - Excludes the user who made the change

- **Notification Content:**
  - Title: "Prop Status Update"
  - Body: "{propName} is now {newStatus}"
  - Respects user notification preferences (`propStatusUpdates` setting)

- **Implementation:**
  - Uses `PropStatusService.sendStatusChangeNotifications()`
  - Integrated into all status update handlers:
    - Web app prop detail page
    - Mobile check-in/out screen
    - Bulk status updates (web and mobile)
    - `usePropLifecycle` hook

- **Error Handling:**
  - Notifications are non-blocking - if they fail, the status update still succeeds
  - Errors are logged but don't interrupt the workflow

### ✅ Status Validation

**Status:** Fully Implemented

Status transitions are now validated to ensure logical workflows:

- **Validation Rules:**
  - Uses predefined status transition matrix from `PropStatusService`
  - Prevents invalid transitions (e.g., `confirmed` → `cut` is not allowed directly)
  - Can be bypassed for bulk operations if needed

- **Implementation:**
  - `PropStatusService.validateStatusTransition()` validates before status change
  - Returns validation result with error message if invalid
  - Integrated into all status update handlers

- **User Experience:**
  - Invalid transitions show alert/error message to user
  - Prevents data inconsistencies and illogical workflows

### ✅ Automated Workflows

**Status:** Fully Implemented

Automated actions are triggered for specific status changes:

- **Auto-Created Tasks:**
  - **Damaged Props** (`damaged_awaiting_repair`, `damaged_awaiting_replacement`, `out_for_repair`):
    - Creates task: "Repair damaged prop: {propName}" or "Replace damaged prop: {propName}"
    - Priority: High for replacement, Medium for repair
    - Links task to prop via `relatedPropId`
    - Only creates if no existing incomplete task exists

  - **Missing Props** (`missing`):
    - Creates task: "Locate missing prop: {propName}"
    - Priority: High
    - Links task to prop via `relatedPropId`
    - Only creates if no existing incomplete task exists

- **Implementation:**
  - `PropStatusService.handleAutomatedWorkflows()` handles workflow logic
  - Runs after status update but before notifications
  - Non-blocking - errors don't prevent status update

- **Task Linking:**
  - Created tasks are linked back to status history via `relatedTaskId` field
  - Provides full audit trail from status change to task creation

### ✅ Enhanced Audit Trail

**Status:** Fully Implemented

Status history now includes additional context:

- **New Fields:**
  - `reason`: Optional reason for the status change
  - `relatedTaskId`: ID of auto-created task (if applicable)
  - `relatedIncidentId`: ID of related incident (for future use)

- **Enhanced Status History Entry:**
  - Created via `PropStatusService.createStatusHistoryEntry()`
  - Includes all standard fields plus new context fields
  - Maintains backward compatibility with existing entries

- **Implementation:**
  - Updated `PropStatusUpdate` interface in `src/types/lifecycle.ts`
  - All status update handlers use enhanced history creation
  - Status history entries can be updated after creation (e.g., to add `relatedTaskId`)

---

## Service Architecture

### PropStatusService

A centralized service (`src/shared/services/PropStatusService.ts`) handles all status-related operations:

**Methods:**
- `validateStatusTransition()`: Validates status transitions
- `getDataCleanupUpdates()`: Returns data cleanup updates based on status
- `sendStatusChangeNotifications()`: Sends notifications to team members
- `handleAutomatedWorkflows()`: Creates automated tasks/workflows
- `createStatusHistoryEntry()`: Creates enhanced status history entries

**Benefits:**
- Single source of truth for status logic
- Consistent behavior across web and mobile
- Easy to extend with new workflows
- Centralized error handling

---

## Future Enhancements

1. **Web App Notifications**: Currently notifications work on mobile. Consider adding in-app notifications for web users
2. **Email Notifications**: Add email notifications for critical status changes (e.g., missing props)
3. **Status Change Reasons**: Add UI to capture reason when changing status
4. **Workflow Customization**: Allow users to configure which automated workflows to enable
5. **Notification Preferences**: More granular notification preferences (e.g., only notify on critical statuses)
6. **Status Change Templates**: Pre-defined status change templates with common reasons


