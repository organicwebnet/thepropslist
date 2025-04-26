import { Timestamp } from 'firebase/firestore';

export interface Show {
  id: string;
  name: string;
  description?: string;
  startDate: Timestamp | string;
  endDate: Timestamp | string;
  venue?: string;
  status?: 'planning' | 'active' | 'completed';
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  userId: string;
  acts?: Act[];
  collaborators?: ShowCollaborator[];
  isTouringShow?: boolean;
  venues?: Venue[];
  stageManager?: string;
  stageManagerEmail?: string;
  stageManagerPhone?: string;
  propsSupervisor?: string;
  propsSupervisorEmail?: string;
  propsSupervisorPhone?: string;
  productionCompany?: string;
  productionContactName?: string;
  productionContactEmail?: string;
  productionContactPhone?: string;
  contacts?: Contact[];
  imageUrl?: string;
  logoImage?: File;
}

export interface Act {
  id: number;
  name: string;
  scenes: Scene[];
}

export interface Scene {
  id: number;
  name: string;
}

export interface Venue {
  name: string;
  address?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface Contact {
  name: string;
  role: string;
  email: string;
}

export interface ShowCollaborator {
  userId: string;
  role: string;
}

export interface Prop {
  id: string;
  name: string;
  description?: string;
  category: string;
  images?: { url: string; caption?: string; isMain?: boolean }[];
  imageUrl?: string;
  location?: string;
  status?: string;
  source?: 'purchased' | 'rented' | 'borrowed' | 'built' | 'made' | 'owned' | 'created';
  sourceDetails?: string;
  act?: number;
  scene?: number;
  price: number;
  quantity: number;
  purchaseUrl?: string;
  dimensions?: { length?: number; width?: number; height?: number; unit?: string };
  weight?: number;
  weightUnit?: 'kg' | 'lb';
  handlingInstructions?: string;
  userId: string;
  showId: string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  isMultiScene?: boolean;
  isConsumable?: boolean;
  transportMethod?: string;
  transportNotes?: string;
  requiresSpecialTransport?: boolean;
  travelWeight?: number;
  usageInstructions?: string;
  setupTime?: number;
  maintenanceNotes?: string;
  safetyNotes?: string;
  hasUsageInstructions?: boolean;
  hasMaintenanceNotes?: boolean;
  hasSafetyNotes?: boolean;
  requiresPreShowSetup?: boolean;
  hasOwnShippingCrate?: boolean;
  hasBeenModified?: boolean;
  preShowSetupDuration?: number;
  preShowSetupNotes?: string;
  shippingCrateDetails?: string;
  modificationDetails?: string;
  lastModifiedAt?: Timestamp | string;
  preShowSetupVideo?: string;
  tags?: string[];
  sceneName?: string;
  rentalDueDate?: string;
  rentalReferenceNumber?: string;
  statusNotes?: string;
  currentLocation?: string;
  expectedReturnDate?: string;
  repairPriority?: 'low' | 'medium' | 'high' | 'urgent';
  digitalAssets?: DigitalAsset[];
  videos?: string[];
  materials?: string[];
  handedness?: 'left' | 'right' | 'either';
  isBreakable?: boolean;
  isHazardous?: boolean;
  unit?: 'cm' | 'in' | 'mm';
}

export interface DigitalAsset {
  id: string;
  name: string;
  url: string;
  type: 'manual' | 'receipt' | 'blueprint' | 'other';
  uploadedAt?: Timestamp | string;
}

export * from './packing'; 