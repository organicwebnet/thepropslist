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
