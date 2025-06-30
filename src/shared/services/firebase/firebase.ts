import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorage } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

// Initialize storage
const storage = getStorage();

interface UploadResult {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  type: string;
}

interface UploadError {
  file: string;
  error: string;
}

export async function uploadImages(files: File[], path: string): Promise<{
  successful: UploadResult[];
  failed: UploadError[];
}> {
  const successful: UploadResult[] = [];
  const failed: UploadError[] = [];

  const uploadPromises = files.map(async (file) => {
    try {
      // Basic file type validation
      if (!file.type.startsWith('image/')) {
        failed.push({
          file: file.name,
          error: 'Invalid file type. Only images are allowed.'
        });
        return;
      }

      // File size validation (5MB)
      const maxFileSize = 5 * 1024 * 1024;
      if (file.size > maxFileSize) {
        failed.push({
          file: file.name,
          error: 'File exceeds maximum size of 5MB.'
        });
        return;
      }

      // Generate a unique filename to avoid collisions
      const uniqueFilename = `${uuidv4()}-${file.name}`;
      const storageRef = ref(storage, `${path}/${uniqueFilename}`);

      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      successful.push({
        url: downloadURL,
        filename: uniqueFilename,
        originalName: file.name,
        size: file.size,
        type: file.type
      });
    } catch (error) {
      failed.push({
        file: file.name,
        error: error instanceof Error ? error.message : 'Unknown error occurred during upload'
      });
    }
  });

  // Wait for all uploads to complete
  await Promise.all(uploadPromises);

  return {
    successful,
    failed
  };
}

/**
 * Validates a file before upload
 * @param file The file to validate
 * @returns An error message if validation fails, null if validation passes
 */
function validateFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return 'Invalid file type. Only images are allowed.';
  }

  const maxFileSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxFileSize) {
    return 'File exceeds maximum size of 5MB.';
  }

  return null;
}

/**
 * Generates a unique filename for storage
 * @param originalFilename The original filename
 * @returns A unique filename
 */
function generateUniqueFilename(originalFilename: string): string {
  return `${uuidv4()}-${originalFilename}`;
} 
