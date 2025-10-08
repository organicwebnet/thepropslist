import { Timestamp } from 'firebase/firestore';
import type { CustomTimestamp } from '../shared/services/firebase/types';
import { Address } from '../shared/types/address';
export type { PropImage } from '../shared/types/props';

export interface Scene {
  id: string | number;
  name: string;
  description?: string;
  setting?: string;
}

export interface Act {
  id: string | number;
  name: string;
  description?: string;
  scenes: Scene[];
}

export interface Contact {
  id?: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export interface ShowCollaborator {
  email: string;
  role: 'editor' | 'viewer';
  addedAt: string | CustomTimestamp;
  addedBy: string;
}

export interface Venue {
  id?: string;
  name: string;
  address?: Address;
  startDate?: string | CustomTimestamp | null;
  endDate?: string | CustomTimestamp | null;
  notes?: string;
}

export interface Show {
  id: string;
  userId: string;
  name: string;
  description: string;
  startDate: string | CustomTimestamp | null;
  endDate: string | CustomTimestamp | null;
  imageUrl?: string;
  acts?: Act[];
  createdAt: string | CustomTimestamp;
  updatedAt: string | CustomTimestamp;
  collaborators: ShowCollaborator[];
  team?: { uid: string; role: 'editor' | 'viewer' }[];
  stageManager: string;
  stageManagerEmail: string;
  stageManagerPhone?: string;
  propsSupervisor: string;
  propsSupervisorEmail: string;
  propsSupervisorPhone?: string;
  productionCompany: string;
  productionContactName: string;
  productionContactEmail: string;
  productionContactPhone?: string;
  venues: Venue[];
  isTouringShow: boolean;
  contacts: Contact[];
  logoImage?: { id: string; url: string; caption?: string };
  status?: 'planning' | 'active' | 'completed' | 'in_storage' | 'cancelled';
  rehearsalAddresses?: Address[];
  storageAddresses?: Address[];
  defaultActId?: string | number;
  defaultSceneId?: string | number;
}

export interface ShowFormData {
  name: string;
  description: string;
  acts: Act[];
  stageManager: string;
  stageManagerEmail: string;
  stageManagerPhone?: string;
  propsSupervisor: string;
  propsSupervisorEmail: string;
  propsSupervisorPhone?: string;
  productionCompany: string;
  productionContactName: string;
  productionContactEmail: string;
  productionContactPhone?: string;
  venues: Venue[];
  isTouringShow: boolean;
  contacts: Contact[];
  imageUrl?: string;
  logoImage?: { id: string; url: string; caption?: string };
  startDate?: string;
  endDate?: string;
  status?: 'planning' | 'active' | 'completed' | 'in_storage' | 'cancelled';
  rehearsalAddresses?: Address[];
  storageAddresses?: Address[];
  collaborators?: ShowCollaborator[];
  userId?: string;
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

export interface TodoItem {
  id: string;
  userId: string; // To associate todo with a user
  showId?: string; // Optional: to associate todo with a specific show
  text: string;
  completed: boolean;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
  dueDate?: Timestamp | string | null;
  priority?: 'low' | 'medium' | 'high';
}

export * from './packing'; 
