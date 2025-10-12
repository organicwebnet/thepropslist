/**
 * Unit tests for UserPermissionService
 */

import { UserPermissionService, type UserProfile } from '../UserPermissionService';

describe('UserPermissionService', () => {
  describe('isAdmin', () => {
    it('should return true for god users', () => {
      const userProfile: UserProfile = { role: 'god' };
      expect(UserPermissionService.isAdmin(userProfile)).toBe(true);
    });

    it('should return true for admin users', () => {
      const userProfile: UserProfile = { role: 'admin' };
      expect(UserPermissionService.isAdmin(userProfile)).toBe(true);
    });

    it('should return true for props_supervisor users', () => {
      const userProfile: UserProfile = { role: 'props_supervisor' };
      expect(UserPermissionService.isAdmin(userProfile)).toBe(true);
    });

    it('should return true for editor users', () => {
      const userProfile: UserProfile = { role: 'editor' };
      expect(UserPermissionService.isAdmin(userProfile)).toBe(true);
    });

    it('should return false for viewer users', () => {
      const userProfile: UserProfile = { role: 'viewer' };
      expect(UserPermissionService.isAdmin(userProfile)).toBe(false);
    });

    it('should return false for null user profile', () => {
      expect(UserPermissionService.isAdmin(null)).toBe(false);
    });

    it('should return false for undefined user profile', () => {
      expect(UserPermissionService.isAdmin(undefined)).toBe(false);
    });
  });

  describe('isExemptFromLimits', () => {
    it('should return true for god users', () => {
      const userProfile: UserProfile = { role: 'god' };
      expect(UserPermissionService.isExemptFromLimits(userProfile)).toBe(true);
    });

    it('should return true for admin users', () => {
      const userProfile: UserProfile = { role: 'admin' };
      expect(UserPermissionService.isExemptFromLimits(userProfile)).toBe(true);
    });

    it('should return true for props_supervisor users', () => {
      const userProfile: UserProfile = { role: 'props_supervisor' };
      expect(UserPermissionService.isExemptFromLimits(userProfile)).toBe(true);
    });

    it('should return false for editor users', () => {
      const userProfile: UserProfile = { role: 'editor' };
      expect(UserPermissionService.isExemptFromLimits(userProfile)).toBe(false);
    });

    it('should return false for viewer users', () => {
      const userProfile: UserProfile = { role: 'viewer' };
      expect(UserPermissionService.isExemptFromLimits(userProfile)).toBe(false);
    });
  });

  describe('canInviteTeamMembers', () => {
    it('should return true for admin roles', () => {
      const adminRoles = ['god', 'admin', 'props_supervisor', 'editor'];
      
      adminRoles.forEach(role => {
        const userProfile: UserProfile = { role };
        expect(UserPermissionService.canInviteTeamMembers(userProfile)).toBe(true);
      });
    });

    it('should return false for non-admin roles', () => {
      const userProfile: UserProfile = { role: 'viewer' };
      expect(UserPermissionService.canInviteTeamMembers(userProfile)).toBe(false);
    });
  });

  describe('shouldShowSubscriptionNotifications', () => {
    it('should return false for unlimited roles', () => {
      const unlimitedRoles = ['god', 'admin', 'props_supervisor'];
      
      unlimitedRoles.forEach(role => {
        const userProfile: UserProfile = { role };
        expect(UserPermissionService.shouldShowSubscriptionNotifications(userProfile)).toBe(false);
      });
    });

    it('should return true for limited roles', () => {
      const limitedRoles = ['editor', 'viewer'];
      
      limitedRoles.forEach(role => {
        const userProfile: UserProfile = { role };
        expect(UserPermissionService.shouldShowSubscriptionNotifications(userProfile)).toBe(true);
      });
    });
  });

  describe('getSubscriptionExemptionStatus', () => {
    it('should return correct status for god user', () => {
      const userProfile: UserProfile = { role: 'god' };
      const status = UserPermissionService.getSubscriptionExemptionStatus(userProfile);
      
      expect(status.isExempt).toBe(true);
      expect(status.shouldShowNotifications).toBe(false);
      expect(status.shouldShowLimits).toBe(false);
    });

    it('should return correct status for editor user', () => {
      const userProfile: UserProfile = { role: 'editor' };
      const status = UserPermissionService.getSubscriptionExemptionStatus(userProfile);
      
      expect(status.isExempt).toBe(false);
      expect(status.shouldShowNotifications).toBe(true);
      expect(status.shouldShowLimits).toBe(true);
    });
  });

  describe('canPerformAction', () => {
    it('should allow god users to invite team members', () => {
      const userProfile: UserProfile = { role: 'god' };
      const result = UserPermissionService.canPerformAction('invite_team_members', userProfile);
      
      expect(result.hasPermission).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should deny viewer users from inviting team members', () => {
      const userProfile: UserProfile = { role: 'viewer' };
      const result = UserPermissionService.canPerformAction('invite_team_members', userProfile);
      
      expect(result.hasPermission).toBe(false);
      expect(result.reason).toBe('You need administrative privileges to invite team members');
    });

    it('should allow god users to bypass subscription limits', () => {
      const userProfile: UserProfile = { role: 'god' };
      const result = UserPermissionService.canPerformAction('bypass_subscription_limits', userProfile);
      
      expect(result.hasPermission).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should deny editor users from bypassing subscription limits', () => {
      const userProfile: UserProfile = { role: 'editor' };
      const result = UserPermissionService.canPerformAction('bypass_subscription_limits', userProfile);
      
      expect(result.hasPermission).toBe(false);
      expect(result.reason).toBe('You need unlimited role to bypass subscription limits');
    });
  });

  describe('validateUserProfile', () => {
    it('should return true for valid user profile', () => {
      const userProfile: UserProfile = { role: 'god', uid: '123' };
      expect(UserPermissionService.validateUserProfile(userProfile)).toBe(true);
    });

    it('should return false for null user profile', () => {
      expect(UserPermissionService.validateUserProfile(null)).toBe(false);
    });

    it('should return false for user profile without role', () => {
      const userProfile: UserProfile = { uid: '123' };
      expect(UserPermissionService.validateUserProfile(userProfile)).toBe(false);
    });
  });

  describe('getUserPermissionSummary', () => {
    it('should return correct summary for god user', () => {
      const userProfile: UserProfile = { role: 'god' };
      const summary = UserPermissionService.getUserPermissionSummary(userProfile);
      
      expect(summary.isValid).toBe(true);
      expect(summary.isAdmin).toBe(true);
      expect(summary.isExemptFromLimits).toBe(true);
      expect(summary.canInviteTeamMembers).toBe(true);
      expect(summary.shouldShowSubscriptionNotifications).toBe(false);
      expect(summary.shouldShowLimits).toBe(false);
    });

    it('should return correct summary for viewer user', () => {
      const userProfile: UserProfile = { role: 'viewer' };
      const summary = UserPermissionService.getUserPermissionSummary(userProfile);
      
      expect(summary.isValid).toBe(true);
      expect(summary.isAdmin).toBe(false);
      expect(summary.isExemptFromLimits).toBe(false);
      expect(summary.canInviteTeamMembers).toBe(false);
      expect(summary.shouldShowSubscriptionNotifications).toBe(true);
      expect(summary.shouldShowLimits).toBe(true);
    });

    it('should return invalid summary for null user profile', () => {
      const summary = UserPermissionService.getUserPermissionSummary(null);
      
      expect(summary.isValid).toBe(false);
      expect(summary.isAdmin).toBe(false);
      expect(summary.isExemptFromLimits).toBe(false);
      expect(summary.canInviteTeamMembers).toBe(false);
      expect(summary.shouldShowSubscriptionNotifications).toBe(true);
      expect(summary.shouldShowLimits).toBe(true);
    });
  });
});
