import { PropLifecycleStatus, MaintenanceRecord, PropStatusUpdate, RepairPriority } from './types/lifecycle';
import { WeightUnit } from './shared/types/props';
import { Prop, PropCategory, PropFormData, PropImage, DigitalAsset, PropSource, DimensionUnit } from './shared/types/props';
import { Address } from './shared/types/address';
import authImport, { FirebaseAuthTypes, firebase as authFirebase } from '@react-native-firebase/auth';
import firestoreImport, { FirebaseFirestoreTypes, Timestamp } from '@react-native-firebase/firestore';

// Re-export types from the more detailed new structure if they are intended to be public API
export type { Show, Act, Scene, Venue, Contact, ShowCollaborator } from './types/index';
export type { PackingBox, PackedProp } from './types/packing';

// UserProfile remains unique to this file for now
export interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string;
  phone: string;
  location: string;
  organization: string;
  role: string;
  bio: string;
  updatedAt?: string;
  fontPreference?: 'system' | 'OpenDyslexic' | 'Arial' | 'Verdana';
  createdAt?: string;
  lastUpdated?: string;
  googleLinked?: boolean;
  storagePreference?: 'firebase' | 'google-drive' | 'hybrid';
  googleDriveFolderId?: string;
}

// ShowFormData has been moved to src/types/index.ts

export interface Filters {
  search: string;
  act?: number;
  scene?: number;
  category?: string;
  status?: PropLifecycleStatus;
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export interface ConfigFormData {
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  GOOGLE_SHEETS_API_KEY: string;
  GOOGLE_DOCS_API_KEY: string;
  CURRENCY: string;
  SHOW_NAME: string;
  SHOW_ACTS: number;
  SHOW_SCENES: number;
}

export interface PackingListFilters {
  actNumber?: number;
  sceneNumber?: number;
  category?: string;
}
