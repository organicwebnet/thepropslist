/**
 * Job Role Permissions System
 * 
 * Defines all job types and their specific permissions within the system.
 * Each job role has granular permissions for different system actions.
 */

// ============================================================================
// FINE-GRAINED SYSTEM ACTIONS BY CATEGORY
// ============================================================================

export enum SystemAction {
  // ============================================================================
  // USER & TEAM MANAGEMENT
  // ============================================================================
  // User Management (God/Admin Only)
  MANAGE_ALL_USERS = 'manage_all_users',
  ASSIGN_SYSTEM_ROLES = 'assign_system_roles',
  VIEW_USER_PROFILES = 'view_user_profiles',
  DELETE_USERS = 'delete_users',
  SUSPEND_USERS = 'suspend_users',
  ACTIVATE_USERS = 'activate_users',
  
  // Team Management (Show-specific)
  INVITE_TEAM_MEMBERS = 'invite_team_members',
  REMOVE_TEAM_MEMBERS = 'remove_team_members',
  ASSIGN_JOB_ROLES = 'assign_job_roles',
  VIEW_TEAM_MEMBERS = 'view_team_members',
  MANAGE_TEAM_PERMISSIONS = 'manage_team_permissions',
  
  // ============================================================================
  // SHOW MANAGEMENT
  // ============================================================================
  // Show Creation & Setup
  CREATE_SHOWS = 'create_shows',
  EDIT_SHOW_DETAILS = 'edit_show_details',
  DELETE_SHOWS = 'delete_shows',
  ARCHIVE_SHOWS = 'archive_shows',
  RESTORE_SHOWS = 'restore_shows',
  VIEW_SHOWS = 'view_shows',
  
  // Show Settings & Configuration
  MANAGE_SHOW_SETTINGS = 'manage_show_settings',
  MANAGE_SHOW_PERMISSIONS = 'manage_show_permissions',
  MANAGE_SHOW_BUDGET = 'manage_show_budget',
  MANAGE_SHOW_SCHEDULE = 'manage_show_schedule',
  
  // ============================================================================
  // PROPS MANAGEMENT (Fine-grained by job role)
  // ============================================================================
  // Props Creation & Design
  CREATE_PROPS = 'create_props',
  EDIT_PROP_DESIGN = 'edit_prop_design',
  EDIT_PROP_SPECIFICATIONS = 'edit_prop_specifications',
  EDIT_PROP_MATERIALS = 'edit_prop_materials',
  EDIT_PROP_DIMENSIONS = 'edit_prop_dimensions',
  EDIT_PROP_NOTES = 'edit_prop_notes',
  
  // Props Status & Workflow
  APPROVE_PROPS = 'approve_props',
  REJECT_PROPS = 'reject_props',
  MARK_PROPS_IN_PROGRESS = 'mark_props_in_progress',
  MARK_PROPS_COMPLETE = 'mark_props_complete',
  MARK_PROPS_DAMAGED = 'mark_props_damaged',
  MARK_PROPS_LOST = 'mark_props_lost',
  
  // Props Assignment & Tracking
  ASSIGN_PROPS_TO_SCENES = 'assign_props_to_scenes',
  ASSIGN_PROPS_TO_ACTORS = 'assign_props_to_actors',
  TRACK_PROP_LOCATION = 'track_prop_location',
  MANAGE_PROP_INVENTORY = 'manage_prop_inventory',
  
  // Props Viewing & Access
  VIEW_ALL_PROPS = 'view_all_props',
  VIEW_ASSIGNED_PROPS = 'view_assigned_props',
  VIEW_PROP_HISTORY = 'view_prop_history',
  VIEW_PROP_COSTS = 'view_prop_costs',
  
  // Props Deletion & Cleanup
  DELETE_PROPS = 'delete_props',
  ARCHIVE_PROPS = 'archive_props',
  
  // ============================================================================
  // BOARD MANAGEMENT
  // ============================================================================
  // Board Creation & Setup
  CREATE_BOARDS = 'create_boards',
  EDIT_BOARD_DETAILS = 'edit_board_details',
  DELETE_BOARDS = 'delete_boards',
  ARCHIVE_BOARDS = 'archive_boards',
  VIEW_BOARDS = 'view_boards',
  
  // Board Organization
  MANAGE_BOARD_LAYOUT = 'manage_board_layout',
  MANAGE_BOARD_CATEGORIES = 'manage_board_categories',
  MANAGE_BOARD_MEMBERS = 'manage_board_members',
  MANAGE_BOARD_PERMISSIONS = 'manage_board_permissions',
  
  // ============================================================================
  // PACKING & LOGISTICS
  // ============================================================================
  // Packing Box Management
  CREATE_PACKING_BOXES = 'create_packing_boxes',
  EDIT_PACKING_BOXES = 'edit_packing_boxes',
  DELETE_PACKING_BOXES = 'delete_packing_boxes',
  VIEW_PACKING_BOXES = 'view_packing_boxes',
  
  // Packing Lists & Organization
  MANAGE_PACKING_LISTS = 'manage_packing_lists',
  ASSIGN_PROPS_TO_BOXES = 'assign_props_to_boxes',
  TRACK_PACKING_STATUS = 'track_packing_status',
  MANAGE_SHIPPING_LABELS = 'manage_shipping_labels',
  
  // ============================================================================
  // SHOPPING & PROCUREMENT
  // ============================================================================
  // Shopping Item Management
  CREATE_SHOPPING_ITEMS = 'create_shopping_items',
  EDIT_SHOPPING_ITEMS = 'edit_shopping_items',
  DELETE_SHOPPING_ITEMS = 'delete_shopping_items',
  VIEW_SHOPPING_ITEMS = 'view_shopping_items',
  
  // Shopping Workflow & Approval
  REQUEST_SHOPPING_ITEMS = 'request_shopping_items',
  APPROVE_SHOPPING_REQUESTS = 'approve_shopping_requests',
  REJECT_SHOPPING_REQUESTS = 'reject_shopping_requests',
  MARK_ITEMS_ORDERED = 'mark_items_ordered',
  MARK_ITEMS_RECEIVED = 'mark_items_received',
  
  // Budget & Cost Management
  MANAGE_BUDGET = 'manage_budget',
  VIEW_BUDGET_DETAILS = 'view_budget_details',
  APPROVE_EXPENSES = 'approve_expenses',
  TRACK_COSTS = 'track_costs',
  
  // Vendor Management
  MANAGE_VENDORS = 'manage_vendors',
  VIEW_VENDOR_INFO = 'view_vendor_info',
  COMPARE_VENDOR_PRICES = 'compare_vendor_prices',
  
  // ============================================================================
  // TASK MANAGEMENT
  // ============================================================================
  // Task Creation & Assignment
  CREATE_TASKS = 'create_tasks',
  EDIT_TASKS = 'edit_tasks',
  DELETE_TASKS = 'delete_tasks',
  ASSIGN_TASKS = 'assign_tasks',
  REASSIGN_TASKS = 'reassign_tasks',
  
  // Task Execution & Tracking
  VIEW_TASKS = 'view_tasks',
  VIEW_ASSIGNED_TASKS = 'view_assigned_tasks',
  COMPLETE_TASKS = 'complete_tasks',
  MARK_TASKS_IN_PROGRESS = 'mark_tasks_in_progress',
  MARK_TASKS_BLOCKED = 'mark_tasks_blocked',
  
  // Task Priority & Scheduling
  SET_TASK_PRIORITY = 'set_task_priority',
  SET_TASK_DEADLINES = 'set_task_deadlines',
  MANAGE_TASK_DEPENDENCIES = 'manage_task_dependencies',
  
  // ============================================================================
  // SYSTEM ADMINISTRATION (God/Admin Only)
  // ============================================================================
  VIEW_SYSTEM_LOGS = 'view_system_logs',
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings',
  ACCESS_ADMIN_PANEL = 'access_admin_panel',
  VIEW_SUBSCRIBER_STATS = 'view_subscriber_stats',
  MANAGE_SYSTEM_MAINTENANCE = 'manage_system_maintenance',
  
  // ============================================================================
  // BILLING & SUBSCRIPTIONS (Admin/Manager Only)
  // ============================================================================
  VIEW_BILLING = 'view_billing',
  MANAGE_SUBSCRIPTIONS = 'manage_subscriptions',
  PURCHASE_ADDONS = 'purchase_addons',
  VIEW_USAGE_STATS = 'view_usage_stats',
  
  // ============================================================================
  // DATA & REPORTING
  // ============================================================================
  // Data Export/Import
  EXPORT_DATA = 'export_data',
  IMPORT_DATA = 'import_data',
  GENERATE_REPORTS = 'generate_reports',
  
  // Reporting & Analytics
  VIEW_PROP_REPORTS = 'view_prop_reports',
  VIEW_COST_REPORTS = 'view_cost_reports',
  VIEW_TASK_REPORTS = 'view_task_reports',
  VIEW_TEAM_REPORTS = 'view_team_reports',
  
  // ============================================================================
  // COMMUNICATION & NOTIFICATIONS
  // ============================================================================
  SEND_NOTIFICATIONS = 'send_notifications',
  MANAGE_ANNOUNCEMENTS = 'manage_announcements',
  VIEW_FEEDBACK = 'view_feedback',
  SEND_TEAM_MESSAGES = 'send_team_messages',
  
  // ============================================================================
  // AUDIT & COMPLIANCE
  // ============================================================================
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  TRACK_CHANGES = 'track_changes',
  VIEW_PERMISSION_HISTORY = 'view_permission_history'
}

// ============================================================================
// JOB ROLE DEFINITIONS
// ============================================================================

export interface JobRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
  color: string;
  permissions: SystemAction[];
  category: 'management' | 'creative' | 'technical' | 'support' | 'crew';
  hierarchy: number; // Higher number = more permissions
  isCustomizable: boolean; // Can God modify this role's permissions?
  isSystemRole: boolean; // Is this a built-in system role?
  createdBy?: string; // God user ID who created this role
  lastModified?: Date;
  version: number; // Track changes to role permissions
}

export const JOB_ROLES: JobRole[] = [
  // ============================================================================
  // MANAGEMENT ROLES (Highest Authority)
  // ============================================================================
  
  {
    id: 'props-supervisor',
    name: 'Props Supervisor',
    displayName: 'Props Supervisor',
    description: 'Oversees all props operations, manages team, and ensures quality control',
    color: 'bg-blue-500',
    category: 'management',
    hierarchy: 90,
    isCustomizable: true,
    isSystemRole: true,
    version: 1,
    permissions: [
      // User & Team Management
      SystemAction.VIEW_TEAM_MEMBERS,
      SystemAction.INVITE_TEAM_MEMBERS,
      SystemAction.REMOVE_TEAM_MEMBERS,
      SystemAction.ASSIGN_JOB_ROLES,
      
      // Show Management
      SystemAction.CREATE_SHOWS,
      SystemAction.EDIT_SHOW_DETAILS,
      SystemAction.VIEW_SHOWS,
      SystemAction.MANAGE_SHOW_SETTINGS,
      
      // Props Management (Full Control)
      SystemAction.CREATE_PROPS,
      SystemAction.EDIT_PROP_DESIGN,
      SystemAction.DELETE_PROPS,
      SystemAction.VIEW_ALL_PROPS,
      SystemAction.APPROVE_PROPS,
      SystemAction.REJECT_PROPS,
      SystemAction.ASSIGN_PROPS_TO_SCENES,
      
      // Board Management
      SystemAction.CREATE_BOARDS,
      SystemAction.EDIT_BOARD_DETAILS,
      SystemAction.DELETE_BOARDS,
      SystemAction.VIEW_BOARDS,
      SystemAction.MANAGE_BOARD_MEMBERS,
      
      // Packing Management
      SystemAction.CREATE_PACKING_BOXES,
      SystemAction.EDIT_PACKING_BOXES,
      SystemAction.DELETE_PACKING_BOXES,
      SystemAction.VIEW_PACKING_BOXES,
      SystemAction.MANAGE_PACKING_LISTS,
      
      // Shopping Management
      SystemAction.CREATE_SHOPPING_ITEMS,
      SystemAction.EDIT_SHOPPING_ITEMS,
      SystemAction.DELETE_SHOPPING_ITEMS,
      SystemAction.VIEW_SHOPPING_ITEMS,
      SystemAction.APPROVE_SHOPPING_REQUESTS,
      SystemAction.REJECT_SHOPPING_REQUESTS,
      SystemAction.MANAGE_BUDGET,
      
      // Task Management
      SystemAction.CREATE_TASKS,
      SystemAction.EDIT_TASKS,
      SystemAction.DELETE_TASKS,
      SystemAction.VIEW_TASKS,
      SystemAction.ASSIGN_TASKS,
      SystemAction.COMPLETE_TASKS,
      
      // Data & Reports
      SystemAction.EXPORT_DATA,
      SystemAction.GENERATE_REPORTS,
      
      // Communication
      SystemAction.SEND_NOTIFICATIONS,
      SystemAction.VIEW_FEEDBACK
    ]
  },
  
  {
    id: 'art-director',
    name: 'Art Director',
    displayName: 'Art Director',
    description: 'Oversees artistic vision, design approval, and creative direction',
    color: 'bg-purple-500',
    category: 'management',
    hierarchy: 85,
    isCustomizable: true,
    isSystemRole: true,
    version: 1,
    permissions: [
      // Show Management
      SystemAction.VIEW_SHOWS,
      SystemAction.EDIT_SHOW_DETAILS,
      
      // Props Management (Approval Authority)
      SystemAction.VIEW_ALL_PROPS,
      SystemAction.EDIT_PROP_DESIGN,
      SystemAction.APPROVE_PROPS,
      SystemAction.REJECT_PROPS,
      SystemAction.ASSIGN_PROPS_TO_SCENES,
      
      // Board Management
      SystemAction.VIEW_BOARDS,
      SystemAction.EDIT_BOARD_DETAILS,
      
      // Shopping Management (Budget Authority)
      SystemAction.VIEW_SHOPPING_ITEMS,
      SystemAction.APPROVE_SHOPPING_REQUESTS,
      SystemAction.REJECT_SHOPPING_REQUESTS,
      SystemAction.MANAGE_BUDGET,
      
      // Task Management
      SystemAction.VIEW_TASKS,
      SystemAction.ASSIGN_TASKS,
      SystemAction.COMPLETE_TASKS,
      
      // Data & Reports
      SystemAction.EXPORT_DATA,
      SystemAction.GENERATE_REPORTS,
      
      // Communication
      SystemAction.SEND_NOTIFICATIONS
    ]
  },
  
  {
    id: 'stage-manager',
    name: 'Stage Manager',
    displayName: 'Stage Manager',
    description: 'Manages stage operations, coordinates with crew, and ensures show flow',
    color: 'bg-indigo-500',
    category: 'management',
    hierarchy: 80,
    isCustomizable: true,
    isSystemRole: true,
    version: 1,
    permissions: [
      // Show Management
      SystemAction.VIEW_SHOWS,
      SystemAction.EDIT_SHOW_DETAILS,
      
      // Props Management (Operational)
      SystemAction.VIEW_ALL_PROPS,
      SystemAction.EDIT_PROP_DESIGN,
      SystemAction.ASSIGN_PROPS_TO_SCENES,
      
      // Board Management
      SystemAction.VIEW_BOARDS,
      SystemAction.EDIT_BOARD_DETAILS,
      SystemAction.CREATE_BOARDS,
      
      // Packing Management
      SystemAction.VIEW_PACKING_BOXES,
      SystemAction.EDIT_PACKING_BOXES,
      SystemAction.MANAGE_PACKING_LISTS,
      
      // Task Management
      SystemAction.CREATE_TASKS,
      SystemAction.EDIT_TASKS,
      SystemAction.VIEW_TASKS,
      SystemAction.ASSIGN_TASKS,
      SystemAction.COMPLETE_TASKS,
      
      // Communication
      SystemAction.SEND_NOTIFICATIONS
    ]
  },
  
  // ============================================================================
  // CREATIVE ROLES
  // ============================================================================
  
  {
    id: 'designer',
    name: 'Designer',
    displayName: 'Designer',
    description: 'Creates designs, concepts, and visual specifications for props and sets',
    color: 'bg-pink-500',
    category: 'creative',
    hierarchy: 70,
    isCustomizable: true,
    isSystemRole: true,
    version: 1,
    permissions: [
      // Show Management
      SystemAction.VIEW_SHOWS,
      
      // Props Management (Design Focus)
      SystemAction.CREATE_PROPS,
      SystemAction.EDIT_PROP_DESIGN,
      SystemAction.VIEW_ALL_PROPS,
      
      // Board Management
      SystemAction.VIEW_BOARDS,
      SystemAction.EDIT_BOARD_DETAILS,
      
      // Shopping Management (Request Items)
      SystemAction.CREATE_SHOPPING_ITEMS,
      SystemAction.VIEW_SHOPPING_ITEMS,
      
      // Task Management
      SystemAction.CREATE_TASKS,
      SystemAction.EDIT_TASKS,
      SystemAction.VIEW_TASKS,
      SystemAction.COMPLETE_TASKS,
      
      // Data Export
      SystemAction.EXPORT_DATA
    ]
  },
  
  {
    id: 'assistant-designer',
    name: 'Assistant Designer',
    displayName: 'Assistant Designer',
    description: 'Supports design work, creates drawings, and assists with design implementation',
    color: 'bg-pink-400',
    category: 'creative',
    hierarchy: 60,
    isCustomizable: true,
    isSystemRole: true,
    version: 1,
    permissions: [
      // Show Management
      SystemAction.VIEW_SHOWS,
      
      // Props Management (Limited Edit)
      SystemAction.VIEW_ALL_PROPS,
      SystemAction.EDIT_PROP_DESIGN,
      
      // Board Management
      SystemAction.VIEW_BOARDS,
      SystemAction.EDIT_BOARD_DETAILS,
      
      // Shopping Management
      SystemAction.VIEW_SHOPPING_ITEMS,
      
      // Task Management
      SystemAction.VIEW_TASKS,
      SystemAction.COMPLETE_TASKS
    ]
  },
  
  // ============================================================================
  // TECHNICAL ROLES
  // ============================================================================
  
  {
    id: 'senior-propmaker',
    name: 'Senior Props Maker',
    displayName: 'Senior Props Maker',
    description: 'Leads prop construction, mentors junior makers, and ensures quality',
    color: 'bg-green-500',
    category: 'technical',
    hierarchy: 75,
    isCustomizable: true,
    isSystemRole: true,
    version: 1,
    permissions: [
      // Show Management
      SystemAction.VIEW_SHOWS,
      
      // Props Management (Full Control)
      SystemAction.CREATE_PROPS,
      SystemAction.EDIT_PROP_DESIGN,
      SystemAction.VIEW_ALL_PROPS,
      SystemAction.ASSIGN_PROPS_TO_SCENES,
      
      // Board Management
      SystemAction.VIEW_BOARDS,
      SystemAction.EDIT_BOARD_DETAILS,
      
      // Packing Management
      SystemAction.VIEW_PACKING_BOXES,
      SystemAction.EDIT_PACKING_BOXES,
      
      // Shopping Management
      SystemAction.CREATE_SHOPPING_ITEMS,
      SystemAction.VIEW_SHOPPING_ITEMS,
      
      // Task Management
      SystemAction.CREATE_TASKS,
      SystemAction.EDIT_TASKS,
      SystemAction.VIEW_TASKS,
      SystemAction.ASSIGN_TASKS,
      SystemAction.COMPLETE_TASKS,
      
      // Data Export
      SystemAction.EXPORT_DATA
    ]
  },
  
  {
    id: 'propmaker',
    name: 'Props Maker',
    displayName: 'Props Maker',
    description: 'Constructs and fabricates props according to specifications',
    color: 'bg-green-400',
    category: 'technical',
    hierarchy: 65,
    isCustomizable: true,
    isSystemRole: true,
    version: 1,
    permissions: [
      // Show Management
      SystemAction.VIEW_SHOWS,
      
      // Props Management (Create & Edit)
      SystemAction.CREATE_PROPS,
      SystemAction.EDIT_PROP_DESIGN,
      SystemAction.VIEW_ALL_PROPS,
      
      // Board Management
      SystemAction.VIEW_BOARDS,
      SystemAction.EDIT_BOARD_DETAILS,
      
      // Packing Management
      SystemAction.VIEW_PACKING_BOXES,
      SystemAction.EDIT_PACKING_BOXES,
      
      // Shopping Management
      SystemAction.CREATE_SHOPPING_ITEMS,
      SystemAction.VIEW_SHOPPING_ITEMS,
      
      // Task Management
      SystemAction.VIEW_TASKS,
      SystemAction.COMPLETE_TASKS
    ]
  },
  
  {
    id: 'props-carpenter',
    name: 'Props Carpenter',
    displayName: 'Props Carpenter',
    description: 'Specializes in woodworking and carpentry for props construction',
    color: 'bg-yellow-500',
    category: 'technical',
    hierarchy: 65,
    isCustomizable: true,
    isSystemRole: true,
    version: 1,
    permissions: [
      // Show Management
      SystemAction.VIEW_SHOWS,
      
      // Props Management (Carpentry Focus)
      SystemAction.CREATE_PROPS,
      SystemAction.EDIT_PROP_DESIGN,
      SystemAction.VIEW_ALL_PROPS,
      
      // Board Management
      SystemAction.VIEW_BOARDS,
      SystemAction.EDIT_BOARD_DETAILS,
      
      // Shopping Management
      SystemAction.CREATE_SHOPPING_ITEMS,
      SystemAction.VIEW_SHOPPING_ITEMS,
      
      // Task Management
      SystemAction.VIEW_TASKS,
      SystemAction.COMPLETE_TASKS
    ]
  },
  
  {
    id: 'show-carpenter',
    name: 'Show Carpenter',
    displayName: 'Show Carpenter',
    description: 'Handles set construction, rigging, and stage carpentry',
    color: 'bg-yellow-400',
    category: 'technical',
    hierarchy: 60,
    isCustomizable: true,
    isSystemRole: true,
    version: 1,
    permissions: [
      // Show Management
      SystemAction.VIEW_SHOWS,
      
      // Props Management (Limited)
      SystemAction.VIEW_ALL_PROPS,
      SystemAction.EDIT_PROP_DESIGN,
      
      // Board Management
      SystemAction.VIEW_BOARDS,
      SystemAction.EDIT_BOARD_DETAILS,
      
      // Shopping Management
      SystemAction.VIEW_SHOPPING_ITEMS,
      
      // Task Management
      SystemAction.VIEW_TASKS,
      SystemAction.COMPLETE_TASKS
    ]
  },
  
  {
    id: 'painter',
    name: 'Painter',
    displayName: 'Painter',
    description: 'Handles painting, finishing, and surface treatments for props and sets',
    color: 'bg-orange-500',
    category: 'technical',
    hierarchy: 60,
    isCustomizable: true,
    isSystemRole: true,
    version: 1,
    permissions: [
      // Show Management
      SystemAction.VIEW_SHOWS,
      
      // Props Management (Painting Focus)
      SystemAction.VIEW_ALL_PROPS,
      SystemAction.EDIT_PROP_DESIGN,
      
      // Board Management
      SystemAction.VIEW_BOARDS,
      SystemAction.EDIT_BOARD_DETAILS,
      
      // Shopping Management
      SystemAction.CREATE_SHOPPING_ITEMS,
      SystemAction.VIEW_SHOPPING_ITEMS,
      
      // Task Management
      SystemAction.VIEW_TASKS,
      SystemAction.COMPLETE_TASKS
    ]
  },
  
  // ============================================================================
  // SUPPORT ROLES
  // ============================================================================
  
  {
    id: 'buyer',
    name: 'Buyer',
    displayName: 'Buyer',
    description: 'Procures materials, manages vendors, and handles purchasing',
    color: 'bg-teal-500',
    category: 'support',
    hierarchy: 70,
    isCustomizable: true,
    isSystemRole: true,
    version: 1,
    permissions: [
      // Show Management
      SystemAction.VIEW_SHOWS,
      
      // Props Management (View Only)
      SystemAction.VIEW_ALL_PROPS,
      
      // Shopping Management (Full Control)
      SystemAction.CREATE_SHOPPING_ITEMS,
      SystemAction.EDIT_SHOPPING_ITEMS,
      SystemAction.DELETE_SHOPPING_ITEMS,
      SystemAction.VIEW_SHOPPING_ITEMS,
      SystemAction.MANAGE_BUDGET,
      
      // Task Management
      SystemAction.VIEW_TASKS,
      SystemAction.COMPLETE_TASKS,
      
      // Data Export
      SystemAction.EXPORT_DATA
    ]
  },
  
  {
    id: 'set-dresser',
    name: 'Set Dresser',
    displayName: 'Set Dresser',
    description: 'Arranges props on set, maintains continuity, and handles prop placement',
    color: 'bg-cyan-500',
    category: 'support',
    hierarchy: 55,
    isCustomizable: true,
    isSystemRole: true,
    version: 1,
    permissions: [
      // Show Management
      SystemAction.VIEW_SHOWS,
      
      // Props Management (Placement Focus)
      SystemAction.VIEW_ALL_PROPS,
      SystemAction.EDIT_PROP_DESIGN,
      SystemAction.ASSIGN_PROPS_TO_SCENES,
      
      // Board Management
      SystemAction.VIEW_BOARDS,
      SystemAction.EDIT_BOARD_DETAILS,
      
      // Packing Management
      SystemAction.VIEW_PACKING_BOXES,
      SystemAction.EDIT_PACKING_BOXES,
      
      // Task Management
      SystemAction.VIEW_TASKS,
      SystemAction.COMPLETE_TASKS
    ]
  },
  
  {
    id: 'assistant-stage-manager',
    name: 'Assistant Stage Manager',
    displayName: 'Assistant Stage Manager',
    description: 'Supports stage management, coordinates crew, and assists with show operations',
    color: 'bg-indigo-400',
    category: 'support',
    hierarchy: 60,
    isCustomizable: true,
    isSystemRole: true,
    version: 1,
    permissions: [
      // Show Management
      SystemAction.VIEW_SHOWS,
      
      // Props Management (Operational)
      SystemAction.VIEW_ALL_PROPS,
      SystemAction.EDIT_PROP_DESIGN,
      SystemAction.ASSIGN_PROPS_TO_SCENES,
      
      // Board Management
      SystemAction.VIEW_BOARDS,
      SystemAction.EDIT_BOARD_DETAILS,
      
      // Task Management
      SystemAction.VIEW_TASKS,
      SystemAction.ASSIGN_TASKS,
      SystemAction.COMPLETE_TASKS,
      
      // Communication
      SystemAction.SEND_NOTIFICATIONS
    ]
  },
  
  // ============================================================================
  // CREW ROLES
  // ============================================================================
  
  {
    id: 'crew',
    name: 'Crew',
    displayName: 'Crew Member',
    description: 'General crew member with basic access to view and complete assigned tasks',
    color: 'bg-gray-500',
    category: 'crew',
    hierarchy: 40,
    isCustomizable: true,
    isSystemRole: true,
    version: 1,
    permissions: [
      // Show Management
      SystemAction.VIEW_SHOWS,
      
      // Props Management (View Only)
      SystemAction.VIEW_ALL_PROPS,
      
      // Board Management
      SystemAction.VIEW_BOARDS,
      
      // Task Management
      SystemAction.VIEW_TASKS,
      SystemAction.COMPLETE_TASKS
    ]
  }
];

// ============================================================================
// GOD-LEVEL PERMISSION MANAGEMENT
// ============================================================================

export interface PermissionCategory {
  id: string;
  name: string;
  description: string;
  actions: SystemAction[];
  icon: string;
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'user-management',
    name: 'User & Team Management',
    description: 'Manage users, roles, and team members',
    icon: '👥',
    actions: [
      SystemAction.MANAGE_ALL_USERS,
      SystemAction.ASSIGN_SYSTEM_ROLES,
      SystemAction.VIEW_USER_PROFILES,
      SystemAction.DELETE_USERS,
      SystemAction.SUSPEND_USERS,
      SystemAction.ACTIVATE_USERS,
      SystemAction.INVITE_TEAM_MEMBERS,
      SystemAction.REMOVE_TEAM_MEMBERS,
      SystemAction.ASSIGN_JOB_ROLES,
      SystemAction.VIEW_TEAM_MEMBERS,
      SystemAction.MANAGE_TEAM_PERMISSIONS
    ]
  },
  {
    id: 'show-management',
    name: 'Show Management',
    description: 'Create, edit, and manage shows',
    icon: '🎭',
    actions: [
      SystemAction.CREATE_SHOWS,
      SystemAction.EDIT_SHOW_DETAILS,
      SystemAction.DELETE_SHOWS,
      SystemAction.ARCHIVE_SHOWS,
      SystemAction.RESTORE_SHOWS,
      SystemAction.VIEW_SHOWS,
      SystemAction.MANAGE_SHOW_SETTINGS,
      SystemAction.MANAGE_SHOW_PERMISSIONS,
      SystemAction.MANAGE_SHOW_BUDGET,
      SystemAction.MANAGE_SHOW_SCHEDULE
    ]
  },
  {
    id: 'props-management',
    name: 'Props Management',
    description: 'Create, edit, and manage props',
    icon: '🎨',
    actions: [
      SystemAction.CREATE_PROPS,
      SystemAction.EDIT_PROP_DESIGN,
      SystemAction.EDIT_PROP_SPECIFICATIONS,
      SystemAction.EDIT_PROP_MATERIALS,
      SystemAction.EDIT_PROP_DIMENSIONS,
      SystemAction.EDIT_PROP_NOTES,
      SystemAction.APPROVE_PROPS,
      SystemAction.REJECT_PROPS,
      SystemAction.MARK_PROPS_IN_PROGRESS,
      SystemAction.MARK_PROPS_COMPLETE,
      SystemAction.MARK_PROPS_DAMAGED,
      SystemAction.MARK_PROPS_LOST,
      SystemAction.ASSIGN_PROPS_TO_SCENES,
      SystemAction.ASSIGN_PROPS_TO_ACTORS,
      SystemAction.TRACK_PROP_LOCATION,
      SystemAction.MANAGE_PROP_INVENTORY,
      SystemAction.VIEW_ALL_PROPS,
      SystemAction.VIEW_ASSIGNED_PROPS,
      SystemAction.VIEW_PROP_HISTORY,
      SystemAction.VIEW_PROP_COSTS,
      SystemAction.DELETE_PROPS,
      SystemAction.ARCHIVE_PROPS
    ]
  },
  {
    id: 'shopping-procurement',
    name: 'Shopping & Procurement',
    description: 'Manage shopping lists, budgets, and vendors',
    icon: '🛒',
    actions: [
      SystemAction.CREATE_SHOPPING_ITEMS,
      SystemAction.EDIT_SHOPPING_ITEMS,
      SystemAction.DELETE_SHOPPING_ITEMS,
      SystemAction.VIEW_SHOPPING_ITEMS,
      SystemAction.REQUEST_SHOPPING_ITEMS,
      SystemAction.APPROVE_SHOPPING_REQUESTS,
      SystemAction.REJECT_SHOPPING_REQUESTS,
      SystemAction.MARK_ITEMS_ORDERED,
      SystemAction.MARK_ITEMS_RECEIVED,
      SystemAction.MANAGE_BUDGET,
      SystemAction.VIEW_BUDGET_DETAILS,
      SystemAction.APPROVE_EXPENSES,
      SystemAction.TRACK_COSTS,
      SystemAction.MANAGE_VENDORS,
      SystemAction.VIEW_VENDOR_INFO,
      SystemAction.COMPARE_VENDOR_PRICES
    ]
  },
  {
    id: 'task-management',
    name: 'Task Management',
    description: 'Create, assign, and track tasks',
    icon: '✅',
    actions: [
      SystemAction.CREATE_TASKS,
      SystemAction.EDIT_TASKS,
      SystemAction.DELETE_TASKS,
      SystemAction.ASSIGN_TASKS,
      SystemAction.REASSIGN_TASKS,
      SystemAction.VIEW_TASKS,
      SystemAction.VIEW_ASSIGNED_TASKS,
      SystemAction.COMPLETE_TASKS,
      SystemAction.MARK_TASKS_IN_PROGRESS,
      SystemAction.MARK_TASKS_BLOCKED,
      SystemAction.SET_TASK_PRIORITY,
      SystemAction.SET_TASK_DEADLINES,
      SystemAction.MANAGE_TASK_DEPENDENCIES
    ]
  },
  {
    id: 'system-admin',
    name: 'System Administration',
    description: 'System-level administration and maintenance',
    icon: '⚙️',
    actions: [
      SystemAction.VIEW_SYSTEM_LOGS,
      SystemAction.MANAGE_SYSTEM_SETTINGS,
      SystemAction.ACCESS_ADMIN_PANEL,
      SystemAction.VIEW_SUBSCRIBER_STATS,
      SystemAction.MANAGE_SYSTEM_MAINTENANCE,
      SystemAction.VIEW_BILLING,
      SystemAction.MANAGE_SUBSCRIPTIONS,
      SystemAction.PURCHASE_ADDONS,
      SystemAction.VIEW_USAGE_STATS
    ]
  }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get job role by ID
 */
export function getJobRole(roleId: string): JobRole | undefined {
  return JOB_ROLES.find(role => role.id === roleId);
}

/**
 * Get all job roles by category
 */
export function getJobRolesByCategory(category: JobRole['category']): JobRole[] {
  return JOB_ROLES.filter(role => role.category === category);
}

/**
 * Get job roles sorted by hierarchy (highest first)
 */
export function getJobRolesByHierarchy(): JobRole[] {
  return [...JOB_ROLES].sort((a, b) => b.hierarchy - a.hierarchy);
}

/**
 * Check if a job role has a specific permission
 */
export function hasJobRolePermission(roleId: string, action: SystemAction): boolean {
  const role = getJobRole(roleId);
  return role?.permissions.includes(action) ?? false;
}

/**
 * Get all permissions for a job role
 */
export function getJobRolePermissions(roleId: string): SystemAction[] {
  const role = getJobRole(roleId);
  return role?.permissions ?? [];
}

/**
 * Get job role display information
 */
export function getJobRoleDisplayInfo(roleId: string) {
  const role = getJobRole(roleId);
  if (!role) return null;
  
  return {
    id: role.id,
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    color: role.color,
    category: role.category,
    hierarchy: role.hierarchy,
    permissionCount: role.permissions.length,
    isCustomizable: role.isCustomizable,
    isSystemRole: role.isSystemRole,
    version: role.version
  };
}

// ============================================================================
// GOD-LEVEL ROLE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create a new custom job role (God only)
 */
export function createCustomJobRole(
  name: string,
  displayName: string,
  description: string,
  category: JobRole['category'],
  permissions: SystemAction[],
  createdBy: string
): JobRole {
  const newRole: JobRole = {
    id: `custom-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    displayName,
    description,
    color: 'bg-gray-500', // Default color for custom roles
    category,
    hierarchy: 50, // Default hierarchy for custom roles
    permissions,
    isCustomizable: true,
    isSystemRole: false,
    createdBy,
    lastModified: new Date(),
    version: 1
  };
  
  return newRole;
}

/**
 * Update job role permissions (God only)
 */
export function updateJobRolePermissions(
  roleId: string,
  newPermissions: SystemAction[],
  _modifiedBy: string
): JobRole | null {
  const role = getJobRole(roleId);
  if (!role || !role.isCustomizable) {
    return null;
  }
  
  const updatedRole: JobRole = {
    ...role,
    permissions: newPermissions,
    lastModified: new Date(),
    version: role.version + 1
  };
  
  return updatedRole;
}

/**
 * Get permission matrix for all roles
 */
export function getPermissionMatrix(): Record<string, Record<string, boolean>> {
  const matrix: Record<string, Record<string, boolean>> = {};
  
  JOB_ROLES.forEach(role => {
    matrix[role.id] = {};
    Object.values(SystemAction).forEach(action => {
      matrix[role.id][action] = role.permissions.includes(action);
    });
  });
  
  return matrix;
}

/**
 * Get all available permissions grouped by category
 */
export function getPermissionsByCategory(): Record<string, SystemAction[]> {
  const permissions: Record<string, SystemAction[]> = {};
  
  PERMISSION_CATEGORIES.forEach(category => {
    permissions[category.id] = category.actions;
  });
  
  return permissions;
}

/**
 * Validate role permissions (ensure no conflicts)
 */
export function validateRolePermissions(permissions: SystemAction[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for conflicting permissions
  if (permissions.includes(SystemAction.DELETE_PROPS) && !permissions.includes(SystemAction.VIEW_ALL_PROPS)) {
    warnings.push('Delete props permission without view all props may cause issues');
  }
  
  if (permissions.includes(SystemAction.APPROVE_SHOPPING_REQUESTS) && !permissions.includes(SystemAction.VIEW_SHOPPING_ITEMS)) {
    warnings.push('Approve shopping requests without view shopping items may cause issues');
  }
  
  // Check for dangerous permission combinations
  if (permissions.includes(SystemAction.MANAGE_ALL_USERS) && permissions.includes(SystemAction.ASSIGN_SYSTEM_ROLES)) {
    warnings.push('Full user management permissions detected - use with caution');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get role comparison between two roles
 */
export function compareRoles(roleId1: string, roleId2: string): {
  role1: JobRole | undefined;
  role2: JobRole | undefined;
  commonPermissions: SystemAction[];
  role1Only: SystemAction[];
  role2Only: SystemAction[];
} {
  const role1 = getJobRole(roleId1);
  const role2 = getJobRole(roleId2);
  
  if (!role1 || !role2) {
    return {
      role1,
      role2,
      commonPermissions: [],
      role1Only: [],
      role2Only: []
    };
  }
  
  const commonPermissions = role1.permissions.filter(perm => role2.permissions.includes(perm));
  const role1Only = role1.permissions.filter(perm => !role2.permissions.includes(perm));
  const role2Only = role2.permissions.filter(perm => !role1.permissions.includes(perm));
  
  return {
    role1,
    role2,
    commonPermissions,
    role1Only,
    role2Only
  };
}

// ============================================================================
// PERMISSION DESCRIPTIONS FOR TOOLTIPS
// ============================================================================

/**
 * Detailed descriptions for each permission to help users understand what they do
 */
export const PERMISSION_DESCRIPTIONS: Record<SystemAction, string> = {
  // User & Team Management
  [SystemAction.MANAGE_ALL_USERS]: 'Full access to create, edit, and delete user accounts across the entire system. This is a high-level administrative permission.',
  [SystemAction.ASSIGN_SYSTEM_ROLES]: 'Ability to assign system-level roles (like God/Admin) to users. Use with caution as this grants significant privileges.',
  [SystemAction.VIEW_USER_PROFILES]: 'View user profile information including contact details, roles, and activity history.',
  [SystemAction.DELETE_USERS]: 'Permanently delete user accounts from the system. This action cannot be undone.',
  [SystemAction.SUSPEND_USERS]: 'Temporarily suspend user accounts, preventing them from accessing the system while preserving their data.',
  [SystemAction.ACTIVATE_USERS]: 'Reactivate previously suspended user accounts, restoring their access to the system.',
  [SystemAction.INVITE_TEAM_MEMBERS]: 'Send invitations to new team members to join a specific show or project.',
  [SystemAction.REMOVE_TEAM_MEMBERS]: 'Remove team members from a show or project, revoking their access to that specific show.',
  [SystemAction.ASSIGN_JOB_ROLES]: 'Assign job-specific roles (like Props Maker, Designer) to team members within a show.',
  [SystemAction.VIEW_TEAM_MEMBERS]: 'View the list of team members and their assigned roles for a show.',
  [SystemAction.MANAGE_TEAM_PERMISSIONS]: 'Modify permissions for team members, controlling what actions they can perform within a show.',
  
  // Show Management
  [SystemAction.CREATE_SHOWS]: 'Create new shows or productions in the system. This is typically reserved for supervisors and managers.',
  [SystemAction.EDIT_SHOW_DETAILS]: 'Modify show information such as name, description, dates, and other show-specific settings.',
  [SystemAction.DELETE_SHOWS]: 'Permanently delete shows from the system. This will also delete all associated props, tasks, and data.',
  [SystemAction.ARCHIVE_SHOWS]: 'Archive completed shows, moving them out of active view while preserving all data for historical reference.',
  [SystemAction.RESTORE_SHOWS]: 'Restore archived shows back to active status, making them accessible again.',
  [SystemAction.VIEW_SHOWS]: 'View show information and details. This is a basic permission required to access show data.',
  [SystemAction.MANAGE_SHOW_SETTINGS]: 'Modify advanced show settings including preferences, configurations, and system options.',
  [SystemAction.MANAGE_SHOW_PERMISSIONS]: 'Control which permissions are available to different roles within a specific show.',
  [SystemAction.MANAGE_SHOW_BUDGET]: 'View and modify budget information, track expenses, and manage financial aspects of a show.',
  [SystemAction.MANAGE_SHOW_SCHEDULE]: 'Create and edit show schedules, rehearsal times, and performance dates.',
  
  // Props Management
  [SystemAction.CREATE_PROPS]: 'Create new prop entries in the system with all relevant details and specifications.',
  [SystemAction.EDIT_PROP_DESIGN]: 'Modify prop design information including visual specifications, drawings, and design notes.',
  [SystemAction.EDIT_PROP_SPECIFICATIONS]: 'Update technical specifications for props such as requirements and constraints.',
  [SystemAction.EDIT_PROP_MATERIALS]: 'Modify the materials list and material requirements for props.',
  [SystemAction.EDIT_PROP_DIMENSIONS]: 'Update dimensional information including length, width, height, and weight of props.',
  [SystemAction.EDIT_PROP_NOTES]: 'Add or modify notes and additional information about props.',
  [SystemAction.APPROVE_PROPS]: 'Approve props for production use, marking them as ready and meeting quality standards.',
  [SystemAction.REJECT_PROPS]: 'Reject props that do not meet requirements, sending them back for revision.',
  [SystemAction.MARK_PROPS_IN_PROGRESS]: 'Update prop status to indicate work is currently being performed on them.',
  [SystemAction.MARK_PROPS_COMPLETE]: 'Mark props as completed and ready for use in the show.',
  [SystemAction.MARK_PROPS_DAMAGED]: 'Record that props have been damaged, triggering repair workflows and documentation.',
  [SystemAction.MARK_PROPS_LOST]: 'Mark props as lost, updating inventory and potentially triggering replacement processes.',
  [SystemAction.ASSIGN_PROPS_TO_SCENES]: 'Assign props to specific scenes in the show, tracking which props are needed where.',
  [SystemAction.ASSIGN_PROPS_TO_ACTORS]: 'Assign props to specific actors, tracking who is responsible for each prop.',
  [SystemAction.TRACK_PROP_LOCATION]: 'Update and track the current physical location of props throughout the production.',
  [SystemAction.MANAGE_PROP_INVENTORY]: 'Manage prop inventory, including quantities, stock levels, and inventory organization.',
  [SystemAction.VIEW_ALL_PROPS]: 'View all props in the system, regardless of assignment or ownership.',
  [SystemAction.VIEW_ASSIGNED_PROPS]: 'View only props that have been assigned to you or your team.',
  [SystemAction.VIEW_PROP_HISTORY]: 'Access historical information about props including past status changes and modifications.',
  [SystemAction.VIEW_PROP_COSTS]: 'View cost information and pricing details for props, including purchase and rental costs.',
  [SystemAction.DELETE_PROPS]: 'Permanently delete props from the system. This action cannot be undone.',
  [SystemAction.ARCHIVE_PROPS]: 'Archive props that are no longer needed, removing them from active view while preserving data.',
  
  // Board Management
  [SystemAction.CREATE_BOARDS]: 'Create new task boards for organizing and managing work items.',
  [SystemAction.EDIT_BOARD_DETAILS]: 'Modify board information including name, description, and board settings.',
  [SystemAction.DELETE_BOARDS]: 'Permanently delete boards and all associated tasks.',
  [SystemAction.ARCHIVE_BOARDS]: 'Archive boards that are no longer active, preserving data for reference.',
  [SystemAction.VIEW_BOARDS]: 'View boards and their contents. Basic permission to access board information.',
  [SystemAction.MANAGE_BOARD_LAYOUT]: 'Modify board layout, columns, and visual organization of tasks.',
  [SystemAction.MANAGE_BOARD_CATEGORIES]: 'Create and manage categories for organizing tasks within boards.',
  [SystemAction.MANAGE_BOARD_MEMBERS]: 'Add or remove members from boards, controlling who can access and work on them.',
  [SystemAction.MANAGE_BOARD_PERMISSIONS]: 'Control permissions for board members, determining what actions they can perform.',
  
  // Packing & Logistics
  [SystemAction.CREATE_PACKING_BOXES]: 'Create new packing boxes for organizing props during transport or storage.',
  [SystemAction.EDIT_PACKING_BOXES]: 'Modify packing box information including contents and labels.',
  [SystemAction.DELETE_PACKING_BOXES]: 'Delete packing boxes from the system.',
  [SystemAction.VIEW_PACKING_BOXES]: 'View packing boxes and their contents.',
  [SystemAction.MANAGE_PACKING_LISTS]: 'Create and manage packing lists for shows, tracking what needs to be packed.',
  [SystemAction.ASSIGN_PROPS_TO_BOXES]: 'Assign props to specific packing boxes for organization and tracking.',
  [SystemAction.TRACK_PACKING_STATUS]: 'Update and track the packing status of boxes (packed, in transit, received, etc.).',
  [SystemAction.MANAGE_SHIPPING_LABELS]: 'Create and manage shipping labels for packing boxes.',
  
  // Shopping & Procurement
  [SystemAction.CREATE_SHOPPING_ITEMS]: 'Add items to shopping lists for purchasing materials and supplies.',
  [SystemAction.EDIT_SHOPPING_ITEMS]: 'Modify shopping list items including quantities, descriptions, and specifications.',
  [SystemAction.DELETE_SHOPPING_ITEMS]: 'Remove items from shopping lists.',
  [SystemAction.VIEW_SHOPPING_ITEMS]: 'View shopping lists and items that need to be purchased.',
  [SystemAction.REQUEST_SHOPPING_ITEMS]: 'Submit requests for items to be added to shopping lists, requiring approval.',
  [SystemAction.APPROVE_SHOPPING_REQUESTS]: 'Approve shopping requests, allowing items to be purchased.',
  [SystemAction.REJECT_SHOPPING_REQUESTS]: 'Reject shopping requests that are not approved for purchase.',
  [SystemAction.MARK_ITEMS_ORDERED]: 'Mark shopping items as ordered, tracking the procurement process.',
  [SystemAction.MARK_ITEMS_RECEIVED]: 'Mark shopping items as received, updating inventory and completing the purchase cycle.',
  [SystemAction.MANAGE_BUDGET]: 'View and modify budget allocations, track spending, and manage financial resources.',
  [SystemAction.VIEW_BUDGET_DETAILS]: 'View budget information and spending details without the ability to modify.',
  [SystemAction.APPROVE_EXPENSES]: 'Approve expense requests and purchases, authorizing payment.',
  [SystemAction.TRACK_COSTS]: 'Record and track costs associated with props, materials, and purchases.',
  [SystemAction.MANAGE_VENDORS]: 'Add, edit, and manage vendor information and contact details.',
  [SystemAction.VIEW_VENDOR_INFO]: 'View vendor information including contact details and pricing.',
  [SystemAction.COMPARE_VENDOR_PRICES]: 'Compare prices from different vendors to make purchasing decisions.',
  
  // Task Management
  [SystemAction.CREATE_TASKS]: 'Create new tasks and work items for team members.',
  [SystemAction.EDIT_TASKS]: 'Modify task details including descriptions, assignments, and requirements.',
  [SystemAction.DELETE_TASKS]: 'Delete tasks from the system.',
  [SystemAction.ASSIGN_TASKS]: 'Assign tasks to team members, distributing work across the team.',
  [SystemAction.REASSIGN_TASKS]: 'Reassign tasks to different team members when needed.',
  [SystemAction.VIEW_TASKS]: 'View tasks and their current status. Basic permission to see task information.',
  [SystemAction.VIEW_ASSIGNED_TASKS]: 'View only tasks that have been assigned to you.',
  [SystemAction.COMPLETE_TASKS]: 'Mark tasks as completed, updating their status in the system.',
  [SystemAction.MARK_TASKS_IN_PROGRESS]: 'Update task status to indicate work has begun.',
  [SystemAction.MARK_TASKS_BLOCKED]: 'Mark tasks as blocked, indicating they cannot proceed due to dependencies or issues.',
  [SystemAction.SET_TASK_PRIORITY]: 'Set priority levels for tasks (high, medium, low) to help with scheduling.',
  [SystemAction.SET_TASK_DEADLINES]: 'Set deadlines and due dates for tasks.',
  [SystemAction.MANAGE_TASK_DEPENDENCIES]: 'Define relationships between tasks, indicating which tasks must be completed before others.',
  
  // System Administration
  [SystemAction.VIEW_SYSTEM_LOGS]: 'Access system logs and diagnostic information for troubleshooting.',
  [SystemAction.MANAGE_SYSTEM_SETTINGS]: 'Modify system-wide settings and configurations. This is a high-level administrative permission.',
  [SystemAction.ACCESS_ADMIN_PANEL]: 'Access the administrative panel with system management tools.',
  [SystemAction.VIEW_SUBSCRIBER_STATS]: 'View statistics about system usage, subscribers, and activity metrics.',
  [SystemAction.MANAGE_SYSTEM_MAINTENANCE]: 'Schedule and manage system maintenance windows and updates.',
  [SystemAction.VIEW_BILLING]: 'View billing information and subscription details.',
  [SystemAction.MANAGE_SUBSCRIPTIONS]: 'Manage subscription plans, upgrades, and billing settings.',
  [SystemAction.PURCHASE_ADDONS]: 'Purchase additional features and add-ons for the system.',
  [SystemAction.VIEW_USAGE_STATS]: 'View usage statistics and analytics for the system.',
  
  // Data & Reporting
  [SystemAction.EXPORT_DATA]: 'Export data from the system in various formats (CSV, JSON, etc.) for backup or analysis.',
  [SystemAction.IMPORT_DATA]: 'Import data into the system from external sources.',
  [SystemAction.GENERATE_REPORTS]: 'Create and generate reports on props, tasks, costs, and other system data.',
  [SystemAction.VIEW_PROP_REPORTS]: 'View reports specifically related to props and prop management.',
  [SystemAction.VIEW_COST_REPORTS]: 'View financial reports including costs, budgets, and spending analysis.',
  [SystemAction.VIEW_TASK_REPORTS]: 'View reports on task completion, productivity, and team performance.',
  [SystemAction.VIEW_TEAM_REPORTS]: 'View reports on team activity, member contributions, and collaboration metrics.',
  
  // Communication & Notifications
  [SystemAction.SEND_NOTIFICATIONS]: 'Send notifications to team members about updates, changes, or important information.',
  [SystemAction.MANAGE_ANNOUNCEMENTS]: 'Create and manage system-wide announcements for all users.',
  [SystemAction.VIEW_FEEDBACK]: 'View feedback and comments from team members.',
  [SystemAction.SEND_TEAM_MESSAGES]: 'Send messages to team members or teams for communication and coordination.',
  
  // Audit & Compliance
  [SystemAction.VIEW_AUDIT_LOGS]: 'View audit logs tracking all system changes and user actions for compliance and security.',
  [SystemAction.TRACK_CHANGES]: 'Track and view history of changes made to props, tasks, and other system entities.',
  [SystemAction.VIEW_PERMISSION_HISTORY]: 'View historical changes to user permissions and role assignments.'
};