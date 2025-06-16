import { PropLifecycleStatus, MaintenanceRecord, PropStatusUpdate, RepairPriority } from '../../types/lifecycle.ts';
import { FirebaseFirestoreTypes, Timestamp } from '@react-native-firebase/firestore';
import { Address } from './address.ts';

// Re-export master types from src/types/index.ts
export type { Show, Act, Scene, Venue, Contact, ShowCollaborator, ShowFormData } from '../../types/index.ts';

// Re-export the type needed by PropForm using 'export type'
export type { PropLifecycleStatus };

export type PropSource = 'bought' | 'made' | 'rented' | 'borrowed' | 'owned' | 'created';
export type WeightUnit = 'kg' | 'lb' | 'g' | 'oz';
export type DimensionUnit = 'cm' | 'in' | 'm' | 'ft';

export interface PropImage {
  id: string;
  url: string;
  caption?: string;
  isMain?: boolean;
}

export interface DigitalAsset {
  id: string;
  name: string;
  title?: string;
  url: string;
  type: 'image' | 'video' | 'document' | 'other';
}

export const propCategories = [
  'Furniture',
  'Decoration',
  'Costume',
  'Weapon',
  'Food/Drink',
  'Book/Paper',
  'Electronics',
  'Musical Instrument',
  'Hand Prop',
  'Set Dressing',
  'Special Effects',
  'Lighting',
  'Other'
] as const;
export type PropCategory = typeof propCategories[number];

export interface PropFormData {
  name: string;
  price: number;
  description?: string;
  category: PropCategory;
  length?: number;
  width?: number;
  height?: number;
  depth?: number;
  weight?: number;
  weightUnit?: WeightUnit;
  unit?: DimensionUnit;
  source: PropSource;
  sourceDetails?: string;
  purchaseUrl?: string;
  act?: number;
  scene?: number;
  sceneName?: string;
  isMultiScene?: boolean;
  isConsumable?: boolean;
  quantity: number;
  imageUrl?: string;
  images?: PropImage[];
  hasUsageInstructions?: boolean;
  usageInstructions?: string;
  hasMaintenanceNotes?: boolean;
  maintenanceNotes?: string;
  hasSafetyNotes?: boolean;
  safetyNotes?: string;
  handlingInstructions?: string;
  requiresPreShowSetup?: boolean;
  preShowSetupNotes?: string;
  preShowSetupVideo?: string;
  preShowSetupDuration?: number;
  hasOwnShippingCrate?: boolean;
  shippingCrateDetails?: string;
  transportNotes?: string;
  requiresSpecialTransport?: boolean;
  travelWeight?: number;
  hasBeenModified?: boolean;
  modificationDetails?: string;
  lastModifiedAt?: string;
  isRented?: boolean;
  rentalSource?: string;
  rentalDueDate?: string;
  rentalReferenceNumber?: string;
  digitalAssets?: DigitalAsset[];
  travelsUnboxed?: boolean;
  status: PropLifecycleStatus;
  statusNotes?: string;
  lastStatusUpdate?: string;
  maintenanceHistory?: MaintenanceRecord[];
  statusHistory?: PropStatusUpdate[];
  lastInspectionDate?: string;
  nextInspectionDue?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDue?: string;
  location?: string;
  currentLocation?: string;
  expectedReturnDate?: string;
  replacementCost?: number;
  replacementLeadTime?: number;
  repairEstimate?: number;
  repairPriority?: RepairPriority;
  subcategory?: string;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  videos?: DigitalAsset[];
  purchaseDate?: string;
  condition?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  barcode?: string;
  warranty?: {
    provider?: string;
    expirationDate?: string;
    details?: string;
  };
  materials?: string[];
  color?: string;
  period?: string;
  style?: string;
  sceneNotes?: string;
  usageNotes?: string;
  handedness?: string;
  isBreakable?: boolean;
  isHazardous?: boolean;
  storageRequirements?: string;
  rentalInfo?: {
    isRental?: boolean;
    provider?: string;
    rentalPeriod?: string;
    cost?: number;
  };
  returnDueDate?: string | Date | null;
  availabilityStatus?: string;
  publicNotes?: string;

  // Assignment for maintenance/repair/other statuses
  assignedTo?: string[]; // Array of user IDs assigned for maintenance/repair
  repairDeadline?: string;
  showId?: string;
}

export interface Prop {
  id: string;
  userId: string;
  showId: string;
  name: string;
  description?: string;
  category: PropCategory;
  price: number;
  quantity: number;
  length?: number;
  width?: number;
  height?: number;
  depth?: number;
  unit?: DimensionUnit;
  weight?: number;
  weightUnit?: WeightUnit;
  travelWeight?: number;
  source: PropSource;
  sourceDetails?: string;
  purchaseUrl?: string;
  rentalDueDate?: string;
  act?: number;
  scene?: number;
  sceneName?: string;
  isMultiScene?: boolean;
  isConsumable?: boolean;
  imageUrl?: string;
  usageInstructions?: string;
  maintenanceNotes?: string;
  safetyNotes?: string;
  handlingInstructions?: string;
  requiresPreShowSetup?: boolean;
  preShowSetupDuration?: number;
  preShowSetupNotes?: string;
  preShowSetupVideo?: string;
  setupTime?: number;
  hasOwnShippingCrate?: boolean;
  shippingCrateDetails?: string;
  requiresSpecialTransport?: boolean;
  transportMethod?: string;
  transportNotes?: string;
  status: PropLifecycleStatus;
  location?: string;
  currentLocation?: string;
  notes?: string;
  tags?: string[];
  images?: PropImage[];
  digitalAssets?: DigitalAsset[];
  videos?: DigitalAsset[];
  materials?: string[];
  statusHistory?: PropStatusUpdate[];
  maintenanceHistory?: MaintenanceRecord[];
  nextMaintenanceDue?: string;
  hasBeenModified?: boolean;
  modificationDetails?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  condition?: string;
  lastUpdated?: string;
  purchaseDate?: string;
  handedness?: string;
  isBreakable?: boolean;
  isHazardous?: boolean;
  storageRequirements?: string;
  returnDueDate?: string | Date | null;
  lastModifiedAt?: string;
  isRented?: boolean;
  rentalSource?: string;
  rentalReferenceNumber?: string;
  travelsUnboxed?: boolean;
  statusNotes?: string;
  lastStatusUpdate?: string;
  lastInspectionDate?: string;
  nextInspectionDue?: string;
  lastMaintenanceDate?: string;
  expectedReturnDate?: string;
  replacementCost?: number;
  replacementLeadTime?: number;
  repairEstimate?: number;
  repairPriority?: RepairPriority;
  subcategory?: string;
  customFields?: Record<string, any>;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  barcode?: string;
  warranty?: {
    provider?: string;
    expirationDate?: string;
    details?: string;
  };
  color?: string;
  period?: string;
  style?: string;
  sceneNotes?: string;
  usageNotes?: string;
  primaryImageUrl?: string;
  availabilityStatus?: string;
  publicNotes?: string;

  // New field for prop assignment to a box or location
  assignment?: {
    type: 'box' | 'location';
    id: string; // ID of the PackingBox or Location
    name?: string; // Optional: name of the box or location for quick display
    assignedAt?: string; // ISO date string for when it was assigned
  };

  // New field for details when prop is checked out
  checkedOutDetails?: {
    to?: string; // e.g., Actor name, Character name, Scene number
    notes?: string;
    checkedOutAt?: string; // ISO date string
    expectedReturnAt?: string; // ISO date string (optional)
  };

  // Assignment for maintenance/repair/other statuses
  assignedTo?: string[]; // Array of user IDs assigned for maintenance/repair
  assignedUserDetails?: { id: string; name: string; email?: string }[]; // Optional: denormalized user info for display
}

export type PropUpdateFormData = Partial<PropFormData>;

// Show, Act, Scene definitions are now removed and re-exported from src/types/index.ts
// Venue, Contact, ShowCollaborator were already removed. 