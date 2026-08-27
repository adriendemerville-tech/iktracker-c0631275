import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createDiscussion } from "@/lib/forum.functions";
import { buildDiscussionSlug } from "@/lib/forum/constants";
import type { ForumCategory } from "@/lib/forum/queries";

const DRAFT_KEY = "iktracker_forum_draft_discussion";

export type DiscussionDraft = {
  title: string;
  body: string;
  category_slug: string;
};

export function loadDiscussionDraft(): DiscussionDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as DiscussionDraft) : null;
  } catch {
    return null;
  }
}

export function clearDiscussionDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

interface ForumComposerProps {
  categories: ForumCategory[];
  /** null = visiteur non connecté, "missing" = connecté sans fiche d'identité */
  state: "anonymous" | "profile-missing" | "ready";
  defaultCategory?: string;
  onPublished?: () => void;
}

export function ForumComposer({
  categories,
  state,
  defaultCategory,
  onPublished,
}: ForumComposerProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(defaultCategory ?? categories[0]?.slug ?? "");
  const [submitting, setSubmitting] = useState(false);

  // Restauration du brouillon (rédaction possible sans compte).
  useEffect(() => {
    const draft = loadDiscussionDraft();
    if (draft) {
      setTitle(draft.title);
      setBody(draft.body);
      if (draft.category_slug) setCategory(draft.category_slug);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!title && !body) return;
    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ title, body, category_slug: category }),
      );
    } catch {
      /* quota */
    }
  }, [title, body, category]);

  const slugPreview = title.trim().length >= 10 ? buildDiscussionSlug(title) : "mots-cles";

  const publish = async () => {
    if (title.trim().length < 10) {
      toast.error("Le titre doit faire au moins 10 caractères.");
      return;
    }
    if (body.trim().length < 20) {
      toast.error("Le message doit faire au moins 20 caractères.");
      return;
    }
    if (state === "anonymous") {
      toast.info("Créez votre compte pour publier — votre brouillon est conservé.");
      navigate("/auth?redirect=/forum");
      return;
    }
    if (state === "profile-missing") {
      navigate("/app/forum/profil");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createDiscussion({
        data: { title: title.trim(), body: body.trim(), category_slug: category },
      });
      if (!res.ok) {
        if (res.error === "profile_required") {
          navigate("/app/forum/profil");
          return;
        }
        toast.error(res.error);
        return;
      }
      clearDiscussionDraft();
      setTitle("");
      setBody("");
      toast.success("Discussion publiée");
      onPublished?.();
      navigate(`/forum/${res.slug}`);
    } catch {
      toast.error("Publication impossible pour le moment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-base font-semibold">Lancer une discussion</h2>

      <div className="space-y-3">
        <div>
          <label htmlFor="forum-title" className="mb-1 block text-xs font-medium">
            Titre
          </label>
          <Input
            id="forum-title"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Comment justifier mes trajets en cas de contrôle URSSAF ?"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Adresse de la discussion : <code>/forum/{slugPreview}</code>
          </p>
        </div>

        <div>
          <label htmlFor="forum-category" className="mb-1 block text-xs font-medium">
            Catégorie
          </label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="forum-category">
              <SelectValue placeholder="Choisir une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="forum-body" className="mb-1 block text-xs font-medium">
            Votre message
          </label>
          <Textarea
            id="forum-body"
            value={body}
            rows={6}
            maxLength={20000}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Décrivez votre situation, vos chiffres, ce que vous avez déjà tenté."
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {state === "anonymous"
              ? "Vous pouvez rédiger sans compte : votre brouillon est conservé jusqu'à la connexion."
              : state === "profile-missing"
                ? "Une fiche d'identité forum est nécessaire pour publier."
                : "Publication immédiate, modération automatique."}
          </p>
          <Button variant="gradient" onClick={publish} disabled={submitting}>
            {submitting ? "Publication…" : "Publier"}
          </Button>
        </div>
      </div>
    </div>
  );
}
