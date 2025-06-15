import { PropLifecycleStatus } from './lifecycle.ts';
import { Prop } from './index.ts';

export interface PropImage {
  url: string;
  caption?: string;
  isPrimary?: boolean;
  uploadedAt: Date;
}

export interface PropDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in' | 'm';
}

export interface PropMaintenance {
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  maintenanceHistory: {
    date: Date;
    type: 'repair' | 'maintenance' | 'inspection';
    description: string;
    cost: number;
    performedBy: string;
  }[];
}

export interface PropUsage {
  showId: string;
  actNumber: number;
  sceneNumber: number;
  startDate: Date;
  endDate?: Date;
}

export interface Show {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  startDate: Date;
  endDate?: Date;
  venue?: string;
  company?: string;
  season?: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface Filters {
  search: string;
  category?: string;
  status?: PropLifecycleStatus;
  act?: number;
  scene?: number;
  location?: string;
  maintenanceNeeded?: boolean;
  isFragile?: boolean;
  requiresSpecialHandling?: boolean;
  sortBy?: 'name' | 'act' | 'scene' | 'status' | 'category' | 'location';
  sortOrder?: 'asc' | 'desc';
}

export interface PropFormData extends Omit<Prop, 'id' | 'createdAt' | 'updatedAt' | 'userId'> {
  id?: string;
} 