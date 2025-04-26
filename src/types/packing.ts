// import { PackedProp } from './packing'; // Assuming PackedProp is here or adjust import

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
  notes?: string; // Keep notes for backward compatibility?
  description?: string; // Add description for PackingBoxCard
  labels?: string[]; // Add labels for PackingContainer compatibility
  status?: string; // Add status - define specific statuses later?
  metadata?: { // Add metadata for PackingContainer compatibility
    createdAt: Date;
    updatedAt: Date;
  };
  // Keep original date fields or consolidate into metadata?
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