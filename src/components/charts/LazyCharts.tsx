// Lazy-loaded chart wrapper - ensures recharts is NOT in the initial bundle
// Only loads when a chart component is actually rendered

import { Suspense, lazy, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Chart placeholder while loading
export const ChartSkeleton = ({ height = 200 }: { height?: number }) => (
  <Skeleton className="w-full rounded-lg" style={{ height }} />
);

// Helper function to load recharts on demand (for imperative usage)
export async function loadRecharts() {
  const recharts = await import('recharts');
  return recharts;
}

// Lazy load the profile km chart as a complete component
export const LazyProfileKmChart = lazy(() => import('./ProfileKmChart'));

// Wrapper component for charts with built-in suspense
interface ChartWrapperProps {
  children: React.ReactNode;
  height?: number;
  className?: string;
}

export const ChartWrapper = ({ children, height = 200, className }: ChartWrapperProps) => (
  <Suspense fallback={<ChartSkeleton height={height} />}>
    <div className={className}>
      {children}
    </div>
  </Suspense>
);

