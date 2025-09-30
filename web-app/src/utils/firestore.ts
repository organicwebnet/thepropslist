/**
 * Cleans data for Firestore compatibility by removing undefined values
 * and handling nested objects and arrays recursively.
 * 
 * @param data - The data to clean
 * @returns Cleaned data suitable for Firestore
 */
export const cleanFirestoreData = (data: any): any => {
  if (data === null || data === undefined) return null;
  
  if (Array.isArray(data)) {
    return data.map(cleanFirestoreData).filter(item => item !== null && item !== undefined);
  }
  
  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned;
  }
  
  return data;
};
