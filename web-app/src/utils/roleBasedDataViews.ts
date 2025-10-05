import { UserRole } from '../../shared/types/auth';
import { PropFieldCategory, RoleDataView, PropFieldDefinition } from '../types/dataViews';

/**
 * Field definitions for all prop data fields
 */
export const PROP_FIELD_DEFINITIONS: Record<string, PropFieldDefinition> = {
  // Location fields
  location: { name: 'location', category: PropFieldCategory.LOCATION, label: 'Location', priority: 'high' },
  currentLocation: { name: 'currentLocation', category: PropFieldCategory.LOCATION, label: 'Current Location', priority: 'high' },
  act: { name: 'act', category: PropFieldCategory.LOCATION, label: 'Act', priority: 'high' },
  scene: { name: 'scene', category: PropFieldCategory.LOCATION, label: 'Scene', priority: 'high' },
  
  // Financial fields
  price: { name: 'price', category: PropFieldCategory.FINANCIAL, label: 'Price', priority: 'medium' },
  replacementCost: { name: 'replacementCost', category: PropFieldCategory.FINANCIAL, label: 'Replacement Cost', priority: 'low' },
  repairEstimate: { name: 'repairEstimate', category: PropFieldCategory.FINANCIAL, label: 'Repair Estimate', priority: 'low' },
  
  // Maintenance fields
  maintenanceNotes: { name: 'maintenanceNotes', category: PropFieldCategory.MAINTENANCE, label: 'Maintenance Notes', priority: 'high' },
  nextMaintenanceDue: { name: 'nextMaintenanceDue', category: PropFieldCategory.MAINTENANCE, label: 'Next Maintenance', priority: 'high' },
  condition: { name: 'condition', category: PropFieldCategory.MAINTENANCE, label: 'Condition', priority: 'high' },
  lastInspectionDate: { name: 'lastInspectionDate', category: PropFieldCategory.MAINTENANCE, label: 'Last Inspection', priority: 'medium' },
  
  // Creative fields
  description: { name: 'description', category: PropFieldCategory.CREATIVE, label: 'Description', priority: 'high' },
  usageInstructions: { name: 'usageInstructions', category: PropFieldCategory.CREATIVE, label: 'Usage Instructions', priority: 'high' },
  notes: { name: 'notes', category: PropFieldCategory.CREATIVE, label: 'Notes', priority: 'medium' },
  images: { name: 'images', category: PropFieldCategory.CREATIVE, label: 'Images', priority: 'medium' },
  
  // Logistics fields
  quantity: { name: 'quantity', category: PropFieldCategory.LOGISTICS, label: 'Quantity', priority: 'high' },
  dimensions: { name: 'dimensions', category: PropFieldCategory.LOGISTICS, label: 'Dimensions', priority: 'medium' },
  weight: { name: 'weight', category: PropFieldCategory.LOGISTICS, label: 'Weight', priority: 'medium' },
  source: { name: 'source', category: PropFieldCategory.LOGISTICS, label: 'Source', priority: 'medium' },
  
  // Safety fields
  safetyNotes: { name: 'safetyNotes', category: PropFieldCategory.SAFETY, label: 'Safety Notes', priority: 'high' },
  isHazardous: { name: 'isHazardous', category: PropFieldCategory.SAFETY, label: 'Hazardous', priority: 'high' },
  isBreakable: { name: 'isBreakable', category: PropFieldCategory.SAFETY, label: 'Breakable', priority: 'medium' },
  
  // Technical fields
  powerRequirements: { name: 'powerRequirements', category: PropFieldCategory.TECHNICAL, label: 'Power Requirements', priority: 'medium' },
  specialRequirements: { name: 'specialRequirements', category: PropFieldCategory.TECHNICAL, label: 'Special Requirements', priority: 'medium' },
  batteryType: { name: 'batteryType', category: PropFieldCategory.TECHNICAL, label: 'Battery Type', priority: 'low' },
  
  // Administrative fields
  status: { name: 'status', category: PropFieldCategory.ADMINISTRATIVE, label: 'Status', priority: 'high' },
  category: { name: 'category', category: PropFieldCategory.ADMINISTRATIVE, label: 'Category', priority: 'medium' },
  tags: { name: 'tags', category: PropFieldCategory.ADMINISTRATIVE, label: 'Tags', priority: 'low' },
  createdAt: { name: 'createdAt', category: PropFieldCategory.ADMINISTRATIVE, label: 'Created', priority: 'low' },
};

/**
 * Role-specific data view configurations
 */
export const ROLE_DATA_VIEWS: Record<UserRole, RoleDataView> = {
  [UserRole.STAGE_MANAGER]: {
    role: UserRole.STAGE_MANAGER,
    displayName: 'Stage Manager',
    description: 'Focus on prop location, usage, and maintenance for show operations',
    isDefault: true,
    config: {
      visibleFields: ['location', 'currentLocation', 'act', 'scene', 'usageInstructions', 'maintenanceNotes', 'condition', 'safetyNotes'],
      hiddenFields: ['price', 'replacementCost', 'repairEstimate', 'source', 'purchaseUrl'],
      priorityFields: ['currentLocation', 'act', 'scene', 'usageInstructions', 'maintenanceNotes'],
      visibleCategories: [PropFieldCategory.LOCATION, PropFieldCategory.MAINTENANCE, PropFieldCategory.CREATIVE, PropFieldCategory.SAFETY],
      hiddenCategories: [PropFieldCategory.FINANCIAL],
      cardLayout: 'detailed',
      showImages: true,
      showStatusIndicators: true,
      quickActions: ['updateLocation', 'addMaintenanceNote', 'reportIssue', 'markReady'],
    },
  },
  
  [UserRole.PROP_MAKER]: {
    role: UserRole.PROP_MAKER,
    displayName: 'Prop Maker',
    description: 'Focus on materials, construction details, and work progress',
    isDefault: true,
    config: {
      visibleFields: ['description', 'materials', 'dimensions', 'weight', 'specialRequirements', 'notes', 'images', 'status'],
      hiddenFields: ['price', 'replacementCost', 'act', 'scene', 'rentalDueDate'],
      priorityFields: ['description', 'materials', 'specialRequirements', 'status', 'notes'],
      visibleCategories: [PropFieldCategory.CREATIVE, PropFieldCategory.TECHNICAL, PropFieldCategory.LOGISTICS],
      hiddenCategories: [PropFieldCategory.FINANCIAL, PropFieldCategory.LOCATION],
      cardLayout: 'detailed',
      showImages: true,
      showStatusIndicators: true,
      quickActions: ['updateStatus', 'addNote', 'uploadImage', 'requestMaterials'],
    },
  },
  
  [UserRole.ART_DIRECTOR]: {
    role: UserRole.ART_DIRECTOR,
    displayName: 'Art Director',
    description: 'Focus on design specifications, budget, and creative requirements',
    isDefault: true,
    config: {
      visibleFields: ['description', 'images', 'price', 'replacementCost', 'source', 'purchaseUrl', 'notes', 'specialRequirements'],
      hiddenFields: ['act', 'scene', 'maintenanceNotes', 'lastInspectionDate'],
      priorityFields: ['description', 'images', 'price', 'source', 'specialRequirements'],
      visibleCategories: [PropFieldCategory.CREATIVE, PropFieldCategory.FINANCIAL, PropFieldCategory.LOGISTICS],
      hiddenCategories: [PropFieldCategory.LOCATION, PropFieldCategory.MAINTENANCE],
      cardLayout: 'detailed',
      showImages: true,
      showStatusIndicators: true,
      quickActions: ['updateDescription', 'addImage', 'updatePrice', 'findSource'],
    },
  },
  
  [UserRole.ASSISTANT_STAGE_MANAGER]: {
    role: UserRole.ASSISTANT_STAGE_MANAGER,
    displayName: 'Assistant Stage Manager',
    description: 'Similar to Stage Manager but with shipping and logistics focus',
    isDefault: true,
    config: {
      visibleFields: ['location', 'currentLocation', 'act', 'scene', 'usageInstructions', 'maintenanceNotes', 'condition', 'shippingCrateDetails', 'travelsUnboxed'],
      hiddenFields: ['price', 'replacementCost', 'repairEstimate'],
      priorityFields: ['currentLocation', 'act', 'scene', 'usageInstructions', 'shippingCrateDetails'],
      visibleCategories: [PropFieldCategory.LOCATION, PropFieldCategory.MAINTENANCE, PropFieldCategory.CREATIVE, PropFieldCategory.LOGISTICS],
      hiddenCategories: [PropFieldCategory.FINANCIAL],
      cardLayout: 'detailed',
      showImages: true,
      showStatusIndicators: true,
      quickActions: ['updateLocation', 'addMaintenanceNote', 'updateShipping', 'markReady'],
    },
  },
  
  [UserRole.PROPS_SUPERVISOR]: {
    role: UserRole.PROPS_SUPERVISOR,
    displayName: 'Props Supervisor',
    description: 'Full access to all prop information and management capabilities',
    isDefault: true,
    config: {
      visibleFields: Object.keys(PROP_FIELD_DEFINITIONS),
      hiddenFields: [],
      priorityFields: ['status', 'location', 'condition', 'maintenanceNotes', 'price'],
      visibleCategories: Object.values(PropFieldCategory),
      hiddenCategories: [],
      cardLayout: 'detailed',
      showImages: true,
      showStatusIndicators: true,
      quickActions: ['editProp', 'deleteProp', 'duplicateProp', 'exportData', 'manageTeam'],
    },
  },
  
  [UserRole.GOD]: {
    role: UserRole.GOD,
    displayName: 'God User',
    description: 'Complete system access with all capabilities',
    isDefault: true,
    config: {
      visibleFields: Object.keys(PROP_FIELD_DEFINITIONS),
      hiddenFields: [],
      priorityFields: ['status', 'location', 'condition', 'maintenanceNotes', 'price'],
      visibleCategories: Object.values(PropFieldCategory),
      hiddenCategories: [],
      cardLayout: 'detailed',
      showImages: true,
      showStatusIndicators: true,
      quickActions: ['editProp', 'deleteProp', 'duplicateProp', 'exportData', 'manageSystem', 'customizeViews'],
    },
  },
  
  // Default views for basic roles
  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    displayName: 'Administrator',
    description: 'Full access to all prop information',
    isDefault: true,
    config: {
      visibleFields: Object.keys(PROP_FIELD_DEFINITIONS),
      hiddenFields: [],
      priorityFields: ['status', 'location', 'condition', 'maintenanceNotes'],
      visibleCategories: Object.values(PropFieldCategory),
      hiddenCategories: [],
      cardLayout: 'detailed',
      showImages: true,
      showStatusIndicators: true,
      quickActions: ['editProp', 'deleteProp', 'duplicateProp', 'exportData'],
    },
  },
  
  [UserRole.EDITOR]: {
    role: UserRole.EDITOR,
    displayName: 'Editor',
    description: 'Full editing access to prop information',
    isDefault: true,
    config: {
      visibleFields: Object.keys(PROP_FIELD_DEFINITIONS),
      hiddenFields: [],
      priorityFields: ['status', 'location', 'condition', 'description'],
      visibleCategories: Object.values(PropFieldCategory),
      hiddenCategories: [],
      cardLayout: 'detailed',
      showImages: true,
      showStatusIndicators: true,
      quickActions: ['editProp', 'duplicateProp', 'exportData'],
    },
  },
  
  [UserRole.VIEWER]: {
    role: UserRole.VIEWER,
    displayName: 'Viewer',
    description: 'Read-only access to prop information',
    isDefault: true,
    config: {
      visibleFields: ['name', 'description', 'category', 'status', 'location', 'images'],
      hiddenFields: ['price', 'replacementCost', 'maintenanceNotes', 'safetyNotes'],
      priorityFields: ['name', 'description', 'status', 'location'],
      visibleCategories: [PropFieldCategory.CREATIVE, PropFieldCategory.LOCATION, PropFieldCategory.ADMINISTRATIVE],
      hiddenCategories: [PropFieldCategory.FINANCIAL, PropFieldCategory.MAINTENANCE, PropFieldCategory.SAFETY],
      cardLayout: 'compact',
      showImages: true,
      showStatusIndicators: false,
      quickActions: ['viewDetails'],
    },
  },
  
  [UserRole.PROPS_SUPERVISOR_ASSISTANT]: {
    role: UserRole.PROPS_SUPERVISOR_ASSISTANT,
    displayName: 'Props Supervisor Assistant',
    description: 'Assistant to props supervisor with most capabilities',
    isDefault: true,
    config: {
      visibleFields: Object.keys(PROP_FIELD_DEFINITIONS),
      hiddenFields: [],
      priorityFields: ['status', 'location', 'condition', 'maintenanceNotes'],
      visibleCategories: Object.values(PropFieldCategory),
      hiddenCategories: [],
      cardLayout: 'detailed',
      showImages: true,
      showStatusIndicators: true,
      quickActions: ['editProp', 'duplicateProp', 'exportData', 'updateStatus'],
    },
  },
};

/**
 * Get the data view configuration for a specific role
 */
export function getRoleDataView(role: UserRole): RoleDataView {
  return ROLE_DATA_VIEWS[role] || ROLE_DATA_VIEWS[UserRole.VIEWER];
}

/**
 * Check if a field should be visible for a specific role
 */
export function isFieldVisibleForRole(fieldName: string, role: UserRole): boolean {
  const roleView = getRoleDataView(role);
  const fieldDef = PROP_FIELD_DEFINITIONS[fieldName];
  
  if (!fieldDef) return false;
  
  // Check if field is explicitly hidden
  if (roleView.config.hiddenFields.includes(fieldName)) {
    return false;
  }
  
  // Check if field is explicitly visible
  if (roleView.config.visibleFields.includes(fieldName)) {
    return true;
  }
  
  // Check category visibility
  const categoryVisible = roleView.config.visibleCategories.includes(fieldDef.category);
  const categoryHidden = roleView.config.hiddenCategories.includes(fieldDef.category);
  
  if (categoryHidden) return false;
  if (categoryVisible) return true;
  
  // Default to not visible if not explicitly configured
  return false;
}

/**
 * Get priority fields for a specific role
 */
export function getPriorityFieldsForRole(role: UserRole): string[] {
  const roleView = getRoleDataView(role);
  return roleView.config.priorityFields;
}

/**
 * Get visible categories for a specific role
 */
export function getVisibleCategoriesForRole(role: UserRole): PropFieldCategory[] {
  const roleView = getRoleDataView(role);
  return roleView.config.visibleCategories;
}

/**
 * Get quick actions for a specific role
 */
export function getQuickActionsForRole(role: UserRole): string[] {
  const roleView = getRoleDataView(role);
  return roleView.config.quickActions;
}
