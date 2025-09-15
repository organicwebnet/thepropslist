import type { Prop } from './props';

export type PdfLayout = 'classic' | 'compact' | 'gallery' | 'technical';

export interface PdfGenerationOptions {
  selectedFields: Record<keyof Prop, boolean>;
  layout: PdfLayout;
  columns: 1 | 2;
  imageCount: number;
  imageWidthOption: 'small' | 'medium' | 'large';
  fonts: { heading: string; body: string };
  brandColors?: { primary: string; accent: string };
  title: string;
  includeTitlePage: boolean;
  includeContacts: boolean;
  orientation?: 'portrait' | 'landscape';
  watermark?: string;
  margins?: { top: number; right: number; bottom: number; left: number };
  showFilesQR?: boolean;
  showVideosQR?: boolean;
}

import type { Prop } from './props.ts';

export interface PdfGenerationOptions {
  selectedFields: Record<keyof Prop, boolean>;
  layout: 'portrait' | 'landscape';
  columns: number;
  imageCount: number;
  imageWidthOption: 'small' | 'medium' | 'full';
  showFilesQR: boolean;
  showVideosQR: boolean;
  title?: string; // Optional title for the PDF document itself
  // Future options could include:
  // fontSize?: 'small' | 'medium' | 'large';
  // customHeaderText?: string;
  // customFooterText?: string;
  // showPageNumbers?: boolean;
} 
