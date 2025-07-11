export interface ShoppingOptionComment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
  type: 'shopper' | 'supervisor' | 'system';
}

export interface ShoppingOption {
  images: string[];
  price: number;
  notes: string; // Keep for backward compatibility
  uploadedBy: string;
  status: 'pending' | 'buy' | 'rejected' | 'maybe';
  shopName?: string;
  productUrl?: string;
  comment?: string; // Keep for backward compatibility
  comments?: ShoppingOptionComment[];
  shopLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  addedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShoppingItem {
  id: string;
  type: 'prop' | 'material' | 'hired';
  description: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'picked' | 'bought';
  lastUpdated: string;
  options: ShoppingOption[];
  quantity?: number;
  budget?: number;
  referenceImage?: string;
  note?: string;
  labels?: string[];
  showId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShoppingFilters {
  type?: 'prop' | 'material' | 'hired';
  status?: string;
  label?: string;
  searchQuery?: string;
} 