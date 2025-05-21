import React, { useEffect, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import type { Prop } from '@/shared/types/props';
import type { Show } from '@/types/index';
import { generatePDF } from '../lib/pdf';

interface PdfPreviewProps {
  props: Prop[];
  show: Show;
  onClose: () => void;
}

export function PdfPreview({ props, show, onClose }: PdfPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    let url: string | null = null;

    const generatePreview = async () => {
      try {
        setLoading(true);
        setError(null);
        const pdfOutput = await generatePDF(props, show, true);
        if (!pdfOutput) throw new Error('Failed to generate PDF preview');
        
        const blob = new Blob([pdfOutput], { type: 'application/pdf' });
        url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (error) {
        console.error('Error generating PDF preview:', error);
        setError('Failed to generate PDF preview. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    generatePreview();

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [props, show]);

  const handleDownload = async () => {
    try {
      setLoading(true);
      await generatePDF(props, show, false);
      setLoading(false);
      onClose();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Failed to download PDF. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[100]">
      <div className="bg-[#1A1A1A] rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col border border-gray-800 relative">
        <div className="sticky top-0 z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-gray-800 bg-[#1A1A1A] rounded-t-lg">
          <div className="flex items-center justify-between w-full">
            <h2 className="text-lg sm:text-xl font-bold text-white truncate">
              {show.name} - PDF Preview
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
              {loading ? (
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
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : pdfUrl ? (
            isMobile ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="text-center max-w-md mx-auto">
                  <p className="text-gray-400 mb-6">
                    PDF preview is not available on mobile devices. Please use the download button to view the PDF on your device.
                  </p>
                  <button
                    onClick={handleDownload}
                    className="w-full px-4 py-3 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors flex items-center justify-center"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download PDF
                  </button>
                </div>
              </div>
            ) : (
              <iframe
                src={pdfUrl}
                className="w-full h-full rounded-b-lg"
                title="PDF Preview"
              />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}