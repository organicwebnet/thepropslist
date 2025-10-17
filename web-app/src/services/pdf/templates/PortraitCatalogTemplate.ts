import type { Prop } from '../../../types/props';
import { type UserPermissions } from '../FieldMappingService';
import { type PdfTemplate, type PdfTemplateOptions, type PdfTemplateResult } from '../PdfTemplateRegistry';
import QRCode from 'qrcode';

export class PortraitCatalogTemplate implements PdfTemplate {
  id = 'portrait-catalog';
  name = 'Portrait Catalog';
  description = 'Paper-optimized portrait layout with image top, content below';
  layout = 'portrait' as const;
  icon = '📄';
  color = 'bg-emerald-600';
  defaultFields = [
    'name', 'description', 'images', 'category', 'status', 'quantity', 'price', 
    'location', 'currentLocation', 'materials', 'condition', 'manufacturer', 
    'length', 'width', 'height', 'weight', 'color', 'source', 'purchaseDate', 'notes'
  ];

  async generatePdf(
    props: Prop[],
    showData: any,
    options: PdfTemplateOptions,
    userPermissions?: UserPermissions
  ): Promise<PdfTemplateResult> {
    try {
      const businessName = options.businessName || showData.name || 'BUSINESS NAME';
      const catalogTitle = 'PROPS CATALOG';
      
      // Generate title page
      const titlePage = this.generateTitlePage(showData, options, props.length);
      
      // Generate props pages with portrait layout
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
      console.error('PortraitCatalogTemplate error:', error);
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
      <div class="page title-page portrait">
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
    const propsPerPage = 1; // 1 prop per portrait page for better detail
    
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
      <div class="page props-page portrait">
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
          width: 100, 
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
      .map(([key, field]) => {
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
    const primaryColor = options.branding?.primaryColor || '#059669';
    const secondaryColor = options.branding?.secondaryColor || '#64748b';
    const accentColor = options.branding?.accentColor || '#10b981';
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
        width: 210mm; /* A4 Portrait */
        height: 297mm;
        padding: 10mm 15mm; /* Reduced margins for more content space */
        margin: 0 auto;
        background: white;
        box-sizing: border-box;
        page-break-after: always;
        page-break-inside: avoid;
        position: relative;
        display: flex;
        flex-direction: column;
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
        margin-bottom: 50px;
        padding: 0 20px;
      }

      .company-logo {
        max-height: 60px;
        max-width: 180px;
        object-fit: contain;
      }

      .show-logo {
        max-height: 60px;
        max-width: 180px;
        object-fit: contain;
      }

      .main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 50px 0;
      }

      .document-title {
        font-size: 56px;
        font-weight: 300;
        color: #2c3e50;
        margin: 0 0 25px 0;
        letter-spacing: 10px;
        text-transform: uppercase;
      }

      .divider {
        width: 150px;
        height: 3px;
        background: ${primaryColor};
        margin: 0 auto 35px auto;
      }

      .show-name {
        font-size: 36px;
        font-weight: 400;
        color: #34495e;
        margin: 0 0 20px 0;
        letter-spacing: 3px;
      }

      .venue {
        font-size: 20px;
        color: #7f8c8d;
        margin: 0 0 15px 0;
        font-weight: 300;
      }

      .company-name {
        font-size: 18px;
        color: #95a5a6;
        margin: 0;
        font-weight: 300;
        letter-spacing: 1px;
      }

      .footer-info {
        display: flex;
        justify-content: space-between;
        width: 100%;
        margin-top: 50px;
        padding: 25px 0;
        border-top: 1px solid #ecf0f1;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .label {
        font-size: 14px;
        color: #7f8c8d;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 500;
      }

      .value {
        font-size: 18px;
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
        margin-bottom: 25px;
        padding-bottom: 15px;
        border-bottom: 2px solid ${primaryColor};
      }

      .business-name {
        font-size: 16px;
        font-weight: 600;
        color: ${primaryColor};
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .page-number {
        font-size: 14px;
        color: ${secondaryColor};
        font-weight: 500;
      }

      .props-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0;
      }

      .prop-card {
        display: flex;
        flex-direction: column;
        gap: 2mm;
        padding: 2mm;
        border: none;
        background: #ffffff;
        min-height: 200mm; /* Proper A4 content height */
        height: 100%;
        box-sizing: border-box;
      }

      .prop-image-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        flex: 0 0 50%; /* Reduce to 50% to give more space to content */
      }

      .prop-image {
        width: 50%;
        max-width: 140mm;
        object-fit: contain;
        border-radius: 6px;
        border: 2px solid ${accentColor};
        background: #f8f9fa;
      }

      .no-image {
        width: 50%;
        max-width: 140mm;
        height: 140mm;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f3f4f6;
        border: 3px dashed #d1d5db;
        border-radius: 6px;
        color: #6b7280;
        font-size: 16px;
        font-weight: 500;
      }

      .qr-code {
        width: 60px;
        height: 60px;
        border: 1px solid ${primaryColor};
        border-radius: 4px;
        background: #ffffff;
        margin-top: 4px;
      }

      .prop-content-section {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1; /* Take remaining space */
        padding: 2mm 0;
      }

      .prop-name {
        font-size: 20px;
        font-weight: 700;
        color: ${primaryColor};
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 1px;
        text-align: center;
        border-bottom: 2px solid ${accentColor};
        padding-bottom: 4px;
      }

      .prop-description {
        font-size: 14px;
        color: #374151;
        line-height: 1.5;
        margin-bottom: 12px;
        font-style: italic;
        text-align: center;
        padding: 5px;
        background: #f9fafb;
        border-radius: 6px;
        border-left: 3px solid ${accentColor};
      }

      .prop-fields {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr; /* 3 columns for portrait */
        gap: 6px;
        margin-top: 8px;
      }

      .field-row {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 4px 6px;
        background: #f8fafc;
        border-radius: 4px;
        border-left: 2px solid ${accentColor};
        min-height: 35px;
        justify-content: center;
      }

      .field-label {
        font-weight: 600;
        color: ${secondaryColor};
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.2px;
        line-height: 1.2;
      }

      .field-value {
        color: #000000;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.2;
      }

      .no-fields {
        color: #6b7280;
        font-style: italic;
        font-size: 14px;
        text-align: center;
        padding: 20px;
        background: #f3f4f6;
        border-radius: 8px;
      }

      /* Print optimizations */
      @media print {
        .page {
          margin: 0;
          box-shadow: none;
        }
        
        .prop-card {
          break-inside: avoid;
        }
      }

      /* Responsive adjustments for smaller screens */
      @media screen and (max-width: 1200px) {
        .page {
          width: 100%;
          height: auto;
          min-height: 297mm; /* Use mm units for consistency */
        }
        
        .prop-fields {
          grid-template-columns: 1fr 1fr; /* 2 columns on mobile */
        }
        
        .prop-image, .no-image {
          height: 100mm; /* Smaller for mobile screens */
        }
        
        .prop-image-section {
          flex: 0 0 50%; /* Reduce image section on mobile */
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
