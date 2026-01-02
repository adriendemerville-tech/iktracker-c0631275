/**
 * Convert an image file to WebP format with compression
 * @param file - The original image file
 * @param quality - Compression quality (0-1), default 0.8
 * @returns Promise<File> - The converted WebP file
 */
export async function convertToWebP(file: File, quality = 0.8): Promise<File> {
  // If already WebP, just return the file (optionally re-compress)
  if (file.type === 'image/webp') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Set canvas dimensions to image dimensions
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw image onto canvas
      ctx.drawImage(img, 0, 0);

      // Convert to WebP blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to convert image to WebP'));
            return;
          }

          // Create new filename with .webp extension
          const originalName = file.name.replace(/\.[^/.]+$/, '');
          const webpFile = new File([blob], `${originalName}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
          });

          resolve(webpFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    img.src = URL.createObjectURL(file);
  });
}
