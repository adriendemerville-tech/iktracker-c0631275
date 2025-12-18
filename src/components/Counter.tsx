import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';

interface CounterProps {
  value: number;
  label: string;
  unit: string;
  variant?: 'default' | 'accent';
  decimals?: number;
}

// Animated digit component - counts up to target
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
  
  useEffect(() => {
    // Skip animation for non-numeric characters
    if (digit === ',' || digit === ' ' || digit === '.') {
      setDisplayDigit(digit);
      return;
    }

    const target = parseInt(digit) || 0;
    
    // If target is 0, just show 0
    if (target === 0) {
      const timeoutId = setTimeout(() => setDisplayDigit('0'), delay);
      return () => clearTimeout(timeoutId);
    }
    
    // Count from 0 up to target value
    const stepDuration = duration / target;
    let current = 0;
    
    const timeoutId = setTimeout(() => {
      const interval = setInterval(() => {
        current++;
        setDisplayDigit(current.toString());
        
        if (current >= target) {
          clearInterval(interval);
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
    <span className="inline-block tabular-nums">
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
    return reverseIndex * 350; // 350ms delay between each position
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
                duration={2000}
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
