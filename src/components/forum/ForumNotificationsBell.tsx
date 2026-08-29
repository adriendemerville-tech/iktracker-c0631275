import { Bell } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForumNotifications } from "@/hooks/useForumNotifications";

/** Cloche de notifications des réponses reçues sur le forum. */
export function ForumNotificationsBell({ className }: { className?: string }) {
  const { items, unreadCount, markAllRead, markRead, hasUser } = useForumNotifications();
  const navigate = useNavigate();

  // Rien à afficher pour les visiteurs non connectés.
  if (!hasUser) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${className ?? ""}`}
          aria-label={`Notifications du forum${unreadCount ? ` (${unreadCount} non lues)` : ""}`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 p-0 flex items-center justify-center text-xs rounded-full"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Forum</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs text-primary hover:underline"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Aucune notification pour le moment.
            </p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  void markRead(n.id);
                  navigate(`/forum/${n.slug}${n.reply_id ? `#reponse-${n.reply_id}` : ""}`);
                }}
                className={`block w-full border-b border-border px-3 py-2 text-left last:border-0 hover:bg-muted/50 ${
                  n.read_at ? "" : "bg-primary/5"
                }`}
              >
                <p className="text-sm font-medium leading-tight">
                  {n.kind === "mention"
                    ? `Vous avez été mentionné : ${n.title}`
                    : n.kind === "reply_to_reply"
                      ? `Réponse à votre message : ${n.title}`
                      : `Nouvelle réponse à votre sujet : ${n.title}`}
                </p>
                {n.excerpt && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.excerpt}</p>
                )}
                <time className="mt-1 block text-[11px] text-muted-foreground" dateTime={n.created_at}>
                  {new Date(n.created_at).toLocaleString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
