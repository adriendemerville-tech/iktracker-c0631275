import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MessageSquareMore, X } from "lucide-react";
import { suggestForumDiscussion } from "@/lib/forum.functions";

const STORAGE_KEY = "ik_forum_banner_muted_until";
const DAY_MS = 24 * 60 * 60 * 1000;
const DISMISS_DURATION_MS = 30 * DAY_MS; // masquée : 1 mois
const CLICK_DURATION_MS = 7 * DAY_MS; // cliquée : 1 semaine

/**
 * Bannière de suggestion forum — desktop uniquement. Ciblée sur le persona
 * métier du membre connecté. Masquée (croix) : aucune suggestion pendant 1
 * mois. Cliquée : disparition et aucune suggestion pendant 1 semaine.
 */
export function ForumSuggestionBanner() {
  const [muted, setMuted] = useState<boolean | null>(null);

  useEffect(() => {
    const until = Number(localStorage.getItem(STORAGE_KEY) || 0);
    setMuted(until > Date.now());
  }, []);

  const { data } = useQuery({
    queryKey: ["forum-suggestion"],
    queryFn: () => suggestForumDiscussion(),
    staleTime: 10 * 60 * 1000,
    enabled: muted === false,
    retry: false,
  });

  const mute = (durationMs: number) => {
    localStorage.setItem(STORAGE_KEY, String(Date.now() + durationMs));
    setMuted(true);
  };

  const dismiss = () => mute(DISMISS_DURATION_MS);
  const follow = () => mute(CLICK_DURATION_MS);

  if (muted !== false) return null;
  const suggestion = data?.suggestion;
  if (!suggestion) return null;

  return (
    <div className="hidden lg:block">
      <div className="relative flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 shadow-sm">
        <MessageSquareMore className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            Cette discussion sur le forum peut vous intéresser
          </p>
          <Link
            to={`/forum/${suggestion.slug}` as string}
            target="_blank"
            rel="noopener noreferrer"
            onClick={follow}
            className="block truncate text-sm font-semibold text-primary hover:underline"
          >
            {suggestion.title}
            <span className="ml-2 font-normal text-muted-foreground">
              — {suggestion.contributions} contribution{suggestion.contributions > 1 ? "s" : ""}
            </span>
          </Link>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Masquer la suggestion"
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
