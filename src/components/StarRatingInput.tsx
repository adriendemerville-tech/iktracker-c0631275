import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Notation par demi-étoiles.
 * Une première tape sur l'étoile N donne N-0,5 ; une seconde tape donne N.
 * Une troisième tape remet la note à zéro.
 */
export function StarRatingInput({
  value,
  onChange,
  size = "md",
  className,
}: StarRatingInputProps) {
  const starSize = size === "lg" ? "w-8 h-8" : size === "sm" ? "w-4 h-4" : "w-6 h-6";

  const handleTap = (n: number) => {
    const half = n - 0.5;
    if (value === half) onChange(n);
    else if (value === n) onChange(0);
    else onChange(half);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value >= n;
        const halfFilled = !filled && value >= n - 0.5;
        return (
          <button
            key={n}
            type="button"
            onClick={() => handleTap(n)}
            className="p-1 hover:scale-110 transition-transform outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            aria-label={`Noter ${n - 0.5} ou ${n} étoiles`}
          >
            <span className="relative block">
              <Star className={cn(starSize, "text-muted-foreground/40")} />
              {(filled || halfFilled) && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: filled ? "100%" : "50%" }}
                >
                  <Star className={cn(starSize, "fill-amber-400 text-amber-400")} />
                </span>
              )}
            </span>
          </button>
        );
      })}
      {value > 0 && (
        <span className="ml-2 text-sm text-muted-foreground">
          {value.toString().replace(".", ",")}/5
        </span>
      )}
    </div>
  );
}
