import { levelInfo } from "@/lib/forum/constants";
import { cn } from "@/lib/utils";

export function ForumLevelBadge({
  level,
  className,
  moderator,
}: {
  level: string;
  className?: string;
  moderator?: boolean;
}) {
  if (moderator) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary",
          className,
        )}
        title="Modérateur du forum"
      >
        Modérateur
      </span>
    );
  }

  const info = levelInfo(level);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium",
        info.color,
        className,
      )}
      title={`Niveau ${info.label}`}
    >
      {info.label}
    </span>
  );
}
