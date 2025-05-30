/**
 * Utility functions for file uploads
 */

/**
 * Checks if a file is an image based on its mimetype
 */
export const isImage = (mimetype: string): boolean => {
  return [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ].includes(mimetype);
};

/**
 * Checks if a file is a document based on its mimetype
 */
export const isDocument = (mimetype: string): boolean => {
  return [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
  ].includes(mimetype);
};

/**
 * Extracts the file extension from a filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop() || '';
};

/**
 * Sanitizes a filename by removing special characters
 */
export const sanitizeFilename = (filename: string): string => {
  // Remove any path information
  const baseName = filename.split(/[\\/]/).pop() || '';

  // Replace special characters with underscores
  return baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
};

/**
 * Formats file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

/**
 * Generate a unique folder path based on current date
 * This helps in organizing files by date for easier management
 */
export const generateDateBasedFolder = (baseFolder: string = ''): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return baseFolder
    ? `${baseFolder}/${year}/${month}/${day}`
    : `${year}/${month}/${day}`;
};
