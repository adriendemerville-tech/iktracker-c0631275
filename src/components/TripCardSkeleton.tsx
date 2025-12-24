import { memo } from 'react';
import { Skeleton } from './ui/skeleton';

interface TripCardSkeletonProps {
  count?: number;
}

const SingleTripCardSkeleton = memo(function SingleTripCardSkeleton() {
  return (
    <div className="bg-card rounded-md p-3 shadow-sm border border-border/50 animate-pulse">
      {/* Row 1: Date and route */}
      <div className="flex items-center gap-3 mb-2">
        {/* Date */}
        <Skeleton className="h-4 w-16 shrink-0" />
        
        {/* Route: Start → End */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <Skeleton className="h-3.5 w-3.5 rounded-full shrink-0" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3.5 w-3.5 shrink-0" />
          <Skeleton className="h-3.5 w-3.5 rounded-full shrink-0" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Row 2: Distance and IK amount */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
});

export const TripCardSkeleton = memo(function TripCardSkeleton({ count = 3 }: TripCardSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SingleTripCardSkeleton key={i} />
      ))}
    </div>
  );
});

export const VehicleCardSkeleton = memo(function VehicleCardSkeleton() {
  return (
    <div className="bg-card rounded-lg p-4 border border-border/50 animate-pulse">
      <div className="flex items-start gap-3">
        {/* Car icon placeholder */}
        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
        
        <div className="flex-1 min-w-0">
          {/* Vehicle name */}
          <Skeleton className="h-5 w-32 mb-1" />
          {/* Details */}
          <Skeleton className="h-4 w-24" />
        </div>
        
        {/* Actions */}
        <Skeleton className="h-8 w-8 rounded shrink-0" />
      </div>
    </div>
  );
});
