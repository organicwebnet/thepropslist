import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams, Link } from 'expo-router';
import { useFirebase } from '@/contexts/FirebaseContext'; // Adjust path as needed
import type { Prop, PropFormData, PropImage } from '@/shared/types/props'; // Adjust path as needed
import { WebPropForm } from '../../../src/platforms/web/components/WebPropForm'; // Adjust path as needed
import { getStatusLabel, statusColorMap, formatDateTime } from '@/platforms/web/utils/propDisplayUtils';
import { View, Text, Pressable } from 'react-native'; // Added Pressable for tabs

// --- SVG Icons (Copied from WebPropCard for consistency) ---
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const StatusUpdatesIcon = () => (
 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
</svg>
);

const MaintenanceIcon = () => (
 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
</svg>
);

const DetailsIcon = () => (
 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
   <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
 </svg>
);

// --- ---

// Placeholder for Web Prop Details/Edit Page
export default function WebPropDetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>(); // Get prop ID from router params
  const propId = id;
  const { service } = useFirebase();

  const [propData, setPropData] = useState<Prop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // State to control edit mode
  const [activeTab, setActiveTab] = useState<'details' | 'status' | 'maintenance'>('details'); // For visual tabs

  // Lifted state for image handling
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!propId || !service?.getDocument) {
      // If no ID or service method, don't attempt fetch (or handle appropriately)
      if (!propId) setError('Prop ID not found.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setIsEditing(false); // Reset edit mode on ID change
    setImageFiles(null); // Reset selected files
    service.getDocument<Prop>('props', propId)
      .then(doc => {
        if (doc?.data) {
          const fetchedData = { ...doc.data, id: doc.id };
          setPropData(fetchedData);
          const urls = fetchedData.images?.map(img => img.url).filter(Boolean) as string[] || [];
          if(fetchedData.imageUrl && !urls.includes(fetchedData.imageUrl)) {
             urls.unshift(fetchedData.imageUrl); // Add main imageUrl if not already in images array
          }
          setImagePreviews(urls); 
          setCurrentImageIndex(0); // Reset index
          setError(null);
        } else {
          setError('Prop not found.');
          setPropData(null);
          setImagePreviews([]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch prop:', err);
        setError('Failed to load prop data.');
        setPropData(null);
        setImagePreviews([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [propId, service]);

  // Handle file selection (lifted from form)
  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setImageFiles(files);
      const newPreviews = Array.from(files).map(file => URL.createObjectURL(file));
      setImagePreviews(newPreviews);
      setCurrentImageIndex(0); // Reset index
    } else {
      setImageFiles(null);
      const urls = propData?.images?.map(img => img.url).filter(Boolean) as string[] || [];
       if(propData?.imageUrl && !urls.includes(propData.imageUrl)) {
         urls.unshift(propData.imageUrl);
       }
      setImagePreviews(urls);
       setCurrentImageIndex(0);
    }
  }, [propData]); // Depend on propData to reset previews correctly

  // Clean up preview URLs
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => {
        // Only revoke blob URLs created by createObjectURL
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imagePreviews]);

  const handleUpdateSubmit = async (formData: PropFormData) => {
    if (!propId || !service?.updateDocument || !service.uploadFile || !service.deleteFile) {
      setError('Cannot update prop. Service methods unavailable or ID missing.');
      return;
    }
    if (!propData) { // Ensure we have the original data for comparison
      setError('Original prop data missing, cannot update.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      let finalImages: PropImage[] = [];
      const imagesToDelete: PropImage[] = [];
      const existingImageUrls = propData.images?.map(img => img.url) || [];
      
      if (imageFiles && imageFiles.length > 0) {
        // New files uploaded: mark all old images for deletion
         imagesToDelete.push(...(propData.images || [])); 
        
        console.log(`Uploading ${imageFiles.length} new files...`);
        const uploadPromises = Array.from(imageFiles).map(async (file, index) => {
          const filePath = `props/${propId}/${Date.now()}_${file.name}`;
          const downloadURL = await service.uploadFile(filePath, file);
          return {
            id: `img-${Date.now()}-${index}`,
            url: downloadURL,
            caption: file.name,
            isMain: index === 0 
          };
        });
        finalImages = await Promise.all(uploadPromises);
        console.log('Upload complete:', finalImages);
      } else {
         // No new files, retain existing images
         finalImages = [...(propData.images || [])];
      }

      // Delete marked images
      if (imagesToDelete.length > 0) {
          console.log(`Deleting ${imagesToDelete.length} old images...`);
          const deletePromises = imagesToDelete.map(img => {
              try {
                  const urlObject = new URL(img.url);
                  const pathName = decodeURIComponent(urlObject.pathname);
                  const pathParts = pathName.split('/o/');
                  if (pathParts.length > 1) {
                      const storagePath = pathParts[1].split('?')[0]; 
                      if (storagePath) {
                          console.log(`Deleting from storage path: ${storagePath}`);
                          return service.deleteFile(storagePath);
                      }
                  }
                  console.warn(`Could not extract path from URL: ${img.url}`);
              } catch (e) {
                  console.warn(`Error processing URL for deletion ${img.url}:`, e);
              }
              return Promise.resolve(); 
          });
          await Promise.all(deletePromises);
          console.log('Old images deleted.');
      }

      // Prepare update data
      const updateData: Partial<Prop> = {
        ...formData, 
        images: finalImages, 
        imageUrl: finalImages.find(img => img.isMain)?.url || finalImages[0]?.url || propData.imageUrl, // Update main imageUrl too
        updatedAt: new Date().toISOString(),
      };
      delete (updateData as any).id;
      delete (updateData as any).createdAt;
      
      await service.updateDocument('props', propId, updateData);
      console.log('Prop updated successfully');

      setPropData(prev => prev ? { ...prev, ...updateData, imageUrl: updateData.imageUrl } : null); 
      setImageFiles(null); 
      const urls = finalImages.map(img => img.url).filter(Boolean) as string[];
      if(updateData.imageUrl && !urls.includes(updateData.imageUrl)) {
          urls.unshift(updateData.imageUrl);
      }
      setImagePreviews(urls);
      setCurrentImageIndex(0);
      setIsEditing(false); 
    } catch (err: any) {
      console.error('Failed to update prop:', err);
      setError(err.message || 'Failed to update prop. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper component for displaying details
  const DetailItem = ({ label, value, isMultiline = false }: { label: string; value?: string | number | null, isMultiline?: boolean }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
      <div className="mb-3"> {/* Increased bottom margin */}
        <span className="block text-xs font-semibold text-gray-500 uppercase mb-0.5">{label}</span> {/* Label style from image */}
        <span className={`block text-gray-100 ${isMultiline ? 'whitespace-pre-wrap' : ''}`}>{value}</span>
      </div>
    );
  };
  
  // Determine status colors for the badge
  const statusColors = propData?.status ? statusColorMap[propData.status] : { bg: 'bg-gray-600/20', text: 'text-gray-400', border: 'border-gray-500/50' };

  const handleNextImage = () => setCurrentImageIndex((prev) => (prev + 1) % imagePreviews.length);
  const handlePrevImage = () => setCurrentImageIndex((prev) => (prev - 1 + imagePreviews.length) % imagePreviews.length);

  // Format dimensions string
  const dimensionString = propData ? [
    propData.length && `L: ${propData.length}`,
    propData.width && `W: ${propData.width}`,
    propData.height && `H: ${propData.height}`,
    propData.depth && `D: ${propData.depth}` // Added Depth
  ].filter(Boolean).join(' × ') + (propData.unit ? ` ${propData.unit}` : '') : '';

  // Format weight string
  const weightString = propData ? `${propData.weight || ''}${propData.weightUnit ? ` ${propData.weightUnit}` : ''}` : '';

  return (
    <div className="p-4 md:p-6 bg-gray-900 min-h-screen text-gray-100">
      <button onClick={() => router.back()} className="mb-4 text-blue-400 hover:text-blue-300">
        &larr; Back to List
      </button>

      {/* Title Section */}      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{isEditing ? 'Edit Prop' : 'Prop Details'}</h1>
        {!isEditing && propData && (
          <button 
            onClick={() => setIsEditing(true)} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Edit Prop
          </button>
        )}
      </div>

      {loading && <p>Loading prop details...</p>}
      
      {error && <p className="text-red-500">Error: {error}</p>}

      {/* Display Details or Edit Form */}      
      {!loading && !error && propData && (
        isEditing ? (
          // --- Edit Form --- 
          <WebPropForm 
            initialData={propData} 
            onSubmit={handleUpdateSubmit} 
            onCancel={() => setIsEditing(false)} // Add cancel handler
            isSubmitting={isSubmitting} 
            imageFiles={imageFiles}
            onImageChange={handleImageChange}
            imagePreviews={imagePreviews}
            mode="edit" // Set mode to edit
          />
        ) : (
          // --- Details View --- 
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}          
              <div>
                <h2 className="text-xl font-semibold text-gray-100 mb-4">{propData.name}</h2>
                <p className="text-gray-400 mb-4">{propData.description || 'No description provided.'}</p>
                
                {/* Status Badge */}                  
                <div className="mb-4">
                  <span className="font-semibold text-gray-400">Status: </span>
                  <span 
                    className={`text-sm font-medium px-3 py-1 rounded-full border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                  >
                    {getStatusLabel(propData.status)}
                  </span>
                </div>
                
                 {/* Other Details */}
                <DetailItem label="Category" value={propData.category} />
                <DetailItem label="Source" value={propData.source} />
                <DetailItem label="Location" value={propData.location} />
                <DetailItem label="Quantity" value={propData.quantity > 1 ? propData.quantity : undefined} />
                <DetailItem label="Act" value={propData.act} />
                <DetailItem label="Scene" value={propData.scene} />
                {/* Add more DetailItem components for other fields as needed */}

              </div>

              {/* Right Column (Image) */}
              <div>
                {imagePreviews.length > 0 ? (
                  <img src={imagePreviews[currentImageIndex]} alt={propData.name} className="rounded-lg shadow-md max-w-full h-auto" />
                ) : (
                  <div className="w-full h-64 bg-gray-700 flex items-center justify-center text-gray-500 rounded-lg">
                    No Image Available
                  </div>
                )}
                {/* TODO: Add carousel or grid for multiple images */}
              </div>
            </div>
             {/* Timestamps */}
             <div className="mt-6 pt-4 border-t border-gray-700 text-xs text-gray-500">
                {propData.createdAt && <p>Created: {formatDateTime(propData.createdAt)}</p>}
                {propData.updatedAt && <p>Last Updated: {formatDateTime(propData.updatedAt)}</p>}
             </div>
          </div>
        )
      )}
    </div>
  );
} 