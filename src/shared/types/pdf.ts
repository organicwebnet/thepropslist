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
