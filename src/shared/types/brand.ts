export interface BrandProfile {
  logoUrl?: string;                // Light background
  logoDarkUrl?: string;            // Dark background
  colors?: { primary?: string; accent?: string };
  fonts?: { heading?: string; body?: string };
  headerText?: string;
  footerText?: string;
  watermark?: string;
  updatedAt?: string;
}


