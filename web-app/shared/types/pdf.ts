import type { Prop } from './props.ts';

export interface PdfGenerationOptions {
  selectedFields: Record<keyof Prop, boolean>;
  layout: 'portrait' | 'landscape' | 'classic' | 'compact' | 'gallery';
  columns: number;
  imageCount: number;
  imageWidthOption: 'small' | 'medium' | 'full';
  showFilesQR: boolean;
  showVideosQR: boolean;
  title?: string; // Optional title for the PDF document itself
  orientation?: 'portrait' | 'landscape';
  includeTitlePage?: boolean;
  includeContacts?: boolean;
  watermark?: string;
  fonts?: {
    header?: string;
    body?: string;
    heading?: string;
  };
  brandColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  // Future options could include:
  // fontSize?: 'small' | 'medium' | 'large';
  // customHeaderText?: string;
  // customFooterText?: string;
  // showPageNumbers?: boolean;
} 
