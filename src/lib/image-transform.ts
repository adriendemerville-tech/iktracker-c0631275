/**
 * Transform Supabase Storage image URLs to WebP format with optimization
 * Uses Supabase Image Transformation API for better performance
 */

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'origin';
  resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Convert a Supabase Storage URL to an optimized WebP version
 * @param url Original image URL from Supabase Storage
 * @param options Transformation options
 * @returns Transformed URL with WebP format
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: ImageTransformOptions = {}
): string | null {
  if (!url) return null;
  
  // Check if it's a Supabase Storage URL
  const isSupabaseStorage = url.includes('supabase.co/storage/v1/object/public/');
  
  if (!isSupabaseStorage) {
    // Return as-is for non-Supabase URLs
    return url;
  }
  
  const {
    width,
    height,
    quality = 80,
    format = 'webp',
    resize = 'cover'
  } = options;
  
  // Build transformation parameters
  const params: string[] = [];
  
  if (width) params.push(`width=${width}`);
  if (height) params.push(`height=${height}`);
  params.push(`quality=${quality}`);
  params.push(`format=${format}`);
  params.push(`resize=${resize}`);
  
  // Convert public URL to render URL with transformations
  // From: .../storage/v1/object/public/bucket/path
  // To: .../storage/v1/render/image/public/bucket/path?...
  const transformedUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );
  
  const separator = transformedUrl.includes('?') ? '&' : '?';
  
  return `${transformedUrl}${separator}${params.join('&')}`;
}

/**
 * Get srcset for responsive images with WebP optimization
 */
export function getResponsiveSrcSet(
  url: string | null | undefined,
  widths: number[] = [400, 800, 1200]
): string | null {
  if (!url) return null;
  
  return widths
    .map(w => {
      const optimizedUrl = getOptimizedImageUrl(url, { width: w, quality: 80 });
      return optimizedUrl ? `${optimizedUrl} ${w}w` : null;
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * Presets for common image sizes
 */
export const imagePresets = {
  thumbnail: { width: 400, height: 250, quality: 75 },
  card: { width: 800, height: 500, quality: 80 },
  featured: { width: 1200, height: 750, quality: 85 },
  full: { width: 1920, quality: 90 },
} as const;
