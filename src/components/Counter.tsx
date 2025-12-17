import { cn } from '@/lib/utils';

interface CounterProps {
  value: number;
  label: string;
  unit: string;
  variant?: 'default' | 'accent';
  decimals?: number;
}

export function Counter({ value, label, unit, variant = 'default', decimals = 0 }: CounterProps) {
  const formattedValue = value.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <div className={cn(
      "flex flex-col items-center p-4 rounded-md transition-all duration-300",
      variant === 'default' && "bg-card text-card-foreground shadow-md",
      variant === 'accent' && "bg-gradient-accent text-accent-foreground shadow-lg"
    )}>
      <span className="text-[10px] uppercase tracking-wider opacity-70 mb-1">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="counter-text text-2xl font-bold animate-counter-up">
          {formattedValue}
        </span>
        <span className="text-sm font-medium opacity-80">{unit}</span>
      </div>
    </div>
  );
}
