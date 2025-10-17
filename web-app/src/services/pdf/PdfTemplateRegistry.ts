import { type Prop } from '../../types/props';
import { type UserPermissions } from './FieldMappingService';

export interface PageDimensions {
  portrait: { width: number; height: number };
  landscape: { width: number; height: number };
}

export interface PdfTemplateOptions {
  selectedFields: Record<string, boolean>;
  title: string;
  showData: {
    name: string;
    venue?: string;
    description?: string;
  };
  businessName?: string;
  layout?: 'portrait' | 'landscape';
  pageDimensions?: PageDimensions;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    fontSize?: 'small' | 'medium' | 'large';
  };
  logoUrl?: string;
  baseUrl?: string;
  sortBy?: 'act_scene' | 'alphabetical';
  includeQRCodes?: boolean;
  applyBrandingToOnline?: boolean;
  onlineFieldSelections?: Record<string, boolean>;
  qrMessage?: string;
}

export interface PdfTemplateResult {
  success: boolean;
  html: string;
  css: string;
  error?: string;
}

export interface PdfTemplate {
  id: string;
  name: string;
  description: string;
  layout: 'portrait' | 'landscape';
  icon: string;
  color: string;
  defaultFields: string[];
  
  generatePdf(
    props: Prop[],
    showData: any,
    options: PdfTemplateOptions,
    userPermissions?: UserPermissions
  ): Promise<PdfTemplateResult>;
}

export class PdfTemplateRegistry {
  private static instance: PdfTemplateRegistry;
  private templates: Map<string, PdfTemplate> = new Map();

  private constructor() {
    this.registerDefaultTemplates();
  }

  public static getInstance(): PdfTemplateRegistry {
    if (!PdfTemplateRegistry.instance) {
      PdfTemplateRegistry.instance = new PdfTemplateRegistry();
    }
    return PdfTemplateRegistry.instance;
  }

  public registerTemplate(template: PdfTemplate): void {
    // Validate template structure
    if (!template.id || !template.name || !template.generatePdf) {
      throw new Error('Invalid template: missing required properties (id, name, or generatePdf method)');
    }
    
    // Check for duplicates
    if (this.templates.has(template.id)) {
      throw new Error(`Template with ID '${template.id}' already exists`);
    }
    
    this.templates.set(template.id, template);
    console.log(`Registered PDF template: ${template.name} (${template.id})`);
  }

  public getTemplate(id: string): PdfTemplate | undefined {
    const template = this.templates.get(id);
    if (!template) {
      console.warn(`Template '${id}' not found. Available templates:`, Array.from(this.templates.keys()));
    }
    return template;
  }

  public getAllTemplates(): PdfTemplate[] {
    const templates = Array.from(this.templates.values());
    console.log('Available templates:', templates.map(t => ({ id: t.id, name: t.name })));
    return templates;
  }

  public getTemplatesByLayout(layout: 'portrait' | 'landscape'): PdfTemplate[] {
    return this.getAllTemplates().filter(template => template.layout === layout);
  }

  private registerDefaultTemplates(): void {
    // Import and register default templates using dynamic imports
    try {
      // Use dynamic imports for ES6 modules
      import('./templates/LandscapeTemplate').then(({ LandscapeTemplate }) => {
        this.registerTemplate(new LandscapeTemplate());
        console.log('Registered LandscapeTemplate with ID:', new LandscapeTemplate().id);
      }).catch(error => {
        console.error('Failed to load LandscapeTemplate:', error);
      });

      import('./templates/PortraitCatalogTemplate').then(({ PortraitCatalogTemplate }) => {
        this.registerTemplate(new PortraitCatalogTemplate());
        console.log('Registered PortraitCatalogTemplate with ID:', new PortraitCatalogTemplate().id);
      }).catch(error => {
        console.error('Failed to load PortraitCatalogTemplate:', error);
      });
      
      console.log('PDF templates registration initiated');
    } catch (error) {
      console.error('Failed to register PDF templates:', error);
    }
  }
}
