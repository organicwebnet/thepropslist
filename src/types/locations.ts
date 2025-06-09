export interface Location {
  id: string;
  name: string;
  showId: string; 
  description?: string;
  qrData?: string; // e.g., { type: 'location', id: 'loc_xyz', name: 'Shelf A-1', showId: 'show_abc' }
  createdAt: Date;
  updatedAt: Date;
} 