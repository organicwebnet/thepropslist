import { UserRole } from '../shared/types/auth';
import { PropFieldCategory } from '../shared/types/dataViews';
import {
  getRoleDataView,
  isFieldVisibleForRole,
  getPriorityFieldsForRole,
  getVisibleCategoriesForRole,
  getQuickActionsForRole,
  PROP_FIELD_DEFINITIONS,
  ROLE_DATA_VIEWS,
} from '../shared/utils/roleBasedDataViews';

describe('Role-Based Data Views', () => {
  describe('getRoleDataView', () => {
    it('should return correct data view for Stage Manager', () => {
      const view = getRoleDataView(UserRole.STAGE_MANAGER);
      
      expect(view.role).toBe(UserRole.STAGE_MANAGER);
      expect(view.displayName).toBe('Stage Manager');
      expect(view.config.priorityFields).toContain('currentLocation');
      expect(view.config.priorityFields).toContain('act');
      expect(view.config.priorityFields).toContain('scene');
      expect(view.config.hiddenCategories).toContain(PropFieldCategory.FINANCIAL);
    });

    it('should return correct data view for Prop Maker', () => {
      const view = getRoleDataView(UserRole.PROP_MAKER);
      
      expect(view.role).toBe(UserRole.PROP_MAKER);
      expect(view.displayName).toBe('Prop Maker');
      expect(view.config.priorityFields).toContain('description');
      expect(view.config.priorityFields).toContain('materials');
      expect(view.config.hiddenCategories).toContain(PropFieldCategory.FINANCIAL);
      expect(view.config.hiddenCategories).toContain(PropFieldCategory.LOCATION);
    });

    it('should return correct data view for Art Director', () => {
      const view = getRoleDataView(UserRole.ART_DIRECTOR);
      
      expect(view.role).toBe(UserRole.ART_DIRECTOR);
      expect(view.displayName).toBe('Art Director');
      expect(view.config.priorityFields).toContain('description');
      expect(view.config.priorityFields).toContain('images');
      expect(view.config.priorityFields).toContain('price');
      expect(view.config.visibleCategories).toContain(PropFieldCategory.FINANCIAL);
    });

    it('should return correct data view for Props Supervisor', () => {
      const view = getRoleDataView(UserRole.PROPS_SUPERVISOR);
      
      expect(view.role).toBe(UserRole.PROPS_SUPERVISOR);
      expect(view.displayName).toBe('Props Supervisor');
      expect(view.config.visibleFields).toEqual(Object.keys(PROP_FIELD_DEFINITIONS));
      expect(view.config.hiddenFields).toEqual([]);
      expect(view.config.visibleCategories).toEqual(Object.values(PropFieldCategory));
      expect(view.config.hiddenCategories).toEqual([]);
    });

    it('should return correct data view for God User', () => {
      const view = getRoleDataView(UserRole.GOD);
      
      expect(view.role).toBe(UserRole.GOD);
      expect(view.displayName).toBe('God User');
      expect(view.config.visibleFields).toEqual(Object.keys(PROP_FIELD_DEFINITIONS));
      expect(view.config.hiddenFields).toEqual([]);
      expect(view.config.quickActions).toContain('manageSystem');
      expect(view.config.quickActions).toContain('customizeViews');
    });

    it('should return viewer role for unknown role', () => {
      const view = getRoleDataView('unknown' as UserRole);
      
      expect(view.role).toBe(UserRole.VIEWER);
      expect(view.displayName).toBe('Viewer');
    });
  });

  describe('isFieldVisibleForRole', () => {
    it('should show location fields for Stage Manager', () => {
      expect(isFieldVisibleForRole('location', UserRole.STAGE_MANAGER)).toBe(true);
      expect(isFieldVisibleForRole('currentLocation', UserRole.STAGE_MANAGER)).toBe(true);
      expect(isFieldVisibleForRole('act', UserRole.STAGE_MANAGER)).toBe(true);
      expect(isFieldVisibleForRole('scene', UserRole.STAGE_MANAGER)).toBe(true);
    });

    it('should hide financial fields for Stage Manager', () => {
      expect(isFieldVisibleForRole('price', UserRole.STAGE_MANAGER)).toBe(false);
      expect(isFieldVisibleForRole('replacementCost', UserRole.STAGE_MANAGER)).toBe(false);
      expect(isFieldVisibleForRole('repairEstimate', UserRole.STAGE_MANAGER)).toBe(false);
    });

    it('should show financial fields for Art Director', () => {
      expect(isFieldVisibleForRole('price', UserRole.ART_DIRECTOR)).toBe(true);
      expect(isFieldVisibleForRole('replacementCost', UserRole.ART_DIRECTOR)).toBe(true);
    });

    it('should hide location fields for Prop Maker', () => {
      expect(isFieldVisibleForRole('act', UserRole.PROP_MAKER)).toBe(false);
      expect(isFieldVisibleForRole('scene', UserRole.PROP_MAKER)).toBe(false);
    });

    it('should show all fields for Props Supervisor', () => {
      expect(isFieldVisibleForRole('price', UserRole.PROPS_SUPERVISOR)).toBe(true);
      expect(isFieldVisibleForRole('location', UserRole.PROPS_SUPERVISOR)).toBe(true);
      expect(isFieldVisibleForRole('maintenanceNotes', UserRole.PROPS_SUPERVISOR)).toBe(true);
    });

    it('should return false for unknown field', () => {
      expect(isFieldVisibleForRole('unknownField', UserRole.STAGE_MANAGER)).toBe(false);
    });
  });

  describe('getPriorityFieldsForRole', () => {
    it('should return correct priority fields for Stage Manager', () => {
      const priorityFields = getPriorityFieldsForRole(UserRole.STAGE_MANAGER);
      
      expect(priorityFields).toContain('currentLocation');
      expect(priorityFields).toContain('act');
      expect(priorityFields).toContain('scene');
      expect(priorityFields).toContain('usageInstructions');
      expect(priorityFields).toContain('maintenanceNotes');
    });

    it('should return correct priority fields for Prop Maker', () => {
      const priorityFields = getPriorityFieldsForRole(UserRole.PROP_MAKER);
      
      expect(priorityFields).toContain('description');
      expect(priorityFields).toContain('materials');
      expect(priorityFields).toContain('specialRequirements');
      expect(priorityFields).toContain('status');
      expect(priorityFields).toContain('notes');
    });

    it('should return correct priority fields for Art Director', () => {
      const priorityFields = getPriorityFieldsForRole(UserRole.ART_DIRECTOR);
      
      expect(priorityFields).toContain('description');
      expect(priorityFields).toContain('images');
      expect(priorityFields).toContain('price');
      expect(priorityFields).toContain('source');
      expect(priorityFields).toContain('specialRequirements');
    });

    it('should return correct priority fields for Props Supervisor', () => {
      const priorityFields = getPriorityFieldsForRole(UserRole.PROPS_SUPERVISOR);
      
      expect(priorityFields).toContain('status');
      expect(priorityFields).toContain('location');
      expect(priorityFields).toContain('condition');
      expect(priorityFields).toContain('maintenanceNotes');
      expect(priorityFields).toContain('price');
    });
  });

  describe('getVisibleCategoriesForRole', () => {
    it('should return correct visible categories for Stage Manager', () => {
      const categories = getVisibleCategoriesForRole(UserRole.STAGE_MANAGER);
      
      expect(categories).toContain(PropFieldCategory.LOCATION);
      expect(categories).toContain(PropFieldCategory.MAINTENANCE);
      expect(categories).toContain(PropFieldCategory.CREATIVE);
      expect(categories).toContain(PropFieldCategory.SAFETY);
      expect(categories).not.toContain(PropFieldCategory.FINANCIAL);
    });

    it('should return correct visible categories for Prop Maker', () => {
      const categories = getVisibleCategoriesForRole(UserRole.PROP_MAKER);
      
      expect(categories).toContain(PropFieldCategory.CREATIVE);
      expect(categories).toContain(PropFieldCategory.TECHNICAL);
      expect(categories).toContain(PropFieldCategory.LOGISTICS);
      expect(categories).not.toContain(PropFieldCategory.FINANCIAL);
      expect(categories).not.toContain(PropFieldCategory.LOCATION);
    });

    it('should return correct visible categories for Art Director', () => {
      const categories = getVisibleCategoriesForRole(UserRole.ART_DIRECTOR);
      
      expect(categories).toContain(PropFieldCategory.CREATIVE);
      expect(categories).toContain(PropFieldCategory.FINANCIAL);
      expect(categories).toContain(PropFieldCategory.LOGISTICS);
      expect(categories).not.toContain(PropFieldCategory.LOCATION);
      expect(categories).not.toContain(PropFieldCategory.MAINTENANCE);
    });

    it('should return all categories for Props Supervisor', () => {
      const categories = getVisibleCategoriesForRole(UserRole.PROPS_SUPERVISOR);
      
      expect(categories).toEqual(Object.values(PropFieldCategory));
    });
  });

  describe('getQuickActionsForRole', () => {
    it('should return correct quick actions for Stage Manager', () => {
      const actions = getQuickActionsForRole(UserRole.STAGE_MANAGER);
      
      expect(actions).toContain('updateLocation');
      expect(actions).toContain('addMaintenanceNote');
      expect(actions).toContain('reportIssue');
      expect(actions).toContain('markReady');
    });

    it('should return correct quick actions for Prop Maker', () => {
      const actions = getQuickActionsForRole(UserRole.PROP_MAKER);
      
      expect(actions).toContain('updateStatus');
      expect(actions).toContain('addNote');
      expect(actions).toContain('uploadImage');
      expect(actions).toContain('requestMaterials');
    });

    it('should return correct quick actions for Art Director', () => {
      const actions = getQuickActionsForRole(UserRole.ART_DIRECTOR);
      
      expect(actions).toContain('updateDescription');
      expect(actions).toContain('addImage');
      expect(actions).toContain('updatePrice');
      expect(actions).toContain('findSource');
    });

    it('should return correct quick actions for Props Supervisor', () => {
      const actions = getQuickActionsForRole(UserRole.PROPS_SUPERVISOR);
      
      expect(actions).toContain('editProp');
      expect(actions).toContain('deleteProp');
      expect(actions).toContain('duplicateProp');
      expect(actions).toContain('exportData');
      expect(actions).toContain('manageTeam');
    });

    it('should return correct quick actions for God User', () => {
      const actions = getQuickActionsForRole(UserRole.GOD);
      
      expect(actions).toContain('editProp');
      expect(actions).toContain('deleteProp');
      expect(actions).toContain('duplicateProp');
      expect(actions).toContain('exportData');
      expect(actions).toContain('manageSystem');
      expect(actions).toContain('customizeViews');
    });

    it('should return limited actions for Viewer', () => {
      const actions = getQuickActionsForRole(UserRole.VIEWER);
      
      expect(actions).toEqual(['viewDetails']);
    });
  });

  describe('Field Definitions', () => {
    it('should have correct field definitions', () => {
      expect(PROP_FIELD_DEFINITIONS.location).toEqual({
        name: 'location',
        category: PropFieldCategory.LOCATION,
        label: 'Location',
        priority: 'high',
      });

      expect(PROP_FIELD_DEFINITIONS.price).toEqual({
        name: 'price',
        category: PropFieldCategory.FINANCIAL,
        label: 'Price',
        priority: 'medium',
      });

      expect(PROP_FIELD_DEFINITIONS.maintenanceNotes).toEqual({
        name: 'maintenanceNotes',
        category: PropFieldCategory.MAINTENANCE,
        label: 'Maintenance Notes',
        priority: 'high',
      });
    });

    it('should have all required field categories', () => {
      const categories = Object.values(PROP_FIELD_DEFINITIONS).map(field => field.category);
      const uniqueCategories = [...new Set(categories)];
      
      expect(uniqueCategories).toContain(PropFieldCategory.LOCATION);
      expect(uniqueCategories).toContain(PropFieldCategory.FINANCIAL);
      expect(uniqueCategories).toContain(PropFieldCategory.MAINTENANCE);
      expect(uniqueCategories).toContain(PropFieldCategory.CREATIVE);
      expect(uniqueCategories).toContain(PropFieldCategory.LOGISTICS);
      expect(uniqueCategories).toContain(PropFieldCategory.SAFETY);
      expect(uniqueCategories).toContain(PropFieldCategory.TECHNICAL);
      expect(uniqueCategories).toContain(PropFieldCategory.ADMINISTRATIVE);
    });
  });

  describe('Role Data Views Configuration', () => {
    it('should have data views for all roles', () => {
      const roles = Object.values(UserRole);
      const configuredRoles = Object.keys(ROLE_DATA_VIEWS);
      
      roles.forEach(role => {
        expect(configuredRoles).toContain(role);
      });
    });

    it('should have consistent configuration structure', () => {
      Object.values(ROLE_DATA_VIEWS).forEach(view => {
        expect(view).toHaveProperty('role');
        expect(view).toHaveProperty('displayName');
        expect(view).toHaveProperty('description');
        expect(view).toHaveProperty('config');
        expect(view).toHaveProperty('isDefault');
        
        expect(view.config).toHaveProperty('visibleFields');
        expect(view.config).toHaveProperty('hiddenFields');
        expect(view.config).toHaveProperty('priorityFields');
        expect(view.config).toHaveProperty('visibleCategories');
        expect(view.config).toHaveProperty('hiddenCategories');
        expect(view.config).toHaveProperty('cardLayout');
        expect(view.config).toHaveProperty('showImages');
        expect(view.config).toHaveProperty('showStatusIndicators');
        expect(view.config).toHaveProperty('quickActions');
      });
    });

    it('should have valid card layouts', () => {
      Object.values(ROLE_DATA_VIEWS).forEach(view => {
        expect(['compact', 'detailed', 'minimal']).toContain(view.config.cardLayout);
      });
    });

    it('should have boolean values for display options', () => {
      Object.values(ROLE_DATA_VIEWS).forEach(view => {
        expect(typeof view.config.showImages).toBe('boolean');
        expect(typeof view.config.showStatusIndicators).toBe('boolean');
      });
    });
  });
});
