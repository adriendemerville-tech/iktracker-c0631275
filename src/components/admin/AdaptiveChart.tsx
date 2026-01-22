import { useRef, useMemo } from 'react';
import { useContainerWidth } from '@/hooks/useContainerWidth';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface DataPoint {
  [key: string]: string | number;
}

interface LineConfig {
  dataKey: string;
  name: string;
  stroke: string;
  showDots?: boolean;
}

interface AdaptiveChartProps {
  data: DataPoint[];
  xAxisKey: string;
  lines: LineConfig[];
  isLoading?: boolean;
  height?: number;
  baseDataPoints?: number;
  emptyMessage?: string;
}

export function AdaptiveChart({
  data,
  xAxisKey,
  lines,
  isLoading = false,
  height = 200,
  baseDataPoints = 7,
  emptyMessage = 'Aucune donnée',
}: AdaptiveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { getDataPoints, isFullWidth } = useContainerWidth(containerRef);
  
  // Limit data points based on container width
  const displayData = useMemo(() => {
    const maxPoints = getDataPoints(baseDataPoints);
    if (data.length <= maxPoints) return data;
    
    // Take the most recent data points
    return data.slice(-maxPoints);
  }, [data, getDataPoints, baseDataPoints]);
  
  if (isLoading) {
    return (
      <div ref={containerRef}>
        <Skeleton className="w-full" style={{ height }} />
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div ref={containerRef} className="flex items-center justify-center" style={{ height }}>
        <p className="text-muted-foreground text-center py-8">{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div ref={containerRef}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={displayData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey={xAxisKey} 
            tick={{ fontSize: isFullWidth ? 11 : 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          {lines.length > 1 && <Legend />}
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.stroke}
              strokeWidth={2}
              dot={line.showDots ? { fill: line.stroke, strokeWidth: 0, r: 3 } : false}
              activeDot={{ r: 4, stroke: line.stroke, strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
