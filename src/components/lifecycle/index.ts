/**
 * Prop Lifecycle Components
 * 
 * This module contains components related to prop lifecycle management.
 * Export all components for easy importing.
 */

// Components
export { PropLifecycle } from './PropLifecycle.tsx';
export { PropStatusUpdate } from './PropStatusUpdate.tsx';
export { MaintenanceRecordForm } from './MaintenanceRecordForm.tsx';
export { StatusHistory } from './StatusHistory.tsx';
export { MaintenanceHistory } from './MaintenanceHistory.tsx';

// Types & Enums from global types
export type { 
    PropLifecycleStatus, 
    MaintenanceRecord, 
    RepairPriority,
    StatusPriority,
    PropStatusUpdate as PropStatusUpdateType
} from '../../types/lifecycle.ts';

// Constants / Utility functions from global types
export { 
    lifecycleStatusLabels, 
    repairPriorityLabels, 
    lifecycleStatusPriority
} from '../../types/lifecycle.ts';

// Local types (./types.ts does not exist)
// export type { LifecycleSectionProps } from './types.ts';

// Utility functions (../../utils/statusColors.ts does not exist)
// export { getStatusColor, getPriorityColor } from '../../utils/statusColors.ts'; 
