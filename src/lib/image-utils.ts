/**
 * Maximum width for blog images - resize larger images to this width
 */
const MAX_IMAGE_WIDTH = 1200;

/**
 * Convert and optimize an image file to WebP format with compression and resizing
 * @param file - The original image file
 * @param quality - Compression quality (0-1), default 0.8
 * @param maxWidth - Maximum width in pixels, default 1200
 * @returns Promise<File> - The converted and optimized WebP file
 */
export async function convertToWebP(
  file: File, 
  quality = 0.8, 
  maxWidth = MAX_IMAGE_WIDTH
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Clean up object URL
      URL.revokeObjectURL(img.src);
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Calculate new dimensions maintaining aspect ratio
      let targetWidth = img.naturalWidth;
      let targetHeight = img.naturalHeight;

      // Resize if width exceeds maxWidth
      if (targetWidth > maxWidth) {
        const ratio = maxWidth / targetWidth;
        targetWidth = maxWidth;
        targetHeight = Math.round(img.naturalHeight * ratio);
      }

      // Set canvas dimensions to target dimensions
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Use high-quality image rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw resized image onto canvas
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

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

          console.log(
            `Image optimized: ${file.name} (${file.size} bytes, ${img.naturalWidth}x${img.naturalHeight}) → ` +
            `${webpFile.name} (${webpFile.size} bytes, ${targetWidth}x${targetHeight})`
          );

          resolve(webpFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Check if a URL points to an optimized WebP image
 */
export function isOptimizedUrl(url: string): boolean {
  return url.endsWith('.webp');
}

/**
 * Convert legacy PNG/JPG URLs to WebP format in content
 * This is for display purposes - the actual files should be converted separately
 */
export function convertLegacyImageUrls(content: string): string {
  // Match image URLs ending in .png, .jpg, .jpeg (case insensitive)
  const imageUrlPattern = /(https?:\/\/[^\s"')]+)\.(png|jpe?g)(\?[^\s"')]*)?/gi;
  
  return content.replace(imageUrlPattern, (match, base, ext, query) => {
    // If the URL is from our Supabase storage, convert to WebP
    if (base.includes('supabase.co/storage')) {
      return `${base}.webp${query || ''}`;
    }
    return match;
  });
}
