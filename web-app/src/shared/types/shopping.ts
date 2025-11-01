export interface ShoppingOptionComment {
  id: string;
  text: string;
  author: string;
  authorName?: string; // Display name of the comment author
  timestamp: string;
  type: 'shopper' | 'supervisor' | 'system';
}

export interface ShoppingOption {
  images: string[];
  price: number;
  notes: string; // Keep for backward compatibility
  uploadedBy: string;
  uploadedByName?: string; // Display name of the user who uploaded the option
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
  // Purchase confirmation fields
  receiptImage?: string; // Image of the receipt
  receiptUploadedBy?: string; // User ID who uploaded the receipt
  receiptUploadedByName?: string; // Display name of user who uploaded receipt
  receiptUploadedAt?: string; // Timestamp when receipt was uploaded
  actualPurchasePrice?: number; // Actual price paid (may differ from estimated)
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
  actualCost?: number; // Actual cost of the purchased item
  assignedTo?: string; // User ID of the assigned buyer
  referenceImage?: string;
  note?: string;
  labels?: string[];
  showId?: string;
  
  // Fields that match props structure for seamless conversion
  name?: string; // Will be set to description if not provided
  category?: string; // Will be inferred from type or set during conversion
  price?: number; // Will be set to actualCost when purchased
  length?: number; // Prop dimensions
  width?: number;
  height?: number;
  diameter?: number; // Diameter for round objects
  unit?: 'mm' | 'cm' | 'in' | 'm' | 'ft'; // Dimension unit (matches props)
  weight?: number;
  weightUnit?: 'kg' | 'lb' | 'g' | 'oz'; // Weight unit (matches props)
  act?: number; // Act number where the prop is used
  scene?: number; // Scene number where the prop is used
  sceneName?: string; // Scene name (matches props)
  source?: 'bought' | 'made' | 'hired' | 'borrowed' | 'donated'; // Will be set based on type
  color?: string; // Color information
  materials?: string[]; // Materials list for made props
  
  createdAt?: string;
  updatedAt?: string;
}

export interface ShoppingFilters {
  type?: 'prop' | 'material' | 'hired';
  status?: string;
  label?: string;
  searchQuery?: string;
}
