import React, { useState, useRef, useEffect } from 'react';
import type { Prop } from '../../shared/types/props';
import type { PdfGenerationOptions, PdfLayout } from '../../shared/types/pdf';
import DashboardLayout from '../PropsBibleHomepage';
import { useShowSelection } from '../contexts/ShowSelectionContext';
import { useFirebase } from '../contexts/FirebaseContext';
import html2pdf from 'html2pdf.js';


const allFields: (keyof Prop)[] = [
  'name', 'description', 'images', 'digitalAssets', 'videos',
  'category', 'status', 'quantity', 'act', 'scene', 'location',
  'manufacturer', 'model', 'serialNumber', 'color', 'style', 'condition',
];

const defaultPdfOptions: PdfGenerationOptions = {
  selectedFields: Object.fromEntries(allFields.map(f => [f, true])) as Record<keyof Prop, boolean>,
  layout: 'classic',
  columns: 1,
  imageCount: 1,
  imageWidthOption: 'medium',
  showFilesQR: true,
  showVideosQR: true,
  fonts: { heading: 'Inter', body: 'Inter' },
  brandColors: { primary: '#0ea5e9', accent: '#22c55e' },
  includeTitlePage: true,
  includeContacts: false,
  orientation: 'portrait',
  title: '',
};

function generatePropsListPages(
  props: Prop[],
  options: PdfGenerationOptions,
  header: string,
  footer: string,
  logoUrl?: string
): { css: string; pages: string[]; fullHtml: string } {
  console.log('Props passed to generatePropsListHtml:', props);
  const isLandscape = options.layout === 'landscape';
  const pageWidth = isLandscape ? 1123 : 794; // px (A4 at 96dpi)
  const pageHeight = isLandscape ? 794 : 1123;
  // Table of Contents HTML
  const tocRows = props.map((prop, idx) =>
    `<tr><td>${idx + 2}</td><td>${prop.name || ''}</td><td>${prop.category || ''}</td></tr>`
  ).join('');
  const tocHtml = `
    <div class='page'>
      <div class='header'>
        ${logoUrl ? `<img src='${logoUrl}' class='logo' /><br/>` : ''}
        <div class='toc-title'>${options.title || 'Props List'}</div>
        ${header ? `<div class='toc-header'>${header}</div>` : ''}
      </div>
      <div class='toc-content'>
        <h2>Table of Contents</h2>
        <table class='toc-table'>
          <thead><tr><th>Page</th><th>Prop Name</th><th>Category</th></tr></thead>
          <tbody>${tocRows}</tbody>
        </table>
      </div>
      <div class='footer'>
        ${footer ? footer : ''}
        <span style='float:right;font-size:0.95em;color:#888;'>Page 1 of ${props.length + 1}</span>
      </div>
    </div>
  `;
  // Helper for badges
  function badge(text: string, color: string) {
    return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:0.95em;font-weight:600;background:${color};color:#fff;margin-right:8px;">${text}</span>`;
  }
  // Helper to render a QR code img for a URL (uses public QR server)
  const qrImg = (url: string, size = 90) => `<img src="https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}" alt="QR" width="${size}" height="${size}" style="display:block;border:1px solid #ddd;border-radius:6px;background:#fff;"/>`;

  // Each prop page
  const propPages = props.map((prop, idx) => {
    const sf = (options.selectedFields || {}) as any;
    // Images
    const mainImg = prop.images && prop.images.length > 0 ? prop.images[0].url : '';
    const galleryImgs = prop.images && prop.images.length > 1 ? prop.images.slice(1) : [];
    // Details table
    const details: [string, any, string][] = [] as any;
    const pushIf = (key: keyof Prop | string, label: string, value: any) => {
      if (sf[key] === false) return;
      if (value === undefined || value === null || value === '') return;
      details.push([label, value, String(key)]);
    };
    pushIf('category', 'Category', prop.category);
    pushIf('status', 'Status', prop.status);
    pushIf('quantity', 'Quantity', prop.quantity);
    pushIf('act', 'Act', prop.act);
    pushIf('scene', 'Scene', prop.scene);
    pushIf('location', 'Location', prop.location);
    pushIf('manufacturer', 'Manufacturer', prop.manufacturer);
    pushIf('model', 'Model', prop.model);
    pushIf('serialNumber', 'Serial Number', prop.serialNumber);
    pushIf('color', 'Color', prop.color);
    // Excluded: Period
    pushIf('style', 'Style', prop.style);
    pushIf('condition', 'Condition', prop.condition);
    const detailsHtml = details.map(([label, value]) =>
      `<tr><td class='detail-label'>${label}</td><td class='detail-value'>${value}</td></tr>`
    ).join('');
    // Digital assets/videos (accept string[] or object[])
    let assetsHtml = '';
    const fileAssets = (prop.digitalAssets || []).map((a: any) => typeof a === 'string' ? ({ url: a, name: a, title: a }) : a);
    const videoAssets = (prop.videos || []).map((a: any) => typeof a === 'string' ? ({ url: a, name: a, title: a }) : a);
    if (fileAssets.length > 0 && (options.selectedFields as any)?.digitalAssets !== false) {
      assetsHtml += `<div class='assets-section'><h4>Files & Documents</h4>`;
      assetsHtml += fileAssets.map(asset => {
        const name = asset.name || asset.title || asset.url;
        return `<div style='display:flex;align-items:center;gap:12px;margin-bottom:10px;'>${options.showFilesQR ? qrImg(asset.url) : ''}<div style='display:flex;flex-direction:column;gap:4px;'><a href='${asset.url}' target='_blank'>${name}</a><span style='font-size:0.9em;color:#666;'>${asset.url}</span></div></div>`;
      }).join('');
      assetsHtml += `</div>`;
    }
    if (videoAssets.length > 0 && (options.selectedFields as any)?.videos !== false) {
      assetsHtml += `<div class='assets-section'><h4>Videos</h4>`;
      assetsHtml += videoAssets.map(video => {
        const name = video.name || video.title || video.url;
        return `<div style='display:flex;align-items:center;gap:12px;margin-bottom:10px;'>${options.showVideosQR ? qrImg(video.url) : ''}<div style='display:flex;flex-direction:column;gap:4px;'><a href='${video.url}' target='_blank'>${name}</a><span style='font-size:0.9em;color:#666;'>${video.url}</span></div></div>`;
      }).join('');
      assetsHtml += `</div>`;
    }
    // 50/50 split layout
    const isDummyImg = !mainImg || mainImg.startsWith('https://example.com/');
    const html = `
      <div class='page'>
        <div class='header'>
          ${logoUrl ? `<img src='${logoUrl}' class='logo' /><br/>` : ''}
          ${header ? `<div>${header}</div>` : ''}
          <div style='font-size:1.3em;font-weight:700;'>${options.title || ''}</div>
        </div>
        <div class='split-container ${isLandscape ? 'landscape' : 'portrait'}'>
          <div class='split-left'>
            ${sf.images === false ? '' : `
            <div class='image-side-by-side'>
              ${!isDummyImg
                ? `<img class='main-img' src='${mainImg}' alt='Main image' />`
                : `<div class='main-img placeholder-img'>No Image</div>`
              }
              ${galleryImgs.length > 0 ? `<div class='thumbs-col'>${galleryImgs.map(img => `<img src='${img.url}' alt='Thumbnail image' class='thumb-img' />`).join('')}</div>` : ''}
            </div>
            `}
          </div>
          <div class='split-right'>
            <div class='prop-title'>${prop.name || ''}</div>
            <div class='badges'>
              ${prop.category ? badge(prop.category, '#1976d2') : ''}
              ${prop.status ? badge(prop.status, '#8e24aa') : ''}
            </div>
            ${(sf.description === false) ? '' : (prop.description ? `<div class='desc'>${prop.description}</div>` : '')}
            <table class='details-table'>${detailsHtml}</table>
            ${assetsHtml}
          </div>
        </div>
        <div class='footer'>
          ${footer ? footer : ''}
          <span style='float:right;font-size:0.95em;color:#888;'>Page ${idx + 2} of ${props.length + 1}</span>
        </div>
      </div>
    `;
    console.log('Prop page HTML for', prop.name, ':', html);
    return html;
  });
  // CSS for catalog look
  const catalogCss = `
    <style>
      body { background: #f0f0f0; font-family: 'Helvetica Neue', Arial, sans-serif; color: #222; margin: 0; padding: 0; }
      .page { page-break-after: always; min-height: ${pageHeight}px; min-width: ${pageWidth}px; max-width: ${pageWidth}px; max-height: ${pageHeight}px; margin: 0 auto; background: #fff; border: 2px solid #111; border-radius: 12px; box-shadow: 0 8px 32px #0002; display: flex; flex-direction: column; justify-content: space-between; padding: 0; }
      .page + .page { margin-top: 32px; }
      .header { text-align: left; padding: 32px 48px 12px 48px; font-size: 1.1em; color: #555; border-bottom: 1px solid #eee; background: #fff; }
      .footer { text-align: right; padding: 12px 48px 32px 48px; font-size: 1em; color: #555; border-top: 1px solid #eee; background: #fff; }
      .logo { max-height: 48px; margin-bottom: 8px; }
      .toc-title { font-size: 2.2em; font-weight: bold; margin-bottom: 8px; }
      .toc-header { font-size: 1.1em; color: #888; margin-bottom: 16px; }
      .toc-content { padding: 32px 48px; }
      .toc-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      .toc-table th, .toc-table td { border-bottom: 1px solid #eee; padding: 8px 12px; text-align: left; font-size: 1.1em; }
      .toc-table th { color: #1976d2; font-weight: 700; }
      .toc-table td:first-child { width: 60px; text-align: center; }
      .split-container { display: flex; flex-direction: row; width: 100%; height: 100%; }
      .split-container.portrait { flex-direction: column; }
      .split-left, .split-right { flex: 1; padding: 48px; box-sizing: border-box; }
      .split-left { display: flex; flex-direction: column; align-items: center; justify-content: center; }
      .image-side-by-side { display: flex; flex-direction: row; align-items: flex-start; gap: 16px; width: 100%; justify-content: center; }
      .main-img { width: 100%; max-width: 360px; max-height: 360px; border-radius: 16px; box-shadow: 0 2px 12px #0001; border: 1px solid #eee; }
      .thumbs-col { display: flex; flex-direction: column; gap: 10px; }
      .thumb-img { width: 72px; height: 72px; object-fit: cover; border-radius: 8px; border: 1px solid #eee; }
      .split-right { display: flex; flex-direction: column; justify-content: flex-start; }
      .prop-title { font-size: 2em; font-weight: bold; margin-bottom: 12px; }
      .badges { margin-bottom: 16px; }
      .desc { font-size: 1.15em; margin-bottom: 18px; color: #444; }
      .details-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
      .details-table td { padding: 6px 10px; font-size: 1.05em; }
      .detail-label { color: #888; font-weight: 600; width: 120px; }
      .detail-value { color: #222; font-weight: 400; }
      .assets-section { margin-top: 18px; }
      .assets-section h4 { margin: 0 0 8px 0; font-size: 1.1em; color: #2a2a2a; }
      .assets-section ul { padding-left: 18px; }
      .assets-section li { margin-bottom: 6px; }
      .placeholder-img {
        width: 100%;
        max-width: 340px;
        max-height: 340px;
        height: 200px;
        border-radius: 16px;
        background: #eee;
        color: #888;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2em;
        border: 1px solid #ccc;
        margin-bottom: 24px;
      }
      @media print { .page { page-break-after: always; } }
    </style>
  `;
  const pages = [tocHtml, ...propPages];
  const fullHtml = `
    <html><head><meta charset='UTF-8'><title>${options.title || 'Props List'}</title>
    ${catalogCss}
    </head><body>
      ${pages.join('')}
    </body></html>
  `;
  return { css: catalogCss, pages, fullHtml };
}

const PropsPdfExportPage: React.FC = () => {
  const [pdfOptions, setPdfOptions] = useState<PdfGenerationOptions>(defaultPdfOptions);
  const [logo, setLogo] = useState<File | null>(null);
  const [header, setHeader] = useState('');
  const [footer, setFooter] = useState('');
  const [ordering, setOrdering] = useState<'act_scene' | 'alphabetical'>('act_scene');
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const logoUrlRef = useRef<string | undefined>(undefined);
  const { service } = useFirebase();
  const { currentShowId } = useShowSelection();
  const [props, setProps] = useState<Prop[]>([]);
  const [showTitle, setShowTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [pageHtmls, setPageHtmls] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const previewNavRef = useRef<HTMLDivElement>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  // Add state for fullHtml at the top
  const [fullHtml, setFullHtml] = useState('');
  const [pageCss, setPageCss] = useState('');
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    if (!currentShowId) {
      setProps([]);
      setShowTitle('');
      setLoading(false);
      return;
    }
    setLoading(true);
    let unsubShow: (() => void) | undefined;
    let unsubProps: (() => void) | undefined;
    unsubShow = service.listenToDocument('shows/' + currentShowId, doc => {
      setShowTitle(doc.data?.name || '');
      setPdfOptions(opt => ({ ...opt, title: doc.data?.name || '' }));
    });
    unsubProps = service.listenToCollection('props', (data) => {
      setProps(data.filter(doc => doc.data.showId === currentShowId).map(doc => ({ ...(doc.data as Prop), id: doc.id })));
      setLoading(false);
    }, err => {
      setProps([]);
      setLoading(false);
    });
    return () => { if (unsubShow) unsubShow(); if (unsubProps) unsubProps(); };
  }, [service, currentShowId]);

  useEffect(() => {
    if (showPreview && previewNavRef.current) {
      previewNavRef.current.focus();
    }
  }, [showPreview]);

  // Recompute scale to fit horizontally
  useEffect(() => {
    const handleResize = () => {
      if (!previewContainerRef.current) return;
      const dims = (pdfOptions.layout === 'landscape') ? { w: 1123, h: 794 } : { w: 794, h: 1123 };
      const cw = previewContainerRef.current.clientWidth;
      const padding = 32; // approximate padding inside container
      const scale = Math.min(1, (cw - padding) / dims.w);
      setPreviewScale(scale > 0 && Number.isFinite(scale) ? scale : 1);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfOptions.layout, showPreview]);

  const handlePreviewKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!showPreview || pageHtmls.length === 0) return;
    if (e.key === 'ArrowLeft') {
      setCurrentPage(p => Math.max(0, p - 1));
    } else if (e.key === 'ArrowRight') {
      setCurrentPage(p => Math.min(pageHtmls.length - 1, p + 1));
    }
  };

  const handlePreview = async () => {
    if (!props || props.length === 0) return;
    console.log('Props count for PDF preview:', props.length);
    let logoUrl: string | undefined = undefined;
    if (logo) {
      logoUrl = URL.createObjectURL(logo);
      if (logoUrlRef.current) URL.revokeObjectURL(logoUrlRef.current);
      logoUrlRef.current = logoUrl;
    }
    let sortedProps = [...props];
    if (ordering === 'alphabetical') {
      sortedProps.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      sortedProps.sort((a, b) => {
        if ((a.act ?? 0) !== (b.act ?? 0)) return (a.act ?? 0) - (b.act ?? 0);
        if ((a.scene ?? 0) !== (b.scene ?? 0)) return (a.scene ?? 0) - (b.scene ?? 0);
        return (a.name || '').localeCompare(b.name || '');
      });
    }
    const { pages, fullHtml, css } = generatePropsListPages(sortedProps, { ...pdfOptions, title: showTitle }, header, footer, logoUrl);
    setFullHtml(fullHtml);
    setPageCss(css);
    console.log('Generated PDF HTML pages:', pages.length);
    setPageHtmls(pages);
    setCurrentPage(0);
    setShowPreview(true);
    const blob = new Blob([fullHtml], { type: 'text/html' });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(blob));
  };

  const handleDownload = () => {
    if (!fullHtml) return;
    // Create a hidden container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.innerHTML = fullHtml;
    document.body.appendChild(container);

    html2pdf()
      .from(container)
      .set({
        margin: 0,
        filename: `${showTitle || 'props-catalog'}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'pt', format: 'a4', orientation: pdfOptions.layout || 'portrait' }
      })
      .save()
      .then(() => {
        document.body.removeChild(container);
      });
  };

  // Manage Blob URL for current page
  useEffect(() => {
    if (!showPreview || pageHtmls.length === 0) {
      setIframeUrl(null);
      return;
    }
    const html = pageHtmls[currentPage];
    if (!html) {
      setIframeUrl(null);
      return;
    }
    const wrapped = `<html><head><meta charset='UTF-8'>${pageCss}</head><body>${html}</body></html>`;
    const blob = new Blob([wrapped], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setIframeUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [showPreview, pageHtmls, currentPage, pageCss]);

  const pageW = pdfOptions.layout === 'landscape' ? 1123 : 794;
  const pageH = pdfOptions.layout === 'landscape' ? 794 : 1123;
  const scaledW = Math.max(0, Math.floor(pageW * previewScale));
  const scaledH = Math.max(0, Math.floor(pageH * previewScale));

  return (
    <DashboardLayout>
      {loading ? (
        <div className="flex flex-col items-center justify-center h-96 text-pb-primary text-xl">Loading props and show info...</div>
      ) : (
        <div className="flex flex-col md:flex-row gap-8 w-full">
          {/* Left panel: options */}
          <div className="w-full md:w-1/2 max-w-md">
            <h2 className="text-2xl font-bold mb-2">Export Props List to PDF</h2>
            <div>
              <label className="font-semibold block mb-1">Fields to include:</label>
              <div className="grid grid-cols-2 gap-2">
                {allFields.map(f => (
                  <label key={f} className="text-sm flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pdfOptions.selectedFields[f]}
                      onChange={e => setPdfOptions(opt => ({
                        ...opt,
                        selectedFields: { ...opt.selectedFields, [f]: e.target.checked }
                      }))}
                      className="accent-pb-primary bg-pb-darker border border-pb-primary rounded focus:ring-2 focus:ring-pb-primary"
                    />
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Logo:</label>
              <input type="file" accept="image/*" onChange={e => setLogo(e.target.files?.[0] || null)}
                className="block w-full text-sm text-pb-gray file:bg-pb-primary file:text-white file:rounded file:border-0 file:px-3 file:py-1 file:mr-3 file:cursor-pointer bg-pb-darker border border-pb-primary rounded focus:outline-none focus:ring-2 focus:ring-pb-primary" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Header Text:</label>
              <input type="text" className="w-full border border-pb-primary rounded px-2 py-1 bg-pb-darker text-white placeholder:text-pb-gray focus:outline-none focus:ring-2 focus:ring-pb-primary" value={header} onChange={e => setHeader(e.target.value)} placeholder="Header..." />
            </div>
            <div>
              <label className="font-semibold block mb-1">Footer Text:</label>
              <input type="text" className="w-full border border-pb-primary rounded px-2 py-1 bg-pb-darker text-white placeholder:text-pb-gray focus:outline-none focus:ring-2 focus:ring-pb-primary" value={footer} onChange={e => setFooter(e.target.value)} placeholder="Footer..." />
            </div>
            <div>
              <label className="font-semibold block mb-1">Order Props By:</label>
              <select className="w-full border border-pb-primary rounded px-2 py-1 bg-pb-darker text-white focus:outline-none focus:ring-2 focus:ring-pb-primary" value={ordering} onChange={e => setOrdering(e.target.value as any)}>
                <option value="act_scene">Act & Scene</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Layout & Orientation:</label>
              <select
                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={pdfOptions.layout as any}
                onChange={e => setPdfOptions({ ...pdfOptions, layout: e.target.value as PdfLayout })}
              >
                <option value="classic">Classic (single column)</option>
                <option value="compact">Compact (two column)</option>
                <option value="gallery">Gallery (image-forward)</option>
                <option value="technical">Technical (specs grid)</option>
              </select>
              <div className="mt-2">
                <select
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={pdfOptions.orientation}
                  onChange={e => setPdfOptions({ ...pdfOptions, orientation: e.target.value as 'portrait'|'landscape' })}
                >
                  <option value="portrait">Portrait (A4)</option>
                  <option value="landscape">Landscape (A4)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1">Heading font</label>
                <select className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white" value={pdfOptions.fonts.heading} onChange={e => setPdfOptions({ ...pdfOptions, fonts: { ...pdfOptions.fonts, heading: e.target.value } })}>
                  <option>Inter</option><option>Roboto</option><option>Merriweather</option><option>Source Serif Pro</option><option>Poppins</option>
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Body font</label>
                <select className="w-full bg-[#1A1A1A] border border-gray-800 rounded-md px-4 py-2 text-white" value={pdfOptions.fonts.body} onChange={e => setPdfOptions({ ...pdfOptions, fonts: { ...pdfOptions.fonts, body: e.target.value } })}>
                  <option>Inter</option><option>Roboto</option><option>Open Sans</option><option>Source Sans Pro</option><option>Lato</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="font-semibold block mb-1">Primary color</label>
                <input type="color" value={pdfOptions.brandColors?.primary} onChange={e => setPdfOptions({ ...pdfOptions, brandColors: { ...(pdfOptions.brandColors||{}), primary: e.target.value } })} />
              </div>
              <div>
                <label className="font-semibold block mb-1">Accent color</label>
                <input type="color" value={pdfOptions.brandColors?.accent} onChange={e => setPdfOptions({ ...pdfOptions, brandColors: { ...(pdfOptions.brandColors||{}), accent: e.target.value } })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={pdfOptions.includeTitlePage} onChange={e => setPdfOptions({ ...pdfOptions, includeTitlePage: e.target.checked })} />
                Include title page
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={pdfOptions.includeContacts} onChange={e => setPdfOptions({ ...pdfOptions, includeContacts: e.target.checked })} />
                Include contacts sheet
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                className="px-4 py-2 rounded bg-pb-primary text-white font-semibold shadow hover:bg-pb-secondary transition-colors w-full"
                onClick={handlePreview}
              >
                Preview PDF
              </button>
              {showPreview && (
                <button
                  className="px-4 py-2 rounded bg-pb-accent text-white font-semibold shadow hover:bg-pb-secondary transition-colors w-full"
                  onClick={handleDownload}
                >
                  Download PDF
                </button>
              )}
            </div>
          </div>
          {/* Right panel: PDF preview */}
          <div className="flex-1 flex flex-col w-full overflow-hidden bg-[#18183a]">
            {showPreview && pageHtmls.length > 0 && (
              <div
                ref={previewNavRef}
                tabIndex={0}
                onKeyDown={handlePreviewKeyDown}
                className="outline-none focus:ring-2 focus:ring-pb-primary rounded"
                style={{ width: '100%' }}
              >
                {/* Top pager */}
                <div className="flex items-center justify-center gap-4 mb-3 sticky top-0 bg-[#18183a] py-2 z-10">
                  <button
                    className="btn btn-secondary px-4 py-2 rounded disabled:opacity-50"
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >Previous</button>
                  <span className="text-white text-lg">Page {currentPage + 1} of {pageHtmls.length}</span>
                  <button
                    className="btn btn-secondary px-4 py-2 rounded disabled:opacity-50"
                    onClick={() => setCurrentPage(p => Math.min(pageHtmls.length - 1, p + 1))}
                    disabled={currentPage === pageHtmls.length - 1}
                  >Next</button>
                </div>
                <div ref={previewContainerRef} className="w-full h-full min-h-0 overflow-auto overflow-x-hidden p-0 m-0">
                  <div className="mx-auto" style={{ width: scaledW, height: scaledH }}>
                    <div style={{ width: pageW, height: pageH, transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
                      {iframeUrl ? (
                        <iframe
                          src={iframeUrl}
                          title="PDF Preview"
                          className="bg-white rounded-lg shadow-2xl border border-gray-300"
                          style={{
                            width: `${pageW}px`,
                            height: `${pageH}px`,
                            background: 'white',
                            boxShadow: '0 8px 32px #0003',
                            borderRadius: '12px',
                            border: '1px solid #e0e0e0',
                            display: 'block',
                          }}
                          scrolling="no"
                        />
                      ) : (
                        <div className="text-white text-lg">PDF page could not be loaded.</div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Bottom pager */}
                <div className="flex items-center justify-center gap-4 mt-1 mb-0">
                  <button
                    className="btn btn-secondary px-4 py-2 rounded disabled:opacity-50"
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >Previous</button>
                  <span className="text-white text-lg">Page {currentPage + 1} of {pageHtmls.length}</span>
                  <button
                    className="btn btn-secondary px-4 py-2 rounded disabled:opacity-50"
                    onClick={() => setCurrentPage(p => Math.min(pageHtmls.length - 1, p + 1))}
                    disabled={currentPage === pageHtmls.length - 1}
                  >Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PropsPdfExportPage; 