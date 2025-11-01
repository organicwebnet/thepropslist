/**
 * Comprehensive Tests for Fine-Grained Permission System
 * 
 * Tests cover:
 * - Job role definitions and properties
 * - Permission validation and edge cases
 * - Role hierarchy and conflicts
 * - Permission matrix generation
 * - Custom role creation and validation
 * - Integration with system roles
 */

import {
  JOB_ROLES,
  PERMISSION_CATEGORIES,
  SystemAction,
  JobRole,
  PermissionCategory,
  getJobRole,
  getJobRolesByCategory,
  getJobRolesByHierarchy,
  hasJobRolePermission,
  getJobRolePermissions,
  getJobRoleDisplayInfo,
  createCustomJobRole,
  updateJobRolePermissions,
  getPermissionMatrix,
  getPermissionsByCategory,
  validateRolePermissions,
  compareRoles
} from '../../core/permissions/jobRoles';

describe('Job Roles System', () => {
  describe('Basic Job Role Structure', () => {
    test('should have all required job roles', () => {
      const expectedRoles = [
        'props-supervisor', 'art-director', 'stage-manager',
        'designer', 'assistant-designer',
        'senior-propmaker', 'propmaker', 'props-carpenter', 'show-carpenter', 'painter',
        'buyer', 'set-dresser', 'assistant-stage-manager',
        'crew'
      ];

      expectedRoles.forEach(roleId => {
        const role = getJobRole(roleId);
        expect(role).toBeDefined();
        expect(role?.id).toBe(roleId);
      });
    });

    test('should have valid role properties', () => {
      JOB_ROLES.forEach(role => {
        // Required properties
        expect(role.id).toBeDefined();
        expect(role.name).toBeDefined();
        expect(role.displayName).toBeDefined();
        expect(role.description).toBeDefined();
        expect(role.color).toBeDefined();
        expect(role.category).toBeDefined();
        expect(role.hierarchy).toBeDefined();
        expect(role.permissions).toBeDefined();
        expect(role.isCustomizable).toBeDefined();
        expect(role.isSystemRole).toBeDefined();
        expect(role.version).toBeDefined();

        // Type validation
        expect(typeof role.id).toBe('string');
        expect(typeof role.name).toBe('string');
        expect(typeof role.displayName).toBe('string');
        expect(typeof role.description).toBe('string');
        expect(typeof role.color).toBe('string');
        expect(['management', 'creative', 'technical', 'support', 'crew']).toContain(role.category);
        expect(typeof role.hierarchy).toBe('number');
        expect(Array.isArray(role.permissions)).toBe(true);
        expect(typeof role.isCustomizable).toBe('boolean');
        expect(typeof role.isSystemRole).toBe('boolean');
        expect(typeof role.version).toBe('number');
      });
    });

    test('should have unique role IDs', () => {
      const roleIds = JOB_ROLES.map(role => role.id);
      const uniqueIds = new Set(roleIds);
      expect(uniqueIds.size).toBe(roleIds.length);
    });

    test('should have valid hierarchy values', () => {
      JOB_ROLES.forEach(role => {
        expect(role.hierarchy).toBeGreaterThan(0);
        expect(role.hierarchy).toBeLessThanOrEqual(100);
      });
    });

    test('should have valid permission arrays', () => {
      JOB_ROLES.forEach(role => {
        expect(role.permissions.length).toBeGreaterThan(0);
        role.permissions.forEach(permission => {
          expect(Object.values(SystemAction)).toContain(permission);
        });
      });
    });
  });

  describe('Permission Categories', () => {
    test('should have all required permission categories', () => {
      const expectedCategories = [
        'user-management', 'show-management', 'props-management',
        'shopping-procurement', 'task-management', 'system-admin'
      ];

      expectedCategories.forEach(categoryId => {
        const category = PERMISSION_CATEGORIES.find(c => c.id === categoryId);
        expect(category).toBeDefined();
        expect(category?.id).toBe(categoryId);
      });
    });

    test('should have valid category properties', () => {
      PERMISSION_CATEGORIES.forEach(category => {
        expect(category.id).toBeDefined();
        expect(category.name).toBeDefined();
        expect(category.description).toBeDefined();
        expect(category.icon).toBeDefined();
        expect(category.actions).toBeDefined();

        expect(typeof category.id).toBe('string');
        expect(typeof category.name).toBe('string');
        expect(typeof category.description).toBe('string');
        expect(typeof category.icon).toBe('string');
        expect(Array.isArray(category.actions)).toBe(true);
        expect(category.actions.length).toBeGreaterThan(0);
      });
    });

    test('should have unique category IDs', () => {
      const categoryIds = PERMISSION_CATEGORIES.map(cat => cat.id);
      const uniqueIds = new Set(categoryIds);
      expect(uniqueIds.size).toBe(categoryIds.length);
    });

    test('should have valid actions in categories', () => {
      PERMISSION_CATEGORIES.forEach(category => {
        category.actions.forEach(action => {
          expect(Object.values(SystemAction)).toContain(action);
        });
      });
    });
  });

  describe('Role Hierarchy and Categories', () => {
    test('should have proper hierarchy ordering', () => {
      const rolesByHierarchy = getJobRolesByHierarchy();
      
      // Check that roles are sorted by hierarchy (highest first)
      for (let i = 0; i < rolesByHierarchy.length - 1; i++) {
        expect(rolesByHierarchy[i].hierarchy).toBeGreaterThanOrEqual(
          rolesByHierarchy[i + 1].hierarchy
        );
      }
    });

    test('should have roles in each category', () => {
      const categories = ['management', 'creative', 'technical', 'support', 'crew'];
      
      categories.forEach(category => {
        const roles = getJobRolesByCategory(category as JobRole['category']);
        expect(roles.length).toBeGreaterThan(0);
        
        roles.forEach(role => {
          expect(role.category).toBe(category);
        });
      });
    });

    test('should have appropriate hierarchy for categories', () => {
      const managementRoles = getJobRolesByCategory('management');
      const creativeRoles = getJobRolesByCategory('creative');
      const technicalRoles = getJobRolesByCategory('technical');
      const supportRoles = getJobRolesByCategory('support');
      const crewRoles = getJobRolesByCategory('crew');

      // Management should generally have higher hierarchy
      const maxManagement = Math.max(...managementRoles.map(r => r.hierarchy));
      const maxCreative = Math.max(...creativeRoles.map(r => r.hierarchy));
      const maxTechnical = Math.max(...technicalRoles.map(r => r.hierarchy));
      const maxSupport = Math.max(...supportRoles.map(r => r.hierarchy));
      const maxCrew = Math.max(...crewRoles.map(r => r.hierarchy));

      expect(maxManagement).toBeGreaterThan(maxCrew);
      expect(maxManagement).toBeGreaterThanOrEqual(maxCreative);
      expect(maxManagement).toBeGreaterThanOrEqual(maxTechnical);
    });
  });

  describe('Permission Validation', () => {
    test('should validate role permissions correctly', () => {
      // Test valid permissions
      const validPermissions = [
        SystemAction.VIEW_SHOWS,
        SystemAction.CREATE_PROPS,
        SystemAction.EDIT_PROP_DESIGN
      ];
      
      const validation = validateRolePermissions(validPermissions);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect permission conflicts', () => {
      // Test conflicting permissions
      const conflictingPermissions = [
        SystemAction.DELETE_PROPS,
        // Missing VIEW_ALL_PROPS which should be required for DELETE_PROPS
      ];
      
      const validation = validateRolePermissions(conflictingPermissions);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.includes('Delete props permission without view all props'))).toBe(true);
    });

    test('should detect dangerous permission combinations', () => {
      const dangerousPermissions = [
        SystemAction.MANAGE_ALL_USERS,
        SystemAction.ASSIGN_SYSTEM_ROLES
      ];
      
      const validation = validateRolePermissions(dangerousPermissions);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.includes('Full user management permissions detected'))).toBe(true);
    });

    test('should handle empty permissions array', () => {
      const validation = validateRolePermissions([]);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should handle invalid permissions', () => {
      const invalidPermissions = [
        'INVALID_PERMISSION' as SystemAction,
        SystemAction.VIEW_SHOWS
      ];
      
      // This should not crash the system
      const validation = validateRolePermissions(invalidPermissions);
      expect(validation).toBeDefined();
    });
  });

  describe('Permission Matrix', () => {
    test('should generate complete permission matrix', () => {
      const matrix = getPermissionMatrix();
      
      // Should have entries for all roles
      JOB_ROLES.forEach(role => {
        expect(matrix[role.id]).toBeDefined();
      });

      // Should have entries for all permissions
      Object.values(SystemAction).forEach(action => {
        JOB_ROLES.forEach(role => {
          expect(typeof matrix[role.id][action]).toBe('boolean');
        });
      });
    });

    test('should have correct permission values in matrix', () => {
      const matrix = getPermissionMatrix();
      
      JOB_ROLES.forEach(role => {
        role.permissions.forEach(permission => {
          expect(matrix[role.id][permission]).toBe(true);
        });
      });
    });

    test('should have false for non-permissions in matrix', () => {
      const matrix = getPermissionMatrix();
      
      JOB_ROLES.forEach(role => {
        Object.values(SystemAction).forEach(action => {
          if (!role.permissions.includes(action)) {
            expect(matrix[role.id][action]).toBe(false);
          }
        });
      });
    });
  });

  describe('Role Comparison', () => {
    test('should compare roles correctly', () => {
      const propsSupervisor = getJobRole('props-supervisor');
      const crew = getJobRole('crew');
      
      expect(propsSupervisor).toBeDefined();
      expect(crew).toBeDefined();
      
      const comparison = compareRoles('props-supervisor', 'crew');
      
      expect(comparison.role1).toBeDefined();
      expect(comparison.role2).toBeDefined();
      expect(comparison.commonPermissions).toBeDefined();
      expect(comparison.role1Only).toBeDefined();
      expect(comparison.role2Only).toBeDefined();
      
      // Props Supervisor should have more permissions than Crew
      expect(comparison.role1Only.length).toBeGreaterThan(comparison.role2Only.length);
    });

    test('should handle non-existent roles in comparison', () => {
      const comparison = compareRoles('non-existent-role', 'crew');
      
      expect(comparison.role1).toBeUndefined();
      expect(comparison.role2).toBeDefined();
      expect(comparison.commonPermissions).toHaveLength(0);
      expect(comparison.role1Only).toHaveLength(0);
      expect(comparison.role2Only).toHaveLength(0);
    });

    test('should find common permissions between roles', () => {
      const comparison = compareRoles('props-supervisor', 'art-director');
      
      // Both should have some common permissions
      expect(comparison.commonPermissions.length).toBeGreaterThan(0);
      
      // Verify common permissions are actually in both roles
      comparison.commonPermissions.forEach(permission => {
        expect(comparison.role1?.permissions).toContain(permission);
        expect(comparison.role2?.permissions).toContain(permission);
      });
    });
  });

  describe('Custom Role Creation', () => {
    test('should create custom role with valid properties', () => {
      const customRole = createCustomJobRole(
        'test-role',
        'Test Role',
        'A test role for validation',
        'technical',
        [SystemAction.VIEW_SHOWS, SystemAction.CREATE_PROPS],
        'test-user-id'
      );

      expect(customRole.id).toBe('custom-test-role');
      expect(customRole.name).toBe('test-role');
      expect(customRole.displayName).toBe('Test Role');
      expect(customRole.description).toBe('A test role for validation');
      expect(customRole.category).toBe('technical');
      expect(customRole.permissions).toEqual([SystemAction.VIEW_SHOWS, SystemAction.CREATE_PROPS]);
      expect(customRole.isCustomizable).toBe(true);
      expect(customRole.isSystemRole).toBe(false);
      expect(customRole.createdBy).toBe('test-user-id');
      expect(customRole.version).toBe(1);
      expect(customRole.lastModified).toBeDefined();
    });

    test('should generate unique IDs for custom roles', () => {
      const role1 = createCustomJobRole('Test Role', 'Test Role', 'Test', 'technical', [], 'user1');
      const role2 = createCustomJobRole('Test Role', 'Test Role', 'Test', 'technical', [], 'user2');
      
      expect(role1.id).not.toBe(role2.id);
    });

    test('should handle special characters in role names', () => {
      const customRole = createCustomJobRole(
        'Special & Role!',
        'Special & Role!',
        'Test role with special characters',
        'creative',
        [],
        'test-user'
      );

      expect(customRole.id).toBe('custom-special---role-');
      expect(customRole.name).toBe('Special & Role!');
    });
  });

  describe('Role Permission Updates', () => {
    test('should update role permissions for customizable roles', () => {
      const propsSupervisor = getJobRole('props-supervisor');
      expect(propsSupervisor?.isCustomizable).toBe(true);

      const newPermissions = [SystemAction.VIEW_SHOWS, SystemAction.CREATE_PROPS];
      const updatedRole = updateJobRolePermissions('props-supervisor', newPermissions, 'test-user');

      expect(updatedRole).toBeDefined();
      expect(updatedRole?.permissions).toEqual(newPermissions);
      expect(updatedRole?.version).toBe((propsSupervisor?.version || 0) + 1);
      expect(updatedRole?.lastModified).toBeDefined();
    });

    test('should not update non-customizable roles', () => {
      // Assuming we have a non-customizable role
      const nonCustomizableRole = JOB_ROLES.find(role => !role.isCustomizable);
      if (nonCustomizableRole) {
        const updatedRole = updateJobRolePermissions(
          nonCustomizableRole.id,
          [SystemAction.VIEW_SHOWS],
          'test-user'
        );
        expect(updatedRole).toBeNull();
      }
    });

    test('should not update non-existent roles', () => {
      const updatedRole = updateJobRolePermissions(
        'non-existent-role',
        [SystemAction.VIEW_SHOWS],
        'test-user'
      );
      expect(updatedRole).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle undefined role IDs gracefully', () => {
      expect(getJobRole('undefined-role')).toBeUndefined();
      expect(getJobRole('')).toBeUndefined();
      expect(getJobRole(null as any)).toBeUndefined();
    });

    test('should handle empty permission arrays', () => {
      const role = getJobRole('crew');
      expect(role?.permissions).toBeDefined();
      expect(Array.isArray(role?.permissions)).toBe(true);
    });

    test('should handle permission checks for non-existent roles', () => {
      expect(hasJobRolePermission('non-existent-role', SystemAction.VIEW_SHOWS)).toBe(false);
      expect(getJobRolePermissions('non-existent-role')).toEqual([]);
    });

    test('should handle display info for non-existent roles', () => {
      const displayInfo = getJobRoleDisplayInfo('non-existent-role');
      expect(displayInfo).toBeNull();
    });

    test('should handle empty categories', () => {
      const emptyCategoryRoles = getJobRolesByCategory('management' as JobRole['category']);
      expect(Array.isArray(emptyCategoryRoles)).toBe(true);
    });

    test('should handle permission matrix with no roles', () => {
      // This shouldn't happen in practice, but test the edge case
      const matrix = getPermissionMatrix();
      expect(typeof matrix).toBe('object');
    });
  });

  describe('Integration Tests', () => {
    test('should have consistent permission counts', () => {
      JOB_ROLES.forEach(role => {
        const displayInfo = getJobRoleDisplayInfo(role.id);
        expect(displayInfo?.permissionCount).toBe(role.permissions.length);
      });
    });

    test('should have valid permission categories coverage', () => {
      const allPermissions = new Set<SystemAction>();
      JOB_ROLES.forEach(role => {
        role.permissions.forEach(permission => allPermissions.add(permission));
      });

      const categoryPermissions = new Set<SystemAction>();
      PERMISSION_CATEGORIES.forEach(category => {
        category.actions.forEach(action => categoryPermissions.add(action));
      });

      // All role permissions should be covered by categories
      allPermissions.forEach(permission => {
        expect(categoryPermissions.has(permission)).toBe(true);
      });
    });

    test('should have proper role hierarchy distribution', () => {
      const hierarchies = JOB_ROLES.map(role => role.hierarchy);
      const uniqueHierarchies = new Set(hierarchies);
      
      // Should have reasonable distribution of hierarchy levels
      expect(uniqueHierarchies.size).toBeGreaterThan(3);
      expect(Math.max(...hierarchies)).toBeLessThanOrEqual(100);
      expect(Math.min(...hierarchies)).toBeGreaterThan(0);
    });

    test('should have appropriate permission counts per role', () => {
      JOB_ROLES.forEach(role => {
        // Each role should have at least some permissions
        expect(role.permissions.length).toBeGreaterThan(0);
        
        // No role should have all permissions (that would be too powerful)
        expect(role.permissions.length).toBeLessThan(Object.values(SystemAction).length);
      });
    });
  });
});
