import { cn } from "@/lib/utils";

interface ForumAvatarProps {
  pseudo?: string | null;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}

export function ForumAvatar({ pseudo, avatarUrl, size = 36, className }: ForumAvatarProps) {
  const initials = (pseudo ?? "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`Photo de profil de ${pseudo ?? "membre"}`}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        className={cn("rounded-full object-cover border border-border", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold border border-border",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, size / 2.8) }}
    >
      {initials || "?"}
    </span>
  );
}
