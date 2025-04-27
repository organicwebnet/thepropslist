import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useFirebase } from '@/contexts/FirebaseContext'; // Adjust path as needed
import type { PropFormData, PropImage } from '@/shared/types/props'; // Adjust path as needed
import { WebPropForm } from '../../../src/platforms/web/components/WebPropForm'; // Adjust path as needed

// Placeholder for Web New Prop Page
export default function WebNewPropPage() {
  const router = useRouter();
  const { service } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Image State Management ---
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setImageFiles(files);

    if (files) {
      const currentPreviews = Array.from(files).map(file => URL.createObjectURL(file));
      // Clean up old previews
      imagePreviews.forEach(URL.revokeObjectURL);
      setImagePreviews(currentPreviews);
    } else {
      imagePreviews.forEach(URL.revokeObjectURL);
      setImagePreviews([]);
    }
  };
  // --- End Image State Management ---

  const handleCreateSubmit = async (formData: PropFormData) => {
    if (!service?.addDocument || !service?.uploadFile) {
        setError('Cannot create prop. Service methods unavailable.');
        return;
      }

    setIsSubmitting(true);
    setError(null);

    try {
      let uploadedImageUrls: PropImage[] = [];

      // --- Upload Images --- 
      if (imageFiles && imageFiles.length > 0) {
        console.log(`Uploading ${imageFiles.length} files...`);
        const uploadPromises = Array.from(imageFiles).map(async (file, index) => {
          // Create a unique path, e.g., props/{timestamp}_{filename}
          // Using a temporary ID might be better if available before Firestore doc creation
          const filePath = `props/${Date.now()}_${file.name}`;
          const downloadURL = await service.uploadFile(filePath, file);
          return {
            id: `img-${Date.now()}-${index}`, // Generate a simple unique ID
            url: downloadURL,
            caption: file.name, // Use filename as default caption
            isMain: index === 0 // Mark first uploaded image as main
          };
        });
        uploadedImageUrls = await Promise.all(uploadPromises);
        console.log('Upload complete:', uploadedImageUrls);
      }

      // --- Prepare Firestore Data --- 
      const now = new Date().toISOString();
      const finalData = {
         ...formData, 
         images: uploadedImageUrls, // Use the actual URLs
         createdAt: now, 
         updatedAt: now,
         // userId, showId - add if necessary
      };
      // Remove the files property if it exists on formData accidentally
      delete (finalData as any).files;

      // --- Add Document to Firestore --- 
      const newDoc = await service.addDocument('props', finalData);
      console.log('Prop created successfully with ID:', newDoc.id);
      
      router.push('/props'); 
    } catch (err: any) {
      console.error('Failed to create prop:', err);
      setError(err.message || 'Failed to create prop. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gray-900 min-h-screen text-gray-100">
      <button onClick={() => router.back()} className="mb-4 text-blue-400 hover:text-blue-300">
          &larr; Cancel
      </button>
      <h1 className="text-2xl font-bold mb-6">Add New Prop (Web)</h1>
      
      {error && <p className="text-red-500 mb-4">Error: {error}</p>}

      {/* Pass image state and handler to the form */}
      <WebPropForm 
        onSubmit={handleCreateSubmit} 
        isSubmitting={isSubmitting}
        imageFiles={imageFiles}
        onImageChange={handleImageChange}
        imagePreviews={imagePreviews}
      />
    </div>
  );
} 