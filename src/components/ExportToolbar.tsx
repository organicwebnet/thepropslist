import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, FileText, AlertCircle, Pencil } from 'lucide-react';
import type { Prop } from '../shared/types/props.ts';
import type { Show } from '../types/index.ts';
import { downloadCSV } from '../lib/sheets.ts';
import { generatePDF } from '../lib/pdf.ts';
import type { PdfGenerationOptions } from '../shared/types/pdf.ts';

interface ExportToolbarProps {
  props: Prop[];
  show: Show;
  onMergeProps?: (prop1: Prop, prop2: Prop) => Promise<void>;
  onDeleteProp?: (propId: string) => Promise<void>;
  onEditProp?: (propId: string, updates: Partial<Prop>) => Promise<void>;
}

interface DuplicateGroup {
  original: Prop;
  duplicates: Prop[];
}

export function ExportToolbar({ props, show, onMergeProps, onDeleteProp, onEditProp }: ExportToolbarProps) {
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [localProps, setLocalProps] = useState<Prop[]>(props);

  // Update localProps when props change
  useEffect(() => {
    setLocalProps(props);
  }, [props]);

  const handleCSVExport = () => {
    downloadCSV(props);
  };

  const handlePDFExport = async () => {
    // Initialize all Prop keys to false, then set desired ones to true
    const allPropKeysFalse: Record<keyof Prop, boolean> = {
      id: false,
      userId: false,
      showId: false,
      name: true, // Keep true
      description: true, // Keep true
      category: true, // Keep true
      price: false,
      quantity: true, // Keep true
      length: false,
      width: false,
      height: false,
      depth: false,
      unit: false,
      weight: false,
      weightUnit: false,
      travelWeight: false,
      source: false,
      sourceDetails: false,
      purchaseUrl: false,
      rentalDueDate: false,
      act: true, // Keep true
      scene: true, // Keep true
      sceneName: false,
      isMultiScene: false,
      isConsumable: false,
      imageUrl: false,
      usageInstructions: false,
      maintenanceNotes: false,
      safetyNotes: false,
      handlingInstructions: false,
      requiresPreShowSetup: false,
      preShowSetupDuration: false,
      preShowSetupNotes: false,
      preShowSetupVideo: false,
      setupTime: false,
      hasOwnShippingCrate: false,
      shippingCrateDetails: false,
      requiresSpecialTransport: false,
      transportMethod: false,
      transportNotes: false,
      status: true, // Keep true
      location: false,
      currentLocation: false,
      notes: false,
      tags: false,
      images: false,
      digitalAssets: false,
      videos: false,
      materials: false,
      statusHistory: false,
      maintenanceHistory: false,
      nextMaintenanceDue: false,
      hasBeenModified: false,
      modificationDetails: false,
      createdAt: false,
      updatedAt: false,
      lastUsedAt: false,
      condition: false,
      lastUpdated: false,
      purchaseDate: false,
      handedness: false,
      isBreakable: false,
      isHazardous: false,
      storageRequirements: false,
      returnDueDate: false,
      lastModifiedAt: false,
      isRented: false,
      rentalSource: false,
      rentalReferenceNumber: false,
      travelsUnboxed: false,
      statusNotes: false,
      lastStatusUpdate: false,
      lastInspectionDate: false,
      nextInspectionDue: false,
      lastMaintenanceDate: false,
      expectedReturnDate: false,
      replacementCost: false,
      replacementLeadTime: false,
      repairEstimate: false,
      repairPriority: false,
      subcategory: false,
      customFields: false,
      manufacturer: false,
      model: false,
      serialNumber: false,
      barcode: false,
      warranty: false,
      color: false,
      period: false,
      style: false,
      sceneNotes: false,
      usageNotes: false,
      primaryImageUrl: false,
      availabilityStatus: false,
      publicNotes: false,
      assignment: false, 
      checkedOutDetails: false,
      assignedTo: false,
      assignedUserDetails: false,
      estimatedDeliveryDate: false,
      courier: false,
      trackingNumber: false,
    };

    const defaultPdfOptions: PdfGenerationOptions = {
      title: `${show.name} - Props List`,
      layout: 'portrait',
      columns: 1,
      selectedFields: allPropKeysFalse, // Use the comprehensive record
      imageCount: 1, 
      imageWidthOption: 'small',
      showFilesQR: false,
      showVideosQR: false,
    };

    try {
      await generatePDF(props, show, defaultPdfOptions, false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const findDuplicates = (propsToCheck: Prop[] = localProps): DuplicateGroup[] => {
    const groups: DuplicateGroup[] = [];
    const seen = new Set<string>();

    propsToCheck.forEach((prop) => {
      if (seen.has(prop.name.toLowerCase())) {
        const group = groups.find(g => 
          g.original.name.toLowerCase() === prop.name.toLowerCase() ||
          g.duplicates.some(d => d.name.toLowerCase() === prop.name.toLowerCase())
        );

        if (group) {
          group.duplicates.push(prop);
        } else {
          const original = propsToCheck.find(p => 
            p.name.toLowerCase() === prop.name.toLowerCase() &&
            p.id !== prop.id
          );
          if (original) {
            groups.push({
              original,
              duplicates: [prop]
            });
          }
        }
      } else {
        seen.add(prop.name.toLowerCase());
      }
    });

    return groups;
  };

  // Update duplicate groups when localProps change
  useEffect(() => {
    if (showDuplicateModal) {
      const groups = findDuplicates();
      if (groups.length === 0) {
        setShowDuplicateModal(false);
        setDuplicateGroups([]);
        setCurrentGroupIndex(0);
      } else {
        setDuplicateGroups(groups);
        if (currentGroupIndex >= groups.length) {
          setCurrentGroupIndex(groups.length - 1);
        }
      }
    }
  }, [localProps, showDuplicateModal]);

  const handleCheckDuplicates = () => {
    const groups = findDuplicates();
    if (groups.length === 0) {
      alert('No duplicates found!');
      return;
    }
    setDuplicateGroups(groups);
    setCurrentGroupIndex(0);
    setShowDuplicateModal(true);
  };

  const handleMerge = async (keepProp: Prop, mergeProp: Prop) => {
    if (onMergeProps) {
      try {
        await onMergeProps(keepProp, mergeProp);
        moveToNextGroup();
      } catch (error) {
        console.error('Error merging props:', error);
        alert('Failed to merge props. Please try again.');
      }
    }
  };

  const handleDelete = async (propId: string) => {
    if (onDeleteProp) {
      try {
        await onDeleteProp(propId);
        moveToNextGroup();
      } catch (error) {
        console.error('Error deleting prop:', error);
        alert('Failed to delete prop. Please try again.');
      }
    }
  };

  const moveToNextGroup = () => {
    if (currentGroupIndex < duplicateGroups.length - 1) {
      setCurrentGroupIndex(prev => prev + 1);
    } else {
      setShowDuplicateModal(false);
      setDuplicateGroups([]);
      setCurrentGroupIndex(0);
    }
  };

  const formatPropDetails = (prop: Prop) => {
    return `Act ${prop.act}, Scene ${prop.scene}\nQuantity: ${prop.quantity}\nPrice: $${prop.price.toFixed(2)}\nCategory: ${prop.category}`;
  };

  const handleEditTitle = async (prop: Prop) => {
    if (!onEditProp || !newTitle.trim()) return;
    
    try {
      await onEditProp(prop.id, { name: newTitle.trim() });
      
      // Update the local props immediately
      setLocalProps(prevProps => 
        prevProps.map(p => 
          p.id === prop.id 
            ? { ...p, name: newTitle.trim() }
            : p
        )
      );
      
      setEditingTitle(null);
      setNewTitle('');
    } catch (error) {
      console.error('Error updating prop title:', error);
      alert('Failed to update prop title. Please try again.');
    }
  };

  const startEditing = (prop: Prop) => {
    setEditingTitle(prop.id);
    setNewTitle(prop.name);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleCheckDuplicates}
          className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-yellow-600 text-white hover:bg-yellow-700 transition-colors"
          title="Check for duplicate props"
        >
          <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
          Duplicates
        </button>
        <button
          onClick={handleCSVExport}
          className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
          title="Export to CSV"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
          CSV
        </button>
        <button
          onClick={handlePDFExport}
          className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          title="Export to PDF"
        >
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          PDF
        </button>
      </div>

      {showDuplicateModal && duplicateGroups.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-[#1A1A1A] rounded-lg shadow-xl p-6 max-w-4xl w-full border border-gray-800">
            <h2 className="text-xl font-bold text-white mb-4">
              Duplicate Props Found: "{duplicateGroups[currentGroupIndex].original.name}"
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-[#2A2A2A] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-white">Original Prop</h3>
                  {editingTitle === duplicateGroups[currentGroupIndex].original.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="px-2 py-1 text-sm bg-[#1A1A1A] text-white border border-gray-700 rounded"
                        placeholder="Enter new title"
                      />
                      <button
                        onClick={() => handleEditTitle(duplicateGroups[currentGroupIndex].original)}
                        className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTitle(null)}
                        className="px-2 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing(duplicateGroups[currentGroupIndex].original)}
                      className="p-1 text-gray-400 hover:text-white"
                      title="Edit title"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="relative w-full aspect-video mb-4 bg-black rounded-lg overflow-hidden">
                  {duplicateGroups[currentGroupIndex].original.images?.[0]?.url ? (
                    <img
                      src={duplicateGroups[currentGroupIndex].original.images[0].url}
                      alt={duplicateGroups[currentGroupIndex].original.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                      No image available
                    </div>
                  )}
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap mb-4">
                  {formatPropDetails(duplicateGroups[currentGroupIndex].original)}
                </pre>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(duplicateGroups[currentGroupIndex].original.id)}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete This
                  </button>
                  <button
                    onClick={() => handleMerge(duplicateGroups[currentGroupIndex].original, duplicateGroups[currentGroupIndex].duplicates[0])}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Keep & Merge
                  </button>
                </div>
              </div>
              <div className="p-4 bg-[#2A2A2A] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-white">Duplicate Prop</h3>
                  {editingTitle === duplicateGroups[currentGroupIndex].duplicates[0].id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="px-2 py-1 text-sm bg-[#1A1A1A] text-white border border-gray-700 rounded"
                        placeholder="Enter new title"
                      />
                      <button
                        onClick={() => handleEditTitle(duplicateGroups[currentGroupIndex].duplicates[0])}
                        className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTitle(null)}
                        className="px-2 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing(duplicateGroups[currentGroupIndex].duplicates[0])}
                      className="p-1 text-gray-400 hover:text-white"
                      title="Edit title"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="relative w-full aspect-video mb-4 bg-black rounded-lg overflow-hidden">
                  {duplicateGroups[currentGroupIndex].duplicates[0].images?.[0]?.url ? (
                    <img
                      src={duplicateGroups[currentGroupIndex].duplicates[0].images[0].url}
                      alt={duplicateGroups[currentGroupIndex].duplicates[0].name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                      No image available
                    </div>
                  )}
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap mb-4">
                  {formatPropDetails(duplicateGroups[currentGroupIndex].duplicates[0])}
                </pre>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(duplicateGroups[currentGroupIndex].duplicates[0].id)}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete This
                  </button>
                  <button
                    onClick={() => handleMerge(duplicateGroups[currentGroupIndex].duplicates[0], duplicateGroups[currentGroupIndex].original)}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Keep & Merge
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">
                Group {currentGroupIndex + 1} of {duplicateGroups.length}
              </span>
              <button
                onClick={() => setShowDuplicateModal(false)}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 
