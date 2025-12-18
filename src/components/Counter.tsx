import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';

interface CounterProps {
  value: number;
  label: string;
  unit: string;
  variant?: 'default' | 'accent';
  decimals?: number;
}

export function Counter({ value, label, unit, variant = 'default', decimals = 0 }: CounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number | null>(null);
  const prevValueRef = useRef<number | null>(null);
  const isFirstRender = useRef(true);
  
  const duration = variant === 'default' ? 2000 : 1200;

  useEffect(() => {
    // On first render, animate from 0
    // On subsequent renders, animate from previous value
    const startValue = isFirstRender.current ? 0 : (prevValueRef.current ?? 0);
    const endValue = value;
    
    isFirstRender.current = false;
    
    if (endValue === startValue) {
      setDisplayValue(endValue);
      prevValueRef.current = endValue;
      return;
    }

    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      
      const elapsed = timestamp - startTimeRef.current;
      // Shorter duration when updating from previous value
      const animDuration = startValue === 0 ? duration : 800;
      const progress = Math.min(elapsed / animDuration, 1);
      
      // Ease-out exponential for dramatic slowdown at the end
      const easeOut = 1 - Math.pow(1 - progress, startValue === 0 ? 5 : 3);
      
      const current = startValue + (endValue - startValue) * easeOut;
      setDisplayValue(current);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value, duration]);

  const formattedValue = displayValue.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div className={cn(
      "flex flex-col items-center p-5 rounded-xl transition-all duration-300",
      "bg-white/5 backdrop-blur-xl border border-white/10",
      "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
      variant === 'accent' && "border-emerald-500/20"
    )}>
      <span className="text-[10px] uppercase tracking-wider text-white/60 mb-2 font-urbanist font-medium">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span 
          className={cn(
            "text-3xl font-urbanist font-extrabold tabular-nums tracking-tight",
            variant === 'default' ? "text-white" : "text-emerald-400"
          )}
        >
          {formattedValue}
        </span>
        <span className="text-sm font-urbanist font-semibold text-white/70">{unit}</span>
      </div>
    </div>
  );
}
