import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildDiscussionSlug, buildMetaDescription, slugifyWord } from "@/lib/forum/constants";

const PseudoSchema = z
  .string()
  .trim()
  .min(3, "Le pseudo doit faire au moins 3 caractères")
  .max(30, "Le pseudo doit faire au plus 30 caractères")
  .regex(/^[\p{L}\p{N} _.-]+$/u, "Caractères non autorisés dans le pseudo");

const ProfileSchema = z.object({
  pseudo: PseudoSchema,
  bio: z.string().trim().max(400).optional().nullable(),
  persona: z.string().trim().max(60).optional().nullable(),
  avatar_url: z.string().trim().max(500).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
});


const DiscussionSchema = z.object({
  title: z.string().trim().min(10).max(120),
  body: z.string().trim().min(20).max(20000),
  category_slug: z.string().trim().min(2).max(60),
  attachment_paths: z
    .array(
      z.object({
        storage_path: z.string().min(1),
        file_name: z.string().min(1).max(200),
        mime_type: z.string().min(1).max(100),
        size_bytes: z.number().int().positive().max(5242880),
        kind: z.enum(["image", "pdf"]),
      }),
    )
    .max(4)
    .optional(),
});

const ReplySchema = z.object({
  discussion_id: z.string().uuid(),
  body: z.string().trim().min(2).max(10000),
  parent_reply_id: z.string().uuid().optional().nullable(),
});

const VoteSchema = z.object({
  target_type: z.enum(["discussion", "reply"]),
  target_id: z.string().uuid(),
  value: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
});

/** Crée automatiquement une fiche contributeur complète si elle n'existe pas encore. */
export const ensureForumProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;

    const { data: existing } = await supabase
      .from("forum_profiles")
      .select(
        "user_id, pseudo, avatar_url, bio, persona, city, level, points, discussions_count, replies_count, upvotes_received, member_since, pseudo_enabled",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return { ok: true as const, profile: existing, created: false };

    const meta = (claims as { user_metadata?: Record<string, unknown>; email?: string } | null) ?? {};
    const metaData = (meta.user_metadata ?? {}) as Record<string, unknown>;
    const rawName =
      (typeof metaData.full_name === "string" && metaData.full_name) ||
      (typeof metaData.name === "string" && metaData.name) ||
      (typeof meta.email === "string" ? meta.email.split("@")[0] : "") ||
      "Membre";

    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("persona")
      .eq("user_id", userId)
      .maybeSingle();
    const persona = prefs?.persona ?? null;
    const job = personaLabel(persona) ?? "Indépendant";

    const cleanBase =
      rawName.replace(/[^\p{L}\p{N} _.-]/gu, "").trim().slice(0, 24) || "Membre";
    const avatarSeed = encodeURIComponent(userId.slice(0, 12));
    const payload = {
      user_id: userId,
      pseudo: cleanBase.length >= 3 ? cleanBase : `Membre ${cleanBase}`,
      pseudo_enabled: true,
      persona,
      bio: `${job} sur IKtracker. Je suis les sujets déplacements, véhicules et gestion du quotidien.`,
      avatar_url: `https://api.dicebear.com/7.x/thumbs/svg?seed=${avatarSeed}`,
    };

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const pseudo =
        attempt === 0 ? payload.pseudo : `${payload.pseudo}${Math.floor(100 + Math.random() * 900)}`;
      const { data: row, error } = await supabase
        .from("forum_profiles")
        .insert({ ...payload, pseudo })
        .select(
          "user_id, pseudo, avatar_url, bio, persona, city, level, points, discussions_count, replies_count, upvotes_received, member_since, pseudo_enabled",
        )
        .single();
      if (!error && row) return { ok: true as const, profile: row, created: true };
      if (error && error.code !== "23505") {
        console.error("ensureForumProfile", error);
        return { ok: false as const, error: "Impossible de créer la fiche." };
      }
    }
    return { ok: false as const, error: "Impossible de créer la fiche." };
  });

/** Crée ou met à jour la fiche d'identité forum du membre connecté. */
export const upsertForumProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ProfileSchema.parse(data))
  .handler(async ({ data, context }) => {
    const payload = {
      user_id: context.userId,
      pseudo: data.pseudo,
      bio: data.bio ?? null,
      persona: data.persona ?? null,
      avatar_url: data.avatar_url ?? null,
      city: data.city ?? null,
    };


    const { data: row, error } = await context.supabase
      .from("forum_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false as const, error: "Ce pseudo est déjà utilisé." };
      }
      console.error("upsertForumProfile", error);
      return { ok: false as const, error: "Impossible d'enregistrer la fiche." };
    }
    return { ok: true as const, profile: row };
  });

const PseudoUpdateSchema = z.object({
  pseudo: PseudoSchema,
  pseudo_enabled: z.boolean(),
});

/** Met à jour le surnom du membre connecté (et son affichage public). */
export const updateForumPseudo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => PseudoUpdateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("forum_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("forum_profiles")
        .update({ pseudo: data.pseudo, pseudo_enabled: data.pseudo_enabled })
        .eq("user_id", userId);
      if (error) {
        if (error.code === "23505") {
          return { ok: false as const, error: "Ce pseudo est déjà utilisé." };
        }
        console.error("updateForumPseudo", error);
        return { ok: false as const, error: "Impossible d'enregistrer le surnom." };
      }
      return { ok: true as const };
    }

    const { error } = await supabase.from("forum_profiles").insert({
      user_id: userId,
      pseudo: data.pseudo,
      pseudo_enabled: data.pseudo_enabled,
    });
    if (error) {
      if (error.code === "23505") {
        return { ok: false as const, error: "Ce pseudo est déjà utilisé." };
      }
      console.error("updateForumPseudo insert", error);
      return { ok: false as const, error: "Impossible d'enregistrer le surnom." };
    }
    return { ok: true as const };
  });

/** Publie une nouvelle discussion (slug SEO + méta-description auto). */
export const createDiscussion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => DiscussionSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("forum_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) {
      return { ok: false as const, error: "profile_required" };
    }

    const base = buildDiscussionSlug(data.title);
    let slug = base;
    const { data: taken } = await supabase
      .from("forum_discussions")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (taken) {
      slug = `${base}-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    const { data: row, error } = await supabase
      .from("forum_discussions")
      .insert({
        author_id: userId,
        title: data.title,
        slug,
        body: data.body,
        category_slug: slugifyWord(data.category_slug),
        meta_description: buildMetaDescription(data.body),
        status: "published",
        seo_indexable: true,
        last_activity_at: new Date().toISOString(),
      })
      .select("id, slug")
      .single();

    if (error || !row) {
      console.error("createDiscussion", error);
      return { ok: false as const, error: "Impossible de publier la discussion." };
    }

    if (data.attachment_paths?.length) {
      await supabase.from("forum_attachments").insert(
        data.attachment_paths.map((a) => ({
          owner_id: userId,
          discussion_id: row.id,
          storage_path: a.storage_path,
          file_name: a.file_name,
          mime_type: a.mime_type,
          size_bytes: a.size_bytes,
          kind: a.kind,
          is_approved: true,
        })),
      );
      await supabase
        .from("forum_discussions")
        .update({ attachment_count: data.attachment_paths.length })
        .eq("id", row.id);
    }

    return { ok: true as const, id: row.id, slug: row.slug };
  });

/** Publie une réponse (ou une réponse imbriquée) dans une discussion. */
export const createReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => ReplySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: discussion } = await supabase
      .from("forum_discussions")
      .select("id, is_locked, status")
      .eq("id", data.discussion_id)
      .maybeSingle();

    if (!discussion || discussion.status !== "published") {
      return { ok: false as const, error: "Discussion introuvable." };
    }
    if (discussion.is_locked) {
      return { ok: false as const, error: "Cette discussion est verrouillée." };
    }

    const { data: profile } = await supabase
      .from("forum_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) return { ok: false as const, error: "profile_required" };

    const { data: row, error } = await supabase
      .from("forum_replies")
      .insert({
        discussion_id: data.discussion_id,
        author_id: userId,
        parent_reply_id: data.parent_reply_id ?? null,
        body: data.body,
        status: "published",
      })
      .select("id")
      .single();

    if (error || !row) {
      console.error("createReply", error);
      return { ok: false as const, error: "Impossible de publier la réponse." };
    }

    // Alertes e-mail aux destinataires (auteur du sujet + auteur de la réponse parente).
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: notifs } = await supabaseAdmin
        .from("forum_notifications")
        .select("user_id, title, slug, excerpt")
        .eq("reply_id", row.id);

      if (notifs?.length) {
        const { data: actor } = await supabaseAdmin
          .from("forum_profiles")
          .select("pseudo, pseudo_enabled")
          .eq("user_id", userId)
          .maybeSingle();
        const actorName =
          actor && actor.pseudo_enabled !== false ? actor.pseudo : "Un membre du forum";

        await Promise.all(
          notifs.map(async (n) => {
            const { data: u } = await supabaseAdmin.auth.admin.getUserById(n.user_id);
            const email = u?.user?.email;
            if (!email) return;
            await supabaseAdmin.functions.invoke("send-transactional-email", {
              body: {
                templateName: "forum-reply",
                recipientEmail: email,
                idempotencyKey: `forum-reply-${row.id}-${n.user_id}`,
                templateData: {
                  discussionTitle: n.title,
                  discussionUrl: `https://iktracker.fr/forum/${n.slug}#reponse-${row.id}`,
                  actorName,
                  excerpt: n.excerpt ?? "",
                },
              },
            });
          }),
        );
      }
    } catch (mailError) {
      console.error("createReply notification email", mailError);
    }

    return { ok: true as const, id: row.id };
  });

/** Vote pour ou contre une discussion / réponse (value 0 = retrait du vote). */
export const voteOnTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => VoteSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.value === 0) {
      await supabase
        .from("forum_votes")
        .delete()
        .eq("user_id", userId)
        .eq("target_type", data.target_type)
        .eq("target_id", data.target_id);
    } else {
      const { error } = await supabase.from("forum_votes").upsert(
        {
          user_id: userId,
          target_type: data.target_type,
          target_id: data.target_id,
          value: data.value,
        },
        { onConflict: "user_id,target_type,target_id" },
      );
      if (error) {
        console.error("voteOnTarget", error);
        return { ok: false as const, error: "Vote impossible." };
      }
    }

    const table = data.target_type === "discussion" ? "forum_discussions" : "forum_replies";
    const { data: row } = await supabase
      .from(table)
      .select("vote_score")
      .eq("id", data.target_id)
      .maybeSingle();

    return { ok: true as const, score: row?.vote_score ?? 0 };
  });

/** Ajoute / retire une discussion des favoris du membre. */
export const toggleSaveDiscussion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ discussion_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("forum_saved_posts")
      .select("discussion_id")
      .eq("user_id", userId)
      .eq("discussion_id", data.discussion_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("forum_saved_posts")
        .delete()
        .eq("user_id", userId)
        .eq("discussion_id", data.discussion_id);
      return { ok: true as const, saved: false };
    }

    await supabase
      .from("forum_saved_posts")
      .insert({ user_id: userId, discussion_id: data.discussion_id });
    return { ok: true as const, saved: true };
  });

/** Signale un contenu à la modération. */
export const reportForumContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        target_type: z.enum(["discussion", "reply"]),
        target_id: z.string().uuid(),
        reason: z.string().trim().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("forum_reports").insert({
      reporter_id: context.userId,
      target_type: data.target_type,
      target_id: data.target_id,
      reason: data.reason ?? null,
    });
    if (error) {
      console.error("reportForumContent", error);
      return { ok: false as const };
    }
    return { ok: true as const };
  });

/** Marque les événements de passage de niveau comme vus. */
export const markLevelEventsSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ ids: z.array(z.string().uuid()).max(20) }).parse(data))
  .handler(async ({ data, context }) => {
    if (!data.ids.length) return { ok: true as const };
    await context.supabase
      .from("forum_level_events")
      .update({ seen_at: new Date().toISOString() })
      .in("id", data.ids)
      .eq("user_id", context.userId);
    return { ok: true as const };
  });
