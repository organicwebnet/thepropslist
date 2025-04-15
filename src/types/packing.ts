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