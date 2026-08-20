// Content freshness audit — file de travail éditoriale (aucun article n'est modifié).
//
// Appelé chaque lundi 06:00 UTC par pg_cron (x-cron-secret), ou manuellement
// depuis l'admin avec un bearer admin.
//
// Signaux détectés par article publié + indexable :
//   stale_12m / stale_6m  → contenu non révisé depuis 12 / 6 mois
//   outdated_year         → cite une année fiscale périmée sans citer l'année courante
//   missing_meta          → meta description absente ou trop courte
//   thin_content          → moins de 1200 caractères de texte
//   no_internal_link      → aucun maillage interne
//   broken_link           → lien sortant en 404/410 (8 vérifications max par article)

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SIX_MONTHS = 1000 * 60 * 60 * 24 * 182;
const TWELVE_MONTHS = 1000 * 60 * 60 * 24 * 365;
const MAX_LINK_CHECKS = 8;

type Reason = { code: string; label: string; weight: number; detail?: string };

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLinks(content: string): string[] {
  const urls = new Set<string>();
  for (const m of content.matchAll(/href=["']([^"']+)["']/gi)) urls.add(m[1]!);
  for (const m of content.matchAll(/\]\((https?:\/\/[^)\s]+)\)/gi)) urls.add(m[1]!);
  return [...urls];
}

async function linkStatus(url: string): Promise<number | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    let res = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctrl.signal });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal });
    }
    clearTimeout(timer);
    return res.status;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/content-freshness-audit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env["SUPABASE_URL"]!;
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
        const cronSecret = process.env["CRON_SECRET"];

        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

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

        const checkLinks = body.checkLinks !== false;

        const { data: posts, error } = await admin
          .from("blog_posts")
          .select("id, slug, title, content, meta_description, published_at, updated_at")
          .eq("status", "published")
          .eq("seo_indexable", true)
          .is("deleted_at", null);

        if (error) return Response.json({ error: error.message }, { status: 500 });

        const now = Date.now();
        const currentYear = new Date().getFullYear();
        const staleYears = [currentYear - 1, currentYear - 2, currentYear - 3];
        const rows: Record<string, unknown>[] = [];

        for (const post of posts ?? []) {
          const reasons: Reason[] = [];
          const content = post.content ?? "";
          const text = stripHtml(content);
          const updatedAt = new Date(post.updated_at ?? post.published_at ?? now).getTime();
          const age = now - updatedAt;

          if (age > TWELVE_MONTHS) {
            reasons.push({ code: "stale_12m", label: "Non révisé depuis +12 mois", weight: 40 });
          } else if (age > SIX_MONTHS) {
            reasons.push({ code: "stale_6m", label: "Non révisé depuis +6 mois", weight: 20 });
          }

          const mentioned = staleYears.filter((y) => new RegExp(`\\b${y}\\b`).test(text));
          const mentionsCurrent = new RegExp(`\\b${currentYear}\\b`).test(text);
          if (mentioned.length > 0 && !mentionsCurrent) {
            reasons.push({
              code: "outdated_year",
              label: `Cite ${mentioned.join(", ")} sans mentionner ${currentYear}`,
              weight: 35,
              detail: mentioned.join(", "),
            });
          }

          if (!post.meta_description || post.meta_description.trim().length < 70) {
            reasons.push({
              code: "missing_meta",
              label: "Meta description absente ou trop courte",
              weight: 15,
            });
          }

          if (text.length < 1200) {
            reasons.push({
              code: "thin_content",
              label: `Contenu court (${text.length} caractères)`,
              weight: 20,
              detail: String(text.length),
            });
          }

          const links = extractLinks(content);
          const internal = links.filter(
            (l) =>
              l.startsWith("/") ||
              l.includes("iktracker.fr") ||
              l.includes("iktracker.lovable.app"),
          );
          if (internal.length === 0) {
            reasons.push({ code: "no_internal_link", label: "Aucun lien interne", weight: 15 });
          }

          if (checkLinks) {
            const external = links.filter((l) => /^https?:\/\//i.test(l)).slice(0, MAX_LINK_CHECKS);
            const statuses = await Promise.all(external.map((l) => linkStatus(l)));
            const broken = external.filter((_, i) => statuses[i] === 404 || statuses[i] === 410);
            if (broken.length > 0) {
              reasons.push({
                code: "broken_link",
                label: `${broken.length} lien(s) mort(s)`,
                weight: 30,
                detail: broken.join(" | "),
              });
            }
          }

          if (reasons.length === 0) continue;

          rows.push({
            post_id: post.id,
            slug: post.slug,
            title: post.title,
            reasons,
            score: Math.min(
              100,
              reasons.reduce((s, r) => s + r.weight, 0),
            ),
            status: "pending",
            last_content_update: post.updated_at,
            detected_at: new Date().toISOString(),
            resolved_at: null,
          });
        }

        // Articles redevenus sains : on clôture leurs signalements ouverts.
        const flagged = rows.map((r) => r.post_id as string);
        const closeQuery = admin
          .from("content_freshness_findings")
          .update({ status: "resolved", resolved_at: new Date().toISOString() })
          .eq("status", "pending");
        if (flagged.length > 0) {
          await closeQuery.not("post_id", "in", `(${flagged.join(",")})`);
        } else {
          await closeQuery;
        }

        if (rows.length > 0) {
          const { error: upsertError } = await admin
            .from("content_freshness_findings")
            .upsert(rows, { onConflict: "post_id" });
          if (upsertError) return Response.json({ error: upsertError.message }, { status: 500 });
        }

        return Response.json({
          ok: true,
          scanned: posts?.length ?? 0,
          flagged: rows.length,
          checked_links: checkLinks,
        });
      },
    },
  },
});
