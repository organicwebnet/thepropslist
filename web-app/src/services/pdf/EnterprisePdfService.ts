import type { Prop } from '../../types/props';
import { FieldMappingService, type UserPermissions, type FieldDefinition } from './FieldMappingService';
import DOMPurify from 'dompurify';

/**
 * Enterprise-grade PDF generation service with comprehensive permission handling,
 * data validation, security measures, and premium output quality
 */

export interface PdfGenerationOptions {
  selectedFields: Record<string, boolean>;
  layout: 'classic' | 'compact' | 'gallery' | 'technical' | 'inventory' | 'show-ready';
  orientation: 'portrait' | 'landscape';
  includeTitlePage: boolean;
  includeTableOfContents: boolean;
  includeContacts: boolean;
  includeSummary: boolean;
  includeImages: boolean;
  includeQR: boolean;
  includeWatermark: boolean;
  watermark?: string;
  title: string;
  subtitle?: string;
  header?: string;
  footer?: string;
  logoUrl?: string;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    fontSize: 'small' | 'medium' | 'large';
  };
  security: {
    includeUserInfo: boolean;
    includeGenerationTimestamp: boolean;
    includePermissionLevel: boolean;
    redactSensitiveData: boolean;
  };
  grouping: {
    enabled: boolean;
    method: 'category' | 'status' | 'location' | 'act_scene' | 'none';
    showGroupHeaders: boolean;
  };
  sorting: {
    method: 'alphabetical' | 'act_scene' | 'category' | 'status' | 'location' | 'custom';
    direction: 'asc' | 'desc';
    customOrder?: string[];
  };
  filtering: {
    enabled: boolean;
    criteria: {
      categories?: string[];
      statuses?: string[];
      locations?: string[];
      acts?: number[];
      scenes?: number[];
    };
  };
}

export interface PdfGenerationResult {
  success: boolean;
  html: string;
  css: string;
  metadata: {
    generatedAt: string;
    generatedBy: string;
    userRole: string;
    totalProps: number;
    accessibleProps: number;
    restrictedFields: number;
    sensitiveFields: number;
    permissionLevel: string;
  };
  errors?: string[];
  warnings?: string[];
}

export interface ShowData {
  id: string;
  name: string;
  description?: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  team?: Record<string, string> | Array<{ role: string; name: string; email?: string; phone?: string }>;
  collaborators?: Array<{ role: string; name: string; email?: string; phone?: string }>;
  contacts?: Array<{ role: string; name: string; email?: string; phone?: string }>;
  logoImage?: { url: string; caption?: string };
  branding?: {
    colors?: { primary?: string; secondary?: string; accent?: string };
    fonts?: { heading?: string; body?: string };
    watermark?: string;
  };
}

export class EnterprisePdfService {
  private static instance: EnterprisePdfService;
  private fieldMappingService: FieldMappingService;

  private constructor() {
    this.fieldMappingService = FieldMappingService.getInstance();
  }

  public static getInstance(): EnterprisePdfService {
    if (!EnterprisePdfService.instance) {
      EnterprisePdfService.instance = new EnterprisePdfService();
    }
    return EnterprisePdfService.instance;
  }

  /**
   * Generate a comprehensive PDF with full permission handling and data validation
   */
  public async generatePropsListPdf(
    props: Prop[],
    showData: ShowData,
    userPermissions: UserPermissions,
    options: PdfGenerationOptions
  ): Promise<PdfGenerationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate inputs
      this.validateInputs(props, showData, userPermissions, options);

      // Filter props based on user permissions
      const accessibleProps = this.filterPropsByPermissions(props, userPermissions, warnings);

      // Apply filtering criteria
      const filteredProps = this.applyFiltering(accessibleProps, options.filtering);

      // Sort props according to options
      const sortedProps = this.sortProps(filteredProps, options.sorting);

      // Group props if enabled
      const groupedProps = this.groupProps(sortedProps, options.grouping);

      // Generate permission-aware field list
      const accessibleFields = this.fieldMappingService.getFieldsForUser(userPermissions);
      const permissionSummary = this.fieldMappingService.getPermissionSummary(userPermissions);

      // Generate HTML content
      const html = this.generateHtml(
        groupedProps,
        showData,
        userPermissions,
        options,
        accessibleFields
      );

      // Generate CSS
      const css = this.generateCss(options);

      // Sanitize HTML for security
      const sanitizedHtml = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'img', 'a', 'ul', 'ol', 'li', 'strong', 'em', 'br', 'hr'],
        ALLOWED_ATTR: ['class', 'id', 'style', 'src', 'alt', 'href', 'target', 'width', 'height'],
        ALLOW_DATA_ATTR: false,
      });

      const generationTime = Date.now() - startTime;

      return {
        success: true,
        html: sanitizedHtml,
        css,
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: userPermissions.role,
          userRole: userPermissions.role,
          totalProps: props.length,
          accessibleProps: accessibleProps.length,
          restrictedFields: permissionSummary.restrictedFields,
          sensitiveFields: permissionSummary.sensitiveFields,
          permissionLevel: this.getPermissionLevel(userPermissions),
        },
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
      };

    } catch (error) {
      return {
        success: false,
        html: '',
        css: '',
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: userPermissions.role,
          userRole: userPermissions.role,
          totalProps: props.length,
          accessibleProps: 0,
          restrictedFields: 0,
          sensitiveFields: 0,
          permissionLevel: 'none',
        },
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      };
    }
  }

  private validateInputs(
    props: Prop[],
    showData: ShowData,
    userPermissions: UserPermissions,
    options: PdfGenerationOptions
  ): void {
    if (!props || props.length === 0) {
      throw new Error('No props provided for PDF generation');
    }

    if (!showData || !showData.id) {
      throw new Error('Invalid show data provided');
    }

    if (!userPermissions || !userPermissions.role) {
      throw new Error('Invalid user permissions provided');
    }

    if (!options || !options.title) {
      throw new Error('PDF generation options are incomplete');
    }
  }

  private filterPropsByPermissions(
    props: Prop[],
    userPermissions: UserPermissions,
    warnings: string[]
  ): Prop[] {
    const accessibleProps: Prop[] = [];
    let restrictedCount = 0;

    props.forEach(prop => {
      // Check if user has access to this prop's show
      if (prop.showId && userPermissions.showId && prop.showId !== userPermissions.showId) {
        // User might not have access to this show's props
        if (!userPermissions.isAdmin && !userPermissions.isOwner) {
          restrictedCount++;
          return;
        }
      }

      // Filter prop data based on field permissions
      const filteredProp = this.fieldMappingService.filterPropDataForUser(prop, userPermissions);
      
      // Only include props that have at least some accessible data
      if (Object.keys(filteredProp).length > 0) {
        accessibleProps.push(filteredProp as Prop);
      } else {
        restrictedCount++;
      }
    });

    if (restrictedCount > 0) {
      warnings.push(`${restrictedCount} props were restricted due to insufficient permissions`);
    }

    return accessibleProps;
  }

  private applyFiltering(props: Prop[], filtering: PdfGenerationOptions['filtering']): Prop[] {
    if (!filtering.enabled || !filtering.criteria) {
      return props;
    }

    return props.filter(prop => {
      const criteria = filtering.criteria!;

      if (criteria.categories && criteria.categories.length > 0) {
        if (!criteria.categories.includes(prop.category)) {
          return false;
        }
      }

      if (criteria.statuses && criteria.statuses.length > 0) {
        if (!criteria.statuses.includes(prop.status)) {
          return false;
        }
      }

      if (criteria.locations && criteria.locations.length > 0) {
        if (!criteria.locations.includes(prop.location || '')) {
          return false;
        }
      }

      if (criteria.acts && criteria.acts.length > 0) {
        if (!criteria.acts.includes(prop.act || 0)) {
          return false;
        }
      }

      if (criteria.scenes && criteria.scenes.length > 0) {
        if (!criteria.scenes.includes(prop.scene || 0)) {
          return false;
        }
      }

      return true;
    });
  }

  private sortProps(props: Prop[], sorting: PdfGenerationOptions['sorting']): Prop[] {
    const sortedProps = [...props];

    sortedProps.sort((a, b) => {
      let comparison = 0;

      switch (sorting.method) {
        case 'alphabetical':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'act_scene':
          if ((a.act || 0) !== (b.act || 0)) {
            comparison = (a.act || 0) - (b.act || 0);
          } else if ((a.scene || 0) !== (b.scene || 0)) {
            comparison = (a.scene || 0) - (b.scene || 0);
          } else {
            comparison = (a.name || '').localeCompare(b.name || '');
          }
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'location':
          comparison = (a.location || '').localeCompare(b.location || '');
          break;
        case 'custom':
          if (sorting.customOrder) {
            const aIndex = sorting.customOrder.indexOf(a.id);
            const bIndex = sorting.customOrder.indexOf(b.id);
            comparison = aIndex - bIndex;
          }
          break;
        default:
          comparison = (a.name || '').localeCompare(b.name || '');
      }

      return sorting.direction === 'desc' ? -comparison : comparison;
    });

    return sortedProps;
  }

  private groupProps(props: Prop[], grouping: PdfGenerationOptions['grouping']): Prop[] | Record<string, Prop[]> {
    if (!grouping.enabled || grouping.method === 'none') {
      return props;
    }

    const groups: Record<string, Prop[]> = {};

    props.forEach(prop => {
      let groupKey = '';

      switch (grouping.method) {
        case 'category':
          groupKey = prop.category || 'Uncategorised';
          break;
        case 'status':
          groupKey = prop.status || 'Unknown';
          break;
        case 'location':
          groupKey = prop.location || 'Unassigned';
          break;
        case 'act_scene':
          groupKey = `Act ${prop.act || 0}, Scene ${prop.scene || 0}`;
          break;
        default:
          groupKey = 'All Props';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(prop);
    });

    return groups;
  }

  private generateHtml(
    groupedProps: Prop[] | Record<string, Prop[]>,
    showData: ShowData,
    userPermissions: UserPermissions,
    options: PdfGenerationOptions,
    accessibleFields: FieldDefinition[]
  ): string {
    const pages: string[] = [];

    // Title page
    if (options.includeTitlePage) {
      pages.push(this.generateTitlePage(showData, userPermissions, options));
    }

    // Table of contents
    if (options.includeTableOfContents) {
      pages.push(this.generateTableOfContents(groupedProps, options));
    }

    // Summary page
    if (options.includeSummary) {
      pages.push(this.generateSummaryPage(groupedProps, userPermissions, options));
    }

    // Props pages
    if (Array.isArray(groupedProps)) {
      pages.push(...this.generatePropsPages(groupedProps, accessibleFields, options));
    } else {
      Object.entries(groupedProps).forEach(([groupName, props]) => {
        if (options.grouping.showGroupHeaders) {
          pages.push(this.generateGroupHeaderPage(groupName, props.length));
        }
        pages.push(...this.generatePropsPages(props, accessibleFields, options));
      });
    }

    // Contacts page
    if (options.includeContacts) {
      pages.push(this.generateContactsPage(showData, userPermissions));
    }

    // Security footer
    if (options.security.includeUserInfo || options.security.includeGenerationTimestamp) {
      pages.push(this.generateSecurityFooter(userPermissions, options));
    }

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

  private generateTitlePage(
    showData: ShowData,
    userPermissions: UserPermissions,
    options: PdfGenerationOptions
  ): string {
    const logoHtml = showData.logoImage?.url 
      ? `<img src="${this.escapeHtml(showData.logoImage.url)}" alt="Show Logo" class="title-logo" />`
      : '';

    const permissionLevel = this.getPermissionLevel(userPermissions);
    const securityInfo = options.security.includePermissionLevel 
      ? `<div class="permission-level">Permission Level: ${permissionLevel}</div>`
      : '';

    return `
      <div class="page title-page">
        <div class="title-content">
          ${logoHtml}
          <h1 class="main-title">${this.escapeHtml(options.title)}</h1>
          ${options.subtitle ? `<h2 class="subtitle">${this.escapeHtml(options.subtitle)}</h2>` : ''}
          <div class="show-info">
            <h3>${this.escapeHtml(showData.name)}</h3>
            ${showData.venue ? `<p class="venue">${this.escapeHtml(showData.venue)}</p>` : ''}
            ${showData.description ? `<p class="description">${this.escapeHtml(showData.description)}</p>` : ''}
          </div>
          ${securityInfo}
        </div>
        ${options.watermark ? `<div class="watermark">${this.escapeHtml(options.watermark)}</div>` : ''}
      </div>
    `;
  }

  private generateTableOfContents(
    groupedProps: Prop[] | Record<string, Prop[]>,
    options: PdfGenerationOptions
  ): string {
    let tocRows = '';

    if (Array.isArray(groupedProps)) {
      groupedProps.forEach((prop, index) => {
        tocRows += `
          <tr>
            <td>${index + 1}</td>
            <td>${this.escapeHtml(prop.name || 'Unnamed')}</td>
            <td>${this.escapeHtml(prop.category || '')}</td>
            <td>${this.escapeHtml(prop.status || '')}</td>
          </tr>
        `;
      });
    } else {
      Object.entries(groupedProps).forEach(([groupName, props]) => {
        tocRows += `
          <tr class="group-header">
            <td colspan="4"><strong>${this.escapeHtml(groupName)} (${props.length} items)</strong></td>
          </tr>
        `;
        props.forEach((prop, index) => {
          tocRows += `
            <tr>
              <td>${index + 1}</td>
              <td>${this.escapeHtml(prop.name || 'Unnamed')}</td>
              <td>${this.escapeHtml(prop.category || '')}</td>
              <td>${this.escapeHtml(prop.status || '')}</td>
            </tr>
          `;
        });
      });
    }

    return `
      <div class="page toc-page">
        <div class="page-header">
          <h2>Table of Contents</h2>
        </div>
        <div class="toc-content">
          <table class="toc-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Prop Name</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tocRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  private generateSummaryPage(
    groupedProps: Prop[] | Record<string, Prop[]>,
    userPermissions: UserPermissions,
    options: PdfGenerationOptions
  ): string {
    const props = Array.isArray(groupedProps) ? groupedProps : Object.values(groupedProps).flat();
    const permissionSummary = this.fieldMappingService.getPermissionSummary(userPermissions);

    const categoryCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const locationCounts: Record<string, number> = {};

    props.forEach(prop => {
      categoryCounts[prop.category] = (categoryCounts[prop.category] || 0) + 1;
      statusCounts[prop.status] = (statusCounts[prop.status] || 0) + 1;
      locationCounts[prop.location || 'Unassigned'] = (locationCounts[prop.location || 'Unassigned'] || 0) + 1;
    });

    const categoryRows = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([category, count]) => `<tr><td>${this.escapeHtml(category)}</td><td>${count}</td></tr>`)
      .join('');

    const statusRows = Object.entries(statusCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([status, count]) => `<tr><td>${this.escapeHtml(status)}</td><td>${count}</td></tr>`)
      .join('');

    const locationRows = Object.entries(locationCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([location, count]) => `<tr><td>${this.escapeHtml(location)}</td><td>${count}</td></tr>`)
      .join('');

    return `
      <div class="page summary-page">
        <div class="page-header">
          <h2>Summary Report</h2>
        </div>
        <div class="summary-content">
          <div class="summary-stats">
            <div class="stat-card">
              <h3>Total Props</h3>
              <div class="stat-number">${props.length}</div>
            </div>
            <div class="stat-card">
              <h3>Accessible Fields</h3>
              <div class="stat-number">${permissionSummary.accessibleFields}</div>
            </div>
            <div class="stat-card">
              <h3>Restricted Fields</h3>
              <div class="stat-number">${permissionSummary.restrictedFields}</div>
            </div>
            <div class="stat-card">
              <h3>Permission Level</h3>
              <div class="stat-number">${this.getPermissionLevel(userPermissions)}</div>
            </div>
          </div>
          
          <div class="summary-tables">
            <div class="summary-table">
              <h3>By Category</h3>
              <table>
                <thead><tr><th>Category</th><th>Count</th></tr></thead>
                <tbody>${categoryRows}</tbody>
              </table>
            </div>
            
            <div class="summary-table">
              <h3>By Status</h3>
              <table>
                <thead><tr><th>Status</th><th>Count</th></tr></thead>
                <tbody>${statusRows}</tbody>
              </table>
            </div>
            
            <div class="summary-table">
              <h3>By Location</h3>
              <table>
                <thead><tr><th>Location</th><th>Count</th></tr></thead>
                <tbody>${locationRows}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private generatePropsPages(
    props: Prop[],
    accessibleFields: FieldDefinition[],
    options: PdfGenerationOptions
  ): string[] {
    return props.map((prop, index) => this.generatePropPage(prop, accessibleFields, options, index + 1));
  }

  private generatePropPage(
    prop: Prop,
    accessibleFields: FieldDefinition[],
    options: PdfGenerationOptions,
    pageNumber: number
  ): string {
    const mainImage = prop.images && prop.images.length > 0 ? prop.images[0] : null;
    const galleryImages = prop.images && prop.images.length > 1 ? prop.images.slice(1) : [];

    const imageHtml = options.includeImages && mainImage 
      ? `
        <div class="prop-image-section">
          <img src="${this.escapeHtml(mainImage.url)}" alt="${this.escapeHtml(prop.name || 'Prop image')}" class="main-image" />
          ${galleryImages.length > 0 ? `
            <div class="gallery-images">
              ${galleryImages.map(img => `
                <img src="${this.escapeHtml(img.url)}" alt="Gallery image" class="gallery-image" />
              `).join('')}
            </div>
          ` : ''}
        </div>
      `
      : '';

    const detailsRows = accessibleFields
      .filter(field => prop[field.key] !== undefined && prop[field.key] !== null && prop[field.key] !== '')
      .map(field => {
        const value = this.fieldMappingService.formatFieldValue(field.key, prop[field.key]);
        return `
          <tr>
            <td class="field-label">${this.escapeHtml(field.label)}</td>
            <td class="field-value">${this.escapeHtml(value)}</td>
          </tr>
        `;
      })
      .join('');

    const qrCodeHtml = options.includeQR && prop.id 
      ? `<div class="qr-code"><img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(prop.id)}" alt="QR Code" /></div>`
      : '';

    return `
      <div class="page prop-page">
        <div class="page-header">
          <h2>${this.escapeHtml(prop.name || 'Unnamed Prop')}</h2>
          <div class="prop-badges">
            ${prop.category ? `<span class="badge category-badge">${this.escapeHtml(prop.category)}</span>` : ''}
            ${prop.status ? `<span class="badge status-badge">${this.escapeHtml(prop.status)}</span>` : ''}
          </div>
        </div>
        
        <div class="prop-content">
          ${imageHtml}
          
          <div class="prop-details">
            ${prop.description ? `<div class="prop-description">${this.escapeHtml(prop.description)}</div>` : ''}
            
            <table class="prop-details-table">
              <tbody>
                ${detailsRows}
              </tbody>
            </table>
            
            ${qrCodeHtml}
          </div>
        </div>
        
        <div class="page-footer">
          <span class="page-number">Page ${pageNumber}</span>
        </div>
      </div>
    `;
  }

  private generateGroupHeaderPage(groupName: string, itemCount: number): string {
    return `
      <div class="page group-header-page">
        <div class="group-header-content">
          <h2>${this.escapeHtml(groupName)}</h2>
          <p class="item-count">${itemCount} item${itemCount !== 1 ? 's' : ''}</p>
        </div>
      </div>
    `;
  }

  private generateContactsPage(showData: ShowData, userPermissions: UserPermissions): string {
    const contacts = this.extractContacts(showData);
    
    if (contacts.length === 0) {
      return '';
    }

    const contactRows = contacts.map(contact => `
      <tr>
        <td>${this.escapeHtml(contact.role)}</td>
        <td>${this.escapeHtml(contact.name)}</td>
        <td>${this.escapeHtml(contact.email || '')}</td>
        <td>${this.escapeHtml(contact.phone || '')}</td>
      </tr>
    `).join('');

    return `
      <div class="page contacts-page">
        <div class="page-header">
          <h2>Contact Information</h2>
        </div>
        <div class="contacts-content">
          <table class="contacts-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              ${contactRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  private generateSecurityFooter(userPermissions: UserPermissions, options: PdfGenerationOptions): string {
    const timestamp = options.security.includeGenerationTimestamp 
      ? `<div class="generation-timestamp">Generated: ${new Date().toLocaleString('en-GB')}</div>`
      : '';

    const userInfo = options.security.includeUserInfo 
      ? `<div class="user-info">Generated by: ${this.escapeHtml(userPermissions.role)}</div>`
      : '';

    const permissionLevel = options.security.includePermissionLevel 
      ? `<div class="permission-level">Permission Level: ${this.getPermissionLevel(userPermissions)}</div>`
      : '';

    return `
      <div class="page security-footer">
        <div class="security-info">
          ${timestamp}
          ${userInfo}
          ${permissionLevel}
          <div class="confidentiality-notice">
            This document contains confidential information. Access is restricted based on user permissions.
          </div>
        </div>
      </div>
    `;
  }

  private extractContacts(showData: ShowData): Array<{ role: string; name: string; email?: string; phone?: string }> {
    const contacts: Array<{ role: string; name: string; email?: string; phone?: string }> = [];

    // Extract from team data
    if (showData.team) {
      if (Array.isArray(showData.team)) {
        showData.team.forEach(member => {
          contacts.push({
            role: member.role || 'Team Member',
            name: member.name || 'Unknown',
            email: member.email,
            phone: member.phone,
          });
        });
      } else {
        Object.entries(showData.team).forEach(([uid, role]) => {
          contacts.push({
            role: role || 'Team Member',
            name: uid,
          });
        });
      }
    }

    // Extract from collaborators
    if (showData.collaborators) {
      showData.collaborators.forEach(collaborator => {
        contacts.push({
          role: collaborator.role || 'Collaborator',
          name: collaborator.name || 'Unknown',
          email: collaborator.email,
          phone: collaborator.phone,
        });
      });
    }

    // Extract from contacts
    if (showData.contacts) {
      showData.contacts.forEach(contact => {
        contacts.push({
          role: contact.role || 'Contact',
          name: contact.name || 'Unknown',
          email: contact.email,
          phone: contact.phone,
        });
      });
    }

    return contacts;
  }

  private generateCss(options: PdfGenerationOptions): string {
    const { branding } = options;
    
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: '${branding.fontFamily}', Arial, sans-serif;
        font-size: ${branding.fontSize === 'small' ? '12px' : branding.fontSize === 'large' ? '16px' : '14px'};
        line-height: 1.6;
        color: #333;
        background: #f5f5f5;
      }

      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto 20px;
        background: white;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        page-break-after: always;
        position: relative;
        padding: 20mm;
      }

      .page:last-child {
        page-break-after: auto;
      }

      .title-page {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        background: linear-gradient(135deg, ${branding.primaryColor}15, ${branding.secondaryColor}15);
      }

      .title-logo {
        max-height: 80px;
        margin-bottom: 30px;
      }

      .main-title {
        font-size: 3em;
        color: ${branding.primaryColor};
        margin-bottom: 20px;
        font-weight: 700;
      }

      .subtitle {
        font-size: 1.5em;
        color: ${branding.secondaryColor};
        margin-bottom: 40px;
        font-weight: 400;
      }

      .show-info h3 {
        font-size: 2em;
        color: ${branding.primaryColor};
        margin-bottom: 15px;
      }

      .venue {
        font-size: 1.2em;
        color: ${branding.accentColor};
        margin-bottom: 10px;
      }

      .description {
        font-size: 1.1em;
        color: #666;
        max-width: 600px;
        margin: 0 auto;
      }

      .permission-level {
        position: absolute;
        top: 20px;
        right: 20px;
        background: ${branding.accentColor};
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 0.9em;
        font-weight: 600;
      }

      .watermark {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 4em;
        color: rgba(0,0,0,0.05);
        font-weight: 700;
        pointer-events: none;
        z-index: -1;
      }

      .page-header {
        border-bottom: 3px solid ${branding.primaryColor};
        padding-bottom: 15px;
        margin-bottom: 30px;
      }

      .page-header h2 {
        color: ${branding.primaryColor};
        font-size: 2em;
        font-weight: 700;
      }

      .prop-badges {
        margin-top: 10px;
      }

      .badge {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.9em;
        font-weight: 600;
        margin-right: 10px;
      }

      .category-badge {
        background: ${branding.primaryColor};
        color: white;
      }

      .status-badge {
        background: ${branding.accentColor};
        color: white;
      }

      .prop-content {
        display: flex;
        gap: 30px;
        margin-bottom: 30px;
      }

      .prop-image-section {
        flex: 0 0 300px;
      }

      .main-image {
        width: 100%;
        max-width: 300px;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        margin-bottom: 15px;
      }

      .gallery-images {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .gallery-image {
        width: 60px;
        height: 60px;
        object-fit: cover;
        border-radius: 4px;
        border: 2px solid ${branding.primaryColor};
      }

      .prop-details {
        flex: 1;
      }

      .prop-description {
        font-size: 1.1em;
        margin-bottom: 20px;
        color: #555;
        line-height: 1.7;
      }

      .prop-details-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }

      .prop-details-table tr {
        border-bottom: 1px solid #eee;
      }

      .field-label {
        font-weight: 600;
        color: ${branding.primaryColor};
        padding: 8px 0;
        width: 40%;
        vertical-align: top;
      }

      .field-value {
        padding: 8px 0 8px 20px;
        color: #333;
      }

      .qr-code {
        text-align: center;
        margin-top: 20px;
      }

      .qr-code img {
        border: 1px solid #ddd;
        border-radius: 4px;
      }

      .toc-table, .contacts-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }

      .toc-table th, .toc-table td,
      .contacts-table th, .contacts-table td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #eee;
      }

      .toc-table th, .contacts-table th {
        background: ${branding.primaryColor};
        color: white;
        font-weight: 600;
      }

      .group-header td {
        background: ${branding.secondaryColor}20;
        font-weight: 600;
        color: ${branding.primaryColor};
      }

      .summary-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 40px;
      }

      .stat-card {
        background: linear-gradient(135deg, ${branding.primaryColor}10, ${branding.secondaryColor}10);
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        border: 2px solid ${branding.primaryColor}20;
      }

      .stat-card h3 {
        color: ${branding.primaryColor};
        margin-bottom: 10px;
        font-size: 1.1em;
      }

      .stat-number {
        font-size: 2.5em;
        font-weight: 700;
        color: ${branding.accentColor};
      }

      .summary-tables {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 30px;
      }

      .summary-table h3 {
        color: ${branding.primaryColor};
        margin-bottom: 15px;
        font-size: 1.3em;
      }

      .summary-table table {
        width: 100%;
        border-collapse: collapse;
      }

      .summary-table th, .summary-table td {
        padding: 10px;
        text-align: left;
        border-bottom: 1px solid #eee;
      }

      .summary-table th {
        background: ${branding.primaryColor};
        color: white;
        font-weight: 600;
      }

      .group-header-page {
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        background: linear-gradient(135deg, ${branding.primaryColor}10, ${branding.secondaryColor}10);
      }

      .group-header-content h2 {
        font-size: 2.5em;
        color: ${branding.primaryColor};
        margin-bottom: 15px;
      }

      .item-count {
        font-size: 1.2em;
        color: ${branding.accentColor};
        font-weight: 600;
      }

      .page-footer {
        position: absolute;
        bottom: 20px;
        right: 20px;
        font-size: 0.9em;
        color: #666;
      }

      .security-footer {
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        background: #f8f9fa;
        border: 2px solid ${branding.primaryColor}20;
      }

      .security-info {
        max-width: 600px;
      }

      .generation-timestamp, .user-info, .permission-level {
        margin-bottom: 10px;
        font-weight: 600;
        color: ${branding.primaryColor};
      }

      .confidentiality-notice {
        margin-top: 20px;
        padding: 15px;
        background: ${branding.accentColor}10;
        border-left: 4px solid ${branding.accentColor};
        font-style: italic;
        color: #666;
      }

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
          page-break-after: auto;
        }
      }
    `;
  }

  private getPermissionLevel(userPermissions: UserPermissions): string {
    if (userPermissions.isOwner || userPermissions.isAdmin) {
      return 'Full Access';
    }
    
    switch (userPermissions.role) {
      case 'god':
        return 'Administrator';
      case 'admin':
        return 'Administrator';
      case 'props_supervisor':
        return 'Supervisor';
      case 'props_carpenter':
        return 'Carpenter';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Viewer';
      default:
        return 'Limited';
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
