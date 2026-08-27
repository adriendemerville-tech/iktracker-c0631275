import { useState } from "react";
import { Bookmark, BookmarkCheck, Share2, Flag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleSaveDiscussion, reportForumContent } from "@/lib/forum.functions";
import { FORUM_BASE_URL } from "@/lib/forum/constants";

interface ForumActionsProps {
  discussionId: string;
  slug: string;
  title: string;
  isSaved?: boolean;
  canInteract: boolean;
  /** Révélées au survol de la carte parente (desktop), toujours visibles sur mobile. */
  revealOnHover?: boolean;
}

export function ForumActions({
  discussionId,
  slug,
  title,
  isSaved = false,
  canInteract,
  revealOnHover = false,
}: ForumActionsProps) {
  const [saved, setSaved] = useState(isSaved);
  const url = `${FORUM_BASE_URL}/${slug}`;

  const onSave = async () => {
    if (!canInteract) {
      toast.info("Connectez-vous pour enregistrer une discussion.");
      return;
    }
    const next = !saved;
    setSaved(next);
    try {
      const res = await toggleSaveDiscussion({ data: { discussion_id: discussionId } });
      setSaved(res.saved);
      toast.success(res.saved ? "Discussion enregistrée" : "Retirée de vos enregistrements");
    } catch {
      setSaved(!next);
      toast.error("Action impossible pour le moment.");
    }
  };

  const onShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié dans le presse-papier");
    } catch {
      /* partage annulé */
    }
  };

  const onReport = async () => {
    if (!canInteract) {
      toast.info("Connectez-vous pour signaler un contenu.");
      return;
    }
    await reportForumContent({
      data: { target_type: "discussion", target_id: discussionId },
    });
    toast.success("Signalement transmis à la modération");
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 transition-opacity",
        revealOnHover && "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
      )}
    >
      <button
        type="button"
        onClick={onSave}
        aria-label={saved ? "Retirer des enregistrements" : "Enregistrer la discussion"}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible-ring"
      >
        {saved ? (
          <BookmarkCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        ) : (
          <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">Enregistrer</span>
      </button>
      <button
        type="button"
        onClick={onShare}
        aria-label="Partager la discussion"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible-ring"
      >
        <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Partager</span>
      </button>
      <button
        type="button"
        onClick={onReport}
        aria-label="Signaler la discussion"
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible-ring"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">Signaler</span>
      </button>
    </div>
  );
}
