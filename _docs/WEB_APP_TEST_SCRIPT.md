# Props Bible Web App - Comprehensive Test Script

## Overview
This test script covers all major user cases and journeys for the Props Bible web application. It's designed to be used for manual testing and can be adapted for automated testing.

## User Roles & Permissions

### User Roles
- **viewer**: Read-only access to props, shows, and packing lists
- **user**: Standard user with create/edit permissions for props, shows, and tasks
- **admin**: Full access including user management and system settings
- **god**: Super admin with unrestricted access

### Key Features
- **Props Management**: Create, edit, view, and organize theatrical props
- **Show Management**: Create and manage theatrical productions
- **Packing Lists**: Organize props into containers for transport
- **Task Management**: Kanban-style boards for project management
- **PDF Export**: Generate professional prop lists and labels
- **Team Collaboration**: Multi-user access with role-based permissions
- **Authentication**: Email/password, Google, and Apple sign-in

---

## Test Environment Setup

### Prerequisites
1. Web app running locally or deployed
2. Test user accounts with different roles
3. Sample data (shows, props, packing lists)
4. Browser developer tools for debugging

### Test Data Requirements
- At least 2 shows with different statuses
- 10+ props across different categories
- 2+ packing lists with containers
- Sample tasks in kanban boards
- User accounts for each role type

---

## User Journey Test Cases

### 1. Authentication & Onboarding

#### 1.1 New User Registration
**User Story**: As a new user, I want to create an account so I can access the Props Bible system.

**Test Steps**:
1. Navigate to `/`
2. Verify redirect to `/login`
3. Click "Sign up" link
4. Verify redirect to `/signup`
5. Fill out registration form:
   - Email: `test@example.com`
   - Password: `TestPassword123!`
   - Display Name: `Test User`
6. Click "Create Account"
7. Verify account creation and redirect to dashboard
8. Verify onboarding modal appears (if no shows exist)

**Expected Results**:
- Account created successfully
- User redirected to dashboard
- Onboarding modal shows if no shows exist
- User profile created with 'user' role by default

**Test Variations**:
- Test with Google sign-in
- Test with Apple sign-in
- Test with invalid email format
- Test with weak password
- Test with existing email

#### 1.2 Existing User Login
**User Story**: As an existing user, I want to log in to access my props and shows.

**Test Steps**:
1. Navigate to `/login`
2. Enter valid credentials
3. Click "Sign In"
4. Verify successful login and redirect to dashboard

**Expected Results**:
- Successful authentication
- Redirect to dashboard
- User profile loaded
- Show selection context available

#### 1.3 Password Reset
**User Story**: As a user who forgot their password, I want to reset it to regain access.

**Test Steps**:
1. Navigate to `/login`
2. Click "Forgot password"
3. Enter email address
4. Check email for reset link
5. Click reset link
6. Enter new password
7. Verify password updated and login successful

### 2. Show Management

#### 2.1 Create New Show
**User Story**: As a props master, I want to create a new show so I can start organizing props for a production.

**Test Steps**:
1. Navigate to `/shows/new`
2. Fill out show details:
   - Show Name: "Test Production"
   - Description: "A test theatrical production"
   - First Performance Date: Future date
   - Venue: "Test Theatre"
3. Upload show logo (optional)
4. Add team members (optional)
5. Click "Create Show"
6. Verify show created and redirect to show detail page

**Expected Results**:
- Show created successfully
- Redirect to `/shows/{showId}`
- Show appears in shows list
- User can select show from dropdown

#### 2.2 Edit Existing Show
**User Story**: As a props master, I want to update show information as production details change.

**Test Steps**:
1. Navigate to existing show detail page
2. Click "Edit" button
3. Modify show information
4. Click "Save Changes"
5. Verify changes saved and redirect to show detail

**Expected Results**:
- Changes saved successfully
- Updated information displayed
- Redirect to show detail page

#### 2.3 Show Selection & Context
**User Story**: As a user, I want to switch between different shows to work on multiple productions.

**Test Steps**:
1. With multiple shows available, click show selector in header
2. Select different show
3. Verify dashboard updates with new show context
4. Navigate to props list and verify filtered by selected show
5. Navigate to boards and verify show-specific tasks

**Expected Results**:
- Show context updates throughout app
- All data filtered by selected show
- Dashboard shows correct show information

### 3. Props Management

#### 3.1 Create New Prop
**User Story**: As a props master, I want to add a new prop to track it throughout the production.

**Test Steps**:
1. Navigate to `/props/add`
2. Fill out prop details:
   - Name: "Test Prop"
   - Category: Select from dropdown
   - Description: "A test theatrical prop"
   - Act/Scene: "Act 1, Scene 2"
   - Status: "in-development"
3. Add dimensions (optional)
4. Upload images (optional)
5. Add purchase/rental information (optional)
6. Click "Create Prop"
7. Verify prop created and redirect to prop detail page

**Expected Results**:
- Prop created successfully
- Redirect to `/props/{propId}`
- Prop appears in props list
- All entered information displayed correctly

#### 3.2 View Prop Details
**User Story**: As a team member, I want to view detailed information about a prop.

**Test Steps**:
1. Navigate to props list
2. Click on a prop
3. Verify prop detail page loads
4. Check all sections:
   - Overview (with location prompt if missing)
   - Dimensions
   - Identification
   - Usage & Safety
   - Purchase & Rental
   - Storage & Logistics
   - Notes
   - Maintenance
5. Test image lightbox functionality
6. Test navigation between sections

**Expected Results**:
- All prop information displayed correctly
- Image lightbox works with swipe navigation
- Section navigation functions properly
- Location prompt appears if location missing

#### 3.3 Edit Prop
**User Story**: As a props master, I want to update prop information as details change.

**Test Steps**:
1. Navigate to prop detail page
2. Click "Edit" button
3. Modify prop information
4. Update status and add status notes
5. Click "Save Changes"
6. Verify changes saved and redirect to prop detail

**Expected Results**:
- Changes saved successfully
- Updated information displayed
- Status change tracked with timestamp

#### 3.4 Prop Status Management
**User Story**: As a props master, I want to change prop status to track its progress through the production lifecycle.

**Test Steps**:
1. Navigate to prop detail page
2. Click "Edit" button
3. Change status from current status to new status (e.g., "in-development" → "ready-for-rehearsal")
4. Add status notes explaining the change
5. Click "Save Changes"
6. Verify status updated on prop detail page
7. Check that status change is tracked with timestamp
8. Navigate to props list and verify status filter shows updated prop

**Expected Results**:
- Status change saved successfully
- Status notes displayed
- Timestamp of status change recorded
- Props list reflects new status
- Status filtering works with new status

**Test Variations**:
- Test all status transitions (in-development → ready-for-rehearsal → with-stage-management → in-storage)
- Test status change with and without notes
- Test status change from different user roles
- Test bulk status changes (if available)

#### 3.5 Maintenance Request Management
**User Story**: As a team member, I want to create maintenance requests for props that need repair or attention.

**Test Steps**:
1. Navigate to prop detail page
2. Scroll to "Maintenance" section
3. Click "Add Maintenance Request" or "Report Issue"
4. Fill out maintenance form:
   - Issue Type: "Repair", "Replacement", "Cleaning", etc.
   - Priority: "Low", "Medium", "High", "Urgent"
   - Description: Detailed description of the issue
   - Estimated Cost: (if applicable)
   - Due Date: When maintenance should be completed
5. Click "Submit Request"
6. Verify maintenance request appears in maintenance section
7. Check that request is assigned appropriate status (e.g., "Open", "In Progress")
8. Verify request appears in task boards (if integrated)

**Expected Results**:
- Maintenance request created successfully
- Request appears in prop's maintenance history
- Request assigned correct priority and status
- Request integrated with task management system
- Email notifications sent (if configured)

**Test Variations**:
- Test different issue types and priorities
- Test maintenance request with and without cost estimates
- Test maintenance request assignment to different team members
- Test maintenance request status updates
- Test maintenance request completion workflow

#### 3.6 Maintenance Request Updates
**User Story**: As a props master, I want to update maintenance requests to track their progress.

**Test Steps**:
1. Navigate to prop with existing maintenance request
2. Click on maintenance request in maintenance section
3. Update request status (e.g., "Open" → "In Progress")
4. Add progress notes or comments
5. Update estimated completion date if needed
6. Click "Update Request"
7. Verify status change reflected in maintenance history
8. Check that task board reflects status change (if integrated)

**Expected Results**:
- Status update saved successfully
- Progress notes displayed in maintenance history
- Task board updated with new status
- Timestamp of status change recorded
- Team members notified of status change (if configured)

#### 3.7 Props List & Filtering
**User Story**: As a user, I want to view and filter props to find what I need.

**Test Steps**:
1. Navigate to `/props`
2. Verify props list displays
3. Test search functionality
4. Test category filtering
5. Test status filtering
6. Test maintenance status filtering (if available)
7. Test sorting options
8. Verify pagination (if applicable)

**Expected Results**:
- Props list loads correctly
- Search returns relevant results
- Filters work as expected
- Sorting functions properly
- Maintenance status filtering works correctly

### 4. Packing Lists & Containers

#### 4.1 Create Packing List
**User Story**: As a props master, I want to create a packing list to organize props for transport.

**Test Steps**:
1. Navigate to `/packing-lists`
2. Click "Create New List"
3. Fill out packing list details:
   - Name: "Test Packing List"
   - Description: "For test production transport"
   - Destination: "Test Venue"
4. Click "Create List"
5. Verify list created and redirect to list detail

**Expected Results**:
- Packing list created successfully
- Redirect to packing list detail page
- List appears in packing lists overview

#### 4.2 Add Containers to Packing List
**User Story**: As a props master, I want to organize props into containers for efficient transport.

**Test Steps**:
1. Navigate to packing list detail page
2. Click "Add Container"
3. Fill out container details:
   - Name: "Container A"
   - Type: "Box"
   - Dimensions: "24x18x12"
   - Weight Limit: "50 lbs"
4. Click "Create Container"
5. Verify container added to list

**Expected Results**:
- Container created successfully
- Container appears in packing list
- Container details displayed correctly

#### 4.3 Add Props to Container
**User Story**: As a props master, I want to assign props to specific containers.

**Test Steps**:
1. Navigate to container detail page
2. Click "Add Props" button
3. Search and select props to add
4. Specify quantities
5. Click "Add to Container"
6. Verify props added to container
7. Check prop location updated

**Expected Results**:
- Props added to container successfully
- Prop locations updated
- Container contents displayed correctly

#### 4.4 Generate Container Labels
**User Story**: As a props master, I want to print labels for containers to identify their contents.

**Test Steps**:
1. Navigate to container detail page
2. Click "Print Label" button
3. Fill out label information:
   - From Address
   - To Address
   - Shipping Mode (Courier/Tour)
   - Props Supervisor
4. Click "Generate Label"
5. Verify PDF label generated
6. Test label printing

**Expected Results**:
- Label PDF generated successfully
- Label contains all required information
- Label prints correctly

### 5. Task Management (Kanban Boards)

#### 5.1 Create New Board
**User Story**: As a project manager, I want to create a task board to organize work for a show.

**Test Steps**:
1. Navigate to `/boards`
2. Click "New Board" button
3. Enter board name: "Test Board"
4. Click "Create Board"
5. Verify board created and displayed

**Expected Results**:
- Board created successfully
- Board appears in boards list
- Default columns created (To Do, In Progress, Done)

#### 5.2 Create Task Cards
**User Story**: As a team member, I want to create tasks to track work that needs to be done.

**Test Steps**:
1. Navigate to board
2. Click "Add Card" in a column
3. Enter card details:
   - Title: "Test Task"
   - Description: "A test task description"
   - Due Date: Future date
   - Assignee: Select team member
4. Click "Create Card"
5. Verify card created in column

**Expected Results**:
- Card created successfully
- Card appears in correct column
- All details displayed correctly

#### 5.3 Drag and Drop Cards
**User Story**: As a team member, I want to move tasks between columns to track progress.

**Test Steps**:
1. Navigate to board
2. Drag a card from "To Do" to "In Progress"
3. Verify card moved successfully
4. Drag card to "Done" column
5. Verify card moved and marked complete

**Expected Results**:
- Cards move smoothly between columns
- Card state updates correctly
- Progress tracked accurately

#### 5.4 Board Navigation & Management
**User Story**: As a user, I want to navigate between different boards and manage board settings.

**Test Steps**:
1. With multiple boards, use board selector
2. Switch between boards
3. Test column collapse/expand
4. Test horizontal scrolling
5. Test board settings (if available)

**Expected Results**:
- Board switching works correctly
- Columns collapse/expand properly
- Horizontal scrolling functions
- Board context maintained

### 6. PDF Export & Reporting

#### 6.1 Export Props List
**User Story**: As a props master, I want to generate a professional props list for the production team.

**Test Steps**:
1. Navigate to `/props/pdf-export`
2. Configure export options:
   - Select fields to include
   - Choose branding options
   - Set layout (portrait/landscape)
   - Add header/footer text
3. Click "Preview PDF"
4. Review preview in embedded viewer
5. Click "Download PDF"
6. Verify PDF generated and downloaded

**Expected Results**:
- PDF preview displays correctly
- All selected fields included
- Branding applied properly
- PDF downloads successfully

#### 6.2 Export with Custom Branding
**User Story**: As a props master, I want to customize the props list with show branding.

**Test Steps**:
1. Navigate to PDF export page
2. Upload show logo
3. Set custom header: "Test Production - Props List"
4. Set custom footer: "Generated by Props Bible"
5. Configure field selection
6. Generate and download PDF

**Expected Results**:
- Logo appears in PDF
- Custom header/footer applied
- Professional appearance maintained

### 7. Team Management & Permissions

#### 7.1 Invite Team Members
**User Story**: As a show administrator, I want to invite team members to collaborate on the show.

**Test Steps**:
1. Navigate to show detail page
2. Click "Team" tab
3. Click "Invite Member"
4. Enter email address
5. Select role (viewer/user/admin)
6. Send invitation
7. Verify invitation sent

**Expected Results**:
- Invitation email sent
- Team member added to pending list
- Role assigned correctly

#### 7.2 Accept Team Invitation
**User Story**: As an invited team member, I want to accept an invitation to join a show.

**Test Steps**:
1. Receive invitation email
2. Click invitation link
3. Create account or sign in
4. Accept invitation
5. Verify access to show

**Expected Results**:
- Invitation accepted successfully
- User gains access to show
- Role permissions applied correctly

#### 7.3 Role-Based Access Control
**User Story**: As a system administrator, I want to ensure users only access features appropriate to their role.

**Test Steps**:
1. Test with viewer role:
   - Verify read-only access to props
   - Verify cannot edit props
   - Verify cannot create new items
2. Test with user role:
   - Verify can create/edit props
   - Verify can create tasks
   - Verify cannot access admin features
3. Test with admin role:
   - Verify full access to all features
   - Verify can manage users
   - Verify can access admin pages

**Expected Results**:
- Role permissions enforced correctly
- UI elements hidden/shown appropriately
- API calls respect role permissions

### 8. Dashboard & Analytics

#### 8.1 Dashboard Overview
**User Story**: As a user, I want to see an overview of my show's progress and important information.

**Test Steps**:
1. Navigate to dashboard (`/`)
2. Verify show banner displays correctly
3. Check statistics cards:
   - Total Props count
   - Pending Tasks count
   - Ready for Show percentage
4. Review urgent tasks section
5. Check recent props activity
6. Verify "Your Tasks" section (if applicable)

**Expected Results**:
- Dashboard loads correctly
- All statistics accurate
- Urgent tasks highlighted properly
- Recent activity displayed

#### 8.2 Task Management from Dashboard
**User Story**: As a user, I want to quickly access and manage my assigned tasks from the dashboard.

**Test Steps**:
1. Navigate to dashboard
2. Click on urgent task card
3. Verify redirect to boards with task selected
4. Click on "Your Tasks" card
5. Verify redirect to boards with user filter

**Expected Results**:
- Task links work correctly
- Board opens with correct context
- Task selection functions properly

### 9. Mobile Responsiveness

#### 9.1 Mobile Navigation
**User Story**: As a mobile user, I want to navigate the app easily on my phone.

**Test Steps**:
1. Open app on mobile device (375x667)
2. Test hamburger menu (if present)
3. Navigate through main sections
4. Test form interactions
5. Test image viewing
6. Test drag and drop (if supported)

**Expected Results**:
- Mobile navigation works smoothly
- Forms are usable on mobile
- Images display correctly
- Touch interactions work properly

#### 9.2 Tablet Experience
**User Story**: As a tablet user, I want to use the app effectively on my tablet.

**Test Steps**:
1. Open app on tablet (768x1024)
2. Test layout adaptation
3. Test touch interactions
4. Test form usability
5. Test board drag and drop

**Expected Results**:
- Layout adapts to tablet size
- Touch interactions work well
- Forms are easily usable
- Board functionality works

### 10. Error Handling & Edge Cases

#### 10.1 Network Connectivity Issues
**User Story**: As a user, I want the app to handle network issues gracefully.

**Test Steps**:
1. Disconnect network while using app
2. Try to perform actions
3. Reconnect network
4. Verify app recovers properly
5. Test offline functionality (if available)

**Expected Results**:
- App shows appropriate error messages
- Data syncs when connection restored
- No data loss occurs

#### 10.2 Invalid Data Handling
**User Story**: As a user, I want the app to handle invalid data gracefully.

**Test Steps**:
1. Try to submit forms with invalid data
2. Test with extremely long text
3. Test with special characters
4. Test with missing required fields
5. Verify appropriate error messages

**Expected Results**:
- Validation errors displayed clearly
- App doesn't crash with invalid data
- User guidance provided for corrections

#### 10.3 Large Dataset Performance
**User Story**: As a user with many props, I want the app to perform well with large datasets.

**Test Steps**:
1. Create show with 100+ props
2. Test props list loading
3. Test search functionality
4. Test filtering performance
5. Test PDF export with large dataset

**Expected Results**:
- App remains responsive
- Loading times acceptable
- Search/filter performance good
- PDF export completes successfully

---

## Test Execution Guidelines

### Pre-Test Checklist
- [ ] Test environment set up
- [ ] Test data prepared
- [ ] Browser cleared of cache/cookies
- [ ] Network connection stable
- [ ] Test user accounts ready

### Test Execution
1. **Sequential Testing**: Execute test cases in order for comprehensive coverage
2. **Cross-Browser Testing**: Test on Chrome, Firefox, Safari, Edge
3. **Device Testing**: Test on desktop, tablet, mobile
4. **Data Validation**: Verify all data persists correctly
5. **Performance Monitoring**: Note any performance issues

### Bug Reporting Template
```
**Bug Title**: Brief description of the issue

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Result**: What should happen

**Actual Result**: What actually happened

**Environment**:
- Browser: [Browser name and version]
- Device: [Desktop/Mobile/Tablet]
- User Role: [viewer/user/admin/god]

**Screenshots**: [If applicable]

**Priority**: [High/Medium/Low]
```

### Test Completion Criteria
- [ ] All user journeys tested successfully
- [ ] No critical bugs found
- [ ] Performance meets requirements
- [ ] Mobile responsiveness verified
- [ ] Cross-browser compatibility confirmed
- [ ] Security permissions working correctly

---

## Automated Test Integration

This manual test script can be converted to automated tests using:

1. **Playwright**: For end-to-end testing
2. **Jest**: For unit and integration tests
3. **Cypress**: Alternative E2E testing framework

### Key Areas for Automation
- Authentication flows
- CRUD operations (Create, Read, Update, Delete)
- Form validation
- Navigation and routing
- API integration
- Error handling

### Design Consistency & Visual Regression Tests

**New automated test suite**: `web-app/tests/design-consistency.spec.ts`

#### **Color Contrast & Visibility Tests**
- ✅ **White-on-white detection**: Automatically catches text visibility issues
- ✅ **Form element visibility**: Ensures all inputs have proper styling
- ✅ **Button visibility**: Checks interactive elements are properly styled
- ✅ **Transparent text detection**: Catches invisible text issues

#### **Layout Consistency Tests**
- ✅ **Spacing consistency**: Verifies consistent padding/margins across pages
- ✅ **Container width consistency**: Ensures uniform layout patterns
- ✅ **Header/navigation consistency**: Checks layout stability across pages

#### **Component Consistency Tests**
- ✅ **Button style consistency**: Verifies uniform button styling
- ✅ **Form input consistency**: Ensures consistent input field styling
- ✅ **Card/container consistency**: Checks uniform card styling patterns

#### **Typography Consistency Tests**
- ✅ **Heading consistency**: Verifies H1, H2, etc. use consistent styles
- ✅ **Text color consistency**: Ensures reasonable color palette usage
- ✅ **Font size consistency**: Checks typography hierarchy

#### **Responsive Design Tests**
- ✅ **Cross-viewport consistency**: Tests mobile, tablet, desktop layouts
- ✅ **Navigation consistency**: Ensures nav works across all screen sizes
- ✅ **Touch target sizing**: Verifies mobile-friendly button sizes

#### **State Consistency Tests**
- ✅ **Form state styling**: Tests default, focused, filled states
- ✅ **Loading state consistency**: Verifies loading indicators work
- ✅ **Error state consistency**: Checks error message styling

#### **Cross-Browser Tests**
- ✅ **Browser compatibility**: Ensures visual consistency across browsers
- ✅ **Element visibility**: Verifies core elements render properly

### Running the Design Consistency Tests

```bash
# Navigate to web-app directory
cd web-app

# Run all design consistency tests
npm run test -- tests/design-consistency.spec.ts

# Run specific test categories
npm run test -- tests/design-consistency.spec.ts --grep "Color Contrast"
npm run test -- tests/design-consistency.spec.ts --grep "Layout Consistency"
npm run test -- tests/design-consistency.spec.ts --grep "Component Consistency"

# Run with UI mode for debugging
npm run test:ui -- tests/design-consistency.spec.ts

# Run in headed mode to see browser
npm run test:headed -- tests/design-consistency.spec.ts
```

### Test Data Management
- Use test-specific user accounts
- Create isolated test data
- Clean up after test execution
- Use data factories for consistent test data

---

## Maintenance & Updates

### Regular Updates
- Update test cases when new features added
- Review and update user journeys quarterly
- Update test data as needed
- Monitor test execution results

### Version Control
- Keep test script in version control
- Tag test script versions with app releases
- Document changes and updates
- Maintain test case traceability

This comprehensive test script ensures thorough coverage of all user journeys and use cases in the Props Bible web application, providing a solid foundation for quality assurance and user experience validation.
