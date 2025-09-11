import { Platform } from 'react-native';
// Local definition to avoid depending on web-only services during bundle
export interface PackingLabel {
  id: string;
  containerId: string;
  packListId: string;
  qrCode: string;
  containerName: string;
  containerStatus: string;
  propCount: number;
  labels: string[];
  url: string;
  generatedAt: Date;
}
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
// import { jsPDF } from "jspdf";

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
            :root {
              /* App dark theme alignment */
              --bg: #111827;          /* darkTheme.colors.background */
              --card: #1F2937;        /* darkTheme.colors.card */
              --input: #374151;       /* darkTheme.colors.inputBackground */
              --text: #F9FAFB;        /* darkTheme.colors.text */
              --text-secondary: #9CA3AF; /* darkTheme.colors.textSecondary */
              --border: #374151;      /* darkTheme.colors.border */
              --primary: #3B82F6;     /* darkTheme.colors.primary */
            }
            html, body {
              background-color: var(--bg);
              color: var(--text);
              font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
            }
            .label-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              padding: 20px;
            }
            .label {
              background: var(--card);
              border: 1px solid var(--border);
              padding: 16px;
              text-align: center;
              break-inside: avoid;
              border-radius: 10px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            }
            .container-name {
              font-size: 18px;
              font-weight: 800;
              margin-bottom: 10px;
              color: var(--text);
            }
            .container-info {
              font-size: 14px;
              color: var(--text-secondary);
              margin-bottom: 10px;
            }
            .qr-code {
              width: 120px;
              height: 120px;
              margin: 10px auto;
              background: #fff; /* keep high contrast for QR */
              border-radius: 6px;
              padding: 6px;
            }
            .label-tags {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
              justify-content: center;
              margin: 10px 0;
            }
            .tag {
              background: var(--input);
              color: var(--text);
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 12px;
              border: 1px solid var(--border);
            }
            .url {
              font-size: 12px;
              color: var(--text-secondary);
              word-break: break-all;
            }
            .generated-date {
              font-size: 11px;
              color: var(--text-secondary);
              margin-top: 6px;
            }
            @media print {
              html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .label { box-shadow: none; }
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
        throw new Error('Failed to print labels');
      }
    }
  }
} 
