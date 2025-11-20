export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Generates a user-friendly box ID using two words (adjective-noun) format
 * Format: adjective-noun-number (e.g., "bright-box-42")
 * This makes IDs more memorable and easier to communicate than long alphanumeric strings
 */
export function generateBoxId(): string {
  const adjectives = [
    'bright', 'quick', 'solid', 'sharp', 'bold', 'calm', 'clear', 'cool',
    'fast', 'firm', 'fresh', 'grand', 'great', 'happy', 'heavy', 'light',
    'lucky', 'neat', 'noble', 'proud', 'quiet', 'rapid', 'smart', 'smooth',
    'solid', 'swift', 'tidy', 'tough', 'vivid', 'warm', 'wise', 'young',
    'brave', 'calm', 'cool', 'keen', 'kind', 'mild', 'pure', 'rare',
    'safe', 'sure', 'true', 'vast', 'wild', 'wise', 'zest', 'zen'
  ];

  const nouns = [
    'box', 'case', 'crate', 'pack', 'kit', 'set', 'lot', 'batch',
    'unit', 'load', 'stack', 'pile', 'bundle', 'group', 'bunch', 'collection',
    'store', 'stock', 'supply', 'cache', 'hoard', 'reserve', 'stash', 'treasure',
    'vault', 'warehouse', 'depot', 'hub', 'base', 'post', 'station', 'center',
    'node', 'point', 'spot', 'place', 'zone', 'area', 'space', 'room',
    'chamber', 'compartment', 'cell', 'cubby', 'niche', 'slot', 'pocket', 'pouch'
  ];

  // Pick random adjective and noun
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  // Add a 2-digit number (1-99) for additional uniqueness
  const number = Math.floor(Math.random() * 99) + 1;
  
  return `${adjective}-${noun}-${number}`;
}

export function bytesToSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString(), 10);
  // Handle cases where i might be invalid (e.g., bytes < 0)
  if (isNaN(i) || i < 0 || i >= sizes.length) {
    return 'Invalid size';
  }
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
} 
