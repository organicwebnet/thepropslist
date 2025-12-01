# Maintenance and Repair Workflow Enhancements

## Overview

The maintenance and repair status workflow has been enhanced to create a comprehensive process that:
1. Prompts users to document what needs fixing
2. Automatically notifies the props supervisor
3. Creates detailed tasks that can be assigned to makers
4. Provides a clear workflow from issue identification to resolution

## Changes Made

### 1. New Notification Types

Added four new notification types to support the maintenance/repair workflow:

- `prop_needs_repair` - Sent to props supervisor when a prop is marked as needing repair
- `prop_needs_maintenance` - Sent to props supervisor when a prop is marked as needing maintenance
- `repair_assigned_to_maker` - Sent to makers when a repair task is assigned to them
- `maintenance_assigned_to_maker` - Sent to makers when a maintenance task is assigned to them

**Files Modified:**
- `web-app/src/shared/types/notification.ts` - Added new notification types

### 2. Enhanced PropStatusService

The `PropStatusService` has been significantly enhanced to support the new workflow:

#### Automatic Props Supervisor Notification
- When a prop is marked as `damaged_awaiting_repair`, `damaged_awaiting_replacement`, `out_for_repair`, or `under_maintenance`, the props supervisor is **automatically notified** (even if `notifyTeam` is false)
- The notification includes:
  - Prop name
  - Status change
  - Repair/maintenance details (if provided)
  - Link to the prop

#### Enhanced Task Creation
- Tasks are automatically created for repair/maintenance statuses with:
  - **Detailed descriptions** including:
    - What needs to be fixed (from repair details)
    - Prop information (name, category, location)
    - Next steps for the workflow
  - **Automatic assignment** to props supervisor (who can then reassign to a maker)
  - **Proper priority levels** (high for damage, medium for maintenance)
  - **Tags** for easy filtering (`repair`, `maintenance`, `prop`)

#### Notification to Task Assignee
- When a task is auto-created and assigned to a props supervisor, they receive a notification prompting them to review and assign to a maker

**Files Modified:**
- `src/shared/services/PropStatusService.ts` - Enhanced `sendStatusChangeNotifications()` and `handleAutomatedWorkflows()`

### 3. Enhanced PropStatusUpdate Component

The status update form now includes a dedicated section for repair/maintenance details:

#### New Fields
- **"What needs to be fixed?"** - A textarea that prompts users to describe the issue, damage, or maintenance required
  - This information is included in the task description
  - Helps props supervisor and maker understand what needs to be done
  - Validation warning if left empty (with option to proceed anyway)

- **Repair Deadline** - Date field for when the repair must be completed
- **Estimated Return Date** - Date field for when the prop is expected back in use

#### Improved User Experience
- Clear labels with help tooltips
- Validation that encourages (but doesn't require) repair details
- Combined notes and repair details in the status update for comprehensive documentation

**Files Modified:**
- `src/components/lifecycle/PropStatusUpdate.tsx` - Added repair details fields and validation

### 4. Notification Targeting

Updated the notification targeting matrix to include the new notification types with appropriate priorities and channels:

- `prop_needs_repair` - High priority, push + in-app + email to props supervisor
- `prop_needs_maintenance` - Medium priority, push + in-app to props supervisor
- `repair_assigned_to_maker` - High priority, push + in-app to assigned maker
- `maintenance_assigned_to_maker` - Medium priority, push + in-app to assigned maker

**Files Modified:**
- `web-app/src/utils/notificationTargeting.ts` - Added notification matrix entries

## Workflow Process

### When a Prop Needs Repair/Maintenance

1. **User marks prop status** as:
   - `damaged_awaiting_repair`
   - `damaged_awaiting_replacement`
   - `out_for_repair`
   - `under_maintenance`

2. **User fills out repair details** (encouraged but optional):
   - Describes what needs to be fixed
   - Sets repair deadline (optional)
   - Sets estimated return date (optional)
   - Uploads damage images (for damage statuses)

3. **System automatically:**
   - Creates a detailed task with all the information
   - Assigns task to props supervisor
   - Notifies props supervisor via push notification, in-app notification, and email
   - Includes repair details in task description

4. **Props Supervisor:**
   - Receives notification about the new repair/maintenance task
   - Reviews the task and repair details
   - Assigns the task to an appropriate maker (propmaker, senior-propmaker, etc.)
   - Maker receives notification about the assignment

5. **Maker:**
   - Receives notification when assigned
   - Reviews task details and repair requirements
   - Performs the repair/maintenance work
   - Updates task status as work progresses

6. **Completion:**
   - When repair/maintenance is complete, prop status is updated (e.g., to `repaired_back_in_show` or `available_in_storage`)
   - Task can be marked as completed

## Benefits

1. **Clear Documentation** - Repair details are captured upfront and included in tasks
2. **Automatic Workflow** - No manual task creation needed; system handles it
3. **Supervisor Awareness** - Props supervisor is always notified of repair/maintenance needs
4. **Maker Assignment** - Clear process for supervisor to assign work to makers
5. **Comprehensive Tasks** - Tasks include all relevant information for efficient work
6. **Traceability** - Full audit trail from issue identification to resolution

## Statuses That Trigger This Workflow

- `damaged_awaiting_repair` - High priority
- `damaged_awaiting_replacement` - High priority
- `out_for_repair` - Medium priority
- `under_maintenance` - Medium priority

## Technical Notes

- The enhanced `PropStatusService` is in the shared folder, so both web-app and mobile apps benefit from these improvements
- Notifications are sent even if `notifyTeam` is false for repair/maintenance statuses (to ensure supervisor awareness)
- Tasks are only created if one doesn't already exist for the prop (prevents duplicates)
- All notifications include metadata for easy linking back to props and tasks

