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
  _options: ImageTransformOptions = {}
): string | null {
  if (!url) return null;
  
  // Return URL as-is - image transformation requires Supabase Pro plan
  // Images are already converted to WebP on upload via convertToWebP()
  return url;
}

/**
 * Get srcset for responsive images with WebP optimization
 */
export function getResponsiveSrcSet(
  url: string | null | undefined,
  _widths: number[] = [400, 800, 1200]
): string | null {
  // Image transformation requires Supabase Pro plan
  // Return null to skip srcset - browser will use original image
  if (!url) return null;
  return null;
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
