// Isolated chart component for Profile page - loaded dynamically
// This keeps recharts OUT of the initial bundle

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Cell, 
  LabelList 
} from 'recharts';

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
      fontWeight={800}
    >
      {displayValue}
    </text>
  );
};

// Custom bar shape with "mushroom" push-up animation + oval top
const KmBarShape = (props: any) => {
  const { x, y, width, height, fill, index } = props;
  if (!height || height <= 0) return null;

  const rx = Math.min(width / 2, 22);
  const ry = Math.min(6, height);

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

interface ProfileKmChartProps {
  data: Array<{ month: string; km: number }>;
  maxKm: number;
}

const ProfileKmChart = ({ data, maxKm }: ProfileKmChartProps) => {
  const colors = ['#3B82F6', '#EC4899', '#22C55E', '#8B5CF6', '#F97316', '#EAB308', '#06B6D4', '#F43F5E', '#84CC16', '#A855F7', '#FB923C', '#FACC15'];

  return (
    // Fixed height container to prevent CLS when chart loads
    <div className="h-48 min-h-[192px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -10, right: -10, bottom: 0, top: 10 }} barCategoryGap="4%">
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
          <XAxis type="category" dataKey="month" tick={{ fontSize: 10 }} interval={0} />
          <YAxis type="number" hide domain={[0, maxKm]} />
          <Bar 
            dataKey="km"
            shape={<KmBarShape />}
            maxBarSize={32}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
            <LabelList dataKey="km" content={<AnimatedLabel />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProfileKmChart;
