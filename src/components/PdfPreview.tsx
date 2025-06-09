import React, { useEffect, useState, useRef } from 'react';
import { View, Button, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { X, Download, Loader2 } from 'lucide-react-native';
import type { Prop } from '../shared/types/props.ts';
import type { Show } from '../types/index.ts';
import { generatePDF } from '../lib/pdf.ts';
import type { PdfGenerationOptions } from '../shared/types/pdf.ts';

const styles = StyleSheet.create({
    mobileContainer: {
        flex: 1,
        backgroundColor: '#1C1C1E',
        paddingTop: Platform.OS === 'ios' ? 40 : 20,
    },
    mobileHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#3A3A3C',
    },
    mobileTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    mobileCloseButton: {
        padding: 5,
    },
    centeredContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    mobileStatusText: {
        marginTop: 15,
        fontSize: 16,
        color: '#EAEAEA',
    },
    mobileErrorText: {
        color: '#FF6B6B',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 15,
    },
    mobileInfoText: {
        fontSize: 16,
        color: '#EAEAEA',
        textAlign: 'center',
        marginBottom: 25,
    },
    mobileDownloadButton: {
        flexDirection: 'row',
        backgroundColor: '#0A84FF',
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
        alignItems: 'center',
    },
    mobileDownloadButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    }
});

interface PdfPreviewProps {
  props: Prop[];
  show: Show;
  options: PdfGenerationOptions;
  onClose: () => void;
}

export function PdfPreview({ props, show, options, onClose }: PdfPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = Platform.OS !== 'web';
  const webPreviewUrlRef = useRef<string | null>(null); // Ref to store object URL for cleanup

  const generatePreviewInternal = async () => {
    try {
      setLoading(true);
      setError(null);
      setPdfUrl(null); // Clear previous URL
      if (webPreviewUrlRef.current) {
        URL.revokeObjectURL(webPreviewUrlRef.current);
        webPreviewUrlRef.current = null;
      }

      const pdfOutput = await generatePDF(props, show, options, true); // isPreview = true
      
      if (Platform.OS === 'web') {
        if (typeof pdfOutput === 'string') { // HTML string for web preview
          const blob = new Blob([pdfOutput], { type: 'text/html' });
          const objectUrl = URL.createObjectURL(blob);
          setPdfUrl(objectUrl);
          webPreviewUrlRef.current = objectUrl; // Store for cleanup
        } else {
          throw new Error('Web preview expects HTML string from generatePDF.');
        }
      } else {
        // Mobile preview expects { uri: string }
        if (pdfOutput && typeof pdfOutput === 'object' && 'uri' in pdfOutput) {
          setPdfUrl(pdfOutput.uri);
        } else {
          // This case should ideally not happen if generatePDF is correct for mobile preview
          console.warn("Mobile preview didn't receive a URI object:", pdfOutput);
          setError('Failed to load PDF preview for mobile.');
        }
      }
    } catch (err: any) {
      console.error('Error generating PDF preview:', err);
      setError(err.message || 'Failed to generate PDF preview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generatePreviewInternal();
    return () => {
      // Cleanup object URL when component unmounts or dependencies change before next run
      if (webPreviewUrlRef.current) {
        URL.revokeObjectURL(webPreviewUrlRef.current);
        webPreviewUrlRef.current = null;
      }
    };
  }, [props, show, options]); // Regenerate if these change

  const handleDownload = async () => {
    try {
      setLoading(true);
      setError(null);
      await generatePDF(props, show, options, false); // isPreview = false for download/share
      setLoading(false);
      
      // On mobile, expo-print handles the UI. 
      // On web, printAsync opens browser dialog. Close modal after a short delay to allow dialogs to appear.
      setTimeout(onClose, 500); 

    } catch (err: any) {
      console.error('Error downloading/sharing PDF:', err);
      setError(err.message || 'Failed to download/share PDF. Please try again.');
      setLoading(false);
    }
  };

  if (isMobile) {
    return (
      <View style={styles.mobileContainer}> 
        <View style={styles.mobileHeader}>
            <Text style={styles.mobileTitle}>{options.title || "PDF Output"}</Text>
            <TouchableOpacity onPress={onClose} style={styles.mobileCloseButton}>
                <X size={24} color="#EAEAEA" />
            </TouchableOpacity>
        </View>

        {loading && (
            <View style={styles.centeredContent}>
                <ActivityIndicator size="large" color="#0A84FF" />
                <Text style={styles.mobileStatusText}>Generating PDF...</Text>
            </View>
        )}
        {error && (
            <View style={styles.centeredContent}>
                <Text style={styles.mobileErrorText}>{error}</Text>
                <Button title="Retry Generation" onPress={generatePreviewInternal} color="#0A84FF" />
            </View>
        )}
        {!loading && !error && !pdfUrl && Platform.OS !== 'web' && (
            // Case where mobile preview URI might be null but no error (e.g. initial state or if generation failed silently before error state)
             <View style={styles.centeredContent}>
                <Text style={styles.mobileInfoText}>
                    Could not load PDF preview. Try downloading.
                </Text>
                <TouchableOpacity onPress={handleDownload} style={styles.mobileDownloadButton}>
                    <Download size={20} color="#FFFFFF" />
                    <Text style={styles.mobileDownloadButtonText}>Open/Share PDF</Text>
                </TouchableOpacity>
            </View>
        )}
        {!loading && !error && pdfUrl && Platform.OS !== 'web' && (
            // Mobile: PDF URI is available, but direct preview in this component is complex (needs WebView).
            // So, guide user to download/share.
            <View style={styles.centeredContent}>
                <Text style={styles.mobileInfoText}>
                    PDF generated (URI: {pdfUrl.substring(0,100)}...). Use button to open/share.
                </Text>
                <TouchableOpacity onPress={handleDownload} style={styles.mobileDownloadButton}>
                    <Download size={20} color="#FFFFFF" />
                    <Text style={styles.mobileDownloadButtonText}>Open/Share PDF</Text>
                </TouchableOpacity>
            </View>
        )}
      </View>
    );
  }

  // Web UI 
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[100]">
      <div className="bg-[#1A1A1A] rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col border border-gray-800 relative">
        <div className="sticky top-0 z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-gray-800 bg-[#1A1A1A] rounded-t-lg">
          <div className="flex items-center justify-between w-full">
            <h2 className="text-lg sm:text-xl font-bold text-white truncate">
              {options.title || `${show.name} - PDF Preview`}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 p-2"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownload}
              disabled={loading}
              className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {loading && !error ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 relative bg-[#0A0A0A] rounded-b-lg overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
                <p className="mt-2 text-gray-400">Generating PDF preview...</p>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <button 
                    onClick={generatePreviewInternal} 
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : pdfUrl && Platform.OS === 'web' ? (
              <iframe
                src={pdfUrl} // This will be the object URL for the HTML blob
                className="w-full h-full rounded-b-lg"
                title="PDF Preview"
                sandbox="allow-scripts" // Sandbox for security if HTML content is complex, though it's generated by us
              />
          ) : Platform.OS !== 'web' && !error && pdfUrl ? (
             // This part of web UI should not be reached if isMobile is true. Included for completeness of logic.
             <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="text-center max-w-md mx-auto">
                  <p className="text-gray-400 mb-6">
                    Mobile PDF generated (URI: {pdfUrl}). This message shouldn't show on web preview.
                  </p>
                </div>
              </div>
          ) :  Platform.OS === 'web' && !loading && !error && !pdfUrl ? (
            // Fallback for web if pdfUrl is somehow null after loading and no error
            <div className="absolute inset-0 flex items-center justify-center p-4">
               <div className="text-center max-w-md mx-auto">
                 <p className="text-gray-400 mb-6">
                   Could not load PDF preview.
                 </p>
               </div>
             </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}