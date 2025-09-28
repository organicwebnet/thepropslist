import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from '@env';
import { v2 as cloudinary } from 'cloudinary';

export const uploadImage = async (file: File, storageService: any): Promise<string> => {
  if (!storageService) {
    throw new Error('Firebase Storage service instance is required for uploadImage.');
  }
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Please upload an image.');
    }

    // Validate file size (5MB limit)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > MAX_SIZE) {
      throw new Error('File size too large. Maximum size is 5MB.');
    }

    // Create a unique file name with WebP extension for optimization
    const fileName = `images/${uuidv4()}.webp`;
    
    // Create a reference using the passed service instance
    const storageRef = ref(storageService as any, fileName);
    
    // Convert to WebP if possible, otherwise keep original format
    let processedFile = file;
    let contentType = file.type;
    
    try {
      // Try to convert to WebP using Canvas API (web only)
      if (typeof window !== 'undefined' && file.type !== 'image/webp') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        await new Promise((resolve, reject) => {
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
              if (blob) {
                processedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
                  type: 'image/webp'
                });
                contentType = 'image/webp';
              }
              resolve(blob);
            }, 'image/webp', 0.8);
          };
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });
      }
    } catch (conversionError) {
      console.warn('WebP conversion failed, using original format:', conversionError);
      // Keep original file if conversion fails
    }
    
    // Upload the file with metadata
    const metadata = {
      contentType,
      customMetadata: {
        'uploaded-by': 'props-bible-app',
        'original-type': file.type,
        'optimized': contentType === 'image/webp' ? 'true' : 'false'
      }
    };
    
    const snapshot = await uploadBytes(storageRef, processedFile, metadata);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error('Upload failed: ' + error.message);
    }
    throw new Error('Upload failed. Please try again.');
  }
};
