import { useEffect, useState, RefObject } from 'react';

interface ContainerWidthResult {
  width: number;
  isFullWidth: boolean;
  getDataPoints: (baseCount?: number) => number;
}

export function useContainerWidth(ref: RefObject<HTMLElement>): ContainerWidthResult {
  const [width, setWidth] = useState(0);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    
    resizeObserver.observe(ref.current);
    
    // Initial measurement
    setWidth(ref.current.offsetWidth);
    
    return () => resizeObserver.disconnect();
  }, [ref]);
  
  // Consider full width if container is more than 600px
  const isFullWidth = width >= 600;
  
  // Get number of data points based on container width
  const getDataPoints = (baseCount = 7) => {
    if (width >= 800) return baseCount * 2; // Full width: double the points
    if (width >= 600) return Math.floor(baseCount * 1.5);
    return baseCount;
  };
  
  return { width, isFullWidth, getDataPoints };
}
