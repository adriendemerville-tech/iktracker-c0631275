/**
 * Transform Supabase Storage image URLs through the Storage Image
 * Transformation endpoint (`/render/image/`), which resizes, compresses and
 * serves WebP automatically when the browser sends `Accept: image/webp`.
 *
 * Works for any Supabase project (blog covers can come from an external CMS
 * bucket), and returns the original URL untouched for non-Supabase sources.
 */

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
}

const DEFAULT_QUALITY = 72;

/** True when the URL points at a public Supabase Storage object. */
export function isTransformableUrl(url: string): boolean {
  return url.includes("/storage/v1/object/public/");
}

/**
 * Convert a Supabase Storage URL to a resized / compressed variant.
 * Returns the original URL when transformation is not applicable.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  options: ImageTransformOptions = {},
): string | null {
  if (!url) return null;
  if (!isTransformableUrl(url)) return url;

  const base = url.split("?")[0].replace("/object/public/", "/render/image/public/");
  const params = new URLSearchParams();
  if (options.width) params.set("width", String(options.width));
  if (options.height) params.set("height", String(options.height));
  params.set("quality", String(options.quality ?? DEFAULT_QUALITY));
  params.set("resize", options.resize ?? "cover");

  return `${base}?${params.toString()}`;
}

/**
 * Build a responsive `srcset` (width descriptors) for a storage image.
 */
export function getResponsiveSrcSet(
  url: string | null | undefined,
  widths: number[] = [400, 800, 1200],
  options: Omit<ImageTransformOptions, "width"> = {},
): string | null {
  if (!url || !isTransformableUrl(url)) return null;

  return widths
    .map((w) => `${getOptimizedImageUrl(url, { ...options, width: w })} ${w}w`)
    .join(", ");
}

/**
 * Presets for common image sizes
 */
export const imagePresets = {
  thumbnail: { width: 400, quality: 70 },
  card: { width: 600, quality: 72 },
  featured: { width: 1000, quality: 75 },
  full: { width: 1600, quality: 80 },
} as const;
