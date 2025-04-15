import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { v4 as uuidv4 } from 'uuid';

export const uploadImage = async (file: File): Promise<string> => {
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

    // Create a unique file name
    const fileExtension = file.name.split('.').pop();
    const fileName = `images/${uuidv4()}.${fileExtension}`; // Changed from 'props' to 'images'
    
    // Create a reference to the file location
    const storageRef = ref(storage, fileName);
    
    // Upload the file with metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        'uploaded-by': 'props-bible-app'
      }
    };
    
    const snapshot = await uploadBytes(storageRef, file, metadata);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading to Firebase Storage:', error);
    if (error instanceof Error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
    throw new Error('Upload failed. Please try again.');
  }
};