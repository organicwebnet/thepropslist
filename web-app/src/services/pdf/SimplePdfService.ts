import type { Prop } from '../../types/props';
import { FieldMappingService, type UserPermissions } from './FieldMappingService';
import QRCode from 'qrcode';

export interface SimplePdfOptions {
  selectedFields: Record<string, boolean>;
  title: string;
  showData: {
    name: string;
    venue?: string;
    description?: string;
  };
  sortBy?: 'act_scene' | 'alphabetical';
  layout?: 'portrait' | 'landscape';
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    fontSize?: 'small' | 'medium' | 'large';
  };
  logoUrl?: string;
}

export interface SimplePdfResult {
  success: boolean;
  html: string;
  css: string;
  error?: string;
}

export class SimplePdfService {
  private static instance: SimplePdfService;
  private fieldMappingService: FieldMappingService;

  private constructor() {
    this.fieldMappingService = FieldMappingService.getInstance();
  }

  public static getInstance(): SimplePdfService {
    if (!SimplePdfService.instance) {
      SimplePdfService.instance = new SimplePdfService();
    }
    return SimplePdfService.instance;
  }

  public async generatePropsListPdf(
    props: Prop[],
    showData: any,
    userPermissions: UserPermissions,
    options: SimplePdfOptions
  ): Promise<SimplePdfResult> {
    try {
      console.log('SimplePdfService: Starting PDF generation');
      console.log('Props count:', props.length);
      console.log('Props sample:', props.slice(0, 2));
      console.log('Show data:', showData);
      console.log('Options:', options);

      // Get accessible fields
      const accessibleFields = this.fieldMappingService.getFieldsForUser(userPermissions);
      console.log('Accessible fields:', accessibleFields.length);
      
      // Filter props to only include selected fields
      const selectedFieldKeys = Object.keys(options.selectedFields).filter(
        key => options.selectedFields[key]
      );
      console.log('Selected field keys:', selectedFieldKeys);

      if (selectedFieldKeys.length === 0) {
        console.warn('No fields selected for export, using fallback fields');
        // Use fallback fields if none are selected
        selectedFieldKeys.push('name', 'status', 'location');
        console.log('Using fallback fields:', selectedFieldKeys);
      }

      // Generate HTML
      const html = await this.generateHtml(props, showData, selectedFieldKeys, accessibleFields, options);
      console.log('Generated HTML length:', html.length);
      
      // Generate CSS
      const css = this.generateCss(options);
      console.log('Generated CSS length:', css.length);

      return {
        success: true,
        html,
        css
      };
    } catch (error) {
      console.error('SimplePdfService error:', error);
      return {
        success: false,
        html: '',
        css: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async generateHtml(
    props: Prop[],
    showData: any,
    selectedFieldKeys: string[],
    accessibleFields: any[],
    options: SimplePdfOptions
  ): Promise<string> {
    // Sort props by act/scene or alphabetically
    const sortedProps = this.sortProps(props, options.sortBy || 'act_scene');
    const layout = options.layout || 'portrait';
    
    // Generate title page
    const titlePage = this.generateTitlePage(showData, options, props.length);
    
    // Generate props catalogue
    const propsCatalogue = await this.generatePropsCatalogue(sortedProps, selectedFieldKeys, accessibleFields, layout);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this.escapeHtml(showData.name)} - Props Catalogue</title>
        <style>${this.generateCss(options)}</style>
      </head>
      <body>
        ${titlePage}
        ${propsCatalogue}
      </body>
      </html>
    `;
  }

  private sortProps(props: Prop[], sortBy: 'act_scene' | 'alphabetical'): Prop[] {
    return [...props].sort((a, b) => {
      if (sortBy === 'alphabetical') {
        return a.name.localeCompare(b.name);
      } else {
        // Sort by act, then scene, then name
        const aAct = a.act || 0;
        const bAct = b.act || 0;
        if (aAct !== bAct) return aAct - bAct;
        
        const aScene = a.scene || 0;
        const bScene = b.scene || 0;
        if (aScene !== bScene) return aScene - bScene;
        
        return a.name.localeCompare(b.name);
      }
    });
  }

  private generateTitlePage(showData: any, options: SimplePdfOptions, propsCount: number): string {
    console.log('SimplePdfService generateTitlePage - propsCount:', propsCount);
    console.log('SimplePdfService generateTitlePage - logoUrl:', options.logoUrl);
    console.log('SimplePdfService generateTitlePage - showData:', showData);
    
    return `
      <div class="page title-page">
        <div class="page-content">
          <div class="title-content">
            ${options.logoUrl ? `<img src="${options.logoUrl}" alt="Company Logo" class="title-logo" onerror="this.style.display='none'" />` : ''}
            <h1 class="main-title">${this.escapeHtml(showData.name)}</h1>
            <div class="accent-bar"></div>
            <h2 class="subtitle">Props Catalogue</h2>
            ${showData.venue ? `<p class="venue">${this.escapeHtml(showData.venue)}</p>` : ''}
            ${showData.description ? `<p class="description">${this.escapeHtml(showData.description)}</p>` : ''}
          <div class="generation-info">
            <p>Generated: ${new Date().toLocaleDateString('en-GB')}</p>
            <p>Total Props: ${propsCount}</p>
          </div>
          </div>
        </div>
        <div class="page-footer">
          Generated on <a href="https://thepropslist.uk">thepropslist.uk</a>
        </div>
      </div>
    `;
  }

  private async generatePropsCatalogue(props: Prop[], selectedFieldKeys: string[], accessibleFields: any[], layout: 'portrait' | 'landscape'): Promise<string> {
    if (props.length === 0) {
      return '<div class="page"><div class="page-content"><div class="no-props">No props found.</div></div></div>';
    }

    const pages: string[] = [];
    let currentPageContent = '';
    let currentPageHeight = 0;
    const maxPageHeight = layout === 'portrait' ? 250 : 180; // Approximate height in mm
    
    for (const prop of props) {
      const propCard = await this.generatePropCard(prop, selectedFieldKeys, accessibleFields, layout);
      const estimatedHeight = this.estimateContentHeight(prop, accessibleFields);
      
      // Check if adding this prop would exceed page height
      if (currentPageHeight + estimatedHeight > maxPageHeight && currentPageContent !== '') {
        // Start a new page
        pages.push(`
          <div class="page props-page ${layout}">
            <div class="page-content">
              ${currentPageContent}
            </div>
            <div class="page-footer">
              <span class="page-number">Page ${pages.length + 1}</span>
              <span>Generated on <a href="https://thepropslist.uk">thepropslist.uk</a></span>
              <span class="page-number"></span>
            </div>
          </div>
        `);
        currentPageContent = '';
        currentPageHeight = 0;
      }
      
      // Add prop to current page
      currentPageContent += propCard;
      currentPageHeight += estimatedHeight;
    }
    
    // Add the last page if it has content
    if (currentPageContent !== '') {
      pages.push(`
        <div class="page props-page ${layout}">
          <div class="page-content">
            ${currentPageContent}
          </div>
          <div class="page-footer">
            <span class="page-number">Page ${pages.length + 1}</span>
            <span>Generated on <a href="https://thepropslist.uk">thepropslist.uk</a></span>
            <span class="page-number"></span>
          </div>
        </div>
      `);
    }

    return pages.join('');
  }

  private estimateContentHeight(prop: Prop, accessibleFields: any[]): number {
    // Estimate content height based on number of fields and content length
    const allFields = accessibleFields.filter(f => f.exportable);
    let fieldCount = 0;
    let totalContentLength = 0;
    
    allFields.forEach(field => {
      const value = this.getPropValue(prop, field.key);
      if (value && String(value).trim() !== '') {
        fieldCount++;
        totalContentLength += String(value).length;
      }
    });
    
    // Base height for prop header and smaller image
    let height = 25;
    
    // Add height for fields (compact layout)
    height += fieldCount * 3; // 3mm per field
    
    // Add extra height for long content
    height += Math.min(totalContentLength / 100, 20); // Max 20mm extra for very long content
    
    // Add height for QR codes if present
    if (prop.digitalAssets?.length || prop.videos?.length || prop.images?.length || prop.purchaseUrl) {
      height += 15;
    }
    
    return height;
  }

  private async generatePropCard(prop: Prop, selectedFieldKeys: string[], accessibleFields: any[], layout: 'portrait' | 'landscape'): Promise<string> {
    const mainImage = prop.images && prop.images.length > 0 ? prop.images[0] : null;
    const qrCodes = await this.generateQRCodes(prop);
    
    // Generate structured field groups
    const fieldGroups = this.generateFieldGroups(prop, accessibleFields, layout);

    if (layout === 'landscape') {
      return `
        <div class="prop-card landscape">
          <div class="prop-image-section">
            ${mainImage ? `<img src="${mainImage.url}" alt="${mainImage.caption || prop.name}" class="prop-main-image" />` : '<div class="no-image">No Image</div>'}
            ${qrCodes}
          </div>
          <div class="prop-details">
            <div class="prop-header">
              <h3 class="prop-name">${this.escapeHtml(prop.name)}</h3>
              ${prop.act && prop.scene ? `<span class="act-scene">Act ${prop.act}, Scene ${prop.scene}</span>` : ''}
            </div>
            <div class="prop-fields">
              ${fieldGroups}
            </div>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="prop-card portrait">
          <div class="prop-image-section">
            ${mainImage ? `<img src="${mainImage.url}" alt="${mainImage.caption || prop.name}" class="prop-main-image" />` : '<div class="no-image">No Image</div>'}
            ${qrCodes}
          </div>
          <div class="prop-details">
            <div class="prop-header">
              <h3 class="prop-name">${this.escapeHtml(prop.name)}</h3>
              ${prop.act && prop.scene ? `<span class="act-scene">Act ${prop.act}, Scene ${prop.scene}</span>` : ''}
            </div>
            <div class="prop-fields">
              ${fieldGroups}
            </div>
          </div>
        </div>
      `;
    }
  }

  private async generateQRCodes(prop: Prop): Promise<string> {
    const qrCodes: string[] = [];
    
    try {
      // Add QR code for digital assets if they exist
      if (prop.digitalAssets && prop.digitalAssets.length > 0) {
        const filesUrl = `${window.location.origin}/props/${prop.id}/files`;
        const qrDataUrl = await QRCode.toDataURL(filesUrl, { width: 60, margin: 1 });
        qrCodes.push(`
          <div class="qr-code">
            <div class="qr-label">Digital Files (${prop.digitalAssets.length})</div>
            <img src="${qrDataUrl}" alt="QR Code for Digital Files" class="qr-image" />
          </div>
        `);
      }
      
      // Add QR code for videos if they exist
      if (prop.videos && prop.videos.length > 0) {
        const videosUrl = `${window.location.origin}/props/${prop.id}/videos`;
        const qrDataUrl = await QRCode.toDataURL(videosUrl, { width: 60, margin: 1 });
        qrCodes.push(`
          <div class="qr-code">
            <div class="qr-label">Videos (${prop.videos.length})</div>
            <img src="${qrDataUrl}" alt="QR Code for Videos" class="qr-image" />
          </div>
        `);
      }

      // Add QR code for all images if they exist
      if (prop.images && prop.images.length > 0) {
        const imagesUrl = `${window.location.origin}/props/${prop.id}/images`;
        const qrDataUrl = await QRCode.toDataURL(imagesUrl, { width: 60, margin: 1 });
        qrCodes.push(`
          <div class="qr-code">
            <div class="qr-label">All Images (${prop.images.length})</div>
            <img src="${qrDataUrl}" alt="QR Code for All Images" class="qr-image" />
          </div>
        `);
      }

      // Add QR codes for URL fields
      if (prop.purchaseUrl) {
        const qrDataUrl = await QRCode.toDataURL(prop.purchaseUrl, { width: 60, margin: 1 });
        qrCodes.push(`
          <div class="qr-code">
            <div class="qr-label">Purchase Link</div>
            <img src="${qrDataUrl}" alt="QR Code for Purchase URL" class="qr-image" />
          </div>
        `);
      }

      // Add QR code for source details if it contains a URL
      if (prop.sourceDetails && this.containsUrl(prop.sourceDetails)) {
        const qrDataUrl = await QRCode.toDataURL(prop.sourceDetails, { width: 60, margin: 1 });
        qrCodes.push(`
          <div class="qr-code">
            <div class="qr-label">Source Link</div>
            <img src="${qrDataUrl}" alt="QR Code for Source Details" class="qr-image" />
          </div>
        `);
      }
    } catch (error) {
      console.warn('Failed to generate QR codes:', error);
      // Fallback to placeholders
      if (prop.digitalAssets && prop.digitalAssets.length > 0) {
        qrCodes.push(`
          <div class="qr-code">
            <div class="qr-label">Digital Files (${prop.digitalAssets.length})</div>
            <div class="qr-placeholder">QR Code</div>
          </div>
        `);
      }
      if (prop.videos && prop.videos.length > 0) {
        qrCodes.push(`
          <div class="qr-code">
            <div class="qr-label">Videos (${prop.videos.length})</div>
            <div class="qr-placeholder">QR Code</div>
          </div>
        `);
      }
      if (prop.images && prop.images.length > 0) {
        qrCodes.push(`
          <div class="qr-code">
            <div class="qr-label">All Images (${prop.images.length})</div>
            <div class="qr-placeholder">QR Code</div>
          </div>
        `);
      }
      if (prop.purchaseUrl) {
        qrCodes.push(`
          <div class="qr-code">
            <div class="qr-label">Purchase Link</div>
            <div class="qr-placeholder">QR Code</div>
          </div>
        `);
      }
      if (prop.sourceDetails && this.containsUrl(prop.sourceDetails)) {
        qrCodes.push(`
          <div class="qr-code">
            <div class="qr-label">Source Link</div>
            <div class="qr-placeholder">QR Code</div>
          </div>
        `);
      }
    }
    
    return qrCodes.length > 0 ? `<div class="qr-codes">${qrCodes.join('')}</div>` : '';
  }

  private containsUrl(text: string): boolean {
    const urlRegex = /(https?:\/\/[^\s]+)/;
    return urlRegex.test(text);
  }

  private isUrlField(fieldKey: string, value: string): boolean {
    // Check if this is a known URL field
    const urlFields = ['purchaseUrl', 'sourceDetails'];
    if (urlFields.includes(fieldKey)) {
      return true;
    }
    
    // Check if the value looks like a URL
    const urlRegex = /^https?:\/\/[^\s]+$/;
    return urlRegex.test(value.trim());
  }

  private generateFieldGroups(prop: Prop, accessibleFields: any[], layout: 'portrait' | 'landscape'): string {
    const allFields = accessibleFields.filter(f => f.exportable);
    
    // Generate flowing content sections
    let content = '';

    // Basic Information Section
    const basicFields = ['name', 'category', 'status', 'quantity', 'act', 'scene', 'sceneName'];
    const basicContent = this.generateSection('Basic Information', basicFields, prop, allFields);
    if (basicContent) content += basicContent;

    // Physical Properties Section
    const physicalFields = ['length', 'width', 'height', 'depth', 'weight', 'weightUnit', 'travelWeight', 'materials'];
    const physicalContent = this.generateSection('Physical Properties', physicalFields, prop, allFields);
    if (physicalContent) content += physicalContent;

    // Source & Purchase Section
    const sourceFields = ['source', 'sourceDetails', 'purchaseUrl', 'price', 'purchaseDate', 'rentalSource', 'rentalReferenceNumber'];
    const sourceContent = this.generateSection('Source & Purchase', sourceFields, prop, allFields);
    if (sourceContent) content += sourceContent;

    // Location & Storage Section
    const locationFields = ['location', 'currentLocation', 'storageRequirements'];
    const locationContent = this.generateSection('Location & Storage', locationFields, prop, allFields);
    if (locationContent) content += locationContent;

    // Description Section
    const descriptionFields = ['description'];
    const descriptionContent = this.generateSection('Description', descriptionFields, prop, allFields);
    if (descriptionContent) content += descriptionContent;

    // Usage Instructions Section
    const usageFields = ['usageInstructions', 'handlingInstructions', 'safetyNotes', 'preShowSetupNotes', 'setupTime'];
    const usageContent = this.generateSection('Usage Instructions', usageFields, prop, allFields);
    if (usageContent) content += usageContent;

    // Maintenance & Condition Section
    const maintenanceFields = ['condition', 'maintenanceNotes', 'lastMaintenanceDate', 'nextMaintenanceDue', 'repairEstimate', 'repairPriority'];
    const maintenanceContent = this.generateSection('Maintenance & Condition', maintenanceFields, prop, allFields);
    if (maintenanceContent) content += maintenanceContent;

    // Additional Information Section
    const additionalFields = ['notes', 'tags', 'manufacturer', 'model', 'serialNumber', 'barcode', 'warranty'];
    const additionalContent = this.generateSection('Additional Information', additionalFields, prop, allFields);
    if (additionalContent) content += additionalContent;

    return content;
  }

  private generateSection(title: string, fieldKeys: string[], prop: Prop, allFields: any[]): string {
    const sectionFields = allFields.filter(field => fieldKeys.includes(field.key));
    const fieldsWithValues = sectionFields
      .map(field => {
        const value = this.getPropValue(prop, field.key);
        if (value && String(value).trim() !== '') {
          return { field, value: String(value) };
        }
        return null;
      })
      .filter(item => item !== null);

    if (fieldsWithValues.length === 0) return '';

    const fieldsHtml = fieldsWithValues
      .map(({ field, value }) => this.generateFieldHtml(field, value))
      .join('');

    return `
      <div class="content-section">
        <h3 class="section-title">${title}</h3>
        <div class="section-content">
          ${fieldsHtml}
        </div>
      </div>
    `;
  }

  private generateFieldHtml(field: any, value: string): string {
    const isTextarea = this.isTextareaField(field.key, value);
    const isUrlField = this.isUrlField(field.key, value);
    
    if (isTextarea) {
      // Textarea fields: label on top, span both columns
      return `
        <div class="field textarea-field field-span-full">
          <span class="field-label">${field.label}:</span>
          <span class="field-value">${this.escapeHtml(value)}</span>
        </div>
      `;
    } else if (isUrlField) {
      // URL fields: make clickable with inline QR code
      return `
        <div class="field url-field">
          <span class="field-label">${field.label}:</span>
          <div class="url-content">
            <a href="${value}" target="_blank" class="url-link">${this.escapeHtml(value)}</a>
            <div class="inline-qr" data-url="${value}"></div>
          </div>
        </div>
      `;
    } else {
      // Regular fields: label and value inline
      return `
        <div class="field inline-field">
          <span class="field-label">${field.label}:</span>
          <span class="field-value">${this.escapeHtml(value)}</span>
        </div>
      `;
    }
  }

  private generatePropsList(props: Prop[], selectedFieldKeys: string[], accessibleFields: any[]): string {
    if (props.length === 0) {
      return '<div class="no-props">No props found.</div>';
    }

    const propsHtml = props.map(prop => {
      const fields = selectedFieldKeys.map(key => {
        const field = accessibleFields.find(f => f.key === key);
        const value = this.getPropValue(prop, key);
        
        if (key === 'images' && prop.images && prop.images.length > 0) {
          const imageHtml = prop.images.slice(0, 2).map(img => 
            `<img src="${img.url}" alt="${img.caption || prop.name}" class="prop-image" />`
          ).join('');
          return `<div class="field-images">${imageHtml}</div>`;
        }
        
        return `
          <div class="field">
            <span class="field-label">${field ? field.label : key}:</span>
            <span class="field-value">${this.escapeHtml(String(value || 'Not specified'))}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="prop-item">
          <div class="prop-header">
            <h3 class="prop-name">${this.escapeHtml(prop.name)}</h3>
            ${prop.act && prop.scene ? `<span class="act-scene">Act ${prop.act}, Scene ${prop.scene}</span>` : ''}
          </div>
          <div class="prop-fields">
            ${fields}
          </div>
        </div>
      `;
    }).join('');

    return `<div class="props-list">${propsHtml}</div>`;
  }

  private generatePropsTable(props: Prop[], selectedFieldKeys: string[], accessibleFields: any[]): string {
    if (props.length === 0) {
      return '<div class="no-props">No props found.</div>';
    }

    // Create table headers
    const headers = selectedFieldKeys.map(key => {
      const field = accessibleFields.find(f => f.key === key);
      return `<th>${field ? field.label : key}</th>`;
    }).join('');

    // Create table rows
    const rows = props.map(prop => {
      const cells = selectedFieldKeys.map(key => {
        const value = this.getPropValue(prop, key);
        if (key === 'images' && prop.images && prop.images.length > 0) {
          // Generate image thumbnails
          const imageHtml = prop.images.slice(0, 3).map((img, index) => 
            `<img src="${img.url}" alt="${img.caption || prop.name}" class="prop-image" style="max-width: 50px; max-height: 50px; margin: 2px; border: 1px solid #ddd;" />`
          ).join('');
          return `<td class="image-cell">${imageHtml}${prop.images.length > 3 ? `<div class="more-images">+${prop.images.length - 3} more</div>` : ''}</td>`;
        }
        return `<td>${this.escapeHtml(String(value || ''))}</td>`;
      }).join('');
      
      return `<tr>${cells}</tr>`;
    }).join('');

    return `
      <div class="props-table-container">
        <table class="props-table">
          <thead>
            <tr>${headers}</tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  private getPropValue(prop: Prop, key: string): any {
    const value = (prop as any)[key];
    
    if (value === null || value === undefined) {
      return '';
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return value;
  }

  private isTextareaField(fieldKey: string, value: string): boolean {
    // Only fields that typically contain very long text content
    const textareaFields = [
      'description',
      'notes',
      'handlingInstructions',
      'safetyNotes',
      'usageInstructions',
      'preShowSetupNotes',
      'storageRequirements',
      'specialRequirements',
      'conditionNotes',
      'repairNotes',
      'history',
      'provenance',
      'careInstructions'
    ];
    
    // Check if it's a known textarea field AND the content is substantial
    if (textareaFields.includes(fieldKey) && value.length > 50) {
      return true;
    }
    
    // Check if the value contains multiple line breaks (likely from textarea)
    const lineBreaks = (value.match(/\n/g) || []).length;
    if (lineBreaks >= 2) {
      return true;
    }
    
    return false;
  }

  private generateCss(options: Partial<SimplePdfOptions> = {}): string {
    const branding = options.branding || {};
    const primaryColor = branding.primaryColor || '#1a1a1a';
    const secondaryColor = branding.secondaryColor || '#666666';
    const accentColor = branding.accentColor || '#f59e0b';
    const fontFamily = branding.fontFamily || 'Helvetica, Arial, sans-serif';
    const fontSize = branding.fontSize || 'medium';
    
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: '${fontFamily}';
        font-size: ${fontSize === 'small' ? '11px' : fontSize === 'large' ? '15px' : '13px'};
        line-height: 1.5;
        color: #1a1a1a;
        background: #ffffff;
        font-weight: 300;
        letter-spacing: 0.02em;
      }

      .page {
        width: 210mm;
        height: 297mm;
        padding: 8mm 10mm;
        margin: 0 auto;
        background: white;
        box-sizing: border-box;
        page-break-after: always;
        page-break-inside: avoid;
        position: relative;
        display: flex;
        flex-direction: column;
      }

      .page.landscape {
        width: 297mm;
        height: 210mm;
        padding: 20mm 25mm;
      }

      .page-content {
        flex: 1;
        padding-bottom: 20mm; /* Space for footer */
        overflow: hidden;
      }

      .page:last-child {
        page-break-after: avoid;
      }

      .title-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        text-align: center;
        background: #ffffff;
        min-height: 100vh;
        position: relative;
        padding-top: 40px;
      }

      .title-content {
        max-width: 500px;
        z-index: 2;
      }

      .title-logo {
        max-height: 80px;
        margin-bottom: 40px;
        opacity: 0.9;
      }

      .main-title {
        font-size: 4.5em;
        color: ${primaryColor};
        margin-bottom: 0.3em;
        font-weight: 100;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        line-height: 0.9;
      }

      .subtitle {
        font-size: 1.2em;
        color: ${secondaryColor};
        margin-bottom: 2em;
        font-weight: 300;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .accent-bar {
        width: 60px;
        height: 3px;
        background: ${accentColor};
        margin: 0 auto 2em;
      }

      .venue {
        font-size: 1.2em;
        color: ${accentColor};
        margin-bottom: 0.5em;
      }

      .description {
        font-size: 1em;
        color: #333;
        margin-bottom: 2em;
      }

      .generation-info {
        font-size: 0.9em;
        color: #333;
        border-top: 2px solid #e5e7eb;
        padding-top: 1em;
      }

      .generation-info p {
        margin-bottom: 0.5em;
      }

      .page-header {
        margin-bottom: 2em;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 1em;
      }

      .page-header {
        margin-bottom: 2em;
        border-bottom: 2px solid ${primaryColor};
        padding-bottom: 1em;
      }

      .page-header h1 {
        font-size: 2em;
        color: ${primaryColor};
        margin-bottom: 0.5em;
      }

      .show-info {
        font-size: 0.9em;
        color: #666;
      }

      .venue {
        font-weight: bold;
        color: ${accentColor};
        margin-bottom: 0.5em;
      }

      .generation-date {
        font-size: 0.8em;
        color: #999;
      }

      .props-list {
        margin-top: 1em;
      }

      .prop-item {
        margin-bottom: 1.5em;
        padding: 1em;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #fafafa;
      }

      .prop-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5em;
        padding-bottom: 0.5em;
        border-bottom: 1px solid #e5e7eb;
      }

      .prop-name {
        font-size: 1.2em;
        color: ${primaryColor};
        margin: 0;
        font-weight: bold;
      }

      .act-scene {
        background: ${secondaryColor};
        color: white;
        padding: 0.2em 0.5em;
        border-radius: 4px;
        font-size: 0.8em;
        font-weight: bold;
      }

      .prop-fields {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.5em;
      }

      .field {
        display: flex;
        flex-direction: column;
      }

      .field-label {
        font-weight: bold;
        color: #666;
        font-size: 0.8em;
        margin-bottom: 0.2em;
      }

      .field-value {
        color: #000;
        font-size: 0.9em;
      }

      .field-images {
        display: flex;
        gap: 0.5em;
        margin-top: 0.5em;
      }

      .prop-image {
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 4px;
        border: 1px solid #ddd;
      }

      /* Luxury Magazine Prop Card Styles */
      .prop-card {
        background: white;
        position: relative;
        overflow: hidden;
      }

      .prop-card.portrait {
        display: flex;
        flex-direction: column;
        height: calc(100% - 20mm);
        min-height: 240mm;
      }

      .prop-card.landscape {
        display: flex;
        flex-direction: row;
        height: calc(100% - 15mm);
        min-height: 170mm;
        margin-bottom: 1em;
        gap: 0;
      }

      .prop-image-section {
        position: relative;
        background: #fafafa;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3em 2em;
        overflow: hidden;
      }

      .prop-card.portrait .prop-image-section {
        flex: 0 0 35%;
        background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
        padding: 1em;
      }

      .prop-card.landscape .prop-image-section {
        flex: 0 0 40%;
        background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
        padding: 1.5em;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }

      .prop-main-image {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        filter: contrast(1.05) brightness(1.02);
        transition: all 0.3s ease;
      }

      .prop-card.portrait .prop-main-image {
        max-height: 120px;
        width: 100%;
        object-fit: cover;
        object-position: center;
      }

      .prop-card.landscape .prop-main-image {
        max-height: 100px;
        width: 100%;
        object-fit: cover;
        object-position: center;
      }

      .no-image {
        width: 80px;
        height: 60px;
        background: #e5e7eb;
        border: 2px dashed #9ca3af;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
        font-size: 0.7em;
        font-weight: 500;
      }

      .prop-details {
        padding: 3em 2.5em;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: white;
      }

      .prop-card.portrait .prop-details {
        flex: 1;
      }

      .prop-card.landscape .prop-details {
        flex: 1;
      }

      .prop-header {
        margin-bottom: 2em;
        padding-bottom: 1.5em;
        border-bottom: 1px solid #e5e5e5;
        position: relative;
      }

      .prop-header::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        width: 40px;
        height: 2px;
        background: ${accentColor};
      }

      .prop-name {
        font-size: 2.2em;
        color: ${primaryColor};
        margin: 0 0 0.8em 0;
        font-weight: 200;
        letter-spacing: 0.02em;
        line-height: 1.1;
      }

      .prop-card.landscape .prop-name {
        font-size: 1.8em;
      }

      .act-scene {
        background: ${accentColor};
        color: white;
        padding: 0.4em 1em;
        border-radius: 0;
        font-size: 0.8em;
        font-weight: 500;
        display: inline-block;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .prop-fields {
        display: grid;
        gap: 1.5em;
      }

      .prop-card.portrait .prop-fields {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      .prop-card.landscape .prop-fields {
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      .field {
        padding: 0;
        background: transparent;
        border: none;
        position: relative;
        margin-bottom: 0.1em;
        line-height: 1.2;
      }

      .field-span-full {
        grid-column: 1 / -1;
      }


      /* URL fields with inline QR codes */
      .url-field {
        display: flex;
        align-items: center;
        gap: 0.5em;
      }

      .url-content {
        display: flex;
        align-items: center;
        gap: 0.5em;
        flex: 1;
      }

      .url-link {
        color: #2563eb;
        text-decoration: underline;
        flex: 1;
        word-break: break-all;
      }

      .inline-qr {
        width: 20px;
        height: 20px;
        background: #f3f4f6;
        border: 1px solid #d1d5db;
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        color: #6b7280;
      }

      /* Ultra-compact content sections for A4 fit */
      .content-section {
        margin-bottom: 0.4em;
        padding-bottom: 0.2em;
        border-bottom: 1px solid #e5e7eb;
        page-break-inside: avoid;
      }

      .content-section:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }

      .section-title {
        font-size: 0.75em;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 0.2em 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid #d1d5db;
        padding-bottom: 0.1em;
      }

      .section-content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.1em 0.8em;
        align-items: start;
      }

      /* Inline fields: label and value on same line */
      .inline-field {
        display: flex;
        align-items: baseline;
        gap: 0.2em;
        font-size: 0.8em;
        line-height: 1.1;
      }

      .inline-field .field-label {
        font-weight: 500;
        color: ${secondaryColor};
        font-size: 0.75em;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 400;
        white-space: nowrap;
      }

      .inline-field .field-value {
        color: ${primaryColor};
        font-size: 1em;
        line-height: 1.5;
        font-weight: 300;
        flex: 1;
      }

      /* Textarea fields: also inline for compact layout */
      .textarea-field {
        display: flex;
        align-items: baseline;
        gap: 0.2em;
        font-size: 0.8em;
        line-height: 1.1;
      }

      .textarea-field .field-label {
        font-weight: 500;
        color: ${secondaryColor};
        font-size: 0.75em;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 400;
        white-space: nowrap;
      }

      .textarea-field .field-value {
        color: ${primaryColor};
        font-size: 1em;
        line-height: 1.3;
        font-weight: 300;
        flex: 1;
      }

      .field::after {
        content: '';
        position: absolute;
        bottom: -0.5em;
        left: 0;
        width: 30px;
        height: 1px;
        background: #e5e5e5;
      }

      /* Footer Styles */
      .page-footer {
        position: absolute;
        bottom: 8mm;
        left: 10mm;
        right: 10mm;
        text-align: center;
        font-size: 0.6em;
        color: ${secondaryColor};
        border-top: 1px solid #e5e5e5;
        padding-top: 1mm;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .page-number {
        font-size: 0.6em;
        color: #999;
      }

      .page-footer a {
        color: ${accentColor};
        text-decoration: none;
        font-weight: 500;
      }

      .page-footer a:hover {
        text-decoration: underline;
      }

      /* QR Code Styles */
      .qr-codes {
        display: flex;
        gap: 1em;
        margin-top: 1em;
        justify-content: center;
      }

      .qr-code {
        text-align: center;
        padding: 1em;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .qr-label {
        font-size: 0.8em;
        font-weight: 600;
        color: #374151;
        margin-bottom: 0.5em;
      }

      .qr-image {
        width: 60px;
        height: 60px;
        border-radius: 4px;
        border: 1px solid #ddd;
      }

      .qr-placeholder {
        width: 60px;
        height: 60px;
        background: #e5e7eb;
        border: 2px dashed #9ca3af;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7em;
        color: #6b7280;
        margin: 0 auto;
      }

      .props-table-container {
        overflow-x: auto;
      }

      .props-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1em;
      }

      .props-table th,
      .props-table td {
        border: 1px solid #d1d5db;
        padding: 8px 12px;
        text-align: left;
        vertical-align: top;
      }

      .props-table th {
        background-color: #f3f4f6;
        font-weight: bold;
        color: #000;
      }

      .props-table tr:nth-child(even) {
        background-color: #f9fafb;
      }

      .props-table tr:hover {
        background-color: #f3f4f6;
      }

      .image-cell {
        text-align: center;
        vertical-align: middle;
      }

      .prop-image {
        display: inline-block;
        border-radius: 4px;
        object-fit: cover;
      }

      .more-images {
        font-size: 0.8em;
        color: #666;
        margin-top: 2px;
      }

      .no-props {
        text-align: center;
        font-size: 1.2em;
        color: #000;
        padding: 2em;
      }

      .watermark {
        position: absolute;
        bottom: 20px;
        right: 20px;
        font-size: 0.8em;
        color: ${primaryColor}40;
        font-weight: bold;
        transform: rotate(-45deg);
        z-index: 1000;
      }

      @media print {
        .page {
          box-shadow: none;
          margin: 0;
        }
      }
    `;
  }

  private escapeHtml(text: string): string {
    if (typeof text !== 'string') {
      text = String(text || '');
    }
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
