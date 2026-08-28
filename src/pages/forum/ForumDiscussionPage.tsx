import { useMemo, useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { EnhancedMarketingFooter } from "@/components/marketing/EnhancedMarketingFooter";
import { ForumAvatar } from "@/components/forum/ForumAvatar";
import { ForumLevelBadge } from "@/components/forum/ForumLevelBadge";
import { ForumVote } from "@/components/forum/ForumVote";
import { ForumActions } from "@/components/forum/ForumActions";
import { LevelUpDialog } from "@/components/forum/LevelUpDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useForumProfile } from "@/hooks/useForumProfile";
import { useLevelUpEvents } from "@/hooks/useLevelUpEvents";
import { createReply } from "@/lib/forum.functions";
import { personaLabel } from "@/lib/forum/constants";
import type { ForumCategory, ForumReplyNode } from "@/lib/forum/queries";
import { Bot, CornerDownRight, Lock } from "lucide-react";

const REPLY_DRAFT_KEY = "iktracker_forum_draft_reply";

export interface ForumDiscussionData {
  discussion: {
    id: string;
    slug: string;
    title: string;
    body: string;
    category_slug: string;
    reply_count: number;
    vote_score: number;
    is_locked: boolean;
    created_at: string;
    updated_at: string;
    author_id: string;
    author?: {
      user_id: string;
      pseudo: string;
      avatar_url: string | null;
      level: string;
      persona: string | null;
    } | null;
  };
  replies: ForumReplyNode[];
  category: ForumCategory | null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ForumDiscussionPage({ data }: { data: ForumDiscussionData }) {
  const { discussion, replies, category } = data;
  const { profile, user, loading } = useForumProfile();
  const { event, dismiss } = useLevelUpEvents(Boolean(user));
  const navigate = useNavigate();

  const [body, setBody] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = window.localStorage.getItem(`${REPLY_DRAFT_KEY}:${discussion.id}`);
      return raw ?? "";
    } catch {
      return "";
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [localReplies, setLocalReplies] = useState(replies);

  const threaded = useMemo(() => {
    const roots = localReplies.filter((r) => !r.parent_reply_id);
    const children = new Map<string, ForumReplyNode[]>();
    localReplies
      .filter((r) => r.parent_reply_id)
      .forEach((r) => {
        const list = children.get(r.parent_reply_id!) ?? [];
        list.push(r);
        children.set(r.parent_reply_id!, list);
      });
    return { roots, children };
  }, [localReplies]);

  const persistDraft = (value: string) => {
    setBody(value);
    try {
      window.localStorage.setItem(`${REPLY_DRAFT_KEY}:${discussion.id}`, value);
    } catch {
      /* quota */
    }
  };

  const submit = async () => {
    if (body.trim().length < 2) return;
    if (!user) {
      toast.info("Créez votre compte pour publier — votre brouillon est conservé.");
      navigate(`/auth?redirect=/forum/${discussion.slug}`);
      return;
    }
    if (!profile) {
      navigate("/app/forum/profil");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createReply({
        data: { discussion_id: discussion.id, body: body.trim() },
      });
      if (!res.ok) {
        if (res.error === "profile_required") {
          navigate("/app/forum/profil");
          return;
        }
        toast.error(res.error);
        return;
      }
      setLocalReplies((prev) => [
        ...prev,
        {
          id: res.id,
          body: body.trim(),
          is_ai: false,
          vote_score: 0,
          created_at: new Date().toISOString(),
          parent_reply_id: null,
          author_id: user.id,
          author: profile
            ? {
                user_id: profile.user_id,
                pseudo: profile.pseudo,
                avatar_url: profile.avatar_url,
                level: profile.level,
                persona: profile.persona,
                points: profile.points,
              }
            : null,
        },
      ]);
      persistDraft("");
      toast.success("Réponse publiée");
    } catch {
      toast.error("Publication impossible pour le moment.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderReply = (reply: ForumReplyNode, depth = 0) => (
    <div key={reply.id} className={depth > 0 ? "ml-6 border-l border-border pl-4" : ""}>
      <article className="rounded-xl border border-border bg-card p-4" id={`reponse-${reply.id}`}>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <ForumAvatar
            pseudo={reply.author?.pseudo ?? (reply.is_ai ? "Assistant IKtracker" : "Membre")}
            avatarUrl={reply.author?.avatar_url}
            size={24}
          />
          {reply.is_ai ? (
            <span className="font-medium text-foreground">Assistant IKtracker</span>
          ) : (
            <ForumAuthorLink
              userId={reply.author?.user_id ?? reply.author_id}
              pseudo={reply.author?.pseudo ?? "Membre"}
              className="font-medium text-foreground"
            />
          )}

          {reply.is_ai ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
              <Bot className="h-3 w-3" aria-hidden="true" /> Réponse assistée
            </span>
          ) : (
            reply.author && <ForumLevelBadge level={reply.author.level} />
          )}
          <time dateTime={reply.created_at}>{formatDate(reply.created_at)}</time>
        </div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{reply.body}</div>
        <div className="mt-2">
          <ForumVote
            targetType="reply"
            targetId={reply.id}
            score={reply.vote_score}
            canVote={Boolean(user)}
            orientation="horizontal"
          />
        </div>
      </article>
      {(threaded.children.get(reply.id) ?? []).map((child) => renderReply(child, depth + 1))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav user={user ? { email: user.email ?? "" } : null} loading={loading} />

      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 pb-16 pt-24 md:pt-28">
        <nav aria-label="Fil d'ariane" className="mb-4 text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link to="/" className="hover:text-foreground">
                Accueil
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/forum" className="hover:text-foreground">
                Forum
              </Link>
            </li>
            {category && (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    to={`/forum/categorie/${category.slug}`}
                    className="hover:text-foreground"
                  >
                    {category.label}
                  </Link>
                </li>
              </>
            )}
          </ol>
        </nav>

        <article className="rounded-xl border border-border bg-card p-5">
          <div className="flex gap-4">
            <div className="hidden sm:block">
              <ForumVote
                targetType="discussion"
                targetId={discussion.id}
                score={discussion.vote_score}
                canVote={Boolean(user)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold leading-tight md:text-3xl">{discussion.title}</h1>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <ForumAvatar
                  pseudo={discussion.author?.pseudo}
                  avatarUrl={discussion.author?.avatar_url}
                  size={24}
                />
                <span className="font-medium text-foreground">
                  {discussion.author?.pseudo ?? "Membre"}
                </span>
                {discussion.author && <ForumLevelBadge level={discussion.author.level} />}
                {personaLabel(discussion.author?.persona) && (
                  <span>· {personaLabel(discussion.author?.persona)}</span>
                )}
                <time dateTime={discussion.created_at}>
                  · Publié le {formatDate(discussion.created_at)}
                </time>
              </div>

              <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">
                {discussion.body}
              </div>

              <div className="mt-4">
                <ForumActions
                  discussionId={discussion.id}
                  slug={discussion.slug}
                  title={discussion.title}
                  canInteract={Boolean(user)}
                />
              </div>
            </div>
          </div>
        </article>

        <section className="mt-8" aria-labelledby="reponses-title">
          <h2 id="reponses-title" className="mb-4 text-lg font-semibold">
            {localReplies.length} réponse{localReplies.length > 1 ? "s" : ""}
          </h2>
          <div className="space-y-3">{threaded.roots.map((r) => renderReply(r))}</div>
        </section>

        <section className="mt-8" aria-labelledby="repondre-title">
          <h2 id="repondre-title" className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <CornerDownRight className="h-4 w-4 text-primary" aria-hidden="true" />
            Répondre
          </h2>
          {discussion.is_locked ? (
            <p className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" aria-hidden="true" /> Cette discussion est verrouillée.
            </p>
          ) : (
            <div className="rounded-xl border border-border bg-card p-4">
              <Textarea
                aria-label="Votre réponse"
                rows={5}
                value={body}
                maxLength={10000}
                onChange={(e) => persistDraft(e.target.value)}
                placeholder="Partagez votre expérience, vos chiffres, vos sources."
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {user
                    ? "Votre réponse sera publiée immédiatement."
                    : "Vous pouvez rédiger sans compte : votre brouillon est conservé jusqu'à la connexion."}
                </p>
                <Button variant="gradient" onClick={submit} disabled={submitting}>
                  {submitting ? "Publication…" : "Publier ma réponse"}
                </Button>
              </div>
            </div>
          )}
        </section>
      </main>

      <EnhancedMarketingFooter />

      <LevelUpDialog
        level={event?.level ?? null}
        previousLevel={event?.previous_level ?? null}
        onClose={dismiss}
      />
    </div>
  );
}
