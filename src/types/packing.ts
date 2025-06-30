import { WeightUnit } from '../shared/types/props.ts'; // Corrected Alias
import { Prop } from '../shared/types/props';
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

  // New fields for label settings
  labelHandlingNote?: string;
  labelIncludeFragile?: boolean;
  labelIncludeThisWayUp?: boolean;
  labelIncludeKeepDry?: boolean;
  labelIncludeBatteries?: boolean;
}

export interface PackedProp {
  propId: string;
  name: string;
  quantity: number;
  weight: number;
  // Use WeightUnit from shared types for consistency
  weightUnit: WeightUnit; 
  isFragile: boolean;
}

export interface PackingListFilters {
  actNumber?: number;
  sceneNumber?: number;
  category?: string;
} 
