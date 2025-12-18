import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';

interface CounterProps {
  value: number;
  label: string;
  unit: string;
  variant?: 'default' | 'accent';
  decimals?: number;
}

// Animated digit component - rolls through numbers
function AnimatedDigit({ 
  digit, 
  delay = 0,
  duration = 1500 
}: { 
  digit: string; 
  delay?: number;
  duration?: number;
}) {
  const [displayDigit, setDisplayDigit] = useState('0');
  const [isAnimating, setIsAnimating] = useState(false);
  const targetDigit = digit === ',' || digit === ' ' ? digit : parseInt(digit) || 0;
  
  useEffect(() => {
    // Skip animation for non-numeric characters
    if (digit === ',' || digit === ' ' || digit === '.') {
      setDisplayDigit(digit);
      return;
    }

    const target = parseInt(digit) || 0;
    let current = 0;
    const steps = target + 10; // Roll through more numbers for effect
    const stepDuration = duration / steps;
    
    const timeoutId = setTimeout(() => {
      setIsAnimating(true);
      
      const interval = setInterval(() => {
        current++;
        if (current >= steps) {
          setDisplayDigit(target.toString());
          setIsAnimating(false);
          clearInterval(interval);
        } else {
          // Show rolling numbers, cycling 0-9
          setDisplayDigit((current % 10).toString());
        }
      }, stepDuration);
      
      return () => clearInterval(interval);
    }, delay);
    
    return () => clearTimeout(timeoutId);
  }, [digit, delay, duration]);

  // Non-numeric characters (comma, space)
  if (digit === ',' || digit === ' ' || digit === '.') {
    return <span>{digit}</span>;
  }

  return (
    <span 
      className={cn(
        "inline-block transition-transform",
        isAnimating && "animate-pulse"
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
    // Skip non-numeric characters in delay calculation
    return reverseIndex * 200; // 200ms delay between each position
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
          {variant === 'accent' ? (
            // Animated counter for money
            digits.map((digit, index) => (
              <AnimatedDigit 
                key={`${key}-${index}`}
                digit={digit} 
                delay={getDelay(index, digits.length)}
                duration={1200}
              />
            ))
          ) : (
            formattedValue
          )}
        </span>
        <span className="text-sm font-urbanist font-semibold text-white/70">{unit}</span>
      </div>
    </div>
  );
}
