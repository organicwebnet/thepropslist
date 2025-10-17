/**
 * Shared role options for consistent role selection across the application
 * These roles determine what users can see and what actions they can perform
 */

export interface RoleOption {
  value: string;
  label: string;
  description?: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  { value: 'propmaker', label: 'Props Maker' },
  { value: 'painter', label: 'Painter' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'senior-propmaker', label: 'Senior Props Maker' },
  { value: 'props-supervisor', label: 'Props Supervisor' },
  { value: 'art-director', label: 'Art Director' },
  { value: 'set-dresser', label: 'Set Dresser' },
  { value: 'stage-manager', label: 'Stage Manager' },
  { value: 'assistant-stage-manager', label: 'Assistant Stage Manager' },
  { value: 'designer', label: 'Designer' },
  { value: 'assistant-designer', label: 'Assistant Designer' },
  { value: 'props-carpenter', label: 'Props Carpenter' },
  { value: 'show-carpenter', label: 'Show Carpenter' },
  { value: 'crew', label: 'Crew' },
];

/**
 * Legacy permission-based roles for backward compatibility
 * These are used for system permissions, not job functions
 */
export const PERMISSION_ROLES: RoleOption[] = [
  { value: 'viewer', label: 'Viewer', description: 'Can view content only' },
  { value: 'editor', label: 'Editor', description: 'Can edit content' },
  { value: 'props_supervisor', label: 'Props Supervisor', description: 'Can manage props and team' },
  { value: 'god', label: 'Admin', description: 'Full system access' },
];

/**
 * Job roles for team member job functions (used in team management)
 * These are separate from permission roles
 */
export const JOB_ROLES: RoleOption[] = [
  { value: 'propmaker', label: 'Prop Maker' },
  { value: 'senior-propmaker', label: 'Senior Prop Maker' },
  { value: 'props-carpenter', label: 'Props Carpenter' },
  { value: 'show-carpenter', label: 'Show Carpenter' },
  { value: 'painter', label: 'Painter' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'props-supervisor', label: 'Props Supervisor' },
  { value: 'art-director', label: 'Art Director' },
  { value: 'set-dresser', label: 'Set Dresser' },
  { value: 'stage-manager', label: 'Stage Manager' },
  { value: 'assistant-stage-manager', label: 'Assistant Stage Manager' },
  { value: 'designer', label: 'Designer' },
  { value: 'assistant-designer', label: 'Assistant Designer' },
  { value: 'crew', label: 'Crew' },
];






