import React, { useState, useRef, useEffect } from 'react';
import type { Prop } from '../../shared/types/props';
import DashboardLayout from '../PropsBibleHomepage';
import { useShowSelection } from '../contexts/ShowSelectionContext';
import { useFirebase } from '../contexts/FirebaseContext';
import { useWebAuth } from '../contexts/WebAuthContext';
import SubFootnote from '../components/SubFootnote';
import SimpleExportPanel from '../components/pdf/SimpleExportPanel';
import { UnifiedPdfService } from '../services/pdf/UnifiedPdfService';
import { type PdfTemplateOptions } from '../services/pdf/PdfTemplateRegistry';
import { BrandingPresetService, type BrandingPresetOptions } from '../services/pdf/BrandingPresetService';
import { BrandingStorageService } from '../services/pdf/BrandingStorageService';
import { type UserPermissions } from '../services/pdf/FieldMappingService';
import { type FieldConfiguration } from '../services/pdf/FieldConfigurationService';
import { type ShowData } from '../services/pdf/EnterprisePdfService';


// Services
const unifiedPdfService = UnifiedPdfService.getInstance();
const brandingPresetService = BrandingPresetService.getInstance();
const brandingStorageService = BrandingStorageService.getInstance();

// Simple PDF options
const defaultPdfOptions = {
  selectedFields: {} as Record<string, boolean>,
  layout: 'landscape' as const,
  orientation: 'landscape' as const,
  includeTitlePage: true,
  includeImages: true,
  includeQR: true,
  title: '',
};

// Legacy function removed - now using EnterprisePdfService

const PropsPdfExportPage: React.FC = () => {
  // Simple state management
  const [pdfOptions, setPdfOptions] = useState(defaultPdfOptions);
  
  // Load saved branding settings on component mount
  const [savedBranding, setSavedBranding] = useState<BrandingPresetOptions | null>(null);
  const [currentConfiguration, setCurrentConfiguration] = useState<FieldConfiguration | null>(null);
  const [showData, setShowData] = useState<ShowData | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  
  // Company branding state - initialize with saved settings or default preset
  const [companyBranding, setCompanyBranding] = useState<BrandingPresetOptions>(() => {
    // Try to load saved branding first
    const saved = brandingStorageService.loadBrandingSettings();
    if (saved) {
      return saved;
    }
    
    // Fall back to default preset
    const defaultPreset = brandingPresetService.getDefaultPreset();
    return defaultPreset.branding;
  });

  // Load saved branding settings on component mount
  useEffect(() => {
    const saved = brandingStorageService.loadBrandingSettings();
    if (saved) {
      setSavedBranding(saved);
      setCompanyBranding(saved);
      console.log('Loaded saved branding settings:', saved);
    }
  }, []);
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [props, setProps] = useState<Prop[]>([]);
  const [showTitle, setShowTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [pageHtmls, setPageHtmls] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const previewNavRef = useRef<HTMLDivElement>(null);
  const [, setFullHtml] = useState('');
  const [pageCss, setPageCss] = useState('');
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [, setTotalPages] = useState(0);

  // Services
  const { service } = useFirebase();
  const { currentShowId } = useShowSelection();
  const { user } = useWebAuth();


  // Initialize user permissions
  useEffect(() => {
    if (currentShowId) {
      // For testing purposes, provide full permissions if user is logged in
      // In production, this would be determined from actual user roles
      const permissions: UserPermissions = {
        role: user ? ((user as any).role || 'editor') : 'viewer',
        permissions: user ? ((user as any).permissions || ['view', 'export', 'edit']) : [],
        showId: currentShowId,
        isOwner: false, // This would need to be determined from show data
        isAdmin: user ? ((user as any).role === 'admin' || (user as any).role === 'god') : false,
      };
      setUserPermissions(permissions);
    }
  }, [user, currentShowId]);

  // Load show data and props
  useEffect(() => {
    if (!currentShowId) {
      setProps([]);
      setShowTitle('');
      setShowData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setGenerationError(null);

    const unsubPropsRef: { fn?: () => void } = {};
    const unsubShow = service.listenToDocument('shows/' + currentShowId, doc => {
      const showDoc = doc.data;
      if (showDoc) {
        setShowTitle(showDoc.name || '');
        setPdfOptions(opt => ({ ...opt, title: showDoc.name || '' }));
        
        // Convert to ShowData format
        const enterpriseShowData: ShowData = {
          id: currentShowId,
          name: showDoc.name || '',
          description: showDoc.description,
          venue: showDoc.venue,
          startDate: showDoc.startDate,
          endDate: showDoc.endDate,
          team: showDoc.team,
          collaborators: showDoc.collaborators,
          contacts: showDoc.contacts,
          logoImage: showDoc.logoImage,
        };
        setShowData(enterpriseShowData);
      }
    });

    // Load props
    unsubPropsRef.fn = service.listenToCollection('props', (data) => {
      console.log('Raw props data:', data);
      console.log('Current show ID:', currentShowId);
      const showProps = data
        .filter(doc => doc.data.showId === currentShowId)
        .map(doc => ({ ...(doc.data as Prop), id: doc.id }));
      console.log('Filtered props for show:', showProps);
      setProps(showProps);
      setLoading(false);
    }, _err => {
      console.error('Error loading props:', _err);
      setProps([]);
      setLoading(false);
      setGenerationError('Failed to load props data');
    });

    return () => { 
      if (unsubShow) unsubShow(); 
      if (unsubPropsRef.fn) unsubPropsRef.fn(); 
    };
  }, [service, currentShowId]);

  useEffect(() => {
    if (showPreview && previewNavRef.current) {
      previewNavRef.current.focus();
    }
  }, [showPreview]);

  useEffect(() => {
    if (showPreview && pageHtmls.length > 0) {
      // Preview is ready for display
      console.log('Preview ready with', pageHtmls.length, 'pages');
    }
  }, [showPreview, pageHtmls, currentPage, pageCss]);

  // Determine orientation based on current configuration
  const currentLayout = (currentConfiguration as any)?.layout || 'landscape';
  const isLandscape = currentLayout !== 'portrait-catalog';
  
  // A4 dimensions - using exact ISO 216 standard measurements
  // A4 Portrait: 210mm × 297mm
  // A4 Landscape: 297mm × 210mm (aspect ratio: 1.414:1)
  const pageWidthMm = isLandscape ? 297 : 210;
  const pageHeightMm = isLandscape ? 210 : 297;
  const aspectRatio = pageWidthMm / pageHeightMm; // Should be 1.414 for landscape
  
  // Calculate scale to fit landscape page within portrait container
  // A4 Portrait: 210mm × 297mm
  // A4 Landscape: 297mm × 210mm
  const portraitWidthMm = 210;
  const portraitHeightMm = 297;
  
  // Calculate the maximum scale that fits the landscape page within portrait dimensions
  const scaleForWidth = portraitWidthMm / pageWidthMm;   // 210/297 = 0.707
  const scaleForHeight = portraitHeightMm / pageHeightMm; // 297/210 = 1.414
  const maxScaleForPortrait = Math.min(scaleForWidth, scaleForHeight); // Use the smaller scale
  
  // Apply both the portrait fit scale and user preview scale
  const finalScale = maxScaleForPortrait * previewScale;
  
  // Ensure we maintain exact A4 proportions
  const finalWidth = pageWidthMm * finalScale;
  const finalHeight = pageHeightMm * finalScale;
  const finalAspectRatio = finalWidth / finalHeight;
  
  // Convert to pixels for preview container sizing (96 DPI standard)
  const mmToPx = 3.7795275591;
  const pageW = Math.round(pageWidthMm * mmToPx);
  const pageH = Math.round(pageHeightMm * mmToPx);
  const scaledW = Math.max(0, Math.floor(pageW * finalScale));
  const scaledH = Math.max(0, Math.floor(pageH * finalScale));
  
  console.log('Preview orientation debug:', {
    currentLayout,
    isLandscape,
    pageWidthMm,
    pageHeightMm,
    aspectRatio: aspectRatio.toFixed(3),
    scaleForWidth: scaleForWidth.toFixed(3),
    scaleForHeight: scaleForHeight.toFixed(3),
    maxScaleForPortrait: maxScaleForPortrait.toFixed(3),
    finalScale: finalScale.toFixed(3),
    finalWidth: finalWidth.toFixed(1),
    finalHeight: finalHeight.toFixed(1),
    finalAspectRatio: finalAspectRatio.toFixed(3),
    pageW,
    pageH,
    scaledW,
    scaledH,
    previewScale,
    currentConfiguration: currentConfiguration ? Object.keys(currentConfiguration) : 'none'
  });

  // Enterprise PDF generation handler
  const handleConfigurationChange = (configuration: FieldConfiguration) => {
    setCurrentConfiguration(configuration);
  };

  // Branding change handler
  const handleBrandingChange = (branding: BrandingPresetOptions) => {
    setCompanyBranding(branding);
    
    // Auto-save branding settings
    brandingStorageService.saveBrandingSettings(branding);
    console.log('Branding settings saved:', branding);
  };

  const handleSaveBranding = () => {
    brandingStorageService.saveBrandingSettings(companyBranding);
    console.log('Branding settings manually saved');
  };

  const handleLoadBranding = () => {
    const saved = brandingStorageService.loadBrandingSettings();
    if (saved) {
      setCompanyBranding(saved);
      console.log('Branding settings loaded:', saved);
    }
  };

  const handleClearBranding = () => {
    brandingStorageService.clearBrandingSettings();
    const defaultPreset = brandingPresetService.getDefaultPreset();
    setCompanyBranding(defaultPreset.branding);
    console.log('Branding settings cleared, reset to default');
  };


  const handlePreview = async (configuration: FieldConfiguration) => {
    console.log('Starting preview generation...');
    console.log('Current show ID:', currentShowId);
    console.log('Show data:', showData);
    console.log('User permissions:', userPermissions);
    console.log('Props count:', props.length);
    console.log('Configuration:', configuration);

    if (!currentShowId || !showData || !userPermissions) {
      const error = 'Missing required data for PDF generation';
      console.error(error);
      setGenerationError(error);
      return;
    }

    if (!props || props.length === 0) {
      const error = 'No props found for this show. Please add some props first.';
      console.error(error);
      setGenerationError(error);
      return;
    }

    // Update current configuration to ensure preview uses correct layout
    setCurrentConfiguration(configuration);

    setIsPreviewLoading(true);
    setGenerationError(null);

    try {
      const layout = (configuration as any).layout || 'landscape';
      
      // Map layout to template ID
      const templateId = layout === 'portrait-catalog' ? 'portrait-catalog' : 'landscape';
      
      const options: PdfTemplateOptions = {
        selectedFields: configuration.fieldSelections,
        title: showTitle || 'Props List',
        showData: {
          name: showData.name || 'Unknown Show',
          venue: showData.venue,
          description: showData.description,
        },
        businessName: companyBranding.companyName || showData.name || 'BUSINESS NAME',
        layout: layout === 'portrait-catalog' ? 'portrait' : 'landscape',
        sortBy: (configuration as any).sortBy || 'act_scene',
        includeQRCodes: (configuration as any).includeQRCodes !== false,
        applyBrandingToOnline: (configuration as any).applyBrandingToOnline || false,
        onlineFieldSelections: (configuration as any).onlineFieldSelections || {},
        branding: {
          primaryColor: companyBranding.primaryColor,
          secondaryColor: companyBranding.secondaryColor,
          accentColor: companyBranding.accentColor,
          fontFamily: companyBranding.fontFamily,
          fontSize: companyBranding.fontSize,
        },
        logoUrl: companyBranding.companyLogo || showData.logoImage?.url || undefined,
        baseUrl: window.location.origin, // Use current domain for QR codes
      };

      console.log('Unified PDF options:', options);
      console.log('Template ID:', templateId);
      console.log('Props being passed to Unified PDF:', props);
      console.log('Props count:', props.length);
      console.log('Selected fields:', Object.keys(options.selectedFields).filter(k => options.selectedFields[k]));

      const result = await unifiedPdfService.generatePdf(
        props,
        showData,
        userPermissions,
        { ...options, templateId }
      );

      console.log('Unified PDF generation result:', result);

      if (result.success) {
        console.log('Unified PDF HTML generated, length:', result.html.length);
        console.log('Unified PDF CSS generated, length:', result.css.length);
        setFullHtml(result.html);
        setPageCss(result.css);
        
        // Parse pages from HTML for preview
        const parser = new DOMParser();
        const doc = parser.parseFromString(result.html, 'text/html');
        const pageElements = doc.querySelectorAll('.page');
        const pages = Array.from(pageElements).map(page => page.outerHTML);
        console.log('Parsed pages:', pages.length);
        
        setPageHtmls(pages);
        setCurrentPage(0);
        setTotalPages(pages.length);
        setShowPreview(true);
        
        // Create preview URL
        const blob = new Blob([result.html], { type: 'text/html' });
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(blob));
        
        console.log('Unified PDF preview generated successfully');
      } else {
        setGenerationError(result.error || 'PDF generation failed');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      setGenerationError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleExport = async (configuration: FieldConfiguration) => {
    console.log('Export button clicked!');
    console.log('Current show ID:', currentShowId);
    console.log('Show data:', showData);
    console.log('User permissions:', userPermissions);
    console.log('Props count:', props?.length);
    console.log('Configuration:', configuration);

    if (!currentShowId || !showData || !userPermissions) {
      const errorMsg = 'Missing required data for PDF generation';
      console.error(errorMsg, { currentShowId, showData, userPermissions });
      setGenerationError(errorMsg);
      return;
    }

    if (!props || props.length === 0) {
      const errorMsg = 'No props found for this show. Please add some props first.';
      console.error(errorMsg);
      setGenerationError(errorMsg);
      return;
    }

      console.log('Starting PDF export generation...');
      setIsGenerating(true);
      setGenerationError(null);

    try {
      const layout = (configuration as any).layout || 'landscape';
      
      // Map layout to template ID
      const templateId = layout === 'portrait-catalog' ? 'portrait-catalog' : 'landscape';
      
      console.log('Using layout:', layout);
      console.log('Using template ID:', templateId);
      
      const options: PdfTemplateOptions = {
        selectedFields: configuration.fieldSelections,
        title: showTitle || 'Props List',
        showData: {
          name: showData.name || 'Unknown Show',
          venue: showData.venue,
          description: showData.description,
        },
        businessName: companyBranding.companyName || showData.name || 'BUSINESS NAME',
        layout: layout === 'portrait-catalog' ? 'portrait' : 'landscape',
        sortBy: (configuration as any).sortBy || 'act_scene',
        includeQRCodes: (configuration as any).includeQRCodes !== false,
        applyBrandingToOnline: (configuration as any).applyBrandingToOnline || false,
        onlineFieldSelections: (configuration as any).onlineFieldSelections || {},
        branding: {
          primaryColor: companyBranding.primaryColor,
          secondaryColor: companyBranding.secondaryColor,
          accentColor: companyBranding.accentColor,
          fontFamily: companyBranding.fontFamily,
          fontSize: companyBranding.fontSize,
        },
        logoUrl: companyBranding.companyLogo || showData.logoImage?.url || undefined,
        baseUrl: window.location.origin, // Use current domain for QR codes
      };

      const result = await unifiedPdfService.generatePdf(
        props,
        showData,
        userPermissions,
        { ...options, templateId }
      );

      console.log('PDF generation result:', result);
      
      if (result.success) {
        console.log('PDF generation successful, starting html2pdf...');
        // Generate actual PDF using html2pdf
        try {
          const { default: html2pdf } = await import('html2pdf.js');
          console.log('html2pdf imported successfully:', html2pdf);
        
          const element = document.createElement('div');
          element.innerHTML = result.html;
          element.style.cssText = result.css;
          
          const opt = {
            margin: [0.3, 0.3, 0.3, 0.3],
            filename: `${showTitle || 'props-list'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
              scale: 2, 
              useCORS: true,
              letterRendering: true,
              allowTaint: true,
              scrollX: 0,
              scrollY: 0
            },
            jsPDF: { 
              unit: 'in', 
              format: 'a4', 
              orientation: layout === 'portrait-catalog' ? 'portrait' : 'landscape',
              compress: true
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
          };

          console.log('html2pdf options:', opt);
          console.log('Starting PDF download...');
          
          await html2pdf().set(opt).from(element).save();
          console.log('Unified PDF exported successfully');
        } catch (html2pdfError) {
          console.error('html2pdf error:', html2pdfError);
          setGenerationError(`PDF generation failed: ${html2pdfError instanceof Error ? html2pdfError.message : 'Unknown error'}`);
        }
      } else {
        console.error('PDF generation failed:', result.error);
        setGenerationError(result.error || 'PDF generation failed');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      setGenerationError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <DashboardLayout>
      {loading ? (
        <div className="flex flex-col items-center justify-center h-96 text-pb-primary text-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pb-primary mb-4"></div>
          Loading props and show information...
        </div>
      ) : (
        <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto">
          {/* Simple Export Panel */}
          {userPermissions ? (
            <div className="w-full space-y-6">
              {/* Export Panel with integrated branding */}
              <SimpleExportPanel
                userPermissions={userPermissions}
                props={props}
                onConfigurationChange={handleConfigurationChange}
                onExport={handleExport}
                onPreview={handlePreview}
                onBrandingChange={handleBrandingChange}
                initialBranding={companyBranding}
                isLoading={isGenerating}
                isPreviewLoading={isPreviewLoading}
                className="h-fit"
              />
            </div>
          ) : (
            <div className="w-full">
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h2 className="text-2xl font-bold mb-2 text-gray-900">Loading Permissions...</h2>
                <p className="text-gray-600">Please wait while we load your access permissions.</p>
              </div>
            </div>
          )}

          {/* Preview Section */}
          {showPreview && (
            <div className="w-full">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6 text-white">
                  <h2 className="text-2xl font-bold mb-2">PDF Preview</h2>
                  <p className="text-green-100">Your PDF has been generated successfully</p>
                </div>
                
                <div className="p-6">
                  {/* Error Display */}
                  {generationError && (
                    <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50">
                      <div className="text-red-800 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Export Error</span>
                      </div>
                      <p className="text-red-700 text-sm mt-1">{generationError}</p>
                    </div>
                  )}
                  
                  {/* PDF Preview Content */}
                  {pageHtmls.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Document Preview</h3>
                        <div className="flex items-center gap-2">
                          <button
                            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            disabled={currentPage === 0}
                          >Previous</button>
                          <span className="text-gray-600 text-sm px-3 py-1 bg-gray-100 rounded">
                            Page {currentPage + 1} of {pageHtmls.length}
                          </span>
                          <button
                            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                            onClick={() => setCurrentPage(p => Math.min(pageHtmls.length - 1, p + 1))}
                            disabled={currentPage === pageHtmls.length - 1}
                          >Next</button>
                          <span className="text-xs text-gray-500 ml-4">
                            {isLandscape ? 'Landscape' : 'Portrait'} A4: {pageWidthMm}×{pageHeightMm}mm ({aspectRatio.toFixed(3)}:1)
                            {isLandscape && (
                              <span className="ml-2 text-blue-600">
                                Scaled: {(maxScaleForPortrait * 100).toFixed(0)}% → {finalWidth.toFixed(0)}×{finalHeight.toFixed(0)}mm ({finalAspectRatio.toFixed(3)}:1)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
                        <div 
                          className="bg-gray-100 p-4"
                          style={{
                            // Flexible container that allows proper A4 scaling
                            minWidth: `${scaledW + 40}px`,
                            minHeight: `${scaledH + 40}px`,
                            overflow: 'hidden', // Remove scrolling
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            margin: '0 auto'
                          }}
                        >
                          <div 
                            ref={previewContainerRef}
                            className="bg-white border border-gray-300 shadow-lg"
                            style={{
                              // Use exact mm dimensions for maximum precision
                              width: `${pageWidthMm}mm`,
                              height: `${pageHeightMm}mm`,
                              // Force exact A4 aspect ratio using CSS aspect-ratio property
                              aspectRatio: aspectRatio.toFixed(3), // 1.414 for landscape
                              // Scale for preview (fits landscape in portrait container)
                              transform: `scale(0.95)`,
                              transformOrigin: 'center center', // Center the scaling
                              overflow: 'visible', // Allow content to be visible
                              color: '#000',
                              backgroundColor: '#fff',
                              position: 'relative',
                              // Ensure proper rendering
                              boxSizing: 'border-box'
                            }}
                          >
                            <style dangerouslySetInnerHTML={{ __html: pageCss }} />
                            <div dangerouslySetInnerHTML={{ __html: pageHtmls[currentPage] || '' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Footer */}
          <div className="w-full">
            <SubFootnote features={["Enterprise PDF Export", "Role-based Permissions", "Advanced Field Mapping"]} />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PropsPdfExportPage;