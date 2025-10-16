import type { Prop } from '../../types/props';
import { type UserPermissions } from './FieldMappingService';
import { PdfTemplateRegistry, type PdfTemplateOptions, type PdfTemplateResult } from './PdfTemplateRegistry';

export class UnifiedPdfService {
  private static instance: UnifiedPdfService;
  private templateRegistry: PdfTemplateRegistry;

  private constructor() {
    this.templateRegistry = PdfTemplateRegistry.getInstance();
  }

  public static getInstance(): UnifiedPdfService {
    if (!UnifiedPdfService.instance) {
      UnifiedPdfService.instance = new UnifiedPdfService();
    }
    return UnifiedPdfService.instance;
  }

  public async generatePdf(
    props: Prop[],
    showData: any,
    userPermissions: UserPermissions,
    options: PdfTemplateOptions & { templateId: string }
  ): Promise<PdfTemplateResult> {
    try {
      // Validate inputs
      if (!props || props.length === 0) {
        throw new Error('No props provided for PDF generation');
      }

      if (!showData) {
        throw new Error('No show data provided for PDF generation');
      }

      if (!userPermissions) {
        throw new Error('No user permissions provided for PDF generation');
      }

      if (!options.templateId) {
        throw new Error('No template ID provided for PDF generation');
      }

      // Get template from registry
      const template = this.templateRegistry.getTemplate(options.templateId);
      
      if (!template) {
        const availableTemplates = this.templateRegistry.getAllTemplates().map(t => t.id).join(', ');
        throw new Error(`Template '${options.templateId}' not found. Available templates: ${availableTemplates}`);
      }

      console.log(`Generating PDF using template: ${template.name} (${template.id})`);
      console.log(`Props count: ${props.length}, Show: ${showData.name || 'Unknown'}`);
      
      // Generate PDF using template
      const result = await template.generatePdf(props, showData, options, userPermissions);
      
      if (!result.success) {
        console.error(`Template ${template.id} failed:`, result.error);
      } else {
        console.log(`Template ${template.id} generated successfully`);
      }
      
      return result;
    } catch (error) {
      console.error('UnifiedPdfService error:', error);
      return {
        success: false,
        html: '',
        css: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  public getAvailableTemplates() {
    return this.templateRegistry.getAllTemplates();
  }

  public getTemplatesByLayout(layout: 'portrait' | 'landscape') {
    return this.templateRegistry.getTemplatesByLayout(layout);
  }

  public registerTemplate(template: any) {
    this.templateRegistry.registerTemplate(template);
  }
}
