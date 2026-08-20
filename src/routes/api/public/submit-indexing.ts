import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SITE = "https://iktracker.fr";
const INDEXNOW_KEY = "2441b032331572cd67fa3ff3e40d9c17";
const GOOGLE_INDEXING_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish";

type Candidate = { url: string; updatedAt: string };

function pemToArrayBuffer(pem: string) {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const raw = atob(b64);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

function b64url(input: string | Uint8Array) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getGoogleAccessToken(): Promise<{ token?: string; error?: string }> {
  const raw =
    process.env["GOOGLE_INDEXING_SERVICE_ACCOUNT"] ?? process.env["GOOGLE_API_KEY"];
  if (!raw) return { error: "GOOGLE_API_KEY manquant" };

  let sa: { client_email?: string; private_key?: string };
  try {
    sa = JSON.parse(raw);
  } catch {
    return {
      error:
        "GOOGLE_API_KEY n'est pas un compte de service JSON. L'Indexing API n'accepte pas les clés API simples : coller le JSON complet du service account (client_email + private_key).",
    };
  }
  if (!sa.client_email || !sa.private_key) {
    return { error: "Service account incomplet (client_email / private_key requis)" };
  }

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/indexing",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(`${header}.${claim}`),
    ),
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${b64url(sig)}`,
    }),
  });
  const text = await res.text();
  if (!res.ok) return { error: `OAuth Google [${res.status}]: ${text.slice(0, 300)}` };
  return { token: JSON.parse(text).access_token as string };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pushIndexNowOnce(urls: string[]) {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: "iktracker.fr",
      key: INDEXNOW_KEY,
      keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body: body.slice(0, 300) };
}

/** Envoi par lots de 100 URLs, avec backoff exponentiel sur 429 / 5xx. */
async function pushIndexNowBatched(urls: string[]) {
  const CHUNK = 100;
  const batches: {
    urls: string[];
    ok: boolean;
    status: number;
    body: string;
    attempts: number;
  }[] = [];

  for (let i = 0; i < urls.length; i += CHUNK) {
    const chunk = urls.slice(i, i + CHUNK);
    let attempt = 0;
    let r = await pushIndexNowOnce(chunk);
    while (!r.ok && (r.status === 429 || r.status >= 500) && attempt < 3) {
      attempt++;
      await sleep(2000 * Math.pow(2, attempt - 1)); // 2s, 4s, 8s
      r = await pushIndexNowOnce(chunk);
    }
    batches.push({ urls: chunk, ...r, attempts: attempt + 1 });
    if (i + CHUNK < urls.length) await sleep(1500); // espacement entre lots
  }
  return batches;
}


async function pushGoogle(token: string, url: string) {
  const res = await fetch(GOOGLE_INDEXING_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, type: "URL_UPDATED" }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body: body.slice(0, 300) };
}

export const Route = createFileRoute("/api/public/submit-indexing")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env["SUPABASE_URL"]!;
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
        const cronSecret = process.env["CRON_SECRET"];

        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

        // --- Auth: cron token OR admin bearer ---
        const token = request.headers.get("x-cron-secret") ?? request.headers.get("x-cron-token");
        const isCron = !!cronSecret && token === cronSecret;

        const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

        if (!isCron) {
          const authHeader = request.headers.get("Authorization") ?? "";
          const jwt = authHeader.replace(/^Bearer\s+/i, "");
          if (!jwt) return new Response("Unauthorized", { status: 401 });
          const { data: userData } = await admin.auth.getUser(jwt);
          if (!userData?.user) return new Response("Unauthorized", { status: 401 });
          const { data: isAdmin } = await admin.rpc("has_role", {
            _user_id: userData.user.id,
            _role: "admin",
          });
          if (!isAdmin) return new Response("Forbidden", { status: 403 });
        }

        const dryRun = body.dryRun === true;
        const explicit = Array.isArray(body.urls) ? (body.urls as string[]) : undefined;
        const sinceHours = Math.min(Math.max(Number(body.sinceHours ?? 26), 1), 24 * 30);
        const since = new Date(Date.now() - sinceHours * 3600_000).toISOString();

        // --- Collect candidates ---
        let candidates: Candidate[];
        if (explicit?.length) {
          candidates = explicit.map((u) => ({
            url: u.startsWith("http") ? u : `${SITE}${u.startsWith("/") ? "" : "/"}${u}`,
            updatedAt: new Date().toISOString(),
          }));
        } else {
          const { data, error } = await admin
            .from("blog_posts")
            .select("slug, updated_at, published_at")
            .eq("status", "published")
            .eq("seo_indexable", true)
            .or(`updated_at.gte.${since},published_at.gte.${since}`)
            .order("updated_at", { ascending: false })
            .limit(200);
          if (error) return Response.json({ error: error.message }, { status: 500 });
          candidates = (data ?? []).map((p) => ({
            url: `${SITE}/blog/${p.slug}`,
            updatedAt: (p.updated_at ?? p.published_at ?? new Date().toISOString()) as string,
          }));
        }

        // --- Deduplicate against previous SUCCESSFUL submissions of the same content version ---
        // (les échecs restent rejouables : un 429 doit repasser au run suivant)
        const { data: already } = await admin
          .from("indexing_submissions")
          .select("url, provider, content_updated_at, status")
          .eq("status", "success")
          .gte("submitted_at", new Date(Date.now() - 30 * 24 * 3600_000).toISOString());
        const seen = new Set(
          (already ?? []).map((r) => `${r.provider}|${r.url}|${r.content_updated_at}`),
        );

        const forGoogle = candidates.filter((c) => !seen.has(`google|${c.url}|${c.updatedAt}`));
        const forIndexNow = candidates.filter((c) => !seen.has(`indexnow|${c.url}|${c.updatedAt}`));

        if (dryRun) {
          return Response.json({
            dryRun: true,
            since,
            candidates: candidates.length,
            google: forGoogle.map((c) => c.url),
            indexnow: forIndexNow.map((c) => c.url),
          });
        }

        const rows: Record<string, unknown>[] = [];
        const result: Record<string, unknown> = { since, candidates: candidates.length };

        // --- IndexNow (Bing, Yandex, Naver...) ---
        if (forIndexNow.length) {
          const byUrl = new Map(forIndexNow.map((c) => [c.url, c.updatedAt]));
          const batches = await pushIndexNowBatched([...byUrl.keys()]);

          let ok = 0;
          let failed = 0;
          let lastError: string | null = null;

          for (const b of batches) {
            if (b.ok) {
              ok += b.urls.length;
              // succès : une ligne par URL (sert à la déduplication)
              for (const u of b.urls) {
                rows.push({
                  url: u,
                  provider: "indexnow",
                  status: "success",
                  http_status: b.status,
                  response: null,
                  content_updated_at: byUrl.get(u),
                });
              }
            } else {
              failed += b.urls.length;
              lastError = `${b.status} ${b.body}`;
              // échec : une seule ligne agrégée par lot (évite de gonfler la table)
              rows.push({
                url: b.urls[0],
                provider: "indexnow",
                status: "error",
                http_status: b.status,
                response: `lot de ${b.urls.length} URLs, ${b.attempts} tentative(s) — ${b.body}`,
                content_updated_at: byUrl.get(b.urls[0]!),
              });
            }
          }

          result.indexnow = {
            submitted: ok,
            failed,
            batches: batches.length,
            lastError,
          };
        } else {
          result.indexnow = { submitted: 0, note: "rien de nouveau" };
        }


        // --- Google Indexing API ---
        const auth = await getGoogleAccessToken();
        if (!auth.token) {
          result.google = { submitted: 0, error: auth.error };
        } else if (forGoogle.length) {
          let ok = 0;
          let failed = 0;
          let lastError: string | null = null;
          for (const c of forGoogle.slice(0, 190)) {
            const r = await pushGoogle(auth.token, c.url);
            if (r.ok) ok++;
            else {
              failed++;
              lastError = `${r.status} ${r.body}`;
            }
            rows.push({
              url: c.url,
              provider: "google",
              status: r.ok ? "success" : "error",
              http_status: r.status,
              response: r.ok ? null : r.body,
              content_updated_at: c.updatedAt,
            });
          }
          result.google = { submitted: ok, failed, lastError };
        } else {
          result.google = { submitted: 0, note: "rien de nouveau" };
        }

        if (rows.length) await admin.from("indexing_submissions").insert(rows);

        return Response.json(result);
      },
    },
  },
});
