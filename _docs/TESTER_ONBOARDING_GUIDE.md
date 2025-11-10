# The Props List - Tester Onboarding Guide

## 🎭 Welcome to The Props List Testing Team!

This comprehensive guide will help you understand The Props List application, the entertainment industry context, user roles, workflows, and subscription model. Whether you're new to software testing or new to the entertainment industry, this guide will get you up to speed.

---

## 📖 Table of Contents

1. [What is The Props List?](#what-is-the-props-list)
2. [Entertainment Industry Background](#entertainment-industry-background)
3. [System Overview](#system-overview)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Subscription Model](#subscription-model)
6. [Core Workflows](#core-workflows)
7. [Key Features to Test](#key-features-to-test)
8. [Testing Scenarios](#testing-scenarios)
9. [Common Issues to Watch For](#common-issues-to-watch-for)
10. [Testing Best Practices](#testing-best-practices)

---

## 🎬 What is The Props List?

**The Props List** is a comprehensive digital platform designed specifically for theater and entertainment production teams to manage props, shows, and collaborative workflows. Think of it as a specialized project management system for the entertainment industry.

### Core Purpose
- **Props Management**: Track, organize, and manage all props used in theatrical productions
- **Show Coordination**: Manage multiple productions simultaneously with team collaboration
- **Workflow Optimization**: Streamline the complex processes involved in theater production
- **Real-time Collaboration**: Enable multiple team members to work together efficiently

### Target Users
- **Props Masters/Supervisors**: Lead props management for productions
- **Stage Managers**: Coordinate show operations and logistics
- **Prop Makers**: Create and maintain props
- **Art Directors**: Oversee design and budget aspects
- **Production Teams**: Various roles involved in theater production

---

## 🎭 Entertainment Industry Background

### Understanding Theater Production

**Theater production** is a complex, collaborative process involving multiple departments working together to create live performances. Here's what you need to know:

#### Key Concepts

**Props (Properties)**
- Physical objects used on stage during performances
- Can be anything from furniture to weapons to food items
- Must be tracked, maintained, and positioned correctly for each scene
- Often expensive and need careful handling

**Shows/Productions**
- Complete theatrical performances (plays, musicals, etc.)
- Each show has multiple acts and scenes
- Props are specific to scenes and must be available at the right time
- Shows can run for weeks, months, or years

**Scenes & Acts**
- **Act**: Major division of a play (Act 1, Act 2, etc.)
- **Scene**: Smaller division within an act
- Props are often specific to certain scenes
- Scene changes happen during performances

**Production Timeline**
- **Pre-production**: Planning, design, prop acquisition
- **Rehearsals**: Practice sessions with props
- **Load-in**: Moving props to the theater
- **Tech Rehearsals**: Technical practice with all elements
- **Performances**: Actual shows for audiences
- **Load-out**: Moving props back to storage

#### Industry Challenges

**Logistics Complexity**
- Hundreds of props per show
- Multiple locations (storage, rehearsal, theater)
- Time-sensitive prop placement during shows
- Maintenance and repair needs

**Team Coordination**
- Multiple departments working simultaneously
- Different roles with different information needs
- Real-time communication requirements
- Budget and timeline constraints

**Asset Management**
- Expensive props that need protection
- Props used across multiple shows
- Storage and transportation requirements
- Maintenance and repair tracking

---

## 🏗️ System Overview

### Architecture
- **Web Application**: Primary interface for desktop/laptop users
- **Mobile Application**: Android app for on-the-go access
- **Cloud Backend**: Firebase-based real-time database
- **Subscription Service**: Stripe-powered billing system

### Core Data Entities

**Shows**
- Represent theatrical productions
- Contain team members, props, tasks, and settings
- Each show is a separate workspace

**Props**
- Individual items used in productions
- Rich metadata including dimensions, cost, location, status
- Photo documentation and maintenance records
- Lifecycle tracking from acquisition to disposal

**Users**
- Team members with specific roles
- Role-based permissions and access control
- Profile information and preferences

**Tasks**
- Kanban-style project management
- Assigned to team members
- Linked to props and shows
- Progress tracking and deadlines

**Packing Lists**
- Organize props into containers for transport
- Generate labels and documentation
- Track what's in each container

---

## 👥 User Roles & Permissions

The system uses a hierarchical role-based access control system. Understanding these roles is crucial for testing.

### Role Hierarchy (Highest to Lowest Authority)

#### 1. **God** (System Administrator)
- **Purpose**: Ultimate system control
- **Permissions**: 
  - Full access to all features and data
  - User management across all shows
  - System configuration and settings
  - Cannot be removed or demoted
- **Typical Users**: System administrators, company owners
- **Testing Focus**: System-wide functionality, user management, admin features

#### 2. **Props Supervisor** (Show Administrator)
- **Purpose**: Lead props management for specific shows
- **Permissions**:
  - Full access within assigned shows
  - Team management (invite, remove, change roles)
  - All props and task management
  - Customize permissions for other roles
- **Typical Users**: Props masters, senior props staff
- **Testing Focus**: Show management, team coordination, props oversight

#### 3. **Stage Manager** (Operational Coordinator)
- **Purpose**: Coordinate show operations and logistics
- **Permissions**: 
  - Defined by Props Supervisor
  - Typically: view props, update locations, manage tasks
  - Access to operational information (locations, schedules)
  - Cannot see financial information
- **Typical Users**: Stage managers, production coordinators
- **Testing Focus**: Operational workflows, location management, task coordination

#### 4. **Prop Maker** (Construction Specialist)
- **Purpose**: Create and maintain props
- **Permissions**:
  - Defined by Props Supervisor
  - Typically: view props, update status, add maintenance notes
  - Access to technical specifications and materials
  - Cannot see financial or location details
- **Typical Users**: Prop builders, craftspeople, maintenance staff
- **Testing Focus**: Prop creation, maintenance workflows, technical details

#### 5. **Art Director** (Design & Budget)
- **Purpose**: Oversee design and budget aspects
- **Permissions**:
  - Defined by Props Supervisor
  - Typically: view props, update descriptions, manage budgets
  - Access to images, prices, and design information
  - Cannot see operational or maintenance details
- **Typical Users**: Art directors, designers, budget coordinators
- **Testing Focus**: Design workflows, budget management, visual content

#### 6. **Assistant Stage Manager** (Logistics Support)
- **Purpose**: Support stage management operations
- **Permissions**:
  - Defined by Props Supervisor
  - Typically: view props, update locations, basic task management
  - Limited access to detailed information
- **Typical Users**: Assistant stage managers, production assistants
- **Testing Focus**: Basic operations, location updates, task support

#### 7. **Props Supervisor Assistant** (Assistant Role)
- **Purpose**: Support props supervisor
- **Permissions**:
  - Defined by Props Supervisor
  - Typically: most props management tasks except team management
  - Cannot invite/remove team members
- **Typical Users**: Assistant props masters, junior props staff
- **Testing Focus**: Props management, assistant-level permissions

#### 8. **Viewer** (Read-Only Access)
- **Purpose**: View information without making changes
- **Permissions**:
  - Read-only access to basic prop information
  - Cannot edit, add, or delete anything
  - Limited to essential information only
- **Typical Users**: External collaborators, auditors, stakeholders
- **Testing Focus**: Read-only functionality, data visibility

### Permission Customization
- Props Supervisors can customize permissions for all roles except God
- Permissions are show-specific (a user might have different roles in different shows)
- Role changes take effect immediately
- Users can have multiple roles across different shows

---

## 💳 Subscription Model

The Props List operates on a Software-as-a-Service (SaaS) model with tiered pricing based on production scale and team size.

### Subscription Tiers

#### **Free Plan** - "Perfect for small productions"
- **Price**: £0/month
- **Limits**:
  - 1 show
  - 2 task boards
  - 20 packing boxes
  - 3 collaborators per show
  - 10 props
  - 0 archived shows
- **Features**: Basic props management, simple task tracking
- **Target**: Small community theaters, student productions

#### **Starter Plan** - "Great for growing productions"
- **Price**: £9/month or £90/year (17% savings)
- **Limits**:
  - 3 shows
  - 5 task boards
  - 200 packing boxes
  - 5 collaborators per show
  - 50 props
  - 2 archived shows
- **Features**: Enhanced collaboration, more storage
- **Target**: Regional theaters, growing production companies

#### **Standard Plan** - "Perfect for professional productions" ⭐ *Most Popular*
- **Price**: £19/month or £190/year (17% savings)
- **Limits**:
  - 10 shows
  - 20 task boards
  - 1,000 packing boxes
  - 15 collaborators per show
  - 100 props
  - 5 archived shows
- **Features**: Full collaboration suite, advanced features
- **Target**: Professional theaters, touring companies

#### **Pro Plan** - "For large-scale productions"
- **Price**: £39/month or £390/year (17% savings)
- **Limits**:
  - 100 shows
  - 200 task boards
  - 10,000 packing boxes
  - 100 collaborators per show
  - 1,000 props
  - 10 archived shows
- **Features**: Enterprise-level features, unlimited scale
- **Target**: Large theaters, production companies, venues

### Feature Access by Plan

| Feature | Free | Starter | Standard | Pro |
|---------|------|---------|----------|-----|
| Props Management | ✓ | ✓ | ✓ | ✓ |
| Basic Task Boards | ✓ | ✓ | ✓ | ✓ |
| Team Collaboration | Limited | ✓ | ✓ | ✓ |
| PDF Export | ✓ | ✓ | ✓ | ✓ |
| Packing Lists | Basic | ✓ | ✓ | ✓ |
| Advanced Analytics | ✗ | ✗ | ✓ | ✓ |
| Custom Branding | ✗ | ✗ | ✗ | ✓ |
| Priority Support | ✗ | ✗ | ✓ | ✓ |
| API Access | ✗ | ✗ | ✗ | ✓ |

### Billing & Payment
- **Payment Processor**: Stripe
- **Billing Cycle**: Monthly or Annual
- **Currency**: British Pounds (GBP)
- **Payment Methods**: Credit cards, bank transfers
- **Trial Period**: 14-day free trial for paid plans
- **Cancellation**: Can cancel anytime, access until end of billing period

### Subscription Limits Testing
When testing, you need to verify:
- Users cannot exceed their plan limits
- Appropriate error messages when limits are reached
- Upgrade prompts when approaching limits
- Graceful degradation when limits are exceeded

---

## 🔄 Core Workflows

Understanding these workflows will help you test the system effectively.

### 1. **Show Setup Workflow**

**Purpose**: Create a new production workspace

**Steps**:
1. **Create Show**: Props Supervisor creates new show
2. **Configure Settings**: Set show details, dates, venues
3. **Invite Team**: Add team members with appropriate roles
4. **Set Permissions**: Customize role permissions
5. **Create Task Boards**: Set up project management structure

**Testing Points**:
- Show creation with all required fields
- Team invitation process
- Role assignment and permission customization
- Task board setup

### 2. **Prop Lifecycle Workflow**

**Purpose**: Manage props from acquisition to disposal

**Stages**:
1. **Planning** (`to_buy`): Identify needed props
2. **Acquisition** (`on_order`): Order or create props
3. **Active Use** (`confirmed`, `available_in_storage`): Props in production
4. **Maintenance** (`under_maintenance`, `out_for_repair`): Care and repair
5. **Disposal** (`ready_for_disposal`, `cut`): End of lifecycle

**Status Transitions**:
- `to_buy` → `on_order` → `confirmed` → `available_in_storage`
- `available_in_storage` → `checked_out` → `in_use_on_set`
- `in_use_on_set` → `under_maintenance` → `available_in_storage`
- Any status → `missing` → `available_in_storage` (when found)

**Testing Points**:
- Status transition logic
- Permission-based status updates
- Status history tracking
- Notification triggers

### 3. **Daily Operations Workflow**

**Purpose**: Manage props during active production

**Activities**:
1. **Check-in/Check-out**: Track prop locations
2. **Status Updates**: Update prop conditions and locations
3. **Maintenance**: Schedule and track repairs
4. **Task Management**: Assign and complete prop-related tasks
5. **Communication**: Team notifications and updates

**Testing Points**:
- Location tracking accuracy
- Real-time updates across team members
- Task assignment and completion
- Notification delivery

### 4. **Packing & Transport Workflow**

**Purpose**: Organize props for transportation

**Steps**:
1. **Create Packing Lists**: Group props by destination
2. **Assign Containers**: Put props in specific boxes/containers
3. **Generate Labels**: Create QR codes and labels
4. **Track Transport**: Monitor prop movement
5. **Unpack**: Verify props at destination

**Testing Points**:
- Packing list creation and management
- Container assignment logic
- Label generation and printing
- Transport tracking

### 5. **Team Collaboration Workflow**

**Purpose**: Enable effective team communication and coordination

**Activities**:
1. **Task Assignment**: Assign prop-related tasks to team members
2. **Status Updates**: Share prop status changes
3. **Comments & Notes**: Add context and instructions
4. **Notifications**: Alert team members of important changes
5. **Documentation**: Maintain records and history

**Testing Points**:
- Real-time collaboration features
- Permission-based access to information
- Notification system functionality
- Data consistency across team members

---

## 🧪 Key Features to Test

### 1. **Props Management**
- **Create Props**: Add new props with all required information
- **Edit Props**: Modify existing prop details
- **Delete Props**: Remove props (with proper permissions)
- **Search & Filter**: Find props by various criteria
- **Bulk Operations**: Update multiple props simultaneously
- **Import/Export**: CSV import and PDF export functionality

### 2. **Show Management**
- **Create Shows**: Set up new productions
- **Configure Settings**: Venue, dates, team settings
- **Archive Shows**: Move completed shows to archive
- **Show Switching**: Navigate between different shows

### 3. **Team Management**
- **Invite Users**: Send invitations to new team members
- **Role Assignment**: Assign and change user roles
- **Permission Management**: Customize role permissions
- **User Removal**: Remove team members (with restrictions)

### 4. **Task Management**
- **Create Tasks**: Add new tasks to kanban boards
- **Assign Tasks**: Assign tasks to team members
- **Update Progress**: Move tasks through workflow stages
- **Task Comments**: Add context and updates to tasks

### 5. **Packing & Labels**
- **Create Packing Lists**: Organize props for transport
- **Generate Labels**: Create QR codes and printable labels
- **Container Management**: Track what's in each container
- **Export Documentation**: Generate packing documentation

### 6. **Notifications & Communication**
- **Real-time Updates**: Changes appear immediately for all users
- **Email Notifications**: Important updates sent via email
- **In-app Alerts**: Notification center for system messages
- **Role-based Notifications**: Different users get relevant notifications

### 7. **Subscription & Billing**
- **Plan Selection**: Choose appropriate subscription tier
- **Payment Processing**: Handle subscription payments
- **Limit Enforcement**: Prevent exceeding plan limits
- **Upgrade/Downgrade**: Change subscription plans

---

## 🎯 Testing Scenarios

### Scenario 1: New User Onboarding
**Objective**: Test the complete user journey from registration to productive use

**Steps**:
1. **Register Account**: Create new user account
2. **Complete Profile**: Add name, role, and preferences
3. **Create First Show**: Set up initial production workspace
4. **Add First Prop**: Create initial prop inventory
5. **Invite Team**: Add team members with different roles
6. **Explore Features**: Navigate through main features

**Expected Results**:
- Smooth registration and profile setup
- Intuitive show creation process
- Easy prop addition with helpful guidance
- Successful team invitation process
- Clear feature discovery and navigation

### Scenario 2: Role-Based Access Control
**Objective**: Verify that different roles see appropriate information and have correct permissions

**Steps**:
1. **Create Test Users**: Set up users with different roles
2. **Add Test Data**: Create props with various information types
3. **Test Each Role**: Log in as each role and verify access
4. **Test Permissions**: Attempt actions appropriate and inappropriate for each role
5. **Verify Restrictions**: Confirm sensitive information is hidden

**Expected Results**:
- Each role sees only appropriate information
- Actions are restricted based on role permissions
- Sensitive data (prices, locations) hidden from unauthorized roles
- Clear error messages for unauthorized actions

### Scenario 3: Prop Lifecycle Management
**Objective**: Test the complete lifecycle of a prop from planning to disposal

**Steps**:
1. **Plan Prop**: Create prop with `to_buy` status
2. **Order Prop**: Change status to `on_order`
3. **Receive Prop**: Update to `confirmed` and add details
4. **Use Prop**: Change to `available_in_storage`, then `in_use_on_set`
5. **Maintain Prop**: Update to `under_maintenance` and add notes
6. **Complete Lifecycle**: Change to `ready_for_disposal`

**Expected Results**:
- Status transitions work correctly
- Status history is maintained
- Appropriate notifications are sent
- All status changes are logged

### Scenario 4: Team Collaboration
**Objective**: Test real-time collaboration features

**Steps**:
1. **Set Up Team**: Create show with multiple team members
2. **Simultaneous Access**: Have multiple users access the same show
3. **Make Changes**: Have one user make changes while others watch
4. **Test Notifications**: Verify other users receive notifications
5. **Test Conflicts**: Attempt simultaneous edits

**Expected Results**:
- Changes appear in real-time for all users
- Notifications are delivered promptly
- Conflicts are handled gracefully
- Data remains consistent across all users

### Scenario 5: Subscription Limits
**Objective**: Test subscription plan limitations and enforcement

**Steps**:
1. **Set Up Test Account**: Create account with specific plan
2. **Approach Limits**: Add data until approaching plan limits
3. **Exceed Limits**: Attempt to exceed plan limits
4. **Test Upgrade**: Test plan upgrade process
5. **Test Downgrade**: Test plan downgrade process

**Expected Results**:
- Clear warnings when approaching limits
- Graceful handling when limits are exceeded
- Smooth upgrade/downgrade process
- Appropriate feature restrictions based on plan

### Scenario 6: Data Import/Export
**Objective**: Test data import and export functionality

**Steps**:
1. **Prepare Test Data**: Create CSV files with various formats
2. **Test Import**: Import props from CSV files
3. **Verify Data**: Check that imported data is accurate
4. **Test Export**: Export data to PDF format
5. **Test Templates**: Download and use import templates

**Expected Results**:
- Successful import of valid CSV files
- Clear error messages for invalid files
- Accurate data mapping and validation
- Professional PDF export output

---

## ⚠️ Common Issues to Watch For

### 1. **Permission Bypass**
- Users accessing features they shouldn't have access to
- Sensitive information visible to unauthorized roles
- Actions succeeding when they should be blocked

### 2. **Data Inconsistency**
- Changes not appearing in real-time
- Different users seeing different data
- Status updates not propagating correctly

### 3. **Subscription Limit Issues**
- Users exceeding plan limits without warnings
- Features not properly restricted by plan
- Billing issues or payment processing errors

### 4. **Performance Problems**
- Slow loading with large datasets
- Timeout errors during operations
- Memory issues with many props

### 5. **User Experience Issues**
- Confusing navigation or unclear instructions
- Missing error messages or unhelpful feedback
- Inconsistent behavior across different sections

### 6. **Mobile-Specific Issues**
- Features not working on mobile devices
- Layout problems on different screen sizes
- Touch interaction issues

---

## 🎯 Testing Best Practices

### 1. **Test with Real-World Data**
- Use realistic prop names, descriptions, and categories
- Test with various prop types (furniture, weapons, consumables)
- Include edge cases (very long names, special characters, etc.)

### 2. **Test Role Combinations**
- Test users with multiple roles across different shows
- Test role changes during active sessions
- Test permission inheritance and overrides

### 3. **Test Subscription Scenarios**
- Test with accounts at different subscription levels
- Test limit enforcement and upgrade prompts
- Test billing and payment scenarios

### 4. **Test Collaboration Features**
- Have multiple testers work simultaneously
- Test with different network conditions
- Test with users on different devices/platforms

### 5. **Test Error Conditions**
- Test with invalid data inputs
- Test with network interruptions
- Test with expired sessions and authentication issues

### 6. **Document Everything**
- Record all issues with detailed steps to reproduce
- Include screenshots and error messages
- Note the user role and subscription level when issues occur

### 7. **Test Accessibility**
- Test keyboard navigation
- Test screen reader compatibility
- Test with different font sizes and themes

---

## 📞 Getting Help

### When You Encounter Issues:
1. **Document the Problem**: Use the bug report template
2. **Check Console**: Look for JavaScript errors in browser console
3. **Try Different Approaches**: Test with different user roles or data
4. **Contact the Team**: Reach out to developers with detailed information

### Useful Resources:
- **Browser Developer Tools**: F12 to open console and network tabs
- **Test Data Templates**: Use provided CSV templates for import testing
- **Role Permission Matrix**: Reference the role permissions table
- **Subscription Plan Details**: Keep plan limits and features handy

---

## 🎉 Conclusion

The Props List is a sophisticated system designed to solve real problems in the entertainment industry. As a tester, your role is crucial in ensuring that theater professionals can rely on this system for their complex, time-sensitive work.

Remember:
- **Think like a theater professional**: Consider the real-world scenarios and pressures
- **Test thoroughly**: The entertainment industry has zero tolerance for system failures during shows
- **Document everything**: Clear bug reports help developers fix issues quickly
- **Ask questions**: If something doesn't make sense, ask for clarification

Welcome to the team, and happy testing! 🎭

---

*This document is a living guide that will be updated as the system evolves. Please check for updates regularly and provide feedback to help improve this resource.*













