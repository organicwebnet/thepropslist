import type { Prop } from '../../../types/props';
import { type UserPermissions } from '../FieldMappingService';
import { type PdfTemplate, type PdfTemplateOptions, type PdfTemplateResult } from '../PdfTemplateRegistry';
import QRCode from 'qrcode';

export class LandscapeTemplate implements PdfTemplate {
  id = 'landscape';
  name = 'Landscape Catalog';
  description = 'Paper-optimized landscape layout with image left, content right';
  layout = 'landscape' as const;
  icon = '📋';
  color = 'bg-blue-600';
  defaultFields = [
    'name', 'description', 'images', 'category', 'status', 'quantity', 'price', 
    'location', 'currentLocation', 'materials', 'condition', 'manufacturer', 
    'length', 'width', 'height', 'weight', 'color', 'source', 'purchaseDate', 'notes'
  ];

  async generatePdf(
    props: Prop[],
    showData: any,
    options: PdfTemplateOptions,
    _userPermissions?: UserPermissions
  ): Promise<PdfTemplateResult> {
    try {
      
      // Generate title page
      const titlePage = this.generateTitlePage(showData, options, props.length);
      
      // Generate props pages with landscape layout
      const propsPages = await this.generatePropsPages(props, options);

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${this.escapeHtml(showData.name)} - Props Catalog</title>
          <style>${this.generateCss(options)}</style>
        </head>
        <body>
          ${titlePage}
          ${propsPages}
        </body>
        </html>
      `;

      return {
        success: true,
        html,
        css: this.generateCss(options)
      };
    } catch (error) {
      console.error('LandscapeTemplate error:', error);
      return {
        success: false,
        html: '',
        css: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private generateTitlePage(showData: any, options: PdfTemplateOptions, propCount: number): string {
    const businessName = options.businessName || showData.name || 'BUSINESS NAME';
    const showName = showData.name || 'SHOW NAME';
    const venue = showData.venue || 'VENUE';
    const showLogo = showData.logoImage?.url;
    
    return `
      <div class="page title-page landscape">
        <div class="title-content">
          <div class="header-section">
            ${options.logoUrl ? `<img src="${options.logoUrl}" alt="${businessName}" class="company-logo" onerror="this.style.display='none';" />` : ''}
            ${showLogo ? `<img src="${showLogo}" alt="${showName}" class="show-logo" onerror="this.style.display='none';" />` : ''}
          </div>
          
          <div class="main-content">
            <h1 class="document-title">PROPS CATALOG</h1>
            <div class="divider"></div>
            <h2 class="show-name">${this.escapeHtml(showName)}</h2>
            <p class="venue">${this.escapeHtml(venue)}</p>
            <p class="company-name">${this.escapeHtml(businessName)}</p>
          </div>
          
          <div class="footer-info">
            <div class="info-item">
              <span class="label">Total Props:</span>
              <span class="value">${propCount}</span>
            </div>
            <div class="info-item">
              <span class="label">Generated:</span>
              <span class="value">${new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private async generatePropsPages(props: Prop[], options: PdfTemplateOptions): Promise<string> {
    const pages: string[] = [];
    const propsPerPage = 1; // 1 prop per landscape page for better print compatibility
    
    for (let i = 0; i < props.length; i += propsPerPage) {
      const pageProps = props.slice(i, i + propsPerPage);
      const pageHtml = await this.generatePropsPage(pageProps, options, Math.floor(i / propsPerPage) + 1);
      pages.push(pageHtml);
    }
    
    return pages.join('');
  }

  private async generatePropsPage(props: Prop[], options: PdfTemplateOptions, pageNumber: number): Promise<string> {
    const businessName = options.businessName || 'BUSINESS NAME';
    
    const propsHtml = await Promise.all(
      props.map(prop => this.generatePropCard(prop, options))
    );

    return `
      <div class="page props-page landscape">
        <div class="page-header">
          <div class="business-name">${this.escapeHtml(businessName)}</div>
          <div class="page-number">Page ${pageNumber}</div>
        </div>
        <div class="props-container">
          ${propsHtml.join('')}
        </div>
      </div>
    `;
  }

  private async generatePropCard(prop: Prop, options: PdfTemplateOptions): Promise<string> {
    const selectedFields = options.selectedFields || {};
    const includeQR = options.includeQRCodes !== false;
    
    // Get primary image
    const primaryImage = prop.images && prop.images.length > 0 ? prop.images[0] : null;
    
    // Generate QR code if enabled
    let qrCodeHtml = '';
    if (includeQR && options.baseUrl) {
      try {
        const qrUrl = `${options.baseUrl}/view/prop/${prop.id}`;
        const qrDataUrl = await QRCode.toDataURL(qrUrl, { 
          width: 80, 
          margin: 1,
          color: { dark: '#000000', light: '#FFFFFF' }
        });
        qrCodeHtml = `<img src="${qrDataUrl}" alt="QR Code" class="qr-code" />`;
      } catch (error) {
        console.warn('Failed to generate QR code:', error);
      }
    }

    // Generate field content
    const fieldsHtml = this.generateFieldContent(prop, selectedFields);

    return `
      <div class="prop-card">
        <div class="prop-image-section">
          ${primaryImage ? `
            <img src="${primaryImage.url}" alt="${this.escapeHtml(prop.name)}" class="prop-image" />
          ` : `
            <div class="no-image">No Image</div>
          `}
          ${qrCodeHtml}
        </div>
        <div class="prop-content-section">
          <h3 class="prop-name">${this.escapeHtml(prop.name)}</h3>
          ${prop.description ? `<div class="prop-description">${this.escapeHtml(prop.description)}</div>` : ''}
          <div class="prop-fields">
            ${fieldsHtml}
          </div>
        </div>
      </div>
    `;
  }

  private generateFieldContent(prop: Prop, selectedFields: Record<string, boolean>): string {
    const fieldMappings: Record<string, { label: string; value: any }> = {
      category: { label: 'Category', value: prop.category },
      status: { label: 'Status', value: prop.status },
      quantity: { label: 'Quantity', value: prop.quantity },
      location: { label: 'Location', value: prop.location },
      currentLocation: { label: 'Current Location', value: prop.currentLocation },
      condition: { label: 'Condition', value: prop.condition },
      materials: { label: 'Materials', value: prop.materials },
      manufacturer: { label: 'Manufacturer', value: prop.manufacturer },
      price: { label: 'Price', value: prop.price ? `$${prop.price}` : null },
      source: { label: 'Source', value: prop.source },
      purchaseDate: { label: 'Purchase Date', value: prop.purchaseDate },
      length: { label: 'Length', value: prop.length },
      width: { label: 'Width', value: prop.width },
      height: { label: 'Height', value: prop.height },
      weight: { label: 'Weight', value: prop.weight },
      color: { label: 'Color', value: prop.color },
      act: { label: 'Act', value: prop.act },
      scene: { label: 'Scene', value: prop.scene },
      notes: { label: 'Notes', value: prop.notes }
    };

    const fieldsHtml = Object.entries(fieldMappings)
      .filter(([key, _]) => selectedFields[key])
      .map(([_, field]) => {
        if (field.value !== null && field.value !== undefined && field.value !== '') {
          return `
            <div class="field-row">
              <span class="field-label">${field.label}:</span>
              <span class="field-value">${this.escapeHtml(String(field.value))}</span>
            </div>
          `;
        }
        return '';
      })
      .filter(html => html)
      .join('');

    return fieldsHtml || '<div class="no-fields">No additional information</div>';
  }

  private generateCss(options: PdfTemplateOptions): string {
    const primaryColor = options.branding?.primaryColor || '#1e40af';
    const secondaryColor = options.branding?.secondaryColor || '#64748b';
    const accentColor = options.branding?.accentColor || '#3b82f6';
    const fontFamily = options.branding?.fontFamily || 'Arial, sans-serif';
    const fontSize = options.branding?.fontSize || 'medium';

    const fontSizeMap = {
      small: '10px',
      medium: '12px',
      large: '14px'
    };

    const baseFontSize = fontSizeMap[fontSize];

    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: ${fontFamily};
        font-size: ${baseFontSize};
        line-height: 1.4;
        color: #000000;
        background: #ffffff;
        font-weight: 400;
      }

      .page {
        width: 297mm; /* A4 Landscape */
        height: 210mm;
        padding: 15mm 20mm; /* Proper margins */
        margin: 0 auto;
        background: white;
        box-sizing: border-box;
        page-break-after: always;
        page-break-inside: avoid;
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: hidden; /* Prevent content overflow */
      }

      .page:last-child {
        page-break-after: avoid;
      }

      /* Title Page */
      .title-page {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        position: relative;
      }

      .title-content {
        width: 100%;
        max-width: 90%;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .header-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-bottom: 40px;
        padding: 0 20px;
      }

      .company-logo {
        max-height: 50px;
        max-width: 150px;
        object-fit: contain;
      }

      .show-logo {
        max-height: 50px;
        max-width: 150px;
        object-fit: contain;
      }

      .main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 40px 0;
      }

      .document-title {
        font-size: 48px;
        font-weight: 300;
        color: #2c3e50;
        margin: 0 0 20px 0;
        letter-spacing: 8px;
        text-transform: uppercase;
      }

      .divider {
        width: 120px;
        height: 2px;
        background: ${primaryColor};
        margin: 0 auto 30px auto;
      }

      .show-name {
        font-size: 32px;
        font-weight: 400;
        color: #34495e;
        margin: 0 0 15px 0;
        letter-spacing: 2px;
      }

      .venue {
        font-size: 18px;
        color: #7f8c8d;
        margin: 0 0 10px 0;
        font-weight: 300;
      }

      .company-name {
        font-size: 16px;
        color: #95a5a6;
        margin: 0;
        font-weight: 300;
        letter-spacing: 1px;
      }

      .footer-info {
        display: flex;
        justify-content: space-between;
        width: 100%;
        margin-top: 40px;
        padding: 20px 0;
        border-top: 1px solid #ecf0f1;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
      }

      .label {
        font-size: 12px;
        color: #7f8c8d;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 500;
      }

      .value {
        font-size: 16px;
        color: ${primaryColor};
        font-weight: 600;
      }

      /* Props Page */
      .props-page {
        background: #ffffff;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid ${primaryColor};
      }

      .business-name {
        font-size: 14px;
        font-weight: 600;
        color: ${primaryColor};
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .page-number {
        font-size: 12px;
        color: ${secondaryColor};
        font-weight: 500;
      }

      .props-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .prop-card {
        display: flex;
        gap: 20px;
        padding: 15px;
        border: none;
        background: #ffffff;
        height: 100%; /* Use full available height */
        width: 100%;
        box-sizing: border-box;
      }

      .prop-image-section {
        flex: 0 0 45%; /* Use percentage for better responsiveness */
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
        justify-content: flex-start;
      }

      .prop-image {
        width: 100%;
        max-width: 100%;
        height: auto;
        max-height: 70%; /* Use percentage of container height */
        object-fit: contain; /* Prevent stretching, maintain aspect ratio */
        border-radius: 6px;
        border: 2px solid ${accentColor};
        background: #f8f9fa; /* Light background for better contrast */
      }

      .no-image {
        width: 100%;
        height: 200px; /* Fixed reasonable height */
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f3f4f6;
        border: 2px dashed #d1d5db;
        border-radius: 6px;
        color: #6b7280;
        font-size: 14px;
        font-weight: 500;
      }

      .qr-code {
        width: 80px;
        height: 80px;
        border: 2px solid ${primaryColor};
        border-radius: 6px;
        background: #ffffff;
      }

      .prop-content-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 10px 0;
        overflow: hidden; /* Prevent content overflow */
        min-height: 0; /* Allow flex shrinking */
      }

      .prop-name {
        font-size: 24px;
        font-weight: 700;
        color: ${primaryColor};
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        border-bottom: 2px solid ${accentColor};
        padding-bottom: 8px;
      }

      .prop-description {
        font-size: 16px;
        color: #374151;
        line-height: 1.6;
        margin-bottom: 20px;
        font-style: italic;
      }

      .prop-fields {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
        overflow-y: auto; /* Allow scrolling if content is too long */
        max-height: 100%; /* Prevent overflow */
      }

      .field-row {
        display: flex;
        gap: 15px;
        align-items: flex-start;
        padding: 8px 0;
        border-bottom: 1px solid #f3f4f6;
      }

      .field-row:last-child {
        border-bottom: none;
      }

      .field-label {
        font-weight: 600;
        color: ${secondaryColor};
        min-width: 100px;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .field-value {
        color: #000000;
        font-size: 14px;
        flex: 1;
        font-weight: 500;
        line-height: 1.4;
      }

      .no-fields {
        color: #6b7280;
        font-style: italic;
        font-size: 12px;
      }

      /* Print optimizations */
      @media print {
        body {
          background: white;
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }
        
        .page {
          margin: 0;
          box-shadow: none;
          page-break-after: always;
          page-break-inside: avoid;
        }
        
        .page:last-child {
          page-break-after: avoid;
        }
        
        .prop-card {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        
        .prop-image {
          max-height: 60%; /* Slightly smaller for print */
        }
      }

      /* Responsive adjustments for smaller screens */
      @media screen and (max-width: 1200px) {
        .page {
          width: 100%;
          height: auto;
          min-height: 210mm; /* Use mm units for consistency */
        }
        
        .prop-card {
          flex-direction: column;
          height: auto;
          min-height: 400px;
        }
        
        .prop-image-section {
          flex: none;
          width: 100%;
        }
        
        .prop-image {
          max-height: 300px;
          height: auto;
        }
        
        .no-image {
          height: 200px;
        }
      }
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}