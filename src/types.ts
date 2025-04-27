import { PropLifecycleStatus, MaintenanceRecord, PropStatusUpdate, RepairPriority } from './types/lifecycle';
import { WeightUnit } from '@/shared/types/props';
import authImport, { FirebaseAuthTypes, firebase as authFirebase } from '@react-native-firebase/auth';
import firestoreImport, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

import { PropList } from './components/PropList';

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
}

export interface Scene {
  id: number;
  name: string;
  description?: string;
}

export interface Act {
  id: number;
  name?: string;
  description?: string;
  scenes: Scene[];
}

export interface Show {
  id: string;
  name: string;
  description: string;
  acts: Act[];
  userId: string;
  createdAt: string;
  updatedAt: string;
  collaborators: ShowCollaborator[];
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
}

export interface ShowCollaborator {
  email: string;
  role: 'editor' | 'viewer';
  addedAt: string;
  addedBy: string;
}

export interface Venue {
  name: string;
  address: string;
  startDate: string;
  endDate: string;
  notes: string;
}

export interface Contact {
  name: string;
  role: string;
  email: string;
  phone?: string;
}

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

export interface PackingBox {
  id: string;
  name: string;
  showId: string;
  actNumber: number;
  sceneNumber: number;
  props: PackedProp[];
  totalWeight: number;
  weightUnit: 'kg' | 'lb';
  isHeavy: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PackedProp {
  propId: string;
  name: string;
  quantity: number;
  weight: number;
  weightUnit: WeightUnit;
  isFragile: boolean;
}

export interface PackingListFilters {
  actNumber?: number;
  sceneNumber?: number;
  category?: string;
}