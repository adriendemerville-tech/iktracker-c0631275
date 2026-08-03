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
  const animationRef = useRef<number | undefined>(undefined);
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
      "flex flex-col items-center p-2 sm:p-5 rounded-xl transition-all duration-300",
      "bg-card/70 backdrop-blur-xl border border-border/60",
      "shadow-[0_8px_32px_rgba(0,0,0,0.08)]",
      variant === 'accent' && "border-emerald-500/30 dark:border-emerald-500/20"
    )}>
      <span className="text-[9px] sm:text-xs uppercase tracking-wider text-muted-foreground mb-1 sm:mb-2 font-urbanist font-medium">{label}</span>
      <div className="flex items-baseline gap-0.5 sm:gap-1.5">
        <span 
          className={cn(
            "text-xl sm:text-3xl font-urbanist font-extrabold tabular-nums tracking-tight",
            variant === 'default' ? "text-foreground" : "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {formattedValue}
        </span>
        <span className="text-[10px] sm:text-sm font-urbanist font-semibold text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}
