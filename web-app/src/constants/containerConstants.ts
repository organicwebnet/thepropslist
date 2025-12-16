/**
 * Container-related constants shared across the application
 */

export const DEFAULT_DIMENSIONS: Record<string, { length: number; width: number; height: number; unit: 'cm' | 'in' }> = {
  'Cardboard Box': { length: 60, width: 40, height: 40, unit: 'cm' },
  'Pallet': { length: 120, width: 100, height: 150, unit: 'cm' },
  'Flight Case': { length: 80, width: 60, height: 50, unit: 'cm' },
  'Custom Case': { length: 100, width: 60, height: 60, unit: 'cm' },
  'Crate': { length: 100, width: 80, height: 80, unit: 'cm' },
  'Tote': { length: 60, width: 40, height: 30, unit: 'cm' },
  'Trunk': { length: 90, width: 50, height: 50, unit: 'cm' },
};

export const TEMPLATE_TYPES = ['Cardboard Box', 'Pallet', 'Flight Case', 'Crate', 'Tote'] as const;

export const CONTAINER_INDENT_PX = 24;


