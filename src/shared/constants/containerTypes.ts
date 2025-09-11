// Canonical container types used across web and mobile
// Keep this list in sync if web adds or removes types
// Canonical container types used on the web-app (keep in sync)
export const CONTAINER_TYPES = [
  'Flight Case',
  'Custom Case',
  'Crate',
  'Trunk',
] as const;

export type ContainerType = typeof CONTAINER_TYPES[number];


