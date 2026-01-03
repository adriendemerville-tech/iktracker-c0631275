import { useState, useRef, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholderClassName?: string;
  eager?: boolean;
  // Aspect ratio for placeholder (e.g., "16/9", "1/1", "4/3")
  aspectRatio?: string;
  // Enable responsive images with srcset
  responsive?: boolean;
}

// Generate responsive srcset for Supabase storage images
function generateSrcSet(src: string): string | undefined {
  // Only apply to Supabase storage URLs
  if (!src.includes('supabase.co/storage')) {
    return undefined;
  }
  
  // Define breakpoints for responsive images
  const widths = [320, 480, 640, 768, 1024, 1280];
  
  // For Supabase, we can use image transformation via URL params
  // Format: /render/image/public/{bucket}/{path}?width=X&quality=Y
  const srcSet = widths.map(w => {
    // Check if it's a direct object URL or render URL
    if (src.includes('/object/public/')) {
      // Convert to render URL for transformation
      const renderUrl = src.replace('/object/public/', '/render/image/public/');
      const separator = renderUrl.includes('?') ? '&' : '?';
      return `${renderUrl}${separator}width=${w}&quality=75 ${w}w`;
    }
    return `${src} ${w}w`;
  }).join(', ');
  
  return srcSet;
}

// Generate sizes attribute for responsive images
function generateSizes(): string {
  return '(max-width: 480px) 100vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, 720px';
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  placeholderClassName,
  eager = false,
  aspectRatio,
  responsive = true,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(eager);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (eager) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // Increased for better preloading
        threshold: 0
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [eager]);

  // Calculate aspect ratio style if dimensions provided
  const aspectStyle = aspectRatio 
    ? { aspectRatio } 
    : width && height 
      ? { aspectRatio: `${width}/${height}` }
      : undefined;

  // Generate optimized src for initial load (smaller for mobile)
  const optimizedSrc = src.includes('supabase.co/storage') && src.includes('/object/public/')
    ? src.replace('/object/public/', '/render/image/public/') + (src.includes('?') ? '&' : '?') + 'width=720&quality=75'
    : src;

  const srcSet = responsive ? generateSrcSet(src) : undefined;
  const sizes = responsive && srcSet ? generateSizes() : undefined;

  return (
    <div 
      ref={imgRef} 
      className={cn("relative overflow-hidden", className)}
      style={aspectStyle}
    >
      {/* Placeholder skeleton with proper dimensions */}
      {!isLoaded && (
        <div 
          className={cn(
            "absolute inset-0 bg-muted animate-pulse rounded-lg",
            placeholderClassName
          )}
          style={aspectStyle}
        />
      )}
      
      {/* Actual image with responsive srcset */}
      {isInView && (
        <img
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "auto"}
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          {...props}
        />
      )}
    </div>
  );
}
