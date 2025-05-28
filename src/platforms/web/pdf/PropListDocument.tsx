import React, { useState, useEffect } from 'react';
import { Document, Page, View, Text, StyleSheet, Image, Font } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import type { Prop } from '../../../shared/types/props.ts';
import { Show } from '../../../types/index.ts'; // Corrected path for Show type

// Define available fonts
// ... existing code ...

// --- QR Code Generation Hook (or Utility Function) ---
// This generates the QR code data URL asynchronously
const useQRCode = (text: string, options?: QRCode.QRCodeToDataURLOptions): string | null => {
   const [dataUrl, setDataUrl] = useState<string | null>(null);

   useEffect(() => {
      if (!text) {
         setDataUrl(null);
         return;
      }
      QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 1, width: 80, ...options })
         .then(url => setDataUrl(url))
         .catch(err => {
            console.error('QR Code generation failed:', err);
            setDataUrl(null); // Handle error case
         });
   }, [text, options]); // Re-generate if text or options change

   return dataUrl;
};

// Define basic styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 20, // Adjusted padding
    fontFamily: 'Helvetica', 
  },
  section: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
    paddingBottom: 5,
  },
  propItem: {
    marginBottom: 15,
    paddingBottom: 10, // Add padding to separate items
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0', 
  },
  propName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333333', // Darker color
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 5, // Increased vertical spacing between rows
    alignItems: 'flex-start', // Align items at the top for long values
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    maxWidth: '30%', // Explicitly limit label width
    marginRight: 5, // Add some space between label and value
    paddingVertical: 2, // Increase vertical padding for line height
    color: '#555555', // Grey labels
  },
  fieldValue: {
    fontSize: 9,
    flex: 1, // Allow value to take remaining space
    paddingVertical: 2, // Increase vertical padding for line height
    color: '#333333',
  },
  imagesContainer: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     marginTop: 5,
  },
  propImage: {
     marginBottom: 5,
     maxWidth: '100%', // Ensure image doesn't overflow container
     objectFit: 'contain',
  },
  imageSmall: {
     width: '25%',
  },
  imageMedium: {
     width: '50%',
  },
  imageFull: {
     width: '100%',
  },
  qrCodeContainer: {
     marginTop: 8,
     flexDirection: 'row',
     alignItems: 'center',
  },
  qrCodeImage: {
     width: 50, // Smaller QR code
     height: 50,
     marginRight: 5,
  },
  qrCodeLabel: {
      fontSize: 8,
      color: '#666666',
  },
  propItemContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
});

interface PropListDocumentProps {
  props: Prop[];
  options: {
    selectedFields: Record<keyof Prop, boolean>;
    layout: 'portrait' | 'landscape';
    columns: number; // Placeholder for future multi-column layout
    imageCount: number;
    showFilesQR: boolean;
    showVideosQR: boolean;
    imageWidthOption: 'small' | 'medium' | 'full'; // Added image size option
  };
  showName: string;
}

// Simple function to format field labels
const formatLabel = (key: string): string => {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
};

// --- Helper function to render a single field row ---
const renderFieldRow = (prop: Prop, fieldKey: keyof Prop) => {
  let value = prop[fieldKey];
  if (value === undefined || value === null) return null;

  // Basic formatting for specific types (can be expanded)
  if (typeof value === 'boolean') {
    value = value ? 'Yes' : 'No';
  } else if (Array.isArray(value)) {
    value = value.join(', '); 
  } else if (fieldKey === 'act' || fieldKey === 'scene') {
    value = String(value); 
  } else {
    value = String(value); 
  }

  if (!value) return null;

  return (
    <View key={fieldKey} style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{formatLabel(fieldKey)}:</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
};

// --- Component to Render a Single Prop with QR Codes --- 
// We extract this to use the useQRCode hook effectively per prop
const PropItemView: React.FC<{ prop: Prop; options: PropListDocumentProps['options'] }> = ({ prop, options }) => {
   // Define the base URL for your application (replace with actual URL)
   const baseUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://yourapp.com'; // Use env variable or fallback
   const filesUrl = `${baseUrl}/props/${prop.id}/files`; // Example URL structure
   const videosUrl = `${baseUrl}/props/${prop.id}/videos`; // Example URL structure

   const filesQRCodeUrl = useQRCode(filesUrl);
   const videosQRCodeUrl = useQRCode(videosUrl);

   return (
      <View key={prop.id} style={styles.propItem} wrap={false}> {/* wrap=false prevents items breaking across pages */}
         {/* Always show Name if available and selected */}
         {options.selectedFields.name && prop.name && (
            <Text style={styles.propName}>{prop.name}</Text>
         )}

         {/* Render Act if selected and available */}
         {options.selectedFields.act && renderFieldRow(prop, 'act')}

         {/* Render Scene if selected and available */}
         {options.selectedFields.scene && renderFieldRow(prop, 'scene')}

         {/* --- Render Images --- */}
         {options.imageCount > 0 && prop.images && prop.images.length > 0 && (
            <View style={styles.imagesContainer}>
               {prop.images?.slice(0, options.imageCount).map((img) => (
                   <Image key={img.id} style={styles.propImage} src={img.url} />
               ))}
            </View>
         )}

         {/* Render Description if selected and available */}
         {options.selectedFields.description && renderFieldRow(prop, 'description')}

         {/* Iterate over *remaining* selected fields and display them */}
         {Object.entries(options.selectedFields)
           // Exclude fields already handled explicitly
           .filter(([key, isSelected]) => 
               isSelected && 
               !['name', 'act', 'scene', 'description'].includes(key) && 
               prop[key as keyof Prop] !== undefined && 
               prop[key as keyof Prop] !== null
           )
           .map(([key]) => renderFieldRow(prop, key as keyof Prop))}

         {/* --- Render QR Codes --- */}
          {options.showFilesQR && filesQRCodeUrl && (
              <View style={styles.qrCodeContainer}>
                  <Image style={styles.qrCodeImage} src={{ uri: filesQRCodeUrl }} />
                  <Text style={styles.qrCodeLabel}>Scan for Files</Text>
              </View>
          )}
          {options.showVideosQR && videosQRCodeUrl && (
              <View style={styles.qrCodeContainer}>
                  <Image style={styles.qrCodeImage} src={{ uri: videosQRCodeUrl }} />
                  <Text style={styles.qrCodeLabel}>Scan for Videos</Text>
              </View>
          )}

      </View>
   );
};

// --- Document Component --- 
export const PropListDocument: React.FC<PropListDocumentProps> = ({ props, options, showName }) => {
  // Function to get the appropriate image style based on the option
  const getImageStyle = () => {
     switch (options.imageWidthOption) {
       case 'small': return styles.imageSmall;
       case 'full': return styles.imageFull;
       case 'medium':
       default: return styles.imageMedium;
     }
  };

  const imageStyle = getImageStyle();

  // Function to determine the style for each prop item based on columns
  const getPropItemStyle = (numColumns: number) => {
    const baseStyle = styles.propItem;
    if (numColumns === 1) {
      return { ...baseStyle, width: '100%' };
    }
    // Basic calculation for width, adjust padding/margin as needed
    const widthPercentage = `${100 / numColumns}%`; 
    return {
      ...baseStyle,
      width: widthPercentage,
      paddingRight: numColumns > 1 ? 5 : 0, // Add some horizontal spacing between columns
      paddingLeft: numColumns > 1 ? 5 : 0,
    };
  };

  const propItemStyle = getPropItemStyle(options.columns);

  return (
  <Document>
    <Page size="A4" orientation={options.layout} style={styles.page}>
      <View style={styles.section}>
        <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 10 }}>
          Prop List for {showName}
        </Text>
      </View>

      {/* Wrap prop items in a flex container */}
      <View style={styles.propItemContainer}>
        {props.map((prop) => (
          // Apply dynamic width style to a wrapper View around PropItemView
          <View key={prop.id} style={propItemStyle}>
             <PropItemView prop={prop} options={options} />
          </View>
        ))}
      </View>
    </Page>
  </Document>
);
};
