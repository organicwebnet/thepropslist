import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
// import { fetchStorageImage } from './firebase'; // Commented out - Needs rework with context
import type { Show } from '../types';
import type { Prop } from '@shared/types';

// Font sizes
const FONT_SIZES = {
  TITLE: 24,
  SUBTITLE: 18,
  HEADING: 16,
  SUBHEADING: 14,
  BODY: 12,
  CAPTION: 10
};

// Margins and spacing
const MARGINS = {
  TOP: 20,
  BOTTOM: 20,
  LEFT: 20,
  RIGHT: 20,
  CONTENT_SPACING: 10
};

// Image dimensions (in mm)
const IMAGE = {
  MAX_WIDTH: 170,
  MAX_HEIGHT: 120,
  SPACING: 5
};

// Colors (RGB values)
const COLORS = {
  PRIMARY: [214, 0, 28],
  SECONDARY: [163, 0, 22],
  TEXT: [0, 0, 0],
  GRAY: [128, 128, 128]
};

function sortProps(props: Prop[]): Prop[] {
  return [...props].sort((a, b) => {
    // Handle multi-scene props - put them at the end
    if (a.isMultiScene && !b.isMultiScene) return 1;
    if (!a.isMultiScene && b.isMultiScene) return -1;
    if (a.isMultiScene && b.isMultiScene) return 0;

    // Sort by act first (handle undefined)
    const actA = a.act ?? Infinity;
    const actB = b.act ?? Infinity;
    if (actA !== actB) return actA - actB;
    
    // Then by scene (handle undefined)
    const sceneA = a.scene ?? Infinity;
    const sceneB = b.scene ?? Infinity;
    return sceneA - sceneB;
  });
}

async function generateQRCode(url: string): Promise<string> {
  if (!url) return "";
  
  try {
    return await QRCode.toDataURL(url, {
      width: 100,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('QR Code generation error:', err);
    return "";
  }
}

async function loadImage(url: string): Promise<string | null> {
  if (!url) return null;

  try {
    const isFirebaseStorage = url.includes('firebasestorage.googleapis.com');
    
    let imageBlob: Blob;
    if (isFirebaseStorage) {
      // imageBlob = await fetchStorageImage(url); // Commented out usage
      console.warn('Fetching Firebase storage images in PDF generation is currently disabled pending refactor.');
      // Fallback: try fetching directly (might fail due to CORS/auth without service)
      try {
        const response = await fetch(url); 
        if (!response.ok) throw new Error(`Failed to fetch image directly: ${response.status}`);
        imageBlob = await response.blob();
      } catch (directFetchError) {
        console.error('Direct fetch attempt also failed:', directFetchError);
        return null; // Cannot load image
      }
    } else {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      imageBlob = await response.blob();
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });
  } catch (error) {
    console.error("Error loading image:", error);
    return null;
  }
}

async function processPropForPDF(doc: jsPDF, prop: Prop, index: number, currentY: number): Promise<number> {
  // Add page break if needed
  if (currentY > doc.internal.pageSize.height - MARGINS.BOTTOM - 20) {
    doc.addPage();
    currentY = MARGINS.TOP;
  }

  const details: (string | string[])[] = [
    `${index + 1}. ${prop.name}`,
    '',
    prop.description ?? '',
    '',
    `Category: ${prop.category}`,
    `Price: $${prop.price.toFixed(2)}`,
    prop.quantity > 1 ? `Quantity: ${prop.quantity}` : '',
    '',
    'Source Information:',
    `Source: ${prop.source}`,
    prop.sourceDetails ? `Details: ${prop.sourceDetails}` : '',
    prop.purchaseUrl ? `Purchase URL: ${prop.purchaseUrl}` : '',
    '',
    'Scene Information:',
    `Act ${prop.act ?? 'N/A'}, Scene ${prop.scene ?? 'N/A'}`,
    prop.isMultiScene ? '(Used in multiple scenes)' : '',
    '',
    'Physical Properties:',
    prop.length ? `Length: ${prop.length}${prop.unit}` : '',
    prop.width ? `Width: ${prop.width}${prop.unit}` : '',
    prop.height ? `Height: ${prop.height}${prop.unit}` : '',
    prop.weight ? `Weight: ${prop.weight}${prop.weightUnit}` : '',
    '',
    (prop.usageInstructions ? [
      'Usage Instructions:',
      prop.usageInstructions
    ] : []),
    '',
    (prop.maintenanceNotes ? [
      'Maintenance Notes:',
      prop.maintenanceNotes
    ] : []),
    '',
    (prop.safetyNotes ? [
      'Safety Notes:',
      prop.safetyNotes
    ] : []),
    '',
    (prop.requiresPreShowSetup ? [
      'Pre-show Setup:',
      `Setup Time: ${prop.preShowSetupDuration ?? prop.setupTime ?? 'N/A'} minutes`,
      prop.preShowSetupNotes ? `Setup Instructions: ${prop.preShowSetupNotes}` : ''
    ] : []),
    '',
    (prop.hasOwnShippingCrate ? [
      'Transport Information:',
      prop.shippingCrateDetails ? `Shipping Crate: ${prop.shippingCrateDetails}` : '',
      prop.transportNotes ? `Transport Notes: ${prop.transportNotes}` : ''
    ] : []),
    '',
    (prop.hasBeenModified ? [
      '⚠️ Modifications:',
      prop.modificationDetails ?? '',
      prop.lastModifiedAt ? `Modified on: ${new Date(prop.lastModifiedAt).toLocaleDateString()}` : ''
    ] : [])
  ];

  const flattenedDetails = details
    .flat()
    .filter((item): item is string => typeof item === 'string' && item !== '')
    .map(item => item.toString());

  if (flattenedDetails.length === 0) {
    return currentY;
  }

  // Prop header
  doc.setFontSize(FONT_SIZES.HEADING);
  doc.setTextColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
  doc.text(flattenedDetails[0], MARGINS.LEFT, currentY);
  currentY += 8;

  // Basic Info
  doc.setFontSize(FONT_SIZES.BODY);
  doc.setTextColor(COLORS.TEXT[0], COLORS.TEXT[1], COLORS.TEXT[2]);

  for (const detail of flattenedDetails.slice(1)) {
    if (currentY > doc.internal.pageSize.height - MARGINS.BOTTOM - 20) {
      doc.addPage();
      currentY = MARGINS.TOP;
    }
    doc.text(detail, MARGINS.LEFT, currentY);
    currentY += 6;
  }

  // Add images
  if (prop.images && prop.images.length > 0) {
    currentY += MARGINS.CONTENT_SPACING;
    
    for (const image of prop.images) {
      const loadedImage = await loadImage(image.url);
      if (!loadedImage) continue;

      if (currentY > doc.internal.pageSize.height - MARGINS.BOTTOM - 40) {
        doc.addPage();
        currentY = MARGINS.TOP;
      }

      const maxWidth = IMAGE.MAX_WIDTH / 2;
      const maxHeight = IMAGE.MAX_HEIGHT / 2;
      
      doc.addImage(loadedImage, 'JPEG', MARGINS.LEFT, currentY, maxWidth, maxHeight);
      
      if (image.caption) {
        doc.setFontSize(FONT_SIZES.CAPTION);
        doc.setTextColor(COLORS.GRAY[0], COLORS.GRAY[1], COLORS.GRAY[2]);
        doc.text(image.caption, MARGINS.LEFT, currentY + maxHeight + 5);
      }
      
      currentY += maxHeight + MARGINS.CONTENT_SPACING;
    }
  }

  // Add QR code for setup video
  if (prop.preShowSetupVideo) {
    const qrCode = await generateQRCode(prop.preShowSetupVideo);
    if (qrCode) {
      if (currentY > doc.internal.pageSize.height - MARGINS.BOTTOM - 40) {
        doc.addPage();
        currentY = MARGINS.TOP;
      }

      const qrSize = 25;
      doc.addImage(qrCode, 'PNG', MARGINS.LEFT, currentY, qrSize, qrSize);
      doc.setFontSize(FONT_SIZES.CAPTION);
      doc.text('Setup Video', MARGINS.LEFT + qrSize + 5, currentY + (qrSize / 2));
      currentY += qrSize + MARGINS.CONTENT_SPACING;
    }
  }

  return currentY;
}

export async function generatePDF(props: Prop[], show: Show, previewMode = false): Promise<Uint8Array | void> {
  try {
    const sortedProps = sortProps(props);
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setProperties({
      title: `Props Bible - ${show.name}`,
      subject: `Props documentation for ${show.name}`,
      author: 'Props Bible App'
    });

    // Cover Page
    let currentY = MARGINS.TOP;

    doc.setFontSize(FONT_SIZES.TITLE);
    doc.setTextColor(COLORS.PRIMARY[0], COLORS.PRIMARY[1], COLORS.PRIMARY[2]);
    doc.text(show.name, MARGINS.LEFT, currentY);
    currentY += 10;

    doc.setFontSize(FONT_SIZES.SUBTITLE);
    doc.setTextColor(COLORS.SECONDARY[0], COLORS.SECONDARY[1], COLORS.SECONDARY[2]);
    doc.text('Props Bible', MARGINS.LEFT, currentY);
    currentY += MARGINS.CONTENT_SPACING * 2;

    // Show Details
    doc.setFontSize(FONT_SIZES.BODY);
    doc.setTextColor(COLORS.TEXT[0], COLORS.TEXT[1], COLORS.TEXT[2]);

    // Calculate total scenes
    const totalActs = show.acts.length;
    const totalScenes = show.acts.reduce((sum, act) => sum + act.scenes.length, 0);

    const showDetails = [
      `Total Acts: ${totalActs}`,
      `Total Scenes: ${totalScenes}`,
      show.stageManager ? `Stage Manager: ${show.stageManager}` : null,
      show.propsSupervisor ? `Props Supervisor: ${show.propsSupervisor}` : null,
      show.productionCompany ? `Production Company: ${show.productionCompany}` : null,
      show.description ? `Description: ${show.description}` : null,
      `Generated on: ${new Date().toLocaleDateString()}`,
      `Total Props: ${props.length}`,
      `Total Items: ${props.reduce((sum, prop) => sum + prop.quantity, 0)}`,
      `Total Value: £${props.reduce((sum, prop) => sum + (prop.price * prop.quantity), 0).toFixed(2)}`
    ].filter((detail): detail is string => detail !== null);

    for (const detail of showDetails) {
      doc.text(detail, MARGINS.LEFT, currentY);
      currentY += 6;
    }

    // Add page break after cover
    doc.addPage();

    // Process each prop
    for (let i = 0; i < sortedProps.length; i++) {
      currentY = await processPropForPDF(doc, sortedProps[i], i, MARGINS.TOP);
      
      // Add page break between props
      if (i < sortedProps.length - 1) {
        doc.addPage();
      }
    }

    // Add page numbers
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(FONT_SIZES.CAPTION);
    doc.setTextColor(COLORS.GRAY[0], COLORS.GRAY[1], COLORS.GRAY[2]);
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    if (previewMode) {
      return new Uint8Array(doc.output('arraybuffer'));
    } else {
      doc.save(`${show.name}-Props-Documentation.pdf`);
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}