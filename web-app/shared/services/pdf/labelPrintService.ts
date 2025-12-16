import { PackingLabel } from '../inventory/packListService.ts';
import { jsPDF } from 'jspdf';
// html2canvas is used by jsPDF.html() internally

export interface LabelPrintOptions {
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

export class LabelPrintService {
  private generateHtml(labels: PackingLabel[]): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Packing Labels</title>
          <style>
            @media print {
              @page {
                size: A4;
                margin: 0.5cm;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            
            * {
              box-sizing: border-box;
            }
            
            body { 
              font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
            }
            
            .label-grid { 
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              padding: 0;
            }
            
            @media print {
              .label-grid {
                gap: 10px;
              }
            }
            
            .label {
              border: 2px solid #000;
              padding: 20px;
              text-align: center;
              break-inside: avoid;
              page-break-inside: avoid;
              min-height: 280px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: white;
            }
            
            .label-header {
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            
            .container-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .container-code {
              font-size: 18px;
              font-weight: bold;
              color: #333;
              font-family: 'Courier New', monospace;
              margin-bottom: 5px;
            }
            
            .container-info {
              font-size: 14px;
              color: #333;
              margin: 8px 0;
              line-height: 1.6;
            }
            
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 4px 0;
              font-size: 13px;
            }
            
            .info-label {
              font-weight: 600;
            }
            
            .qr-section {
              margin: 15px 0;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            
            .qr-code {
              width: 150px;
              height: 150px;
              border: 2px solid #000;
              padding: 8px;
              background: white;
              display: block;
              margin: 0 auto;
            }
            
            .qr-label {
              font-size: 12px;
              font-weight: 600;
              margin-top: 8px;
              text-transform: uppercase;
            }
            
            .label-tags {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
              justify-content: center;
              margin: 10px 0;
              min-height: 30px;
            }
            
            .tag {
              background: #f0f0f0;
              border: 1px solid #ccc;
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
            }
            
            .url-section {
              margin-top: 10px;
              padding-top: 10px;
              border-top: 1px solid #ccc;
            }
            
            .url {
              font-size: 10px;
              color: #666;
              word-break: break-all;
              font-family: 'Courier New', monospace;
              line-height: 1.4;
            }
            
            .generated-date {
              font-size: 9px;
              color: #999;
              margin-top: 8px;
            }
            
            @media print {
              .label {
                border: 2px solid #000 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="label-grid">
            ${labels.map(label => {
              // Extract container code from name (e.g., "SXNR2K" from "Container SXNR2K")
              const containerCode = label.containerName.match(/[A-Z0-9]{6,}/)?.[0] || label.containerName;
              const displayName = label.containerName.replace(/^[A-Z0-9]+\s*/, '') || label.containerName;
              
              return `
              <div class="label">
                <div class="label-header">
                  <div class="container-code">${containerCode}</div>
                  <div class="container-name">${displayName}</div>
                </div>
                
                <div class="container-info">
                  <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span>${label.containerStatus || 'N/A'}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Props:</span>
                    <span>${label.propCount}</span>
                  </div>
                </div>
                
                ${label.labels && label.labels.length > 0 ? `
                  <div class="label-tags">
                    ${label.labels.map((tag: string) => `
                      <span class="tag">${tag}</span>
                    `).join('')}
                  </div>
                ` : '<div class="label-tags"></div>'}
                
                <div class="qr-section">
                  ${label.qrCode ? `<img class="qr-code" src="${label.qrCode}" alt="QR Code">` : '<div class="qr-code" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center; color: #999;">No QR Code</div>'}
                  <div class="qr-label">Scan to View Container</div>
                </div>
                
                ${label.url ? `
                  <div class="url-section">
                    <div class="url">${label.url}</div>
                  </div>
                ` : ''}
                
                <div class="generated-date">
                  Generated: ${new Date(label.generatedAt).toLocaleString()}
                </div>
              </div>
            `;
            }).join('')}
          </div>
        </body>
      </html>
    `;
  }

  async printLabels(labels: PackingLabel[], options: LabelPrintOptions = {}): Promise<void> {
    const html = this.generateHtml(labels);

    if (typeof window !== 'undefined') {
      // For web, generate PDF and open in new window for preview
      try {
        const pdf = new jsPDF({
          orientation: options.orientation === 'landscape' ? 'landscape' : 'portrait',
          unit: 'mm',
          format: options.format === 'Letter' ? 'letter' : 'a4',
        });

        // Convert HTML to PDF
        await new Promise<void>((resolve, reject) => {
          pdf.html(html, {
            callback: () => {
              try {
                // Open PDF in new window for preview
                pdf.output('dataurlnewwindow');
                resolve();
              } catch (error) {
                reject(error);
              }
            },
            x: 0,
            y: 0,
            width: pdf.internal.pageSize.getWidth(),
            windowWidth: pdf.internal.pageSize.getWidth(),
            html2canvas: {
              scale: 0.264583, // Convert pixels to mm (1mm = 3.779527559 pixels at 96 DPI)
              useCORS: true,
              logging: false,
              allowTaint: true,
            },
          });
        });
      } catch (error) {
        console.error('Error generating PDF:', error);
        // Fallback to print dialog if PDF generation fails
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        iframe.contentDocument?.write(html);
        iframe.contentDocument?.close();

        iframe.onload = () => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        };
      }
    } else {
      // For mobile/server, use jsPDF for PDF generation
      // Note: In mobile/server context, window is undefined, so we can't open a new window
      // The PDF can be saved or shared using platform-specific APIs
      try {
        const pdf = new jsPDF({
          orientation: options.orientation === 'landscape' ? 'landscape' : 'portrait',
          unit: 'mm',
          format: options.format === 'Letter' ? 'letter' : 'a4',
        });
        await new Promise<void>((resolve, reject) => {
          pdf.html(html, {
            callback: () => {
              try {
                // In mobile/server context, PDF generation is complete
                // Platform-specific sharing/saving would be handled by the caller
                console.log('PDF generated successfully (mobile/server context)');
                resolve();
              } catch (error) {
                reject(error);
              }
            },
            x: 0,
            y: 0,
            width: pdf.internal.pageSize.getWidth(),
            windowWidth: pdf.internal.pageSize.getWidth(),
            html2canvas: {
              scale: 0.264583,
              useCORS: true,
              logging: false,
              allowTaint: true,
            },
          });
        });
      } catch (error) {
        throw new Error('Failed to print labels');
      }
    }
  }

  async previewLabelAsPdf(label: PackingLabel, options: LabelPrintOptions = {}): Promise<void> {
    // Generate HTML for a single label
    const html = this.generateHtml([label]);

    if (typeof window !== 'undefined') {
      try {
        const pdf = new jsPDF({
          orientation: options.orientation === 'landscape' ? 'landscape' : 'portrait',
          unit: 'mm',
          format: options.format === 'Letter' ? 'letter' : 'a4',
        });

        // Convert HTML to PDF
        await new Promise<void>((resolve, reject) => {
          pdf.html(html, {
            callback: () => {
              try {
                // Open PDF in new window for preview
                pdf.output('dataurlnewwindow');
                resolve();
              } catch (error) {
                reject(error);
              }
            },
            x: 0,
            y: 0,
            width: pdf.internal.pageSize.getWidth(),
            windowWidth: pdf.internal.pageSize.getWidth(),
            html2canvas: {
              scale: 0.264583,
              useCORS: true,
              logging: false,
              allowTaint: true,
            },
          });
        });
      } catch (error) {
        console.error('Error generating PDF preview:', error);
        throw new Error('Failed to generate PDF preview');
      }
    }
  }
} 
