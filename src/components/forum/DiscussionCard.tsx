import { Link } from "@/lib/router-compat";
import { MessageSquare, Pin } from "lucide-react";
import { ForumAvatar } from "./ForumAvatar";
import { ForumLevelBadge } from "./ForumLevelBadge";
import { ForumVote } from "./ForumVote";
import { ForumActions } from "./ForumActions";
import { personaLabel } from "@/lib/forum/constants";
import type { ForumDiscussionListItem, ForumCategory } from "@/lib/forum/queries";

interface DiscussionCardProps {
  discussion: ForumDiscussionListItem;
  categories: ForumCategory[];
  canInteract: boolean;
  isSaved?: boolean;
}

function relativeDate(value: string): string {
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 31) return `il y a ${days} j`;
  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${Math.floor(months / 12)} an(s)`;
}

export function DiscussionCard({
  discussion,
  categories,
  canInteract,
  isSaved,
}: DiscussionCardProps) {
  const category = categories.find((c) => c.slug === discussion.category_slug);
  const excerpt =
    discussion.meta_description ??
    discussion.body.replace(/\s+/g, " ").trim().slice(0, 160);

  return (
    <article className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex gap-3">
        <div className="hidden sm:block">
          <ForumVote
            targetType="discussion"
            targetId={discussion.id}
            score={discussion.vote_score}
            canVote={canInteract}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {discussion.is_pinned && (
              <span className="inline-flex items-center gap-1 text-primary">
                <Pin className="h-3 w-3" aria-hidden="true" /> Épinglée
              </span>
            )}
            {category && (
              <Link
                to={`/forum/categorie/${category.slug}`}
                className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary hover:bg-primary/20"
              >
                {category.label}
              </Link>
            )}
            <time dateTime={discussion.created_at}>{relativeDate(discussion.created_at)}</time>
          </div>

          <h3 className="text-base font-semibold leading-snug">
            <Link
              to={`/forum/${discussion.slug}`}
              className="hover:text-primary focus-visible-ring rounded-sm"
            >
              {discussion.title}
            </Link>
          </h3>

          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{excerpt}</p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ForumAvatar
                pseudo={discussion.author?.pseudo}
                avatarUrl={discussion.author?.avatar_url}
                size={24}
              />
              <span className="font-medium text-foreground">
                {discussion.author?.pseudo ?? "Membre"}
              </span>
              {discussion.author && <ForumLevelBadge level={discussion.author.level} moderator={discussion.author.is_moderator} />}
              {personaLabel(discussion.author?.persona) && (
                <span className="hidden sm:inline">· {personaLabel(discussion.author?.persona)}</span>
              )}
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                {discussion.reply_count}
              </span>
            </div>

            <ForumActions
              discussionId={discussion.id}
              slug={discussion.slug}
              title={discussion.title}
              canInteract={canInteract}
              isSaved={isSaved}
              revealOnHover
            />
          </div>
        </div>
      </div>
    </article>
  );
}
