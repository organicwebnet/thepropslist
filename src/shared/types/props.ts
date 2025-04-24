export type PropSource = 'owned' | 'rented' | 'borrowed' | 'created';
export type PropStatus = 'available' | 'in-use' | 'maintenance' | 'lost';
export type WeightUnit = 'kg' | 'lb' | 'g' | 'oz';

export interface Prop {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  category: string;
  act: number;
  scene: number;
  quantity: number;
  weight?: number;
  weightUnit?: WeightUnit;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };
  source: PropSource;
  status: PropStatus;
  location?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  maintenanceHistory?: {
    date: string;
    description: string;
    cost?: number;
  }[];
} 