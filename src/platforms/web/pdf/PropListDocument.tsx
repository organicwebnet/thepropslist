import React, { useState, useEffect } from 'react';
import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import type { Prop } from '@/shared/types/props';

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
    marginBottom: 3, // Increased spacing
  },
  fieldLabel: {
    fontSize: 9, // Slightly smaller labels
    fontWeight: 'bold',
    width: '25%', // Adjusted width
    color: '#555555', // Grey labels
  },
  fieldValue: {
    fontSize: 9, // Slightly smaller values
    width: '75%', // Adjusted width
    color: '#333333',
  },
  imagesContainer: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     marginTop: 5,
  },
  propImage: {
     width: 60, // Smaller image size
     height: 60,
     objectFit: 'cover',
     marginRight: 5,
     marginBottom: 5,
     borderWidth: 0.5,
     borderColor: '#CCCCCC',
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
  }
});

interface PropListDocumentProps {
  props: Prop[];
  options: {
    selectedFields: Record<keyof Prop, boolean>;
    layout: 'portrait' | 'landscape';
    imageCount: number;
    showFilesQR: boolean;
    showVideosQR: boolean;
    // columns option is not directly used yet
  };
  showName?: string; // Optional: To display the show name
}

// Simple function to format field labels
const formatLabel = (key: string): string => {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
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
        {/* Iterate over selected fields and display them */}
        {Object.entries(options.selectedFields)
          .filter(([key, isSelected]) => isSelected && key !== 'name' && prop[key as keyof Prop] !== undefined && prop[key as keyof Prop] !== null)
          .map(([key]) => {
             const fieldKey = key as keyof Prop;
             let value = prop[fieldKey];
             
             // Basic formatting for specific types (can be expanded)
             if (typeof value === 'boolean') {
               value = value ? 'Yes' : 'No';
             } else if (Array.isArray(value)) {
               // Simple join for arrays (like materials, tags)
               value = value.join(', '); 
             } else if (fieldKey === 'act' || fieldKey === 'scene') {
                 value = String(value); // Display act/scene numbers directly
             } else {
               value = String(value); // Ensure it's a string
             }

             // Skip empty values after formatting
             if (!value) return null;

             return (
               <View key={fieldKey} style={styles.fieldRow}>
                 <Text style={styles.fieldLabel}>{formatLabel(fieldKey)}:</Text>
                 <Text style={styles.fieldValue}>{value}</Text>
               </View>
             );
        })}

        {/* --- Render Images --- */}
        {options.imageCount > 0 && prop.images && prop.images.length > 0 && (
           <View style={styles.imagesContainer}>
              {prop.images.slice(0, options.imageCount).map((img) => (
                  // Important: Ensure image URLs are absolute and accessible!
                  // @react-pdf/renderer might have issues with relative URLs or complex auth
                  <Image key={img.id} style={styles.propImage} src={img.url} />
              ))}
           </View>
        )}

        {/* --- Render QR Codes --- */}
         {options.showFilesQR && filesQRCodeUrl && (
             <View style={styles.qrCodeContainer}>
                 <Image style={styles.qrCodeImage} src={filesQRCodeUrl} />
                 <Text style={styles.qrCodeLabel}>Scan for Files</Text>
             </View>
         )}
         {options.showVideosQR && videosQRCodeUrl && (
             <View style={styles.qrCodeContainer}>
                 <Image style={styles.qrCodeImage} src={videosQRCodeUrl} />
                 <Text style={styles.qrCodeLabel}>Scan for Videos</Text>
             </View>
         )}

      </View>
   );
};


export const PropListDocument: React.FC<PropListDocumentProps> = ({ props, options, showName }) => (
  <Document>
    <Page size="A4" orientation={options.layout} style={styles.page}>
      <View style={styles.section}>
        <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 10 }}>
          Prop List {showName ? `for ${showName}` : ''}
        </Text>
      </View>

      {/* Map through props and use the PropItemView component */}
      {props.map((prop) => (
         <PropItemView key={prop.id} prop={prop} options={options} />
      ))}
    </Page>
  </Document>
); 