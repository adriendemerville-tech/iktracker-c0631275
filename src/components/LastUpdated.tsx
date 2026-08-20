import { RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface LastUpdatedProps {
  /** ISO date string (YYYY-MM-DD or full ISO) of the last content update */
  date: string;
  className?: string;
}

/**
 * Visible "Mis à jour le ..." freshness signal.
 * Pairs with the dateModified property of the page JSON-LD.
 */
export function LastUpdated({ date, className }: LastUpdatedProps) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm text-muted-foreground ${className ?? ""}`}
    >
      <RefreshCw className="h-4 w-4" aria-hidden="true" />
      Mis à jour le{" "}
      <time dateTime={parsed.toISOString()}>
        {format(parsed, "dd MMMM yyyy", { locale: fr })}
      </time>
    </span>
  );
}

export default LastUpdated;
