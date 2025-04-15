import type { Prop } from '../types';

function convertToCSV(props: Prop[]): string {
  // Define headers
  const headers = [
    'Name',
    'Category',
    'Description',
    'Price',
    'Quantity',
    'Total Cost',
    'Source',
    'Source Details',
    'Purchase URL',
    'Act',
    'Scene',
    'Multi-Scene',
    'Consumable',
    'Dimensions',
    'Transport Method',
    'Transport Notes',
    'Special Transport Required',
    'Travel Weight (kg)',
    'Usage Instructions',
    'Setup Time (minutes)',
    'Maintenance Notes',
    'Safety Notes',
    'Handling Instructions',
    'Main Image URL',
    'Additional Image URLs',
    'Image Captions'
  ];

  // Convert props to rows
  const rows = props.map(prop => {
    // Get main image URL
    const mainImage = prop.images?.find(img => img.isMain);
    const mainImageUrl = mainImage?.url || prop.imageUrl || '';

    // Get additional image URLs and captions
    const additionalImages = prop.images?.filter(img => !img.isMain) || [];
    const additionalImageUrls = additionalImages.map(img => img.url).join(', ');
    const imageCaptions = prop.images?.map(img => img.caption).filter(Boolean).join(', ') || '';

    return [
      prop.name,
      prop.category,
      prop.description,
      prop.price.toString(),
      prop.quantity.toString(),
      (prop.price * prop.quantity).toString(),
      prop.source,
      prop.sourceDetails,
      prop.purchaseUrl || '',
      prop.isMultiScene ? 'Multiple' : prop.act?.toString() || '',
      prop.isMultiScene ? 'Multiple' : prop.scene?.toString() || '',
      prop.isMultiScene ? 'Yes' : 'No',
      prop.isConsumable ? 'Yes' : 'No',
      [
        prop.length ? `L: ${prop.length}` : '',
        prop.width ? `W: ${prop.width}` : '',
        prop.height ? `H: ${prop.height}` : '',
      ].filter(Boolean).join(' × ') + (prop.unit ? ` ${prop.unit}` : ''),
      prop.transportMethod || '',
      prop.transportNotes || '',
      prop.requiresSpecialTransport ? 'Yes' : 'No',
      prop.travelWeight?.toString() || '',
      prop.usageInstructions || '',
      prop.setupTime?.toString() || '',
      prop.maintenanceNotes || '',
      prop.safetyNotes || '',
      prop.handlingInstructions || '',
      mainImageUrl,
      additionalImageUrls,
      imageCaptions
    ];
  });

  // Escape special characters and wrap fields in quotes if needed
  const escapeField = (field: string) => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  // Convert to CSV string
  const csvContent = [
    headers.map(escapeField).join(','),
    ...rows.map(row => row.map(escapeField).join(','))
  ].join('\n');

  return csvContent;
}

export function downloadCSV(props: Prop[]) {
  const config = JSON.parse(localStorage.getItem('apiConfig') || '{}');
  const showName = config.SHOW_NAME || 'Props';
  
  // Generate CSV content
  const csvContent = convertToCSV(props);
  
  // Create blob and download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  // Set filename with date
  const date = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `${showName}-Props-${date}.csv`);
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}