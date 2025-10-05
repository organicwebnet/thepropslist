import { UserRole } from './auth';

/**
 * Categories for organizing prop fields based on user needs
 */
export enum PropFieldCategory {
  LOCATION = 'location',
  FINANCIAL = 'financial', 
  MAINTENANCE = 'maintenance',
  CREATIVE = 'creative',
  LOGISTICS = 'logistics',
  SAFETY = 'safety',
  TECHNICAL = 'technical',
  ADMINISTRATIVE = 'administrative',
}

/**
 * Simplified data view configuration
 */
export interface DataViewConfig {
  // Field visibility
  visibleFields: string[];
  hiddenFields: string[];
  priorityFields: string[];
  
  // Category visibility
  visibleCategories: PropFieldCategory[];
  hiddenCategories: PropFieldCategory[];
  
  // Display options
  cardLayout: 'compact' | 'detailed' | 'minimal';
  showImages: boolean;
  showStatusIndicators: boolean;
  
  // Quick actions available to this role
  quickActions: string[];
}

/**
 * Role-specific data view definition
 */
export interface RoleDataView {
  role: UserRole;
  displayName: string;
  description: string;
  config: DataViewConfig;
  isDefault: boolean;
}

/**
 * Field definition for prop data
 */
export interface PropFieldDefinition {
  name: string;
  category: PropFieldCategory;
  label: string;
  priority: 'high' | 'medium' | 'low';
  description?: string;
}

/**
 * Cached data view result
 */
export interface CachedDataView {
  config: DataViewConfig;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Data view service result
 */
export interface DataViewResult {
  config: DataViewConfig;
  role: UserRole;
  isCustom: boolean;
  source: 'default' | 'cached' | 'computed';
}
