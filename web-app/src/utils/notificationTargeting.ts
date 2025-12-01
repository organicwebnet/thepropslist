import type { ShoppingItem } from '../shared/types/shopping';
import type { NotificationType } from '../shared/types/notification';

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  showId: string;
}

export interface NotificationTarget {
  userId: string;
  channels: ('push' | 'in_app' | 'email')[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

// Role-based notification targeting matrix
export const SHOPPING_NOTIFICATION_MATRIX: Record<NotificationType, {
  targetRoles: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: ('push' | 'in_app' | 'email')[];
  includeRequester?: boolean;
  includeAssigned?: boolean;
}> = {
  // Existing notification types
  task_assigned: {
    targetRoles: ['buyer', 'props_supervisor'],
    priority: 'medium',
    channels: ['in_app']
  },
  task_due_soon: {
    targetRoles: ['buyer', 'props_supervisor'],
    priority: 'high',
    channels: ['push', 'in_app']
  },
  task_due_today: {
    targetRoles: ['buyer', 'props_supervisor'],
    priority: 'urgent',
    channels: ['push', 'in_app', 'email']
  },
  prop_change_request: {
    targetRoles: ['props_supervisor', 'art_director'],
    priority: 'medium',
    channels: ['in_app']
  },
  comment: {
    targetRoles: ['buyer', 'props_supervisor', 'art_director'],
    priority: 'low',
    channels: ['in_app']
  },
  system: {
    targetRoles: ['buyer', 'props_supervisor', 'art_director'],
    priority: 'medium',
    channels: ['in_app']
  },

  // Shopping List Workflow Notifications
  shopping_item_requested: {
    targetRoles: ['props_supervisor', 'art_director'],
    priority: 'medium',
    channels: ['in_app', 'email'],
    includeRequester: false
  },
  
  shopping_item_assigned: {
    targetRoles: ['buyer'],
    priority: 'high',
    channels: ['push', 'in_app'],
    includeAssigned: true
  },
  
  shopping_item_approved: {
    targetRoles: ['buyer'],
    priority: 'high',
    channels: ['push', 'in_app'],
    includeRequester: true
  },
  
  shopping_item_rejected: {
    targetRoles: [],
    priority: 'medium',
    channels: ['in_app', 'email'],
    includeRequester: true
  },
  
  shopping_option_added: {
    targetRoles: ['props_supervisor', 'art_director'],
    priority: 'medium',
    channels: ['in_app']
  },
  
  shopping_option_selected: {
    targetRoles: ['buyer'],
    priority: 'high',
    channels: ['push', 'in_app'],
    includeAssigned: true
  },
  
  shopping_option_rejected: {
    targetRoles: ['buyer'],
    priority: 'medium',
    channels: ['in_app'],
    includeAssigned: true
  },
  
  shopping_item_purchased: {
    targetRoles: ['props_supervisor', 'art_director'],
    priority: 'high',
    channels: ['push', 'in_app', 'email'],
    includeRequester: true
  },
  
  shopping_item_delivered: {
    targetRoles: ['props_supervisor', 'art_director'],
    priority: 'medium',
    channels: ['in_app', 'email'],
    includeRequester: true
  },
  
  shopping_budget_exceeded: {
    targetRoles: ['props_supervisor', 'art_director'],
    priority: 'urgent',
    channels: ['push', 'in_app', 'email']
  },
  
  shopping_reminder: {
    targetRoles: ['buyer'],
    priority: 'medium',
    channels: ['push', 'in_app'],
    includeAssigned: true
  },
  
  shopping_approval_needed: {
    targetRoles: ['props_supervisor', 'art_director'],
    priority: 'high',
    channels: ['push', 'in_app']
  },
  
  shopping_material_request: {
    targetRoles: ['props_supervisor', 'art_director'],
    priority: 'medium',
    channels: ['in_app', 'email']
  },
  
  shopping_material_approved: {
    targetRoles: ['buyer'],
    priority: 'high',
    channels: ['push', 'in_app'],
    includeAssigned: true
  },
  
  shopping_task_linked: {
    targetRoles: ['buyer', 'props_supervisor'],
    priority: 'low',
    channels: ['in_app']
  },

  // Maintenance and Repair Workflow Notifications
  prop_needs_repair: {
    targetRoles: ['props_supervisor'],
    priority: 'high',
    channels: ['push', 'in_app', 'email']
  },
  prop_needs_maintenance: {
    targetRoles: ['props_supervisor'],
    priority: 'medium',
    channels: ['push', 'in_app']
  },
  repair_assigned_to_maker: {
    targetRoles: ['propmaker', 'senior-propmaker'],
    priority: 'high',
    channels: ['push', 'in_app'],
    includeAssigned: true
  },
  maintenance_assigned_to_maker: {
    targetRoles: ['propmaker', 'senior-propmaker'],
    priority: 'medium',
    channels: ['push', 'in_app'],
    includeAssigned: true
  },

  // Subscription-related notifications
  subscription_expiring_soon: {
    targetRoles: [], // User-specific, not role-based
    priority: 'medium',
    channels: ['push', 'in_app', 'email']
  },
  subscription_expiring_today: {
    targetRoles: [],
    priority: 'high',
    channels: ['push', 'in_app', 'email']
  },
  subscription_expired: {
    targetRoles: [],
    priority: 'urgent',
    channels: ['push', 'in_app', 'email']
  },
  subscription_payment_failed: {
    targetRoles: [],
    priority: 'urgent',
    channels: ['push', 'in_app', 'email']
  },
  subscription_upgrade_available: {
    targetRoles: [],
    priority: 'low',
    channels: ['in_app']
  }
};

export class NotificationTargetingService {
  private teamMembers: TeamMember[] = [];
  private currentUser: { id: string; roles: string[] } | null = null;

  constructor(teamMembers: TeamMember[], currentUser: { id: string; roles: string[] }) {
    this.teamMembers = teamMembers;
    this.currentUser = currentUser;
  }

  /**
   * Get notification targets for a specific notification type and shopping item
   */
  getNotificationTargets(
    notificationType: NotificationType,
    item: ShoppingItem,
    additionalData?: { optionIndex?: number; assignedTo?: string }
  ): NotificationTarget[] {
    const matrix = SHOPPING_NOTIFICATION_MATRIX[notificationType];
    if (!matrix) {
      console.warn(`No notification matrix found for type: ${notificationType}`);
      return [];
    }

    const targets: NotificationTarget[] = [];

    // Add role-based targets
    for (const role of matrix.targetRoles) {
      const membersWithRole = this.teamMembers.filter(member =>
        member.roles.some(memberRole => memberRole.name === role) &&
        member.showId === item.showId
      );

      for (const member of membersWithRole) {
        targets.push({
          userId: member.id,
          channels: matrix.channels,
          priority: matrix.priority
        });
      }
    }

    // Add requester if specified
    if (matrix.includeRequester && item.requestedBy) {
      const requester = this.teamMembers.find(member => 
        member.id === item.requestedBy && member.showId === item.showId
      );
      if (requester) {
        targets.push({
          userId: requester.id,
          channels: matrix.channels,
          priority: matrix.priority
        });
      }
    }

    // Add assigned user if specified
    if (matrix.includeAssigned && (item.assignedTo || additionalData?.assignedTo)) {
      const assignedUserId = item.assignedTo || additionalData?.assignedTo;
      const assignedUser = this.teamMembers.find(member => 
        member.id === assignedUserId && member.showId === item.showId
      );
      if (assignedUser) {
        targets.push({
          userId: assignedUser.id,
          channels: matrix.channels,
          priority: matrix.priority
        });
      }
    }

    // Remove duplicates
    const uniqueTargets = targets.filter((target, index, self) =>
      index === self.findIndex(t => t.userId === target.userId)
    );

    return uniqueTargets;
  }

  /**
   * Get all team members with a specific role for a show
   */
  getTeamMembersByRole(role: string, showId: string): TeamMember[] {
    return this.teamMembers.filter(member =>
      member.roles.some(memberRole => memberRole.name === role) &&
      member.showId === showId
    );
  }

  /**
   * Check if current user has permission for a specific action
   */
  hasPermission(action: string): boolean {
    if (!this.currentUser) return false;
    
    return this.currentUser.roles.some(role => {
      const roleData = this.teamMembers
        .flatMap(member => member.roles)
        .find(r => r.name === role);
      return roleData?.permissions.includes(action) || false;
    });
  }

  /**
   * Get user's role in a specific show
   */
  getUserRoleInShow(userId: string, showId: string): UserRole[] {
    const member = this.teamMembers.find(m => m.id === userId && m.showId === showId);
    return member?.roles || [];
  }
}

// Utility functions for common notification scenarios
export const getSupervisorsForShow = (teamMembers: TeamMember[], showId: string): TeamMember[] => {
  return teamMembers.filter(member =>
    member.showId === showId &&
    member.roles.some(role => ['props_supervisor', 'art_director'].includes(role.name))
  );
};

export const getBuyersForShow = (teamMembers: TeamMember[], showId: string): TeamMember[] => {
  return teamMembers.filter(member =>
    member.showId === showId &&
    member.roles.some(role => role.name === 'buyer')
  );
};

export const getMakersForShow = (teamMembers: TeamMember[], showId: string): TeamMember[] => {
  return teamMembers.filter(member =>
    member.showId === showId &&
    member.roles.some(role => role.name === 'maker')
  );
};

// Default role definitions
export const DEFAULT_ROLES: UserRole[] = [
  {
    id: 'props_supervisor',
    name: 'props_supervisor',
    permissions: [
      'approve_shopping_requests',
      'reject_shopping_requests',
      'assign_shopping_items',
      'select_shopping_options',
      'view_all_shopping_items',
      'manage_budget'
    ]
  },
  {
    id: 'art_director',
    name: 'art_director',
    permissions: [
      'approve_shopping_requests',
      'reject_shopping_requests',
      'select_shopping_options',
      'view_all_shopping_items',
      'manage_budget'
    ]
  },
  {
    id: 'buyer',
    name: 'buyer',
    permissions: [
      'add_shopping_options',
      'confirm_purchases',
      'update_delivery_status',
      'view_assigned_items'
    ]
  },
  {
    id: 'maker',
    name: 'maker',
    permissions: [
      'request_materials',
      'view_material_requests',
      'link_materials_to_tasks'
    ]
  },
  {
    id: 'designer',
    name: 'designer',
    permissions: [
      'request_shopping_items',
      'view_requested_items',
      'add_reference_images'
    ]
  }
];
