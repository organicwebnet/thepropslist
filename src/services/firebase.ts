import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

export async function uploadImages(files: File[], path: string): Promise<string[]> {
  const uploadPromises = files.map(async (file) => {
    const storageRef = ref(storage, `${path}/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  });

  return Promise.all(uploadPromises);
} 