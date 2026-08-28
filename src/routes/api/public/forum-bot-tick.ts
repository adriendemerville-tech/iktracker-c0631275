import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import {
  applyTypos,
  isBotAwake,
  isDuplicateTitle,
  isoWeekKey,
  LIFECYCLE_MULTIPLIER,
  pickStance,
  shouldStayUnanswered,
  STANCE_PROMPT,
  styleBlock,
  targetWeight,
  violatesAdviceGuard,
  violatesSeoGuard,
  violatesToneGuard,
  titleSimilarity,
  weeklyDiscussionSlots,
  weightedPick,
  type BotProfileContext,
  type ReplyTarget,
} from "@/lib/forum/bot-personality";
import { cleanModelText, generateForumText } from "@/lib/forum/bot-generation.server";
import { buildDiscussionSlug, buildMetaDescription } from "@/lib/forum/constants";

// Client service-role typé librement : ces tables d'animation ne sont pas
// exposées au client, on évite la propagation des types générés ici.
type Admin = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
  auth: { getUser: (jwt: string) => Promise<any> };
};

interface RunLog {
  kind: string;
  status: string;
  reason?: string;
  bot?: string;
  target_id?: string;
  target_type?: string;
  model?: string;
  output?: string;
}

async function logRun(admin: Admin, entry: RunLog) {
  await admin.from("forum_bot_runs").insert({
    kind: entry.kind,
    status: entry.status,
    reason: entry.reason ?? null,
    bot_user_id: entry.bot ?? null,
    target_id: entry.target_id ?? null,
    target_type: entry.target_type ?? null,
    model: entry.model ?? null,
    output: entry.output?.slice(0, 2000) ?? null,
  });
}

async function loadBots(admin: Admin): Promise<BotProfileContext[]> {
  const { data: bots } = await admin
    .from("forum_bot_profiles")
    .select("*")
    .eq("is_active", true);
  if (!bots?.length) return [];
  const ids = bots.map((b: any) => b.user_id as string);
  const { data: profiles } = await admin
    .from("forum_profiles")
    .select("user_id, pseudo, persona, bio, vehicle")
    .in("user_id", ids);
  const byId = new Map<string, any>((profiles ?? []).map((p: any) => [p.user_id as string, p]));
  return bots
    .map((b: any) => {
      const p = byId.get(b.user_id as string);
      if (!p) return null;
      return {
        ...b,
        pseudo: p.pseudo as string,
        persona: (p.persona ?? null) as string | null,
        bio: (p.bio ?? null) as string | null,
        vehicle: (p.vehicle ?? null) as string | null,
      } as BotProfileContext;
    })
    .filter(Boolean) as BotProfileContext[];
}

/* -------------------------------------------------------------------------- */
/* Discussion                                                                  */
/* -------------------------------------------------------------------------- */

async function createBotDiscussion(admin: Admin, bots: BotProfileContext[], now: Date) {
  const { data: cats } = await admin
    .from("forum_categories")
    .select("slug, label, description")
    .order("sort_order");
  const categories = cats ?? [];
  if (!categories.length) return { status: "skipped", reason: "aucune catégorie" };

  const { data: recent } = await admin
    .from("forum_discussions")
    .select("title, category_slug")
    .order("created_at", { ascending: false })
    .limit(60);
  const existingTitles = (recent ?? []).map((d: any) => d.title as string);

  const candidates = bots.filter((b) => LIFECYCLE_MULTIPLIER[b.lifecycle] > 0);
  const bot = weightedPick(
    candidates,
    (b) =>
      LIFECYCLE_MULTIPLIER[b.lifecycle] *
      b.activity_weight *
      (isBotAwake(b, now) ? 2 : 0.6) *
      (b.last_discussion_at
        ? Math.min(
            3,
            (now.getTime() - new Date(b.last_discussion_at).getTime()) / (14 * 86_400_000),
          )
        : 3),
    Math.random(),
  );
  if (!bot) return { status: "skipped", reason: "aucun membre disponible" };

  // La rubrique Véhicules est surreprésentée (2 chances sur N+1) car sujet fédérateur.
  const vehicules = categories.find((c: any) => c.slug === "vehicules");
  const pool = vehicules ? [...categories, vehicules] : categories;
  const category = pool[Math.floor(Math.random() * pool.length)] as any;
  const topicHint =
    category.slug === "vehicules"
      ? `Sujet voiture uniquement, tiré de ton quotidien : quel véhicule choisir pour ton activité, hésitation thermique/hybride/électrique, un problème mécanique ou électronique sur un modèle précis (cite la marque et le modèle), entretien, assurance, revente ou achat d'occasion, autonomie, bornes de recharge, coût d'usage. Tu peux parler de TA voiture (${bot.vehicle ?? "ton véhicule actuel"}) ou de celle que tu envisages.`
      : `Sujet libre, tiré de ton quotidien professionnel : organisation, tournées, clients, outils, véhicule, paperasse, équilibre de vie, galères de terrain.`;
  const system = `${styleBlock(bot)}

Tu ouvres une nouvelle discussion sur le forum, dans la rubrique "${category.label}".
${topicHint}
Réponds UNIQUEMENT au format:
TITRE: <titre de 40 à 110 caractères, sans point final, formulé comme un vrai membre>
CORPS: <ton message>`;

  const user = `Titres déjà présents sur le forum (ne les répète pas, choisis un angle nettement différent) :
${existingTitles.slice(0, 30).map((t: string) => `- ${t}`).join("\n") || "- (aucun)"}`;

  const generated = await generateForumText(system, user, { size: "large", temperature: 1 });
  if (!generated) return { status: "error", reason: "modèle indisponible", bot: bot.user_id };

  const text = cleanModelText(generated.text);
  const titleMatch = text.match(/TITRE\s*:\s*(.+)/i);
  const bodyMatch = text.match(/CORPS\s*:\s*([\s\S]+)/i);
  if (!titleMatch || !bodyMatch) {
    return {
      status: "rejected",
      reason: "format inattendu",
      bot: bot.user_id,
      model: generated.model,
      output: text,
    };
  }
  const title = cleanModelText(titleMatch[1]!).slice(0, 120);
  let body = cleanModelText(bodyMatch[1]!);

  const guard =
    violatesSeoGuard(`${title}\n${body}`) ?? violatesAdviceGuard(body) ?? violatesToneGuard(body);
  if (guard) {
    return { status: "rejected", reason: guard, bot: bot.user_id, model: generated.model, output: title };
  }
  if (isDuplicateTitle(title, existingTitles)) {
    return { status: "rejected", reason: "sujet trop proche d'un fil existant", bot: bot.user_id, output: title };
  }
  if (title.length < 20 || body.length < 120) {
    return { status: "rejected", reason: "contenu trop court", bot: bot.user_id, output: title };
  }

  body = applyTypos(body, bot.typo_rate);

  const base = buildDiscussionSlug(title);
  const { data: taken } = await admin
    .from("forum_discussions")
    .select("id")
    .eq("slug", base)
    .maybeSingle();
  const slug = taken ? `${base}-${Math.floor(100000 + Math.random() * 900000)}` : base;

  // Horodatage naturel : jamais l'heure ronde du cron.
  const createdAt = new Date(now.getTime() - Math.floor(Math.random() * 50) * 60_000).toISOString();

  const { data: row, error } = await admin
    .from("forum_discussions")
    .insert({
      author_id: bot.user_id,
      title,
      slug,
      body,
      category_slug: category.slug,
      meta_description: buildMetaDescription(body),
      status: "published",
      seo_indexable: true,
      is_bot: true,
      created_at: createdAt,
      updated_at: createdAt,
      last_activity_at: createdAt,
    })
    .select("id, slug")
    .single();

  if (error || !row) {
    return { status: "error", reason: error?.message ?? "insertion refusée", bot: bot.user_id };
  }

  await admin
    .from("forum_bot_profiles")
    .update({ last_discussion_at: createdAt })
    .eq("user_id", bot.user_id);

  return {
    status: "ok",
    bot: bot.user_id,
    target_id: (row as any).id as string,
    target_type: "discussion",
    model: generated.model,
    output: title,
  };
}

/* -------------------------------------------------------------------------- */
/* Réponse                                                                     */
/* -------------------------------------------------------------------------- */

async function createBotReply(admin: Admin, bots: BotProfileContext[], now: Date) {
  const since = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const { data: discussions } = await admin
    .from("forum_discussions")
    .select("id, title, body, author_id, is_bot, created_at, last_activity_at, reply_count, status, is_locked")
    .eq("status", "published")
    .gte("last_activity_at", since)
    .order("last_activity_at", { ascending: false })
    .limit(40);

  const open = (discussions ?? []).filter((d: any) => !d.is_locked);
  if (!open.length) return { status: "skipped", reason: "aucune discussion active" };

  const authorIds = [...new Set(open.map((d: any) => d.author_id as string))];
  const { data: authors } = await admin
    .from("forum_profiles")
    .select("user_id, pseudo, persona")
    .in("user_id", authorIds);
  const authorById = new Map<string, any>((authors ?? []).map((a: any) => [a.user_id as string, a]));

  const targets: ReplyTarget[] = open
    .filter((d: any) => !(d.is_bot && shouldStayUnanswered(d.id as string)))
    .map((d: any) => ({
      discussion_id: d.id as string,
      title: d.title as string,
      persona: (authorById.get(d.author_id as string)?.persona ?? null) as string | null,
      is_bot: d.is_bot === true,
      created_at: d.created_at as string,
      last_activity_at: d.last_activity_at as string,
      reply_count: (d.reply_count ?? 0) as number,
    }));
  if (!targets.length) return { status: "skipped", reason: "aucune cible éligible" };

  const botIds = new Set(bots.map((b) => b.user_id));
  const awake = bots.filter((b) => isBotAwake(b, now));
  const pool = awake.length ? awake : bots;
  const bot = weightedPick(
    pool,
    (b) => LIFECYCLE_MULTIPLIER[b.lifecycle] * b.activity_weight,
    Math.random(),
  );
  if (!bot) return { status: "skipped", reason: "aucun membre éveillé" };

  const target = weightedPick(targets, (t) => targetWeight(bot, t, now), Math.random());
  if (!target) return { status: "skipped", reason: "aucune cible pondérée" };

  const discussion = open.find((d: any) => d.id === target.discussion_id) as any;
  if (discussion.author_id === bot.user_id) {
    return { status: "skipped", reason: "le membre est l'auteur du fil" };
  }

  const { data: replies } = await admin
    .from("forum_replies")
    .select("id, author_id, body, created_at, is_bot")
    .eq("discussion_id", target.discussion_id)
    .eq("status", "published")
    .order("created_at", { ascending: true })
    .limit(12);

  const list = (replies ?? []) as any[];
  const last = list[list.length - 1];

  // Jamais deux messages d'affilée du même membre, ni deux bots à la suite
  // sans qu'un humain ne soit intervenu entre-temps.
  if (last && last.author_id === bot.user_id) {
    return { status: "skipped", reason: "le membre vient déjà de répondre" };
  }
  if (last && (last.is_bot === true || botIds.has(last.author_id as string)) && Math.random() < 0.85) {
    return { status: "skipped", reason: "dernier message déjà écrit par un membre animé" };
  }
  if (list.some((r) => r.author_id === bot.user_id) && Math.random() < 0.9) {
    return { status: "skipped", reason: "le membre a déjà répondu" };
  }

  const stance = pickStance(Math.random());
  const thread = (replies ?? [])
    .map((r: any) => `- ${(authorById.get(r.author_id)?.pseudo as string) ?? "un membre"} : ${String(r.body).slice(0, 300)}`)
    .join("\n");

  const system = `${styleBlock(bot)}

Tu réponds dans une discussion du forum. ${STANCE_PROMPT[stance]}
Tu peux t'adresser directement à un autre membre par son pseudo si c'est naturel.
Réponds uniquement par le texte de ta réponse, sans titre ni préambule.`;

  const user = `Sujet : ${discussion.title}
Message initial : ${String(discussion.body).slice(0, 1200)}
${thread ? `\nRéponses déjà publiées :\n${thread}` : ""}`;

  const generated = await generateForumText(system, user, { size: "small", temperature: 1 });
  if (!generated) return { status: "error", reason: "modèle indisponible", bot: bot.user_id };

  let body = cleanModelText(generated.text);
  const guard = violatesSeoGuard(body) ?? violatesAdviceGuard(body) ?? violatesToneGuard(body);
  if (guard) {
    return {
      status: "rejected",
      reason: guard,
      bot: bot.user_id,
      target_id: target.discussion_id,
      target_type: "discussion",
      model: generated.model,
    };
  }
  if (body.length < 15) return { status: "rejected", reason: "réponse trop courte", bot: bot.user_id };

  // Anti-redite : on refuse une réponse qui recopie le fond d'un message déjà publié.
  const redundant = list.some((r) => titleSimilarity(body, String(r.body)) >= 0.45);
  if (redundant) {
    return {
      status: "rejected",
      reason: "réponse redondante avec le fil",
      bot: bot.user_id,
      target_id: target.discussion_id,
      model: generated.model,
    };
  }

  body = applyTypos(body, bot.typo_rate);

  const parent =
    replies?.length && Math.random() < 0.35
      ? (replies[Math.floor(Math.random() * replies.length)] as any)
      : null;

  const createdAt = new Date(now.getTime() - Math.floor(Math.random() * 55) * 60_000).toISOString();

  const { data: row, error } = await admin
    .from("forum_replies")
    .insert({
      discussion_id: target.discussion_id,
      author_id: bot.user_id,
      parent_reply_id: parent && parent.author_id !== bot.user_id ? parent.id : null,
      body,
      status: "published",
      is_bot: true,
      created_at: createdAt,
      updated_at: createdAt,
    })
    .select("id")
    .single();

  if (error || !row) {
    return { status: "error", reason: error?.message ?? "insertion refusée", bot: bot.user_id };
  }

  await admin
    .from("forum_bot_profiles")
    .update({ last_reply_at: createdAt })
    .eq("user_id", bot.user_id);

  return {
    status: "ok",
    bot: bot.user_id,
    target_id: target.discussion_id,
    target_type: "discussion",
    model: generated.model,
    output: body.slice(0, 200),
  };
}

/* -------------------------------------------------------------------------- */
/* Route                                                                       */
/* -------------------------------------------------------------------------- */

export const Route = createFileRoute("/api/public/forum-bot-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const admin = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
          { auth: { persistSession: false } },
        );

        const cronSecret = process.env["CRON_SECRET"];
        const token = request.headers.get("x-cron-secret") ?? request.headers.get("x-cron-token");
        const isCron = !!cronSecret && token === cronSecret;

        if (!isCron) {
          const jwt = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
          if (!jwt) return new Response("Unauthorized", { status: 401 });
          const { data: userData } = await admin.auth.getUser(jwt);
          if (!userData?.user) return new Response("Unauthorized", { status: 401 });
          const { data: isAdmin } = await admin.rpc("has_role", {
            _user_id: userData.user.id,
            _role: "admin",
          });
          if (!isAdmin) return new Response("Forbidden", { status: 403 });
        }

        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const force = body.force === "discussion" || body.force === "reply" ? body.force : null;

        const now = new Date();
        const bots = await loadBots(admin);
        if (!bots.length) return Response.json({ ok: false, error: "aucun membre animé actif" });

        const results: Array<Record<string, unknown>> = [];

        // --- Publication des discussions programmées arrivées à échéance ---
        const { data: publishedDue } = await admin.rpc("forum_publish_due_discussions");
        if (publishedDue) results.push({ kind: "scheduled_publish", count: publishedDue });


        // --- Discussions : 2 par semaine, sur créneaux tirés au sort ---
        const weekKey = isoWeekKey(now);
        const slots = weeklyDiscussionSlots(weekKey);
        const weekStart = new Date(now);
        const dow = weekStart.getUTCDay() || 7;
        weekStart.setUTCDate(weekStart.getUTCDate() - (dow - 1));
        weekStart.setUTCHours(0, 0, 0, 0);

        const { count: doneThisWeek } = await admin
          .from("forum_bot_runs")
          .select("id", { count: "exact", head: true })
          .eq("kind", "discussion")
          .eq("status", "ok")
          .gte("created_at", weekStart.toISOString());

        const passed = slots.filter(
          (s) => dow > s.day || (dow === s.day && now.getUTCHours() >= s.hour),
        ).length;

        if (force === "discussion" || (!force && passed > (doneThisWeek ?? 0))) {
          const res = await createBotDiscussion(admin, bots, now);
          await logRun(admin, { kind: "discussion", ...res } as RunLog);
          results.push({ kind: "discussion", ...res });
        }

        // --- Réponses : rythme irrégulier, 0 à 2 par passage ---
        const replyRolls = force === "reply" ? 1 : Math.random() < 0.45 ? (Math.random() < 0.25 ? 2 : 1) : 0;
        for (let i = 0; i < replyRolls; i++) {
          const res = await createBotReply(admin, bots, now);
          await logRun(admin, { kind: "reply", ...res } as RunLog);
          results.push({ kind: "reply", ...res });
        }

        return Response.json({
          ok: true,
          week: weekKey,
          slots,
          discussionsThisWeek: doneThisWeek ?? 0,
          results,
        });
      },
    },
  },
});
