import { FieldMappingService, type FieldDefinition, type FieldCategory, type UserPermissions } from './FieldMappingService';
import type { Prop } from '../../types/props';

/**
 * Enterprise-grade field configuration service for PDF exports
 * Provides type-safe field selection, validation, and configuration management
 */

export interface FieldConfiguration {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isSystem: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  fieldSelections: Record<string, boolean>;
  categorySelections: Record<string, boolean>;
  priorityFilter: 'all' | 'high' | 'medium' | 'low';
  customOrder?: string[];
  metadata: {
    totalFields: number;
    selectedFields: number;
    categories: string[];
    lastUsed?: string;
    usageCount: number;
  };
}

export interface FieldConfigurationPreset {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'detailed' | 'inventory' | 'show-ready' | 'custom';
  icon: string;
  configuration: Partial<FieldConfiguration>;
  recommendedFor: string[];
}

export interface FieldValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class FieldConfigurationService {
  private static instance: FieldConfigurationService;
  private fieldMappingService: FieldMappingService;
  private configurations: Map<string, FieldConfiguration> = new Map();
  private presets: FieldConfigurationPreset[] = [];

  private constructor() {
    this.fieldMappingService = FieldMappingService.getInstance();
    this.initializePresets();
  }

  public static getInstance(): FieldConfigurationService {
    if (!FieldConfigurationService.instance) {
      FieldConfigurationService.instance = new FieldConfigurationService();
    }
    return FieldConfigurationService.instance;
  }

  private initializePresets(): void {
    this.presets = [
      {
        id: 'basic-overview',
        name: 'Basic Overview',
        description: 'Essential prop information for quick reference',
        category: 'basic',
        icon: '📋',
        recommendedFor: ['viewers', 'stage managers'],
        configuration: {
          name: 'Basic Overview',
          description: 'Essential prop information for quick reference',
          fieldSelections: {
            name: true,
            description: true,
            category: true,
            status: true,
            quantity: true,
            location: true,
            act: true,
            scene: true,
          },
          categorySelections: {
            basic: true,
            'show-assignment': true,
            'status-location': true,
          },
          priorityFilter: 'high',
        },
      },
      {
        id: 'detailed-inventory',
        name: 'Detailed Inventory',
        description: 'Comprehensive prop details for inventory management',
        category: 'detailed',
        icon: '📊',
        recommendedFor: ['props supervisors', 'inventory managers'],
        configuration: {
          name: 'Detailed Inventory',
          description: 'Comprehensive prop details for inventory management',
          fieldSelections: {
            name: true,
            description: true,
            category: true,
            subcategory: true,
            status: true,
            quantity: true,
            price: true,
            manufacturer: true,
            model: true,
            serialNumber: true,
            barcode: true,
            condition: true,
            location: true,
            currentLocation: true,
            act: true,
            scene: true,
            sceneName: true,
            source: true,
            purchaseDate: true,
            warranty: true,
            materials: true,
            color: true,
            weight: true,
            length: true,
            width: true,
            height: true,
            depth: true,
            tags: true,
            notes: true,
          },
          categorySelections: {
            basic: true,
            financial: true,
            physical: true,
            identification: true,
            'show-assignment': true,
            'status-location': true,
            'source-acquisition': true,
            'condition-maintenance': true,
          },
          priorityFilter: 'all',
        },
      },
      {
        id: 'show-ready',
        name: 'Show Ready',
        description: 'Production-focused information for show execution',
        category: 'show-ready',
        icon: '🎭',
        recommendedFor: ['directors', 'stage managers', 'actors'],
        configuration: {
          name: 'Show Ready',
          description: 'Production-focused information for show execution',
          fieldSelections: {
            name: true,
            description: true,
            category: true,
            status: true,
            quantity: true,
            location: true,
            currentLocation: true,
            act: true,
            scene: true,
            sceneName: true,
            isMultiScene: true,
            usageInstructions: true,
            handlingInstructions: true,
            safetyNotes: true,
            requiresPreShowSetup: true,
            preShowSetupNotes: true,
            preShowSetupDuration: true,
            isConsumable: true,
            handedness: true,
            isBreakable: true,
            isHazardous: true,
            storageRequirements: true,
            checkedOutDetails: true,
            assignedTo: true,
          },
          categorySelections: {
            basic: true,
            'show-assignment': true,
            'status-location': true,
            'usage-instructions': true,
            'safety-handling': true,
            'assignment-tracking': true,
          },
          priorityFilter: 'all',
        },
      },
      {
        id: 'transport-logistics',
        name: 'Transport & Logistics',
        description: 'Information needed for prop transportation and logistics',
        category: 'inventory',
        icon: '🚚',
        recommendedFor: ['logistics coordinators', 'transport teams'],
        configuration: {
          name: 'Transport & Logistics',
          description: 'Information needed for prop transportation and logistics',
          fieldSelections: {
            name: true,
            category: true,
            quantity: true,
            weight: true,
            travelWeight: true,
            length: true,
            width: true,
            height: true,
            depth: true,
            requiresSpecialTransport: true,
            transportMethod: true,
            transportNotes: true,
            hasOwnShippingCrate: true,
            shippingCrateDetails: true,
            caseLength: true,
            caseWidth: true,
            caseHeight: true,
            travelsUnboxed: true,
            fragile: true,
            thisWayUp: true,
            keepDry: true,
            doNotTilt: true,
            batteryHazard: true,
            isBreakable: true,
            isHazardous: true,
            storageRequirements: true,
            location: true,
            currentLocation: true,
            assignedTo: true,
            estimatedDeliveryDate: true,
            courier: true,
            trackingNumber: true,
          },
          categorySelections: {
            basic: true,
            physical: true,
            'transport-shipping': true,
            'safety-handling': true,
            'assignment-tracking': true,
          },
          priorityFilter: 'all',
        },
      },
      {
        id: 'financial-report',
        name: 'Financial Report',
        description: 'Cost and financial information for budgeting and accounting',
        category: 'detailed',
        icon: '💰',
        recommendedFor: ['producers', 'accountants', 'budget managers'],
        configuration: {
          name: 'Financial Report',
          description: 'Cost and financial information for budgeting and accounting',
          fieldSelections: {
            name: true,
            category: true,
            quantity: true,
            price: true,
            replacementCost: true,
            repairEstimate: true,
            purchaseDate: true,
            source: true,
            sourceDetails: true,
            purchaseUrl: true,
            isRented: true,
            rentalSource: true,
            rentalDueDate: true,
            rentalReferenceNumber: true,
            warranty: true,
            condition: true,
            lastInspectionDate: true,
            nextInspectionDue: true,
            lastMaintenanceDate: true,
            nextMaintenanceDue: true,
            repairPriority: true,
            expectedReturnDate: true,
            replacementLeadTime: true,
          },
          categorySelections: {
            basic: true,
            financial: true,
            'source-acquisition': true,
            'condition-maintenance': true,
          },
          priorityFilter: 'all',
        },
      },
      {
        id: 'maintenance-schedule',
        name: 'Maintenance Schedule',
        description: 'Maintenance and inspection information for prop care',
        category: 'inventory',
        icon: '🔧',
        recommendedFor: ['maintenance teams', 'props supervisors'],
        configuration: {
          name: 'Maintenance Schedule',
          description: 'Maintenance and inspection information for prop care',
          fieldSelections: {
            name: true,
            category: true,
            status: true,
            condition: true,
            lastInspectionDate: true,
            nextInspectionDue: true,
            lastMaintenanceDate: true,
            nextMaintenanceDue: true,
            maintenanceNotes: true,
            repairPriority: true,
            repairEstimate: true,
            assignedTo: true,
            manufacturer: true,
            model: true,
            serialNumber: true,
            warranty: true,
            materials: true,
            isBreakable: true,
            isHazardous: true,
            storageRequirements: true,
            location: true,
            currentLocation: true,
            notes: true,
          },
          categorySelections: {
            basic: true,
            identification: true,
            'condition-maintenance': true,
            'safety-handling': true,
            'assignment-tracking': true,
            metadata: true,
          },
          priorityFilter: 'all',
        },
      },
    ];
  }

  /**
   * Create a new field configuration
   */
  public createConfiguration(
    name: string,
    description: string,
    fieldSelections: Record<string, boolean>,
    categorySelections: Record<string, boolean>,
    createdBy: string,
    options: {
      priorityFilter?: 'all' | 'high' | 'medium' | 'low';
      customOrder?: string[];
    } = {}
  ): FieldConfiguration {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    const allFields = this.fieldMappingService.getAllFields();
    const selectedFields = Object.keys(fieldSelections).filter(key => fieldSelections[key]);
    const categories = Object.keys(categorySelections).filter(key => categorySelections[key]);

    const configuration: FieldConfiguration = {
      id,
      name,
      description,
      isDefault: false,
      isSystem: false,
      createdBy,
      createdAt: now,
      updatedAt: now,
      fieldSelections,
      categorySelections,
      priorityFilter: options.priorityFilter || 'all',
      customOrder: options.customOrder,
      metadata: {
        totalFields: allFields.length,
        selectedFields: selectedFields.length,
        categories,
        usageCount: 0,
      },
    };

    this.configurations.set(id, configuration);
    return configuration;
  }

  /**
   * Get all available presets
   */
  public getPresets(): FieldConfigurationPreset[] {
    return this.presets;
  }

  /**
   * Get presets recommended for a specific role
   */
  public getPresetsForRole(role: string): FieldConfigurationPreset[] {
    return this.presets.filter(preset => 
      preset.recommendedFor.includes(role.toLowerCase())
    );
  }

  /**
   * Apply a preset to create a new configuration
   */
  public applyPreset(
    presetId: string,
    name: string,
    createdBy: string,
    customizations: Partial<FieldConfiguration> = {}
  ): FieldConfiguration {
    const preset = this.presets.find(p => p.id === presetId);
    if (!preset) {
      throw new Error(`Preset with ID ${presetId} not found`);
    }

    const baseConfig = preset.configuration;
    const configuration = this.createConfiguration(
      name,
      baseConfig.description || preset.description,
      baseConfig.fieldSelections || {},
      baseConfig.categorySelections || {},
      createdBy,
      {
        priorityFilter: baseConfig.priorityFilter,
        customOrder: baseConfig.customOrder,
      }
    );

    // Apply customizations
    Object.assign(configuration, customizations);
    configuration.updatedAt = new Date().toISOString();

    return configuration;
  }

  /**
   * Get configuration by ID
   */
  public getConfiguration(id: string): FieldConfiguration | undefined {
    return this.configurations.get(id);
  }

  /**
   * Get all configurations for a user
   */
  public getConfigurationsForUser(userId: string): FieldConfiguration[] {
    return Array.from(this.configurations.values())
      .filter(config => config.createdBy === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Update an existing configuration
   */
  public updateConfiguration(
    id: string,
    updates: Partial<FieldConfiguration>,
    updatedBy: string
  ): FieldConfiguration {
    const configuration = this.configurations.get(id);
    if (!configuration) {
      throw new Error(`Configuration with ID ${id} not found`);
    }

    // Update metadata
    if (updates.fieldSelections) {
      const selectedFields = Object.keys(updates.fieldSelections).filter(key => updates.fieldSelections![key]);
      configuration.metadata.selectedFields = selectedFields.length;
    }

    if (updates.categorySelections) {
      configuration.metadata.categories = Object.keys(updates.categorySelections).filter(key => updates.categorySelections![key]);
    }

    // Apply updates
    Object.assign(configuration, updates);
    configuration.updatedAt = new Date().toISOString();

    return configuration;
  }

  /**
   * Delete a configuration
   */
  public deleteConfiguration(id: string, userId: string): boolean {
    const configuration = this.configurations.get(id);
    if (!configuration) {
      return false;
    }

    if (configuration.isSystem) {
      throw new Error('Cannot delete system configurations');
    }

    if (configuration.createdBy !== userId) {
      throw new Error('Cannot delete configurations created by other users');
    }

    return this.configurations.delete(id);
  }

  /**
   * Validate a field configuration
   */
  public validateConfiguration(
    configuration: Partial<FieldConfiguration>,
    userPermissions: UserPermissions
  ): FieldValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate required fields
    if (!configuration.name || configuration.name.trim().length === 0) {
      errors.push('Configuration name is required');
    }

    if (!configuration.fieldSelections || Object.keys(configuration.fieldSelections).length === 0) {
      errors.push('At least one field must be selected');
    }

    // Validate field selections against user permissions
    if (configuration.fieldSelections) {
      const accessibleFields = this.fieldMappingService.getFieldsForUser(userPermissions);
      const accessibleFieldKeys = accessibleFields.map(field => field.key);

      const selectedFields = Object.keys(configuration.fieldSelections).filter(
        key => configuration.fieldSelections![key]
      );

      const inaccessibleFields = selectedFields.filter(
        key => !accessibleFieldKeys.includes(key as keyof Prop)
      );

      if (inaccessibleFields.length > 0) {
        errors.push(`You don't have permission to export these fields: ${inaccessibleFields.join(', ')}`);
      }

      // Check for missing high-priority fields
      const highPriorityFields = this.fieldMappingService.getFieldsByPriority('high');
      const missingHighPriority = highPriorityFields.filter(
        field => !selectedFields.includes(field.key as string)
      );

      if (missingHighPriority.length > 0) {
        warnings.push(`Consider including these important fields: ${missingHighPriority.map(f => f.label).join(', ')}`);
      }
    }

    // Validate category selections
    if (configuration.categorySelections) {
      const availableCategories = this.fieldMappingService.getAllFieldCategories();
      const availableCategoryIds = availableCategories.map(cat => cat.id);
      
      const selectedCategories = Object.keys(configuration.categorySelections).filter(
        key => configuration.categorySelections![key]
      );

      const invalidCategories = selectedCategories.filter(
        key => !availableCategoryIds.includes(key)
      );

      if (invalidCategories.length > 0) {
        errors.push(`Invalid categories selected: ${invalidCategories.join(', ')}`);
      }
    }

    // Suggest improvements
    if (configuration.fieldSelections) {
      const selectedCount = Object.values(configuration.fieldSelections).filter(Boolean).length;
      const totalFields = this.fieldMappingService.getAllFields().length;

      if (selectedCount < 5) {
        suggestions.push('Consider selecting more fields for a comprehensive report');
      } else if (selectedCount > totalFields * 0.8) {
        suggestions.push('You have selected most fields - consider using a more focused selection for better readability');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Get fields that should be included based on configuration
   */
  public getFieldsForConfiguration(
    configuration: FieldConfiguration,
    userPermissions: UserPermissions
  ): FieldDefinition[] {
    const allFields = this.fieldMappingService.getFieldsForUser(userPermissions);
    
    return allFields.filter(field => {
      // Check if field is explicitly selected
      if (configuration.fieldSelections[field.key as string]) {
        return true;
      }

      // Check if field's category is selected
      const fieldCategory = this.getFieldCategory(field.key);
      if (fieldCategory && configuration.categorySelections[fieldCategory.id]) {
        return true;
      }

      // Check priority filter
      if (configuration.priorityFilter !== 'all' && field.priority !== configuration.priorityFilter) {
        return false;
      }

      return false;
    });
  }

  /**
   * Get field categories that should be included based on configuration
   */
  public getCategoriesForConfiguration(
    configuration: FieldConfiguration,
    userPermissions: UserPermissions
  ): FieldCategory[] {
    const allCategories = this.fieldMappingService.getFieldCategoriesForUser(userPermissions);
    
    return allCategories.filter(category => 
      configuration.categorySelections[category.id]
    );
  }

  /**
   * Generate a smart configuration based on props data and user role
   */
  public generateSmartConfiguration(
    props: Prop[],
    userPermissions: UserPermissions,
    purpose: 'overview' | 'inventory' | 'show-ready' | 'maintenance' | 'financial'
  ): FieldConfiguration {
    const allFields = this.fieldMappingService.getFieldsForUser(userPermissions);
    const fieldSelections: Record<string, boolean> = {};
    const categorySelections: Record<string, boolean> = {};

    // Always include basic fields
    const basicFields = ['name', 'description', 'category', 'status', 'quantity'];
    basicFields.forEach(field => {
      if (allFields.some(f => f.key === field)) {
        fieldSelections[field] = true;
      }
    });

    // Add purpose-specific fields
    switch (purpose) {
      case 'overview':
        ['location', 'act', 'scene'].forEach(field => {
          if (allFields.some(f => f.key === field)) {
            fieldSelections[field] = true;
          }
        });
        categorySelections.basic = true;
        categorySelections['show-assignment'] = true;
        categorySelections['status-location'] = true;
        break;

      case 'inventory':
        ['manufacturer', 'model', 'serialNumber', 'condition', 'location', 'currentLocation'].forEach(field => {
          if (allFields.some(f => f.key === field)) {
            fieldSelections[field] = true;
          }
        });
        categorySelections.basic = true;
        categorySelections.identification = true;
        categorySelections['status-location'] = true;
        categorySelections['condition-maintenance'] = true;
        break;

      case 'show-ready':
        ['act', 'scene', 'sceneName', 'usageInstructions', 'handlingInstructions', 'safetyNotes'].forEach(field => {
          if (allFields.some(f => f.key === field)) {
            fieldSelections[field] = true;
          }
        });
        categorySelections.basic = true;
        categorySelections['show-assignment'] = true;
        categorySelections['usage-instructions'] = true;
        categorySelections['safety-handling'] = true;
        break;

      case 'maintenance':
        ['condition', 'lastInspectionDate', 'nextInspectionDue', 'maintenanceNotes', 'repairPriority'].forEach(field => {
          if (allFields.some(f => f.key === field)) {
            fieldSelections[field] = true;
          }
        });
        categorySelections.basic = true;
        categorySelections['condition-maintenance'] = true;
        categorySelections['safety-handling'] = true;
        break;

      case 'financial':
        ['price', 'replacementCost', 'purchaseDate', 'source', 'isRented', 'rentalDueDate'].forEach(field => {
          if (allFields.some(f => f.key === field)) {
            fieldSelections[field] = true;
          }
        });
        categorySelections.basic = true;
        categorySelections.financial = true;
        categorySelections['source-acquisition'] = true;
        break;
    }

    return this.createConfiguration(
      `Smart ${purpose.charAt(0).toUpperCase() + purpose.slice(1)} Configuration`,
      `Auto-generated configuration for ${purpose} purposes`,
      fieldSelections,
      categorySelections,
      userPermissions.role,
      { priorityFilter: 'all' }
    );
  }

  /**
   * Track configuration usage
   */
  public trackUsage(configurationId: string): void {
    const configuration = this.configurations.get(configurationId);
    if (configuration) {
      configuration.metadata.usageCount++;
      configuration.metadata.lastUsed = new Date().toISOString();
    }
  }

  private getFieldCategory(fieldKey: keyof Prop): FieldCategory | undefined {
    const categories = this.fieldMappingService.getAllFieldCategories();
    return categories.find(category => 
      category.fields.some(field => field.key === fieldKey)
    );
  }

  private generateId(): string {
    return `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
