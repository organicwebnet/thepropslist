export interface BrandProfile {
  id: string;
  name: string;
  logo?: {
    id: string;
    url: string;
    caption?: string;
  };
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  fonts?: {
    header?: string;
    body?: string;
    heading?: string;
  };
  watermark?: string;
  headerText?: string;
  footerText?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
