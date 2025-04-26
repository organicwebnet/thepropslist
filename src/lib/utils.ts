export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function bytesToSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString(), 10);
  // Handle cases where i might be invalid (e.g., bytes < 0)
  if (isNaN(i) || i < 0 || i >= sizes.length) {
    return 'Invalid size';
  }
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
} 