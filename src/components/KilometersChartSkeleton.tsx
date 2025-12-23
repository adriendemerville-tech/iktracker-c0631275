import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export function KilometersChartSkeleton() {
  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="w-4 h-4" />
          Kilomètres parcourus
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Fixed height skeleton matching the actual chart */}
        <div className="h-48 flex items-end justify-around gap-2 px-4">
          {[0.4, 0.6, 0.3, 0.8, 0.5, 0.7].map((height, i) => (
            <div 
              key={i}
              className="w-8 bg-muted/60 rounded-t-full animate-pulse"
              style={{ height: `${height * 100}%` }}
            />
          ))}
        </div>
        {/* X-axis skeleton */}
        <div className="flex justify-around mt-2 px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-8 h-3 bg-muted/40 rounded animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
