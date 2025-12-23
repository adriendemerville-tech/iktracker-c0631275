import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Car } from 'lucide-react';
import { Trip } from '@/types/trip';

// Chart animation settings
const KM_BAR_ANIMATION_DURATION_MS = 6000;
const KM_BAR_ANIMATION_DELAY_MS = 150;
const KM_BAR_ANIMATION_STAGGER_MS = 60;

// Animated counter label for bar chart
const AnimatedLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  const [displayValue, setDisplayValue] = useState<number | null>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!value || value === 0) return;
    setDisplayValue(null);
    startTimeRef.current = null;
  }, [value]);

  useEffect(() => {
    if (!value || value === 0) return;

    const duration = 2600;
    const startDelay = 1200;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;

      const elapsed = timestamp - startTimeRef.current - startDelay;

      if (elapsed < 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * easeOut));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value]);

  if (!value || value === 0 || displayValue === null) return null;

  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="white"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={13}
      fontWeight={700}
    >
      {displayValue}
    </text>
  );
};

// Custom bar shape with animation
const KmBarShape = (props: any) => {
  const { x, y, width, height, fill, index } = props;
  if (!height || height <= 0) return null;

  const rx = Math.min(width / 2, 22);
  const ry = Math.min(14, height);

  const d = [
    `M ${x} ${y + ry}`,
    `A ${rx} ${ry} 0 0 1 ${x + rx} ${y}`,
    `L ${x + width - rx} ${y}`,
    `A ${rx} ${ry} 0 0 1 ${x + width} ${y + ry}`,
    `L ${x + width} ${y + height}`,
    `L ${x} ${y + height}`,
    'Z',
  ].join(' ');

  const delay = KM_BAR_ANIMATION_DELAY_MS + (Number(index) || 0) * KM_BAR_ANIMATION_STAGGER_MS;
  const isLastBar = index === 5;
  
  return (
    <path
      d={d}
      fill={fill}
      filter={isLastBar ? "url(#barGlow)" : "url(#barShadow)"}
      className="km-bar-grow"
      style={{ animationDuration: `${KM_BAR_ANIMATION_DURATION_MS}ms`, animationDelay: `${delay}ms` }}
    />
  );
};

interface KilometersChartProps {
  trips: Trip[];
  isMobile: boolean;
}

export function KilometersChart({ trips, isMobile }: KilometersChartProps) {
  const totalStats = useMemo(() => {
    const totalKm = Math.round(trips.reduce((sum, trip) => sum + trip.distance, 0));
    return { totalKm };
  }, [trips]);

  const monthlyKmData = useMemo(() => {
    const now = new Date();
    const months = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('fr-FR', { month: 'short' });
      months.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
        km: 0
      });
    }

    trips.forEach(trip => {
      const tripDate = new Date(trip.startTime);
      const tripMonth = tripDate.getMonth();
      const tripYear = tripDate.getFullYear();
      
      const monthData = months.find(m => m.monthIndex === tripMonth && m.year === tripYear);
      if (monthData) {
        monthData.km += trip.distance;
      }
    });

    return months.map(m => ({ month: m.month, km: Math.round(m.km) }));
  }, [trips]);

  const chartMaxKm = useMemo(() => {
    const maxKm = Math.max(...monthlyKmData.map(d => d.km), 0);
    const minCeiling = 200;
    const padding = 1.2;
    return Math.max(Math.ceil(maxKm * padding / 50) * 50, minCeiling);
  }, [monthlyKmData]);

  return (
    <Card className="relative">
      {/* Animated car */}
      <div className="absolute top-4 right-[40px] flex flex-col items-center gap-0 z-10">
        {totalStats.totalKm === 0 ? (
          <div className="relative" style={{ filter: 'drop-shadow(0 0 4px hsl(220 70% 50% / 0.2))' }}>
            <Car className="w-8 h-8 text-primary/60 fill-transparent" strokeWidth={1.5} />
            <div className="absolute bottom-[4px] left-[4px] w-[7px] h-[7px] rounded-full border-[1.5px] border-primary/60" />
            <div className="absolute bottom-[4px] right-[4px] w-[7px] h-[7px] rounded-full border-[1.5px] border-primary/60" />
            <span className="absolute top-[10px] left-1/2 -translate-x-1/2 text-[8px] font-bold text-primary select-none animate-zz-float">
              Zz..
            </span>
            <div className="absolute bottom-[6px] -right-[6px] w-[4px] h-[4px] rounded-full bg-primary/60" />
          </div>
        ) : (
          <div className="animate-car-bounce relative" style={{ filter: 'drop-shadow(0 0 4px hsl(220 70% 50% / 0.35))' }}>
            <Car className="w-8 h-8 text-primary fill-transparent" strokeWidth={1.5} />
            <div className="absolute bottom-[4px] left-[4px] w-[7px] h-[7px] rounded-full border-[1.5px] border-primary border-dashed animate-wheel-spin" />
            <div className="absolute bottom-[4px] right-[4px] w-[7px] h-[7px] rounded-full border-[1.5px] border-primary border-dashed animate-wheel-spin" />
          </div>
        )}
        <div className="relative w-12 -mt-1.5">
          <div className={`w-full h-[2px] bg-muted-foreground/40 rounded-full ${totalStats.totalKm > 0 ? 'animate-road-wave' : ''}`} />
        </div>
      </div>

      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="w-4 h-4" />
          Kilomètres parcourus
        </CardTitle>
        {!isMobile && (
          <CardDescription>
            Sur les 6 derniers mois
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyKmData} margin={{ left: 0, right: 0, bottom: 0, top: 10 }} barSize={32}>
              <defs>
                <filter id="barShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
                </filter>
                <filter id="barGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <XAxis type="category" dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis type="number" hide domain={[0, chartMaxKm]} />
              <Bar 
                dataKey="km"
                shape={<KmBarShape />}
              >
                {monthlyKmData.map((_, index) => {
                  const colors = ['#3B82F6', '#EC4899', '#22C55E', '#8B5CF6', '#F97316', '#EAB308'];
                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                })}
                <LabelList dataKey="km" content={<AnimatedLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
