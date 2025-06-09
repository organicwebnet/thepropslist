import { Platform } from 'react-native';
import * as Print from 'expo-print';
import QRCode from 'qrcode';
import type { Show, Act, Scene } from '../types.ts';
import type { Prop, DigitalAsset } from '../shared/types/props.ts';
import type { PdfGenerationOptions } from '../shared/types/pdf.ts';

// Utility to generate QR code data URL for embedding in HTML
async function generateQRCodeDataURL(text: string, size = 80): Promise<string> {
  try {
    return await QRCode.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: 'L' });
  } catch (err) {
    return '';
  }
}

// Basic HTML escaping
const escapeHtml = (unsafe: string | undefined | null | number | boolean): string => {
  if (unsafe === null || typeof unsafe === 'undefined') return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Helper to format display label for prop keys
const formatFieldLabel = (key: string): string => {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
};

async function generatePropsListHtml(props: Prop[], show: Show, options: PdfGenerationOptions): Promise<string> {
  let html = `<html><head><meta charset="UTF-8"><title>${escapeHtml(options.title || show.name)}</title>`;
  html += `<style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 20px; color: #333; }
    .prop-item { 
      page-break-inside: avoid; 
      margin-bottom: 25px; 
      padding: 15px; 
      border: 1px solid #ddd; 
      border-radius: 8px; 
      background-color: #fff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .prop-name { font-size: 1.6em; font-weight: bold; margin-bottom: 12px; color: #111; }
    .prop-detail { margin-bottom: 7px; font-size: 0.95em; line-height: 1.5; }
    .prop-detail strong { color: #444; font-weight: 600; }
    .prop-images { margin-top: 15px; }
    .prop-images img { 
      max-width: ${options.imageWidthOption === 'full' ? '100%' : options.imageWidthOption === 'medium' ? '60%' : '30%'}; 
      height: auto; 
      margin-right: 10px; 
      margin-bottom: 10px; 
      border: 1px solid #ccc; 
      border-radius: 4px;
      vertical-align: top;
    }
    .qr-code-container { margin-top:10px; }
    .qr-code { width: ${options.imageWidthOption === 'small' ? '60px' : '90px'}; height: auto; margin-top: 5px; margin-right: 10px; vertical-align: middle;}
    .section-title { font-size: 1.3em; font-weight: bold; margin-top: 20px; margin-bottom: 10px; color: #222; border-bottom: 2px solid #eee; padding-bottom: 6px; }
    
    @media print {
      body { margin: 0.4in; font-size: 10pt; }
      .prop-item { border: 1px solid #bbb; box-shadow: none; }
      .prop-name { font-size: 14pt; }
      .prop-detail { font-size: 9pt; }
      .section-title { font-size: 12pt; }
      .columns-${options.columns} { 
        column-count: ${options.columns}; 
        column-gap: 25px; 
      }
      .prop-item-column { 
        break-inside: avoid-column; 
        page-break-inside: avoid; 
        width: 100%; 
      }
      .prop-item { box-shadow: none; }
    }
    ${options.layout === 'landscape' ? '@page { size: landscape; }' : '@page { size: portrait; }'}
  </style></head><body>`;

  html += `<header style="text-align:center; margin-bottom:30px;"><h1>${escapeHtml(options.title || show.name)}</h1></header>`;
  html += `<main><div class="${options.columns > 1 ? `columns-${options.columns}` : ''}">`;

  const getSortableValue = (value: Act | Scene | string | number | undefined): string => {
    if (typeof value === 'number') return String(value).padStart(5, '0');
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      if ('name' in value && typeof value.name === 'string') return value.name;
      if ('id' in value && (typeof value.id === 'string' || typeof value.id === 'number')) return String(value.id);
    }
    return '';
  };

  const sortedProps = [...props].sort((a, b) => {
    const actA = getSortableValue(a.act);
    const actB = getSortableValue(b.act);
    if (actA.localeCompare(actB) !== 0) return actA.localeCompare(actB);

    const sceneA = getSortableValue(a.scene);
    const sceneB = getSortableValue(b.scene);
    if (sceneA.localeCompare(sceneB) !== 0) return sceneA.localeCompare(sceneB);
    
    return (a.name || '').localeCompare(b.name || '');
  });

  for (const prop of sortedProps) {
    html += `<div class="prop-item ${options.columns > 1 ? 'prop-item-column' : ''}">`;
    html += `<div class="prop-name">${escapeHtml(prop.name)}</div>`;

    for (const key in options.selectedFields) {
      if (options.selectedFields[key as keyof Prop]) {
        const fieldValue = prop[key as keyof Prop];
        if (fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== '') {
          let displayValue = '';
          if ((key === 'act' || key === 'scene') && typeof fieldValue === 'object' && fieldValue && 'name' in fieldValue) {
            displayValue = escapeHtml((fieldValue as { name: string }).name);
          } else if (typeof fieldValue === 'object' && fieldValue !== null) {
            displayValue = escapeHtml(JSON.stringify(fieldValue));
          } else {
            displayValue = escapeHtml(fieldValue);
          }
          html += `<div class="prop-detail"><strong>${escapeHtml(formatFieldLabel(key))}:</strong> ${displayValue}</div>`;
        }
      }
    }

    if (options.imageCount > 0 && prop.images && prop.images.length > 0) {
      html += `<div class="prop-images section-title">Images:</div>`;
      for (let i = 0; i < Math.min(prop.images.length, options.imageCount); i++) {
        if (prop.images[i].url && prop.images[i].url.startsWith('http')) {
           html += `<img src="${escapeHtml(prop.images[i].url)}" alt="${escapeHtml(prop.images[i].caption || prop.name)}" />`;
        } else {
           html += `<div class="prop-detail"><em>Image URL invalid or missing for: ${escapeHtml(prop.images[i].caption || 'Untitled Image')}</em></div>`;
        }
      }
    }
    
    const assetsForQr: DigitalAsset[] = [];
    if (prop.digitalAssets && Array.isArray(prop.digitalAssets)) {
        prop.digitalAssets.forEach((asset: DigitalAsset) => {
            if (asset.url && asset.url.startsWith('http')) {
                if ((asset.type === 'document' && options.showFilesQR) || 
                    (asset.type === 'video' && options.showVideosQR)) {
                    assetsForQr.push(asset);
                }
            }
        });
    }
    if (options.selectedFields.purchaseUrl && prop.purchaseUrl && options.showFilesQR && prop.purchaseUrl.startsWith('http')) {
        assetsForQr.push({ 
            id: 'purchase-url-' + prop.id, 
            name: 'Purchase Link', 
            url: prop.purchaseUrl, 
            type: 'other'
        });
    }

    if (assetsForQr.length > 0) {
        html += `<div class="section-title qr-code-container">Links & Resources:</div>`;
        for (const asset of assetsForQr) {
            const qrDataUrl = await generateQRCodeDataURL(asset.url);
            html += `<div class="prop-detail" style="display:flex; align-items:center; margin-bottom: 8px;">`;
            if (qrDataUrl) {
                html += `<img src="${qrDataUrl}" class="qr-code" alt="QR for ${escapeHtml(asset.name || asset.type)}" />`;
            }
            html += `<div style="margin-left: 10px;"><strong>${escapeHtml(asset.name || formatFieldLabel(asset.type))}:</strong> <a href="${escapeHtml(asset.url)}" target="_blank">${escapeHtml(asset.url)}</a></div>`;
            html += `</div>`;
        }
    }
    html += `</div>`;
  }

  html += `</div></main></body></html>`;
  return html;
}

export async function generatePDF(
  props: Prop[], 
  show: Show, 
  options: PdfGenerationOptions, 
  isPreview: boolean
): Promise<{ uri: string } | string | void> {
  const htmlContent = await generatePropsListHtml(props, show, options);

  if (Platform.OS !== 'web') {
    if (isPreview) {
      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      return { uri };
    } else {
      await Print.printAsync({ html: htmlContent, orientation: options.layout });
      return;
    }
  } else {
    if (isPreview) {
      return htmlContent;
    } else {
      try {
        await Print.printAsync({ html: htmlContent, orientation: options.layout });
        return;
      } catch (e) {
        // Fallback to download HTML if print fails
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const fileName = (options.title || show.name || 'document') + '.html';
        link.download = fileName.replace(/[^a-zA-Z0-9._ Woodstock()]/g, '_');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        return;
      }
    }
  }
}