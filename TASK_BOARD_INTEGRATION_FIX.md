# Task Board Integration Fix for Maintenance/Repair Workflow

## Issues Identified and Fixed

### Problem 1: Tasks Created in Wrong Collection
**Issue:** Tasks were being created in the `tasks` collection, but the task board UI uses `todo_boards/{boardId}/lists/{listId}/cards`.

**Fix:** Updated `PropStatusService.handleAutomatedWorkflows()` to:
- Find the task board for the show
- Find the appropriate list (prefers "Repair" or "To Do" lists)
- Create task cards directly on the task board
- Use `propId` field (not `relatedPropId`) to link tasks to props

### Problem 2: Task Not Linked to Prop
**Issue:** Tasks used `relatedPropId` but task board cards use `propId`.

**Fix:** Changed task creation to use `propId` field, which is the standard field used by task board cards to link to props.

### Problem 3: Existing Task Check in Wrong Place
**Issue:** System checked for existing tasks in `tasks` collection instead of task board cards.

**Fix:** Updated the duplicate check to:
- Find the task board for the show
- Check all lists for existing cards with matching `propId`
- Only create new task if no incomplete task exists

## How It Works Now

### When User Reports Repair/Maintenance:

1. **User completes PropStatusUpdate form:**
   - Selects repair/maintenance status
   - Fills in "What needs to be fixed?" field
   - Optionally sets repair deadline and return date
   - Submits form

2. **System automatically:**
   - Updates prop status
   - Creates status history entry
   - Finds task board for the show
   - Creates task card on task board with:
     - Title: "Repair damaged prop: [Prop Name]" (or similar)
     - Description: Includes repair details, prop info, and next steps
     - Prop link: `[@Prop Name](prop:propId)` for easy navigation
     - Assignment: Automatically assigned to props supervisor
     - Labels: `['repair', 'maintenance', 'prop']`
   - Notifies props supervisor

3. **Props Supervisor:**
   - Receives notification about new task
   - Sees task on task board (in "Repair" or "To Do" list)
   - Can click prop link in task description to view prop details
   - Assigns task to a maker
   - Maker receives notification

4. **Task Tracking:**
   - Task appears on task board where team can track progress
   - Task is linked to prop via `propId` field
   - Prop detail page can show linked tasks (if implemented)
   - Task can be moved between lists as work progresses
   - Task can be marked complete when repair/maintenance is done

## Key Changes Made

### File: `src/shared/services/PropStatusService.ts`

1. **Updated task creation location:**
   - Changed from `tasks` collection to `todo_boards/{boardId}/lists/{listId}/cards`
   - Finds appropriate board and list automatically

2. **Updated prop linking:**
   - Changed from `relatedPropId` to `propId`
   - Added prop mention link in description: `[@Prop Name](prop:propId)`

3. **Updated duplicate check:**
   - Now checks task board cards instead of tasks collection
   - Searches all lists for existing incomplete tasks

4. **Enhanced task data:**
   - Includes `propId` for prop linking
   - Includes `labels` for filtering
   - Includes `priority` and `status` fields
   - Includes comprehensive description with next steps

## Benefits

1. **Tasks appear on task board** - Team can see and track all repair/maintenance tasks
2. **Tasks linked to props** - Easy navigation between tasks and props
3. **No duplicate tasks** - System checks for existing tasks before creating new ones
4. **Automatic assignment** - Tasks assigned to props supervisor who can reassign to makers
5. **Comprehensive information** - Task includes all repair details and next steps
6. **Proper workflow** - Tasks flow through task board lists as work progresses

## Testing Checklist

- [ ] Create repair/maintenance status update
- [ ] Verify task appears on task board
- [ ] Verify task is in correct list (Repair or To Do)
- [ ] Verify task has prop link in description
- [ ] Verify props supervisor receives notification
- [ ] Verify task can be assigned to maker
- [ ] Verify maker receives notification
- [ ] Verify no duplicate tasks created for same prop
- [ ] Verify task can be moved between lists
- [ ] Verify task can be marked complete





