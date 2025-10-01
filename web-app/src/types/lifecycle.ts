// Web-only lifecycle type definitions
export type PropLifecycleStatus = 'active' | 'inactive' | 'maintenance' | 'repair' | 'retired';

export interface MaintenanceRecord {
  id: string;
  date: string;
  type: 'routine' | 'repair' | 'inspection';
  description: string;
  performedBy?: string;
  cost?: number;
}

export interface PropStatusUpdate {
  id: string;
  date: string;
  fromStatus: PropLifecycleStatus;
  toStatus: PropLifecycleStatus;
  reason: string;
  updatedBy?: string;
}

export type RepairPriority = 'low' | 'medium' | 'high' | 'urgent';
