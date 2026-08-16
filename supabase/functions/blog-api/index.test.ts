import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const BASE_URL = `${SUPABASE_URL}/functions/v1/blog-api`;

async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    ...((options.headers as Record<string, string>) || {}),
  };
  const res = await fetch(url, { ...options, headers });
  const body = await res.json();
  return { status: res.status, body };
}

// ============================================================
// PUBLIC ENDPOINTS
// ============================================================

Deno.test("GET /docs returns API documentation", async () => {
  const { status, body } = await apiFetch("/docs");
  assertEquals(status, 200);
  assertExists(body.version);
  assertExists(body.endpoints);
});

Deno.test("GET /health returns ok", async () => {
  const { status, body } = await apiFetch("/health");
  assertEquals(status, 200);
  assertEquals(body.success, true);
  assertEquals(body.data.status, "ok");
  assertExists(body.data.counts);
});

Deno.test("GET /posts returns published posts array", async () => {
  const { status, body } = await apiFetch("/posts");
  assertEquals(status, 200);
  assertEquals(Array.isArray(body.posts), true);
});

Deno.test("GET /posts/nonexistent-slug returns 404", async () => {
  const { status } = await apiFetch("/posts/this-slug-does-not-exist-12345");
  assertEquals(status, 404);
});

Deno.test("GET /pages returns pages array", async () => {
  const { status, body } = await apiFetch("/pages");
  assertEquals(status, 200);
  assertEquals(Array.isArray(body.pages), true);
});

// ============================================================
// AUTH PROTECTION
// ============================================================

Deno.test("POST /posts without auth returns 401", async () => {
  const { status } = await apiFetch("/posts", {
    method: "POST",
    body: JSON.stringify({ title: "Test", slug: "test-unauth", content: "Hello" }),
  });
  assertEquals(status, 401);
});

Deno.test("POST /injection without auth returns 401", async () => {
  const { status } = await apiFetch("/injection", {
    method: "POST",
    body: JSON.stringify({ content: "<script>alert(1)</script>", location: "head" }),
  });
  assertEquals(status, 401);
});

Deno.test("POST /code is alias for /injection (returns 401 without auth)", async () => {
  const { status } = await apiFetch("/code", {
    method: "POST",
    body: JSON.stringify({ content: "test", location: "head" }),
  });
  assertEquals(status, 401);
});

Deno.test("POST /cms-push-code is alias for /injection (returns 401 without auth)", async () => {
  const { status } = await apiFetch("/cms-push-code", {
    method: "POST",
    body: JSON.stringify({ content: "test", location: "head" }),
  });
  assertEquals(status, 401);
});

Deno.test("DELETE /posts without auth returns 401", async () => {
  const { status } = await apiFetch("/posts/some-slug", { method: "DELETE" });
  assertEquals(status, 401);
});

Deno.test("PUT /posts without auth returns 401", async () => {
  const { status } = await apiFetch("/posts/some-slug", {
    method: "PUT",
    body: JSON.stringify({ title: "Updated" }),
  });
  assertEquals(status, 401);
});

// ============================================================
// AUTHENTICATED — STATUS FILTERING (Parménion / Autopilot)
// ============================================================

const API_KEY = Deno.env.get("BLOG_API_KEY") || "";

async function authFetch(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
    "x-api-key": API_KEY,
    ...((options.headers as Record<string, string>) || {}),
  };
  const res = await fetch(url, { ...options, headers });
  const body = await res.json();
  return { status: res.status, body };
}

Deno.test("GET /posts?status=all with API key returns drafts and published", async () => {
  if (!API_KEY) return; // skip if no key configured
  const { status, body } = await authFetch("/posts?status=all&limit=200");
  assertEquals(status, 200);
  const statuses = (body.posts ?? []).map((p: any) => p.status);
  const hasDraft = statuses.includes("draft");
  const hasPublished = statuses.includes("published");
  assertEquals(hasPublished, true, "Should contain published posts");
  assertEquals(
    hasDraft,
    true,
    "Should contain draft posts (Parménion needs this to avoid duplicates)",
  );
});

Deno.test("GET /posts?status=draft with API key returns only drafts", async () => {
  if (!API_KEY) return;
  const { status, body } = await authFetch("/posts?status=draft&limit=50");
  assertEquals(status, 200);
  const allDraft = (body.posts ?? []).every((p: any) => p.status === "draft");
  assertEquals(allDraft, true, "All returned posts should be drafts");
});

Deno.test("GET /posts without status param returns only published (default)", async () => {
  if (!API_KEY) return;
  const { status, body } = await authFetch("/posts?limit=50");
  assertEquals(status, 200);
  const allPublished = (body.posts ?? []).every((p: any) => p.status === "published");
  assertEquals(allPublished, true, "Default should return only published posts");
});

Deno.test("Each post has a status field for consumer-side filtering", async () => {
  if (!API_KEY) return;
  const { body } = await authFetch("/posts?status=all&limit=5");
  for (const post of body.posts ?? []) {
    assertExists(post.status, "Every post must expose a status field");
  }
});

// ============================================================
// CORS
// ============================================================

Deno.test("OPTIONS request returns CORS headers", async () => {
  const res = await fetch(BASE_URL + "/posts", {
    method: "OPTIONS",
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  assertEquals(res.headers.get("access-control-allow-origin"), "*");
  await res.text();
});
