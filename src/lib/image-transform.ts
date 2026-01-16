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
  
  // Return the original URL directly - Supabase image transformation 
  // requires a Pro plan and may not be available on all projects
  // The original public URL will work correctly
  return url;
}

/**
 * Get srcset for responsive images with WebP optimization
 * Note: Returns null since Supabase image transformation requires Pro plan
 */
export function getResponsiveSrcSet(
  url: string | null | undefined,
  widths: number[] = [400, 800, 1200]
): string | null {
  // Supabase image transformation requires Pro plan
  // Return null to use standard img src
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
