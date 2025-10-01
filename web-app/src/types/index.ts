// Web-only type definitions
export interface Show {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Act {
  id: string;
  showId: string;
  number: number;
  name: string;
  description?: string;
}

export interface Scene {
  id: string;
  actId: string;
  number: number;
  name: string;
  description?: string;
}

export interface Venue {
  id: string;
  name: string;
  address?: string;
  capacity?: number;
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface ShowCollaborator {
  uid: string;
  role: 'viewer' | 'editor' | 'admin';
  email?: string;
  name?: string;
}

export interface ShowFormData {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}
