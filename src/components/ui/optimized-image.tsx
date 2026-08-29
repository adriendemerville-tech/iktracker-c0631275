import { useState, useRef, useEffect, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl, getResponsiveSrcSet } from "@/lib/image-transform";

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

function generateSizes(): string {
  return "(max-width: 480px) 100vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, 720px";
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
        rootMargin: "200px", // Increased for better preloading
        threshold: 0,
      },
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

  // Resized + compressed variant (WebP is negotiated via Accept headers)
  const optimizedSrc = getOptimizedImageUrl(src, { width: width ?? 800 }) ?? src;

  const srcSet =
    responsive
      ? (getResponsiveSrcSet(src, [320, 480, 640, 768, 1024, 1280]) ?? undefined)
      : undefined;
  const sizes = responsive && srcSet ? generateSizes() : undefined;

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)} style={aspectStyle}>
      {/* Placeholder skeleton with proper dimensions */}
      {!isLoaded && (
        <div
          className={cn("absolute inset-0 bg-muted animate-pulse rounded-lg", placeholderClassName)}
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
            isLoaded ? "opacity-100" : "opacity-0",
          )}
          {...props}
        />
      )}
    </div>
  );
}
