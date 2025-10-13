import type { Prop } from '../../types/props';

/**
 * Enterprise-grade field mapping service for PDF exports
 * Ensures complete data synchronization between CRUD operations and PDF generation
 */

export interface FieldCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  fields: FieldDefinition[];
}

export interface FieldDefinition {
  key: keyof Prop;
  label: string;
  description: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'array' | 'object' | 'url' | 'currency';
  priority: 'high' | 'medium' | 'low';
  required: boolean;
  groupable: boolean;
  searchable: boolean;
  exportable: boolean;
  permissions: {
    view: string[]; // Roles that can view this field
    export: string[]; // Roles that can export this field
    sensitive: boolean; // Whether this field contains sensitive information
  };
  formatter?: (value: any) => string;
  validator?: (value: any) => boolean;
}

export interface UserPermissions {
  role: string;
  permissions: string[];
  showId?: string;
  isOwner?: boolean;
  isAdmin?: boolean;
}

export class FieldMappingService {
  private static instance: FieldMappingService;
  private fieldCategories: FieldCategory[] = [];

  private constructor() {
    this.initializeFieldCategories();
  }

  private getDefaultPermissions(): FieldDefinition['permissions'] {
    return {
      view: ['viewer', 'editor', 'props_supervisor', 'props_carpenter', 'admin', 'god'],
      export: ['viewer', 'editor', 'props_supervisor', 'props_carpenter', 'admin', 'god'],
      sensitive: false,
    };
  }

  private getSensitivePermissions(): FieldDefinition['permissions'] {
    return {
      view: ['props_supervisor', 'props_carpenter', 'admin', 'god'],
      export: ['props_supervisor', 'props_carpenter', 'admin', 'god'],
      sensitive: true,
    };
  }

  public static getInstance(): FieldMappingService {
    if (!FieldMappingService.instance) {
      FieldMappingService.instance = new FieldMappingService();
    }
    return FieldMappingService.instance;
  }

  private isValidPropField(key: string): key is keyof Prop {
    // List of fields that actually exist in the Prop interface
    const validFields: (keyof Prop)[] = [
      'id', 'userId', 'showId', 'name', 'description', 'category', 'price', 'quantity',
      'length', 'width', 'height', 'depth', 'unit', 'weight', 'weightUnit', 'travelWeight',
      'source', 'sourceDetails', 'purchaseUrl', 'rentalDueDate', 'act', 'scene', 'sceneName',
      'isMultiScene', 'isConsumable', 'imageUrl', 'usageInstructions', 'maintenanceNotes',
      'safetyNotes', 'handlingInstructions', 'requiresPreShowSetup', 'preShowSetupDuration',
      'preShowSetupNotes', 'preShowSetupVideo', 'setupTime', 'hasOwnShippingCrate',
      'shippingCrateDetails', 'caseLength', 'caseWidth', 'caseHeight', 'requiresSpecialTransport',
      'transportMethod', 'transportNotes', 'status', 'location', 'currentLocation', 'notes',
      'tags', 'images', 'digitalAssets', 'videos', 'materials', 'comments', 'statusHistory',
      'maintenanceHistory', 'nextMaintenanceDue', 'hasBeenModified', 'modificationDetails',
      'createdAt', 'updatedAt', 'lastUsedAt', 'condition', 'lastUpdated', 'purchaseDate',
      'handedness', 'isBreakable', 'isHazardous', 'storageRequirements', 'returnDueDate',
      'lastModifiedAt', 'isRented', 'rentalSource', 'rentalReferenceNumber', 'travelsUnboxed',
      'statusNotes', 'lastStatusUpdate', 'lastInspectionDate', 'nextInspectionDue',
      'lastMaintenanceDate', 'expectedReturnDate', 'replacementCost', 'replacementLeadTime',
      'repairEstimate', 'repairPriority', 'subcategory', 'customFields', 'manufacturer',
      'model', 'serialNumber', 'barcode', 'warranty'
    ];
    return validFields.includes(key as keyof Prop);
  }

  private initializeFieldCategories(): void {
    this.fieldCategories = [
      {
        id: 'basic',
        name: 'Basic Information',
        description: 'Core prop identification and description',
        icon: '📋',
        fields: [
          {
            key: 'name',
            label: 'Name',
            description: 'Primary identifier for the prop',
            type: 'text',
            priority: 'high',
            required: true,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'description',
            label: 'Description',
            description: 'Detailed description of the prop',
            type: 'text',
            priority: 'high',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'images',
            label: 'Images',
            description: 'Visual documentation of the prop',
            type: 'array',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            formatter: (value: string[]) => value ? `${value.length} image(s)` : 'No images',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'digitalAssets',
            label: 'Digital Assets',
            description: 'Files and documents related to the prop',
            type: 'array',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            formatter: (value: string[]) => value ? `${value.length} file(s)` : 'No files',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'videos',
            label: 'Videos',
            description: 'Video content related to the prop',
            type: 'array',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            formatter: (value: string[]) => value ? `${value.length} video(s)` : 'No videos',
            permissions: this.getDefaultPermissions(),
          },
        ],
      },
      {
        id: 'financial',
        name: 'Financial Information',
        description: 'Cost, pricing, and financial data',
        icon: '💰',
        fields: [
          {
            key: 'price',
            label: 'Price',
            description: 'Purchase or rental price of the prop',
            type: 'currency',
            priority: 'high',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: number) => value ? `£${value.toFixed(2)}` : 'Not specified',
            permissions: this.getSensitivePermissions(),
          },
          {
            key: 'replacementCost',
            label: 'Replacement Cost',
            description: 'Cost to replace the prop if lost or damaged',
            type: 'currency',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: number) => value ? `£${value.toFixed(2)}` : 'Not specified',
            permissions: this.getSensitivePermissions(),
          },
          {
            key: 'repairEstimate',
            label: 'Repair Estimate',
            description: 'Estimated cost for repairs',
            type: 'currency',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: number) => value ? `£${value.toFixed(2)}` : 'Not specified',
            permissions: this.getSensitivePermissions(),
          },
          {
            key: 'purchaseDate',
            label: 'Purchase Date',
            description: 'Date when the prop was purchased',
            type: 'date',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: string) => value ? new Date(value).toLocaleDateString('en-GB') : 'Not specified',
            permissions: this.getDefaultPermissions(),
          },
        ],
      },
      {
        id: 'physical',
        name: 'Physical Properties',
        description: 'Dimensions, weight, and physical characteristics',
        icon: '📏',
        fields: [
          {
            key: 'weight',
            label: 'Weight',
            description: 'Weight of the prop',
            type: 'number',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: number) => value ? `${value} kg` : 'Not specified',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'travelWeight',
            label: 'Travel Weight',
            description: 'Weight including packaging for transport',
            type: 'number',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: number) => value ? `${value} kg` : 'Not specified',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'length',
            label: 'Length',
            description: 'Length dimension of the prop',
            type: 'number',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: number) => value ? `${value} cm` : 'Not specified',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'width',
            label: 'Width',
            description: 'Width dimension of the prop',
            type: 'number',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: number) => value ? `${value} cm` : 'Not specified',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'height',
            label: 'Height',
            description: 'Height dimension of the prop',
            type: 'number',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: number) => value ? `${value} cm` : 'Not specified',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'depth',
            label: 'Depth',
            description: 'Depth dimension of the prop',
            type: 'number',
            priority: 'low',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: number) => value ? `${value} cm` : 'Not specified',
            permissions: this.getDefaultPermissions(),
          },
        ],
      },
      {
        id: 'identification',
        name: 'Identification',
        description: 'Manufacturer, model, and identification details',
        icon: '🏷️',
        fields: [
          {
            key: 'manufacturer',
            label: 'Manufacturer',
            description: 'Company or person who made the prop',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'model',
            label: 'Model',
            description: 'Model name or number of the prop',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'serialNumber',
            label: 'Serial Number',
            description: 'Unique serial number of the prop',
            type: 'text',
            priority: 'high',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'barcode',
            label: 'Barcode',
            description: 'Barcode or QR code identifier',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
        ],
      },
      {
        id: 'show-assignment',
        name: 'Show Assignment',
        description: 'Act, scene, and show-specific information',
        icon: '🎭',
        fields: [
          {
            key: 'act',
            label: 'Act',
            description: 'Act number where the prop is used',
            type: 'number',
            priority: 'high',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'scene',
            label: 'Scene',
            description: 'Scene number where the prop is used',
            type: 'number',
            priority: 'high',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'sceneName',
            label: 'Scene Name',
            description: 'Name of the scene where the prop is used',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'isMultiScene',
            label: 'Multi-Scene',
            description: 'Whether the prop is used in multiple scenes',
            type: 'boolean',
            priority: 'medium',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            formatter: (value: boolean) => value ? 'Yes' : 'No',
            permissions: this.getDefaultPermissions(),
          },
        ],
      },
      {
        id: 'status-location',
        name: 'Status & Location',
        description: 'Current status and location information',
        icon: '📍',
        fields: [
          {
            key: 'category',
            label: 'Category',
            description: 'Classification category of the prop',
            type: 'text',
            priority: 'high',
            required: true,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'status',
            label: 'Status',
            description: 'Current status of the prop',
            type: 'text',
            priority: 'high',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'quantity',
            label: 'Quantity',
            description: 'Number of units available',
            type: 'number',
            priority: 'high',
            required: true,
            groupable: false,
            searchable: false,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'location',
            label: 'Location',
            description: 'Storage or staging location',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'currentLocation',
            label: 'Current Location',
            description: 'Where the prop is currently located',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
        ],
      },
      {
        id: 'source-acquisition',
        name: 'Source & Acquisition',
        description: 'Where the prop came from and acquisition details',
        icon: '🛒',
        fields: [
          {
            key: 'source',
            label: 'Source',
            description: 'Where the prop was obtained from',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'sourceDetails',
            label: 'Source Details',
            description: 'Additional details about the source',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'purchaseUrl',
            label: 'Purchase URL',
            description: 'Link to purchase the prop online',
            type: 'url',
            priority: 'low',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'isRented',
            label: 'Is Rented',
            description: 'Whether the prop is rented rather than owned',
            type: 'boolean',
            priority: 'high',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            formatter: (value: boolean) => value ? 'Yes' : 'No',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'rentalSource',
            label: 'Rental Source',
            description: 'Company or person renting the prop',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'rentalDueDate',
            label: 'Rental Due Date',
            description: 'Date when the rental period ends',
            type: 'date',
            priority: 'high',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: string) => value ? new Date(value).toLocaleDateString('en-GB') : 'Not specified',
            permissions: this.getDefaultPermissions(),
          },
        ],
      },
      {
        id: 'condition-maintenance',
        name: 'Condition & Maintenance',
        description: 'Physical condition and maintenance information',
        icon: '🔧',
        fields: [
          {
            key: 'condition',
            label: 'Condition',
            description: 'Current physical condition of the prop',
            type: 'text',
            priority: 'high',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'lastInspectionDate',
            label: 'Last Inspection Date',
            description: 'Date of the most recent inspection',
            type: 'date',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: string) => value ? new Date(value).toLocaleDateString('en-GB') : 'Not specified',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'nextInspectionDue',
            label: 'Next Inspection Due',
            description: 'Date when the next inspection is due',
            type: 'date',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: string) => value ? new Date(value).toLocaleDateString('en-GB') : 'Not specified',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'lastMaintenanceDate',
            label: 'Last Maintenance Date',
            description: 'Date of the most recent maintenance',
            type: 'date',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: string) => value ? new Date(value).toLocaleDateString('en-GB') : 'Not specified',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'nextMaintenanceDue',
            label: 'Next Maintenance Due',
            description: 'Date when the next maintenance is due',
            type: 'date',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: string) => value ? new Date(value).toLocaleDateString('en-GB') : 'Not specified',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'maintenanceNotes',
            label: 'Maintenance Notes',
            description: 'Notes about maintenance requirements',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'repairPriority',
            label: 'Repair Priority',
            description: 'Priority level for any needed repairs',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
        ],
      },
      {
        id: 'usage-instructions',
        name: 'Usage Instructions',
        description: 'How to use and handle the prop',
        icon: '📖',
        fields: [
          {
            key: 'usageInstructions',
            label: 'Usage Instructions',
            description: 'Instructions for using the prop',
            type: 'text',
            priority: 'high',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'handlingInstructions',
            label: 'Handling Instructions',
            description: 'Instructions for handling the prop safely',
            type: 'text',
            priority: 'high',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'safetyNotes',
            label: 'Safety Notes',
            description: 'Important safety information',
            type: 'text',
            priority: 'high',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'requiresPreShowSetup',
            label: 'Requires Pre-Show Setup',
            description: 'Whether the prop needs setup before the show',
            type: 'boolean',
            priority: 'medium',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            formatter: (value: boolean) => value ? 'Yes' : 'No',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'preShowSetupNotes',
            label: 'Pre-Show Setup Notes',
            description: 'Notes about pre-show setup requirements',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'preShowSetupDuration',
            label: 'Pre-Show Setup Duration',
            description: 'Time required for pre-show setup',
            type: 'text',
            priority: 'low',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'isConsumable',
            label: 'Is Consumable',
            description: 'Whether the prop is consumed during use',
            type: 'boolean',
            priority: 'medium',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            formatter: (value: boolean) => value ? 'Yes' : 'No',
            permissions: this.getDefaultPermissions(),
          },
        ],
      },
      {
        id: 'safety-handling',
        name: 'Safety & Handling',
        description: 'Safety requirements and handling considerations',
        icon: '⚠️',
        fields: [
          {
            key: 'isBreakable',
            label: 'Is Breakable',
            description: 'Whether the prop is fragile or breakable',
            type: 'boolean',
            priority: 'high',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            formatter: (value: boolean) => value ? 'Yes' : 'No',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'isHazardous',
            label: 'Is Hazardous',
            description: 'Whether the prop poses any safety hazards',
            type: 'boolean',
            priority: 'high',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            formatter: (value: boolean) => value ? 'Yes' : 'No',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'storageRequirements',
            label: 'Storage Requirements',
            description: 'Special storage requirements for the prop',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'handedness',
            label: 'Handedness',
            description: 'Whether the prop is left or right-handed',
            type: 'text',
            priority: 'low',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
        ],
      },
      {
        id: 'transport-shipping',
        name: 'Transport & Shipping',
        description: 'Transportation and shipping information',
        icon: '🚚',
        fields: [
          {
            key: 'requiresSpecialTransport',
            label: 'Requires Special Transport',
            description: 'Whether the prop needs special transport arrangements',
            type: 'boolean',
            priority: 'medium',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            formatter: (value: boolean) => value ? 'Yes' : 'No',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'transportMethod',
            label: 'Transport Method',
            description: 'Recommended method of transport',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'transportNotes',
            label: 'Transport Notes',
            description: 'Additional notes about transport requirements',
            type: 'text',
            priority: 'low',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'hasOwnShippingCrate',
            label: 'Has Own Shipping Crate',
            description: 'Whether the prop has its own shipping container',
            type: 'boolean',
            priority: 'medium',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            formatter: (value: boolean) => value ? 'Yes' : 'No',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'shippingCrateDetails',
            label: 'Shipping Crate Details',
            description: 'Details about the shipping container',
            type: 'text',
            priority: 'low',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'caseLength',
            label: 'Case Length',
            description: 'Length of the shipping case',
            type: 'number',
            priority: 'low',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: number) => value ? `${value} cm` : 'Not specified',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'caseWidth',
            label: 'Case Width',
            description: 'Width of the shipping case',
            type: 'number',
            priority: 'low',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: number) => value ? `${value} cm` : 'Not specified',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'caseHeight',
            label: 'Case Height',
            description: 'Height of the shipping case',
            type: 'number',
            priority: 'low',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: number) => value ? `${value} cm` : 'Not specified',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'travelsUnboxed',
            label: 'Travels Unboxed',
            description: 'Whether the prop travels without packaging',
            type: 'boolean',
            priority: 'medium',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            formatter: (value: boolean) => value ? 'Yes' : 'No',
            permissions: this.getDefaultPermissions(),
          },
        ],
      },
      {
        id: 'assignment-tracking',
        name: 'Assignment & Tracking',
        description: 'Assignment and tracking information',
        icon: '👤',
        fields: [
          {
            key: 'checkedOutDetails',
            label: 'Checked Out Details',
            description: 'Information about who has checked out the prop',
            type: 'object',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: any) => value ? JSON.stringify(value) : 'Not checked out',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'assignedTo',
            label: 'Assigned To',
            description: 'Person or department assigned to the prop',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'estimatedDeliveryDate',
            label: 'Estimated Delivery Date',
            description: 'Expected delivery date for the prop',
            type: 'date',
            priority: 'low',
            required: false,
            groupable: false,
            searchable: false,
            exportable: true,
            formatter: (value: string) => value ? new Date(value).toLocaleDateString('en-GB') : 'Not specified',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'courier',
            label: 'Courier',
            description: 'Courier or delivery service used',
            type: 'text',
            priority: 'low',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'trackingNumber',
            label: 'Tracking Number',
            description: 'Tracking number for delivery',
            type: 'text',
            priority: 'low',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
        ],
      },
      {
        id: 'metadata',
        name: 'Metadata',
        description: 'Additional metadata and notes',
        icon: '📝',
        fields: [
          {
            key: 'tags',
            label: 'Tags',
            description: 'Searchable tags for the prop',
            type: 'array',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            formatter: (value: string[]) => value ? value.join(', ') : 'No tags',
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'notes',
            label: 'Notes',
            description: 'General notes about the prop',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'sceneNotes',
            label: 'Scene Notes',
            description: 'Notes specific to scene usage',
            type: 'text',
            priority: 'low',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'usageNotes',
            label: 'Usage Notes',
            description: 'Notes about how the prop is used',
            type: 'text',
            priority: 'low',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'period',
            label: 'Period',
            description: 'Historical period the prop represents',
            type: 'text',
            priority: 'low',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'availabilityStatus',
            label: 'Availability Status',
            description: 'Current availability status',
            type: 'text',
            priority: 'medium',
            required: false,
            groupable: true,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
          {
            key: 'publicNotes',
            label: 'Public Notes',
            description: 'Notes visible to all users',
            type: 'text',
            priority: 'low',
            required: false,
            groupable: false,
            searchable: true,
            exportable: true,
            permissions: this.getDefaultPermissions(),
          },
        ],
      },
    ];
  }

  public getAllFields(): FieldDefinition[] {
    return this.fieldCategories.flatMap(category => category.fields)
      .filter(field => this.isValidPropField(field.key as string));
  }

  public getAllFieldCategories(): FieldCategory[] {
    return this.fieldCategories;
  }

  public getFieldsByPriority(priority: 'high' | 'medium' | 'low'): FieldDefinition[] {
    return this.getAllFields().filter(field => field.priority === priority);
  }

  public getFieldCategoriesForExport(): Array<{ category: FieldCategory; fields: FieldDefinition[] }> {
    return this.fieldCategories.map(category => ({
      category,
      fields: category.fields.filter(field => field.exportable)
    }));
  }

  public getFieldsForUser(userPermissions: UserPermissions): FieldDefinition[] {
    return this.getAllFields().filter(field => 
      this.userCanExportField(field, userPermissions)
    );
  }

  public getFieldCategoriesForUser(userPermissions: UserPermissions): Array<{ category: FieldCategory; fields: FieldDefinition[] }> {
    return this.fieldCategories.map(category => ({
      category,
      fields: category.fields.filter(field => 
        this.userCanExportField(field, userPermissions)
      )
    })).filter(item => item.fields.length > 0);
  }

  public userCanViewField(field: FieldDefinition, userPermissions: UserPermissions): boolean {
    // Owner and admin can view everything
    if (userPermissions.isOwner || userPermissions.isAdmin) {
      return true;
    }

    // Check if user's role is in the view permissions
    return field.permissions.view.includes(userPermissions.role);
  }

  public userCanExportField(field: FieldDefinition, userPermissions: UserPermissions): boolean {
    // Must be able to view first
    if (!this.userCanViewField(field, userPermissions)) {
      return false;
    }

    // Owner and admin can export everything
    if (userPermissions.isOwner || userPermissions.isAdmin) {
      return true;
    }

    // Check if user's role is in the export permissions
    return field.permissions.export.includes(userPermissions.role);
  }

  public getSensitiveFieldsForUser(userPermissions: UserPermissions): FieldDefinition[] {
    return this.getFieldsForUser(userPermissions).filter(field => 
      field.permissions.sensitive && !this.userCanExportField(field, userPermissions)
    );
  }

  public filterPropDataForUser(prop: Prop, userPermissions: UserPermissions): Partial<Prop> {
    const filteredProp: Partial<Prop> = {};
    
    this.getFieldsForUser(userPermissions).forEach(field => {
      if (this.userCanExportField(field, userPermissions)) {
        (filteredProp as any)[field.key] = prop[field.key];
      }
    });

    return filteredProp;
  }

  public getPermissionSummary(userPermissions: UserPermissions): {
    totalFields: number;
    accessibleFields: number;
    sensitiveFields: number;
    restrictedFields: number;
  } {
    const allFields = this.getAllFields();
    const accessibleFields = this.getFieldsForUser(userPermissions);
    const sensitiveFields = this.getSensitiveFieldsForUser(userPermissions);
    
    return {
      totalFields: allFields.length,
      accessibleFields: accessibleFields.length,
      sensitiveFields: sensitiveFields.length,
      restrictedFields: allFields.length - accessibleFields.length,
    };
  }

  public formatFieldValue(fieldKey: keyof Prop, value: any): string {
    const field = this.getAllFields().find(f => f.key === fieldKey);
    if (!field) {
      return String(value || '');
    }

    if (field.formatter) {
      return field.formatter(value);
    }

    if (value === null || value === undefined || value === '') {
      return 'Not specified';
    }

    return String(value);
  }

  public validateFieldValue(fieldKey: keyof Prop, value: any): boolean {
    const field = this.getAllFields().find(f => f.key === fieldKey);
    if (!field) {
      return false;
    }

    if (field.validator) {
      return field.validator(value);
    }

    // Basic validation based on type
    switch (field.type) {
      case 'text':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null;
      case 'url':
        return typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));
      case 'currency':
        return typeof value === 'number' && value >= 0;
      default:
        return true;
    }
  }
}