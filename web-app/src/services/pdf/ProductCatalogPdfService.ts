import type { Prop } from '../../types/props';
import { FieldMappingService, type UserPermissions } from './FieldMappingService';
import QRCode from 'qrcode';

export interface ProductCatalogPdfOptions {
  selectedFields: Record<string, boolean>;
  title: string;
  showData: {
    name: string;
    venue?: string;
    description?: string;
  };
  businessName?: string;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    fontSize?: 'small' | 'medium' | 'large';
  };
  logoUrl?: string;
  baseUrl?: string; // Base URL for QR code links
}

export interface ProductCatalogPdfResult {
  success: boolean;
  html: string;
  css: string;
  error?: string;
}

export class ProductCatalogPdfService {
  private static instance: ProductCatalogPdfService;
  private fieldMappingService: FieldMappingService;

  private constructor() {
    this.fieldMappingService = FieldMappingService.getInstance();
  }

  public static getInstance(): ProductCatalogPdfService {
    if (!ProductCatalogPdfService.instance) {
      ProductCatalogPdfService.instance = new ProductCatalogPdfService();
    }
    return ProductCatalogPdfService.instance;
  }

  public async generateProductCatalogPdf(
    props: Prop[],
    showData: any,
    userPermissions: UserPermissions,
    options: ProductCatalogPdfOptions
  ): Promise<ProductCatalogPdfResult> {
    try {
      console.log('ProductCatalogPdfService: Starting PDF generation');
      console.log('Props count:', props.length);
      console.log('Props sample:', props.slice(0, 2));
      console.log('Show data:', showData);
      console.log('User permissions:', userPermissions);
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
        selectedFieldKeys.push('name', 'description', 'category', 'status', 'price', 'location');
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
      console.error('ProductCatalogPdfService error:', error);
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
    options: ProductCatalogPdfOptions
  ): Promise<string> {
    const businessName = options.businessName || showData.name || 'BUSINESS NAME';
    const catalogTitle = 'PRODUCT CATALOG';
    
    // Generate pages for each prop
    const pages = await Promise.all(
      props.map(async (prop, index) => {
        return await this.generatePropPage(prop, selectedFieldKeys, accessibleFields, options, index + 1);
      })
    );

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this.escapeHtml(options.title)}</title>
        <style>${this.generateCss(options)}</style>
      </head>
      <body>
        ${pages.join('\n')}
      </body>
      </html>
    `;
  }

  private async generatePropPage(
    prop: Prop,
    selectedFieldKeys: string[],
    accessibleFields: any[],
    options: ProductCatalogPdfOptions,
    pageNumber: number
  ): Promise<string> {
    const businessName = options.businessName || 'BUSINESS NAME';
    const catalogTitle = 'PRODUCT CATALOG';
    
    // Get main product image
    const mainImage = prop.images && prop.images.length > 0 ? prop.images[0] : null;
    const secondaryImage = prop.images && prop.images.length > 1 ? prop.images[1] : mainImage;
    
    // Generate QR code for prop link - read-only, non-discoverable URL
    const propUrl = options.baseUrl ? `${options.baseUrl}/view/prop/${prop.id}` : `#prop-${prop.id}`;
    let qrCodeDataUrl = '';
    try {
      console.log('Generating QR code for URL:', propUrl);
      qrCodeDataUrl = await QRCode.toDataURL(propUrl, {
        width: 100,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      console.log('QR code generated successfully, length:', qrCodeDataUrl.length);
    } catch (error) {
      console.warn('Failed to generate QR code for prop:', prop.id, error);
    }

    // Format price
    const price = prop.price ? this.formatPrice(prop.price) : '£100';
    
    // Generate product details list
    const productDetails = this.generateProductDetailsList(prop, selectedFieldKeys, accessibleFields);
    
    // Generate main image HTML
    const mainImageHtml = mainImage 
      ? `<img src="${this.escapeHtml(mainImage.url)}" alt="${this.escapeHtml(prop.name || 'Product image')}" class="main-product-image" />`
      : '<div class="main-product-image placeholder">No image available</div>';
    
    // Generate secondary image HTML
    const secondaryImageHtml = secondaryImage 
      ? `<img src="${this.escapeHtml(secondaryImage.url)}" alt="${this.escapeHtml(prop.name || 'Product image')}" class="secondary-product-image" />`
      : '<div class="secondary-product-image placeholder">No image available</div>';

    return `
      <div class="page product-catalog-page">
        <!-- Header -->
        <div class="page-header">
          <div class="business-name">${this.escapeHtml(businessName)}</div>
          <div class="catalog-title">${catalogTitle}</div>
        </div>

        <!-- Main Product Image -->
        <div class="main-image-section">
          ${mainImageHtml}
        </div>

        <!-- Product Information Section -->
        <div class="product-info-section">
          <!-- Left Column -->
          <div class="left-column">
            <h1 class="product-name">${this.escapeHtml(prop.name || 'Product Name')}</h1>
            <div class="product-price">${price}</div>
            <div class="product-description">
              ${this.escapeHtml(prop.description || 'Title and description of prop will be displayed here. This provides detailed information about the prop, its features, and any relevant details for production use.')}
            </div>
            <div class="product-indicators">
              <div class="indicator active"></div>
              <div class="indicator"></div>
              <div class="indicator"></div>
            </div>
          </div>

          <!-- Right Column -->
          <div class="right-column">
            ${qrCodeDataUrl ? `
              <div class="qr-code-section">
                <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code" />
                <div class="qr-label">QR code link to prop on site</div>
                <a href="${this.escapeHtml(propUrl)}" class="prop-link" target="_blank">${this.escapeHtml(propUrl)}</a>
              </div>
            ` : ''}
            
            <div class="product-details-section">
              <h3 class="details-title">PRODUCT DETAILS</h3>
              <ul class="product-details-list">
                ${productDetails}
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private generateProductDetailsList(
    prop: Prop,
    selectedFieldKeys: string[],
    accessibleFields: any[]
  ): string {
    const details: string[] = [];
    
    // Always include key details
    if (prop.category) {
      details.push(`<li><strong>Category:</strong> ${this.escapeHtml(prop.category)}</li>`);
    }
    
    if (prop.status) {
      details.push(`<li><strong>Status:</strong> ${this.escapeHtml(prop.status)}</li>`);
    }
    
    if (prop.quantity && prop.quantity > 1) {
      details.push(`<li><strong>Quantity:</strong> ${prop.quantity}</li>`);
    }
    
    if (prop.location) {
      details.push(`<li><strong>Location:</strong> ${this.escapeHtml(prop.location)}</li>`);
    }
    
    if (prop.act && prop.scene) {
      details.push(`<li><strong>Act/Scene:</strong> ${prop.act}.${prop.scene}</li>`);
    }
    
    // Add physical dimensions if available
    const dimensions = [];
    if (prop.length) dimensions.push(`L: ${prop.length}`);
    if (prop.width) dimensions.push(`W: ${prop.width}`);
    if (prop.height) dimensions.push(`H: ${prop.height}`);
    if (dimensions.length > 0) {
      details.push(`<li><strong>Dimensions:</strong> ${dimensions.join(', ')}</li>`);
    }
    
    // Add weight if available
    if (prop.weight) {
      details.push(`<li><strong>Weight:</strong> ${prop.weight}</li>`);
    }
    
    // Add materials if available
    if (prop.materials) {
      const materialsText = Array.isArray(prop.materials) ? prop.materials.join(', ') : prop.materials;
      details.push(`<li><strong>Materials:</strong> ${this.escapeHtml(materialsText)}</li>`);
    }
    
    // Add color if available
    if (prop.color) {
      details.push(`<li><strong>Color:</strong> ${this.escapeHtml(prop.color)}</li>`);
    }
    
    // Add manufacturer if available
    if (prop.manufacturer) {
      details.push(`<li><strong>Manufacturer:</strong> ${this.escapeHtml(prop.manufacturer)}</li>`);
    }
    
    // Add condition if available
    if (prop.condition) {
      details.push(`<li><strong>Condition:</strong> ${this.escapeHtml(prop.condition)}</li>`);
    }
    
    // Add any other selected fields that have values
    selectedFieldKeys.forEach(fieldKey => {
      if (prop[fieldKey as keyof Prop] && !details.some(d => d.includes(fieldKey))) {
        const value = prop[fieldKey as keyof Prop];
        if (value && value !== '' && typeof value === 'string') {
          const label = this.getFieldLabel(fieldKey);
          details.push(`<li><strong>${label}:</strong> ${this.escapeHtml(value)}</li>`);
        }
      }
    });
    
    return details.join('');
  }

  private getFieldLabel(fieldKey: string): string {
    const labels: Record<string, string> = {
      name: 'Name',
      description: 'Description',
      category: 'Category',
      subcategory: 'Subcategory',
      status: 'Status',
      quantity: 'Quantity',
      price: 'Price',
      location: 'Location',
      currentLocation: 'Current Location',
      act: 'Act',
      scene: 'Scene',
      sceneName: 'Scene Name',
      manufacturer: 'Manufacturer',
      model: 'Model',
      serialNumber: 'Serial Number',
      barcode: 'Barcode',
      condition: 'Condition',
      materials: 'Materials',
      color: 'Color',
      weight: 'Weight',
      length: 'Length',
      width: 'Width',
      height: 'Height',
      depth: 'Depth',
      tags: 'Tags',
      notes: 'Notes',
      source: 'Source',
      purchaseDate: 'Purchase Date',
      warranty: 'Warranty',
      isRented: 'Rented',
      rentalSource: 'Rental Source',
      rentalDueDate: 'Rental Due Date',
      fragile: 'Fragile',
      isBreakable: 'Breakable',
      isHazardous: 'Hazardous',
      storageRequirements: 'Storage Requirements',
      usageInstructions: 'Usage Instructions',
      handlingInstructions: 'Handling Instructions',
      safetyNotes: 'Safety Notes',
      assignedTo: 'Assigned To',
      checkedOutDetails: 'Checked Out Details'
    };
    
    return labels[fieldKey] || fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1);
  }

  private formatPrice(price: number | string): string {
    if (typeof price === 'string') {
      return price;
    }
    
    if (price === 0) {
      return 'Price on request';
    }
    
    return `£${price.toFixed(2)}`;
  }

  private generateCss(options: ProductCatalogPdfOptions): string {
    const branding = options.branding || {};
    const primaryColor = branding.primaryColor || '#000000';
    const secondaryColor = branding.secondaryColor || '#666666';
    const accentColor = branding.accentColor || '#22c55e';
    const fontFamily = branding.fontFamily || 'Arial, sans-serif';
    const fontSize = branding.fontSize || 'medium';
    
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: '${fontFamily}';
        font-size: ${fontSize === 'small' ? '12px' : fontSize === 'large' ? '16px' : '14px'};
        line-height: 1.4;
        color: #000000;
        background: #ffffff;
        font-weight: 400;
      }

      .page {
        width: 210mm;
        height: 297mm;
        padding: 20mm;
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

      .product-catalog-page {
        background: #ffffff;
      }

      /* Header - matches mockup exactly */
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 0;
        border-bottom: none;
      }

      .business-name {
        font-size: 14px;
        font-weight: 600;
        color: #000000;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .catalog-title {
        font-size: 14px;
        font-weight: 600;
        color: #000000;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Main Product Image - large and centered */
      .main-image-section {
        margin-bottom: 30px;
        text-align: center;
        width: 100%;
      }

      .main-product-image {
        width: 100%;
        max-width: 100%;
        height: auto;
        max-height: 300px;
        object-fit: cover;
        border-radius: 0;
        box-shadow: none;
        border: none;
      }

      .main-product-image.placeholder {
        width: 100%;
        height: 300px;
        background: #f8f8f8;
        border: 1px solid #e0e0e0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
        font-style: italic;
        border-radius: 0;
      }

      /* Product Information Section - two column layout */
      .product-info-section {
        display: flex;
        gap: 40px;
        flex: 1;
        align-items: flex-start;
      }

      .left-column {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .right-column {
        flex: 0 0 180px;
        display: flex;
        flex-direction: column;
        gap: 15px;
      }

      /* Left Column Content - matches mockup styling */
      .product-name {
        font-size: 24px;
        font-weight: 700;
        color: #000000;
        margin-bottom: 10px;
        line-height: 1.2;
        text-transform: none;
      }

      .product-price {
        font-size: 18px;
        font-weight: 600;
        color: #000000;
        margin-bottom: 20px;
      }

      .product-description {
        font-size: 14px;
        line-height: 1.6;
        color: #333333;
        margin-bottom: 30px;
        flex: 1;
        text-align: left;
      }

      .product-indicators {
        display: flex;
        gap: 8px;
        margin-top: auto;
        align-items: center;
      }

      .indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #e0e0e0;
      }

      .indicator.active {
        background: ${accentColor};
      }

      /* Right Column Content - matches mockup layout */
      .secondary-image-section {
        text-align: center;
        margin-bottom: 10px;
      }

      .secondary-product-image {
        width: 100%;
        max-width: 120px;
        height: 120px;
        object-fit: cover;
        border-radius: 0;
        box-shadow: none;
        border: 1px solid #e0e0e0;
      }

      .secondary-product-image.placeholder {
        width: 120px;
        height: 120px;
        background: #f8f8f8;
        border: 1px solid #e0e0e0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
        font-style: italic;
        font-size: 12px;
        border-radius: 0;
      }

      .qr-code-section {
        text-align: center;
        padding: 10px;
        background: #ffffff;
        border: 1px solid #e0e0e0;
        margin-bottom: 15px;
      }

      .qr-code {
        width: 60px;
        height: 60px;
        margin-bottom: 5px;
        border: 1px solid #e0e0e0;
      }

      .qr-label {
        font-size: 10px;
        color: #666666;
        font-style: italic;
        text-align: center;
        margin-bottom: 8px;
      }

      .prop-link {
        font-size: 10px;
        color: #0066cc;
        text-decoration: underline;
        text-align: center;
        display: block;
        word-break: break-all;
        line-height: 1.2;
      }

      .prop-link:hover {
        color: #004499;
      }

      .product-details-section {
        flex: 1;
      }

      .details-title {
        font-size: 12px;
        font-weight: 600;
        color: #000000;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .product-details-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .product-details-list li {
        margin-bottom: 6px;
        font-size: 12px;
        line-height: 1.3;
        color: #333333;
        position: relative;
        padding-left: 0;
      }

      .product-details-list li:before {
        content: "•";
        color: #000000;
        font-weight: bold;
        position: absolute;
        left: -12px;
      }

      .product-details-list li strong {
        color: #000000;
        font-weight: 600;
      }

      /* Responsive adjustments for print */
      @media print {
        body {
          background: white;
        }
        
        .page {
          margin: 0;
          box-shadow: none;
          page-break-after: always;
        }
        
        .page:last-child {
          page-break-after: avoid;
        }
      }

      /* Ensure proper page breaks */
      .product-catalog-page {
        page-break-inside: avoid;
      }
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
