import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
// import { PDFViewer, BlobProvider } from '@react-pdf/renderer'; // Comment out PDF renderer imports
import { Download, Loader2 } from 'lucide-react';

import { useFirebase } from '../../../src/contexts/FirebaseContext.tsx';
import { useShows } from '../../../src/contexts/ShowsContext.tsx';
import type { Prop, Show, Act, Scene } from '../../../src/shared/types/props.ts';
import type { FirebaseDocument } from '../../../src/shared/services/firebase/types.ts';
// import { PropListDocument } from '../../../src/platforms/web/pdf/PropListDocument.tsx'; // Corrected extension

// Helper to get displayable keys from Prop type (excluding complex/internal fields)
const getDisplayablePropKeys = (): (keyof Prop)[] => {
  // Explicitly list keys from the Prop interface suitable for PDF display
  const includedKeys: (keyof Prop)[] = [
    'name',
    'description',
    'category',
    'price',
    'quantity',
    'length',
    'width',
    'height',
    'depth',
    'unit',
    'weight',
    'weightUnit',
    'travelWeight',
    'source',
    'sourceDetails',
    'purchaseUrl',
    'rentalDueDate',
    'act',
    'scene',
    'sceneName',
    // 'isMultiScene', // Boolean flags might be less useful, uncomment if needed
    // 'isConsumable', // Boolean flag
    // 'imageUrl', // Usually shown separately or not in lists
    'usageInstructions',
    'maintenanceNotes',
    'safetyNotes',
    'handlingInstructions',
    // 'requiresPreShowSetup', // Boolean flag
    'preShowSetupDuration',
    'preShowSetupNotes',
    'preShowSetupVideo',
    // 'setupTime', // Potentially redundant with preShowSetupDuration?
    // 'hasOwnShippingCrate', // Boolean flag
    'shippingCrateDetails',
    // 'requiresSpecialTransport', // Boolean flag
    'transportMethod',
    'transportNotes',
    'status',
    'location',
    'currentLocation',
    'notes',
    'tags',
    'materials',
    'nextMaintenanceDue',
    // 'hasBeenModified', // Boolean flag
    'modificationDetails',
    'lastUsedAt',
    'condition',
    'purchaseDate',
    'handedness',
    // 'isBreakable', // Boolean flag
    // 'isHazardous', // Boolean flag
    'storageRequirements',
    // Complex/Internal fields typically excluded:
    // 'id', 'userId', 'showId', 'images', 'digitalAssets', 'videos', 
    // 'statusHistory', 'maintenanceHistory', 'lastModifiedAt', 'createdAt', 
    // 'updatedAt', 'lastUpdated' 
  ];

  return includedKeys;
};

// Placeholder page for PDF Preview and Customization
export default function PdfPreviewPage() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { service: firebaseService, isInitialized: firebaseInitialized } = useFirebase();
  const { getShowById } = useShows();

  const [show, setShow] = useState<Show | null>(null);
  const [propData, setPropData] = useState<Prop[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false); 
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // --- Filter/Customization State --- 
  const [checkedActs, setCheckedActs] = useState<Record<string, boolean>>({});
  const [checkedScenes, setCheckedScenes] = useState<Record<string, boolean>>({});
  const [imageCount, setImageCount] = useState<number>(1);
  const [showFilesQR, setShowFilesQR] = useState<boolean>(false);
  const [showVideosQR, setShowVideosQR] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Record<keyof Prop, boolean>>(() => {
     const initialFields: Record<string, boolean> = {};
     // Default common fields to true
     const defaultSelected: (keyof Prop)[] = ['name', 'category', 'description', 'location', 'status', 'quantity', 'condition'];
     getDisplayablePropKeys().forEach(key => {
         initialFields[key as string] = defaultSelected.includes(key);
     });
     return initialFields as Record<keyof Prop, boolean>;
  });
  const [layout, setLayout] = useState<'portrait' | 'landscape'>('portrait');
  const [columns, setColumns] = useState<number>(1); 
  const [imageWidthOption, setImageWidthOption] = useState<'small' | 'medium' | 'full'>('medium'); // Default to medium
  // --- End Filter/Customization State --- 

  const displayablePropKeys = getDisplayablePropKeys();
  const showIdParam = searchParams.showId;
  const showId = typeof showIdParam === 'string' ? showIdParam : undefined;

  // --- Initialize Checked State Effect --- 
  useEffect(() => {
     if (show?.acts) {
        const initialActsChecked: Record<string, boolean> = {};
        const initialScenesChecked: Record<string, boolean> = {};
        show.acts.forEach((act: Act) => {
           const actIdStr = String(act.id);
           initialActsChecked[actIdStr] = true; // Default acts to checked
           act.scenes?.forEach((scene: Scene) => {
              const sceneIdStr = String(scene.id);
              initialScenesChecked[sceneIdStr] = true; // Default scenes to checked
           });
        });
        setCheckedActs(initialActsChecked);
        setCheckedScenes(initialScenesChecked);
        console.log('[PDF Preview] Initialized checkedActs:', initialActsChecked);
        console.log('[PDF Preview] Initialized checkedScenes:', initialScenesChecked);
        setShowPreview(false); // Reset preview on initial load
     }
  }, [show]); // Depend on show data
  // --- End Initialize Checked State Effect --- 

  // --- Data Fetching Effect (existing) --- 
  useEffect(() => {
    if (!showId || !firebaseInitialized || !firebaseService) {
      setError('Missing required data (Show ID or Firebase Service).');
      setIsLoading(false);
      return;
    }

    let propsUnsubscribe: (() => void) | null = null;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch Show Details first
        const showData = await getShowById(showId);
        if (!showData) {
          throw new Error(`Show with ID ${showId} not found.`);
        }
        setShow(showData);

        // Fetch Props for the show
        propsUnsubscribe = firebaseService.listenToCollection<Prop>(
          'props',
          (propDocs: FirebaseDocument<Prop>[]) => {
            const extractedData = propDocs.map(doc => ({ ...doc.data, id: doc.id } as Prop));
            console.log('[PDF Preview] Fetched propData:', extractedData);
            setPropData(extractedData);
            setIsLoading(false);
          },
          (err: Error) => {
            console.error("Error fetching props for PDF:", err);
            setError('Failed to load props for PDF.');
            setIsLoading(false);
          },
          { where: [['showId', '==', showId]] }
        );

      } catch (fetchError: any) {
        console.error("Error loading data for PDF preview:", fetchError);
        setError(fetchError.message || 'Error loading data.');
        setIsLoading(false);
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      if (propsUnsubscribe && typeof propsUnsubscribe === 'function') {
        console.log("Cleaning up props listener for PDF preview (Call commented out due to TS error)");
        // propsUnsubscribe(); // Keep commented out if TS error persists
      }
    };
  }, [showId, firebaseInitialized, firebaseService, getShowById]);
  // --- End Data Fetching Effect ---

  // --- Filter Props based on checked Acts/Scenes --- 
  const filteredPropData = useMemo(() => {
    const hasActFilters = Object.keys(checkedActs).length > 0;
    const hasSceneFilters = Object.keys(checkedScenes).length > 0;

    console.log('[PDF Preview] Filtering props. Inputs:', { 
       propDataLength: propData.length,
       checkedActs,
       checkedScenes,
       hasActFilters,
       hasSceneFilters
    });

    // If no filters are active (e.g., show has no acts), return all props
    if (!hasActFilters && !hasSceneFilters) {
        console.log('[PDF Preview] No act/scene filters active, returning all props.');
        return propData;
    }

    const filtered = propData.filter((p, index) => {
        const actIdStr = p.act !== undefined && p.act !== null ? String(p.act) : null;
        const sceneIdStr = p.scene !== undefined && p.scene !== null ? String(p.scene) : null;

        // Determine if the prop's act/scene (if they exist) are checked
        // Default to 'true' if the specific filter type isn't active or the prop lacks the field
        const actPasses = !hasActFilters || !actIdStr || checkedActs[actIdStr];
        const scenePasses = !hasSceneFilters || !sceneIdStr || checkedScenes[sceneIdStr];

        // Log check for first few props for detail
        if (index < 5) { 
           console.log(`[PDF Preview Filter Detail] Prop ${p.id} (Act: ${actIdStr}, Scene: ${sceneIdStr}): ActPasses=${actPasses}, ScenePasses=${scenePasses}`);
        }
        
        // Prop passes if both its relevant act and scene checks pass
        return actPasses && scenePasses;
    });

    console.log('[PDF Preview] Filtering props complete. Result count:', filtered.length);
    return filtered;
  }, [propData, checkedActs, checkedScenes]);
  // --- End Filter Props ---

  // --- Event Handlers --- 
  const handleOptionChange = (callback?: () => void) => {
    if (callback) callback();
    setShowPreview(false); // Reset preview when any option changes
  };

  const handleFieldToggle = (fieldName: keyof Prop) => {
    handleOptionChange(() => setSelectedFields(prev => ({ ...prev, [fieldName]: !prev[fieldName] })));
  };

  const handleLayoutChange = (value: 'portrait' | 'landscape') => {
     handleOptionChange(() => setLayout(value));
  };

  const handleColumnsChange = (value: number) => {
      handleOptionChange(() => setColumns(value));
  };

  // --- Checkbox Handlers ---
  const handleActCheckboxChange = (actId: number, isChecked: boolean) => {
    const actIdStr = String(actId);
    handleOptionChange(() => {
        setCheckedActs(prev => ({ ...prev, [actIdStr]: isChecked }));
        // Also toggle all scenes within this act
        const scenesToToggle: Record<string, boolean> = {};
        show?.acts?.find((a: Act) => Number(a.id) === actId)?.scenes?.forEach((scene: Scene) => { // Added optional chaining
           scenesToToggle[String(scene.id)] = isChecked;
        });
        setCheckedScenes(prev => ({ ...prev, ...scenesToToggle }));
    });
  };

  const handleSceneCheckboxChange = (sceneId: number, actId: number, isChecked: boolean) => {
     const sceneIdStr = String(sceneId);
     const actIdStr = String(actId);
     handleOptionChange(() => {
        // Update the scene's state
        const newCheckedScenes = { ...checkedScenes, [sceneIdStr]: isChecked };
        setCheckedScenes(newCheckedScenes);

        // Check if the parent act should be checked/unchecked
        const actScenes = show?.acts?.find(a => a.id === actId)?.scenes || [];
        const anySceneCheckedForAct = actScenes.some(s => newCheckedScenes[String(s.id)]);

        if (anySceneCheckedForAct && !checkedActs[actIdStr]) {
           // If at least one scene is checked, ensure the act is checked
           setCheckedActs(prev => ({ ...prev, [actIdStr]: true }));
        } else if (!anySceneCheckedForAct && checkedActs[actIdStr]) {
           // If no scenes are checked, ensure the act is unchecked
           setCheckedActs(prev => ({ ...prev, [actIdStr]: false }));
        }
     });
  };
  // --- End Checkbox Handlers ---

  const handleImageCountChange = (value: number) => {
     const count = Math.max(0, Math.min(10, value)); 
     handleOptionChange(() => setImageCount(count));
  };
  
  const handleFilesQRChange = (checked: boolean) => {
     handleOptionChange(() => setShowFilesQR(checked));
  };
  
  const handleVideosQRChange = (checked: boolean) => {
     handleOptionChange(() => setShowVideosQR(checked));
  };

  const handleGeneratePreview = () => {
    setShowPreview(true); 
  };

  // Helper function to format field labels (simple)
  const formatLabel = (key: string): string => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  };

  if (isLoading) {
    return <div className="p-6 bg-gray-900 min-h-screen text-white flex justify-center items-center">Loading PDF Preview...</div>;
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen text-white">
        <button onClick={() => router.back()} className="mb-4 text-blue-400 hover:text-blue-300">&larr; Back</button>
        <h1 className="text-xl text-red-500">Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!show) {
     return <div className="p-6 bg-gray-900 min-h-screen text-white">Show data not found.</div>;
  }

  // Update pdfOptions 
  const pdfOptions = { 
     selectedFields, 
     layout, 
     columns, 
     imageCount, 
     showFilesQR, 
     showVideosQR, 
     imageWidthOption // Pass the new option
  };
  // Simplified PDF filename
  const pdfFileName = `${show?.name?.replace(/[^a-z0-9]/gi, '_') ?? 'Show'}_PropList.pdf`;

  // Memoized PDF Document Component
  const MemoizedPropListDocument = useMemo(() => (
   <div className="text-white p-4 bg-yellow-600 rounded">PDF Document generation commented out</div> // Placeholder
  ), [
    show?.name, 
    filteredPropData, 
    layout, 
    selectedFields, 
    imageCount, 
    showFilesQR, 
    showVideosQR, 
    columns, 
    imageWidthOption
  ]);

  return (
    <div className="p-4 md:p-6 bg-gray-900 min-h-screen text-gray-100">
       <button onClick={() => router.back()} className="mb-4 text-blue-400 hover:text-blue-300">
         &larr; Back to Props
       </button>
       <h1 className="text-2xl font-bold mb-2">PDF Preview & Options</h1>
       <h2 className="text-lg text-gray-400 mb-6">Show: {show.name} ({filteredPropData.length} props filtered)</h2>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* --- Column 1: Options --- */}
         <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg border border-gray-700 self-start">
           <h3 className="text-xl font-semibold mb-4">Customize PDF</h3>
           
           {/* Layout Options */}
           <div className="mb-4">
             <label className="block text-sm font-medium text-gray-300 mb-1">Layout:</label>
             <select 
               value={layout} 
               onChange={(e) => handleLayoutChange(e.target.value as 'portrait' | 'landscape')}
               className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2.5"
             >
               <option value="portrait">Portrait</option>
               <option value="landscape">Landscape</option>
             </select>
           </div>

           {/* --- Act/Scene Checkbox Filters --- */}
           <div className="mb-4">
             <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Act/Scene:</label>
             <div className="max-h-60 overflow-y-auto space-y-2 pr-2 border border-gray-600 p-2 rounded-md"> {/* Scrollable filter list */}
               {(!show?.acts || show.acts.length === 0) && <p className="text-sm text-gray-400 italic">No acts defined for this show.</p>}
               {show?.acts?.map((a: Act) => { // Added optional chaining
                 const actIdStr = String(a.id);
                 return (
                   <div key={`act-filter-${a.id}`} className="mb-3 p-3 bg-gray-800 rounded">
                     <label className="flex items-center space-x-2 text-gray-200 font-medium">
                       <input
                         type="checkbox"
                         checked={checkedActs[actIdStr] || false}
                         onChange={(e) => handleActCheckboxChange(Number(a.id), e.target.checked)}
                         className="form-checkbox h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                       />
                       <span>{a.name || `Act ${a.id}`}</span>
                     </label>
                     {checkedActs[actIdStr] && a.scenes && a.scenes.length > 0 && (
                       <div className="pl-6 mt-2 space-y-1">
                         {a.scenes?.map((scene: Scene) => { // Typed scene
                           const sceneIdStr = String(scene.id);
                           return (
                             <label key={`scene-filter-${scene.id}`} className="flex items-center space-x-2 text-gray-300 text-sm">
                               <input
                                 type="checkbox"
                                 checked={checkedScenes[sceneIdStr] || false}
                                 onChange={(e) => handleSceneCheckboxChange(Number(scene.id), Number(a.id), e.target.checked)}
                                 className="form-checkbox h-3 w-3 text-blue-500 bg-gray-600 border-gray-500 rounded focus:ring-blue-400"
                               />
                               <span>{scene.name || `Scene ${scene.id}`}</span>
                             </label>
                           );
                         })}
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
           </div>
           {/* --- End Act/Scene Checkbox Filters --- */}

           {/* --- Image Size --- */}
           <div className="mb-4">
             <label htmlFor="imageSize" className="block text-sm font-medium text-gray-300 mb-1">Image Size:</label>
             <select
               id="imageSize"
               value={imageWidthOption}
               onChange={(e) => handleOptionChange(() => setImageWidthOption(e.target.value as 'small' | 'medium' | 'full'))}
               className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2.5"
             >
               <option value="small">Small</option>
               <option value="medium">Medium</option>
               <option value="full">Full Width</option>
             </select>
           </div>

           {/* --- Image Count --- */}
           <div className="mb-4">
             <label htmlFor="imageCount" className="block text-sm font-medium text-gray-300 mb-1">Images per Prop (Max 10):</label>
             <input
               type="number"
               id="imageCount"
               min="0"
               max="10"
               value={imageCount}
               onChange={(e) => handleImageCountChange(parseInt(e.target.value, 10))}
               className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg p-2.5"
             />
           </div>

           {/* --- QR Code Options --- */}
            <div className="mb-4 space-y-2">
               <label className="block text-sm font-medium text-gray-300 mb-1">Include QR Codes:</label>
               <div className="flex items-center">
                  <input 
                     type="checkbox" 
                     id="filesQRCheckbox" 
                     checked={showFilesQR}
                     onChange={(e) => handleFilesQRChange(e.target.checked)}
                     className="mr-2 rounded"
                  />
                  <label htmlFor="filesQRCheckbox" className="text-sm">Link to Associated Files</label>
               </div>
                <div className="flex items-center">
                   <input 
                      type="checkbox" 
                      id="videosQRCheckbox" 
                      checked={showVideosQR}
                      onChange={(e) => handleVideosQRChange(e.target.checked)}
                      className="mr-2 rounded"
                   />
                   <label htmlFor="videosQRCheckbox" className="text-sm">Link to Videos</label>
                </div>
            </div>

           {/* Columns Options (Placeholder) */}
           <div className="mb-4">
              <label htmlFor="columns" className="block text-sm font-medium text-gray-300 mb-1">Columns:</label>
              <select
                 id="columns"
                 value={columns}
                 onChange={(e) => setColumns(Number(e.target.value))}
                 className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
              >
                <option value={1}>1 Column</option>
                <option value={2}>2 Columns</option>
              </select>
           </div>
           
           {/* Field Selection */}
           <div className="mb-4">
             <label className="block text-sm font-medium text-gray-300 mb-2">Include Fields:</label>
             <div className="max-h-60 overflow-y-auto space-y-1 pr-2"> {/* Scrollable field list */}
               {displayablePropKeys.map((key) => (
                 <div key={key} className="flex items-center">
                   <input 
                     type="checkbox" 
                     id={`field-${key}`}
                     checked={selectedFields[key as keyof Prop] ?? false} // Handle potential undefined keys defensively
                     onChange={() => handleFieldToggle(key as keyof Prop)}
                     className="mr-2 rounded"
                   />
                   <label htmlFor={`field-${key}`} className="text-sm capitalize">{formatLabel(key)}</label>
                 </div>
               ))}
             </div>
           </div>

           {/* Generate Button */}
           <button 
              onClick={handleGeneratePreview}
              disabled={showPreview} // Disable if preview is already shown
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
           >
              Generate Preview
           </button>

           {/* Download Button (Placeholder) */}
           <button
             disabled // Disable button as functionality is removed
             className="w-full mt-4 flex items-center justify-center gap-2 bg-gray-500 text-white font-bold py-2 px-4 rounded opacity-50 cursor-not-allowed"
           >
             <Download size={18} />
             Download PDF (Disabled)
           </button>
         </div>

         {/* --- Column 2/3: PDF Preview --- */}
         <div className="md:col-span-2 bg-gray-800 p-1 rounded-lg border border-gray-700 flex items-center justify-center text-gray-500 min-h-[600px]">
           {showPreview ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400 italic">PDF Preview generation commented out.</p>
              </div>
            ) : showPreview && filteredPropData.length === 0 ? (
              <p>No props found matching the selected filters.</p>
            ) : (
              <p>Click "Generate Preview" above.</p>
            )}
         </div>
       </div>
     </div>
  );
} 