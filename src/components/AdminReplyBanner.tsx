import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageSquareHeart, X } from "lucide-react";
import { useFeedback } from "@/hooks/useFeedback";

const STORAGE_KEY = "ik_admin_reply_banner_dismissed";

/**
 * Bannière desktop affichée en haut de /app quand Adrien a répondu à un
 * message non lu. Cliquable (vers la discussion) et masquable.
 */
export function AdminReplyBanner() {
  const { feedbacks } = useFeedback();
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    setDismissedId(localStorage.getItem(STORAGE_KEY));
  }, []);

  const latest = feedbacks.find((f) => f.response && !f.read_by_user);
  if (!latest || dismissedId === latest.id) return null;

  const excerpt = latest.response?.replace(/\s+/g, " ").slice(0, 110) ?? "";

  const dismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    localStorage.setItem(STORAGE_KEY, latest.id);
    setDismissedId(latest.id);
  };

  return (
    <div className="hidden lg:block">
      <Link
        to="/app/messages"
        className="relative flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 shadow-sm transition-colors hover:bg-primary/10"
      >
        <MessageSquareHeart className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            Adrien a répondu à votre message
          </p>
          <p className="truncate text-sm font-medium">{excerpt}…</p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-primary">Lire et répondre</span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Masquer la bannière"
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </Link>
    </div>
  );
}
