import { Platform } from 'react-native';
import { PackingLabel } from '../inventory/packListService';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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
            body { font-family: system-ui, -apple-system, sans-serif; }
            .label-grid { 
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              padding: 20px;
            }
            .label {
              border: 1px solid #ccc;
              padding: 15px;
              text-align: center;
              break-inside: avoid;
            }
            .container-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .container-info {
              font-size: 14px;
              color: #666;
              margin-bottom: 10px;
            }
            .qr-code {
              width: 120px;
              height: 120px;
              margin: 10px auto;
            }
            .label-tags {
              display: flex;
              flex-wrap: wrap;
              gap: 5px;
              justify-content: center;
              margin: 10px 0;
            }
            .tag {
              background: #f0f0f0;
              padding: 2px 8px;
              border-radius: 10px;
              font-size: 12px;
            }
            .url {
              font-size: 12px;
              color: #666;
              word-break: break-all;
            }
            .generated-date {
              font-size: 10px;
              color: #999;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="label-grid">
            ${labels.map(label => `
              <div class="label">
                <div class="container-name">${label.containerName}</div>
                <div class="container-info">
                  Status: ${label.containerStatus}<br>
                  Props: ${label.propCount}
                </div>
                ${label.labels.length > 0 ? `
                  <div class="label-tags">
                    ${label.labels.map(tag => `
                      <span class="tag">${tag}</span>
                    `).join('')}
                  </div>
                ` : ''}
                <img class="qr-code" src="${label.qrCode}" alt="QR Code">
                <div class="url">${label.url}</div>
                <div class="generated-date">
                  Generated: ${new Date(label.generatedAt).toLocaleString()}
                </div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;
  }

  async printLabels(labels: PackingLabel[], options: LabelPrintOptions = {}): Promise<void> {
    const html = this.generateHtml(labels);

    if (Platform.OS === 'web') {
      // For web, create a temporary iframe to handle printing
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      iframe.contentDocument?.write(html);
      iframe.contentDocument?.close();

      iframe.onload = () => {
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
      };
    } else {
      // For mobile, use Expo Print
      try {
        const { uri } = await Print.printToFileAsync({
          html,
        });

        if (Platform.OS === 'android') {
          // Share the PDF file on Android
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Print or Share Labels',
          });
        } else {
          // Print directly on iOS
          await Print.printAsync({
            uri,
            orientation: options.orientation || 'portrait',
          });
        }
      } catch (error) {
        console.error('Error printing labels:', error);
        throw new Error('Failed to print labels');
      }
    }
  }
} 