export interface Address {
  id: string; // Unique ID for the saved address (could be generated or use a Firestore ID)
  name: string; // Recipient/Sender Name
  companyName?: string; // Optional Company Name
  street1: string;
  street2?: string; // Optional second address line
  city: string;
  region: string; // State / Province / Region
  postalCode: string;
  country: string;
  // Optional: Add a nickname for easy selection?
  nickname?: string; 
} 