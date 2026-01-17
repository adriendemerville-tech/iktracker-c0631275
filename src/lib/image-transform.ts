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
 * Uses the render/image endpoint for transformation when available
 * @param url Original image URL from Supabase Storage
 * @param options Transformation options
 * @returns Transformed URL with WebP format
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: ImageTransformOptions = {}
): string | null {
  if (!url) return null;
  
  // Already a WebP image - return as-is
  if (url.endsWith('.webp')) {
    return url;
  }
  
  // Check if it's a Supabase Storage URL with object/public path
  const isSupabaseStorage = url.includes('supabase.co/storage/v1/object/public/');
  
  if (!isSupabaseStorage) {
    // Return as-is for non-Supabase URLs
    return url;
  }
  
  // Convert to render/image endpoint for WebP transformation
  // This works on Supabase projects that support image transformation
  try {
    const transformedUrl = url.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );
    
    // Build query parameters for transformation
    const params = new URLSearchParams();
    
    if (options.width) params.set('width', options.width.toString());
    if (options.height) params.set('height', options.height.toString());
    if (options.quality) params.set('quality', options.quality.toString());
    params.set('format', options.format || 'webp');
    if (options.resize) params.set('resize', options.resize);
    
    const separator = transformedUrl.includes('?') ? '&' : '?';
    return `${transformedUrl}${separator}${params.toString()}`;
  } catch {
    // Fallback to original URL if transformation fails
    return url;
  }
}

/**
 * Get srcset for responsive images with WebP optimization
 */
export function getResponsiveSrcSet(
  url: string | null | undefined,
  widths: number[] = [400, 800, 1200]
): string | null {
  if (!url) return null;
  
  // Already a WebP - create srcset with render/image endpoint
  const isSupabaseStorage = url.includes('supabase.co/storage/v1/');
  
  if (!isSupabaseStorage) {
    return null;
  }
  
  try {
    const srcSetParts = widths.map(width => {
      const optimizedUrl = getOptimizedImageUrl(url, { width, quality: 80, format: 'webp' });
      return `${optimizedUrl} ${width}w`;
    });
    
    return srcSetParts.join(', ');
  } catch {
    return null;
  }
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
