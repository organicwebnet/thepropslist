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

export interface PropImage {
  id: string;
  url: string;
  isMain: boolean;
  uploadedAt: string;
  caption: string;
}

export interface DigitalAsset {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  status: 'active' | 'inactive';
  lastChecked?: string;
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

export interface PropFormData {
  name: string;
  price: number;
  description: string;
  category: PropCategory;
  length?: number;
  width?: number;
  height?: number;
  depth?: number;
  weight?: number;
  weightUnit: 'kg' | 'lb';
  unit: string;
  source: 'bought' | 'made' | 'rented' | 'borrowed';
  sourceDetails: string;
  purchaseUrl?: string;
  act: number;
  scene: number;
  sceneName?: string;
  isMultiScene: boolean;
  isConsumable: boolean;
  quantity: number;
  imageUrl?: string;
  images: PropImage[];
  hasUsageInstructions: boolean;
  usageInstructions?: string;
  hasMaintenanceNotes: boolean;
  maintenanceNotes?: string;
  hasSafetyNotes: boolean;
  safetyNotes?: string;
  handlingInstructions?: string;
  requiresPreShowSetup: boolean;
  preShowSetupNotes?: string;
  preShowSetupVideo?: string;
  preShowSetupDuration?: number;
  hasOwnShippingCrate: boolean;
  shippingCrateDetails?: string;
  transportNotes?: string;
  requiresSpecialTransport: boolean;
  travelWeight?: number;
  hasBeenModified: boolean;
  modificationDetails: string;
  lastModifiedAt?: string;
  isRented: boolean;
  rentalSource?: string;
  rentalDueDate?: string;
  rentalReferenceNumber?: string;
  digitalAssets: DigitalAsset[];
  travelsUnboxed: boolean;
}

export interface PropFormProps {
  onSubmit: (prop: PropFormData) => Promise<void>;
  disabled?: boolean;
  initialData?: PropFormData;
  mode?: 'create' | 'edit';
  onCancel?: () => void;
  show?: Show;
}

export interface Prop extends PropFormData {
  id: string;
  userId: string;
  showId: string;
  createdAt: string;
}

export interface Show {
  id: string;
  name: string;
  description: string;
  acts: Act[];
  userId: string;
  createdAt: string;
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
  logoImage?: PropImage;
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
  logoImage?: PropImage;
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

export const dimensionUnits = [
  { value: 'cm', label: 'cm' },
  { value: 'in', label: 'in' },
  { value: 'mm', label: 'mm' }
] as const;

export const weightUnits = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' }
] as const;

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
  weightUnit: 'kg' | 'lb';
  isFragile: boolean;
}

export interface PackingListFilters {
  actNumber?: number;
  sceneNumber?: number;
  category?: string;
}