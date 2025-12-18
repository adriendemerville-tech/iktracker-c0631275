import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';

interface CounterProps {
  value: number;
  label: string;
  unit: string;
  variant?: 'default' | 'accent';
  decimals?: number;
}

// Animated digit component - slot machine effect cycling only within valid range
function AnimatedDigit({ 
  digit, 
  delay = 0,
  duration = 800,
  variant = 'default'
}: { 
  digit: string; 
  delay?: number;
  duration?: number;
  variant?: 'default' | 'accent';
}) {
  const [displayDigit, setDisplayDigit] = useState('0');
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number | null>(null);
  
  useEffect(() => {
    // Skip animation for non-numeric characters
    if (digit === ',' || digit === ' ' || digit === '.') {
      setDisplayDigit(digit);
      return;
    }

    const target = parseInt(digit) || 0;
    
    if (target === 0) {
      const timeoutId = setTimeout(() => {
        setDisplayDigit('0');
      }, delay);
      return () => clearTimeout(timeoutId);
    }

    // Number of full cycles through the valid range (0 to target)
    const numCycles = 8;
    // Total steps = cycles * (target + 1) to end exactly on target
    const totalSteps = numCycles * (target + 1);
    let lastDisplayed = -1;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
        setIsAnimating(true);
      }
      
      const elapsed = timestamp - startTimeRef.current - delay;
      
      if (elapsed < 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out exponential for dramatic slowdown at the end
      const easeOut = 1 - Math.pow(1 - progress, 4);
      
      // Calculate current step and cycle within 0 to target range
      const currentStep = Math.floor(totalSteps * easeOut);
      const displayValue = currentStep % (target + 1);
      
      // Only update if digit changed
      if (displayValue !== lastDisplayed) {
        setDisplayDigit(displayValue.toString());
        lastDisplayed = displayValue;
      }
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayDigit(target.toString());
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      startTimeRef.current = null;
      setIsAnimating(false);
    };
  }, [digit, delay, duration, variant]);

  if (digit === ',' || digit === ' ' || digit === '.') {
    return <span>{digit}</span>;
  }

  return (
    <span 
      className={cn(
        "inline-block tabular-nums transition-all duration-75",
        isAnimating && variant === 'accent' && "text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]",
        isAnimating && variant === 'default' && "text-blue-200 drop-shadow-[0_0_8px_rgba(147,197,253,0.6)]"
      )}
    >
      {displayDigit}
    </span>
  );
}

export function Counter({ value, label, unit, variant = 'default', decimals = 0 }: CounterProps) {
  const formattedValue = value.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  
  const prevValueRef = useRef(value);
  const [key, setKey] = useState(0);
  
  // Trigger re-animation when value changes
  useEffect(() => {
    if (value !== prevValueRef.current) {
      setKey(k => k + 1);
      prevValueRef.current = value;
    }
  }, [value]);

  // Calculate delays - units first (rightmost), then tens, hundreds...
  const getDelay = (index: number, totalLength: number) => {
    // Reverse index so rightmost digits animate first
    const reverseIndex = totalLength - 1 - index;
    return reverseIndex * 150; // 150ms delay between each position
  };

  const digits = formattedValue.split('');

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
          key={key}
          className={cn(
            "text-3xl font-urbanist font-extrabold tabular-nums tracking-tight",
            variant === 'default' ? "text-white" : "text-emerald-400"
          )}
        >
          {digits.map((digit, index) => (
            <AnimatedDigit 
              key={`${key}-${index}`}
              digit={digit} 
              delay={getDelay(index, digits.length)}
              duration={variant === 'default' ? 2500 : 1500}
              variant={variant}
            />
          ))}
        </span>
        <span className="text-sm font-urbanist font-semibold text-white/70">{unit}</span>
      </div>
    </div>
  );
}
