// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";
import { forwardGoogleCalendarCallback } from "./google-calendar-callback.server";

const backend = "https://backend.example.test";
const legacy = `${backend}/functions/v1/google-calendar-auth?action=callback`;
const next = "https://iktracker.fr/oauth/google-calendar/callback";

function harness(extra: Record<string, string> = {}) {
  const env = { SUPABASE_URL: backend, SUPABASE_SERVICE_ROLE_KEY: "test-signing-key", GOOGLE_CLIENT_ID: "test-client", GOOGLE_CLIENT_SECRET: "test-secret", ...extra };
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const insert = vi.fn(async () => ({ error: null }));
  const update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
  const chain = { eq: vi.fn(() => chain), single: vi.fn(async () => ({ data: { id: "connection-id" } })) };
  const client = {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: "test-user" } }, error: null })) },
    from: vi.fn(() => ({ select: vi.fn(() => chain), insert, update })),
  };
  const fetcher = vi.fn(async () => Response.json({ access_token: "mock-access", refresh_token: "mock-refresh", expires_in: 3600 }));
  const source = readFileSync(new URL("../../supabase/functions/google-calendar-auth/index.ts", import.meta.url), "utf8")
    .replace(/^import .*;\n/gm, "");
  const javascript = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  runInNewContext(javascript, {
    Deno: { env: { get: (key: keyof typeof env) => env[key] } },
    serve: (fn: typeof handler) => { handler = fn; },
    createClient: () => client,
    crypto: webcrypto, TextEncoder, Uint8Array, URL, URLSearchParams, Request, Response, fetch: fetcher,
    btoa, atob, console: { log: vi.fn(), error: vi.fn() },
  });
  const invoke = async (request: Request) => {
    if (!handler) throw new Error("Handler not registered");
    return handler(request);
  };
  const authorize = async (redirectUrl = "https://iktracker.fr/profile") => {
    const state = btoa(JSON.stringify({ redirect_url: redirectUrl }));
    const response = await invoke(new Request(`${backend}?action=authorize&state=${encodeURIComponent(state)}`, { headers: { Authorization: "Bearer mock-user-token" } }));
    return new URL((await response.json()).url);
  };
  const exchange = (state: string, values = { code: "mock-code" }) => invoke(new Request(`${backend}?action=exchange`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state, ...values }),
  }));
  return { invoke, authorize, exchange, fetcher, insert, update, env };
}

describe("Google Agenda OAuth — mocked, no database or network writes", () => {
  it("requests only calendar.events.readonly and keeps the legacy default", async () => {
    const auth = await harness().authorize();
    expect(auth.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/calendar.events.readonly");
    expect(auth.searchParams.get("redirect_uri")).toBe(legacy);
  });

  it("signs the selected URI and reuses it even after the setting changes", async () => {
    const h = harness({ GOOGLE_CALENDAR_REDIRECT_URI: next });
    const auth = await h.authorize();
    const state = auth.searchParams.get("state") ?? "";
    const payload = JSON.parse(Buffer.from(state.split(".")[0], "base64url").toString());
    expect(payload.redirect_uri).toBe(next);
    expect(auth.searchParams.get("redirect_uri")).toBe(next);
    h.env.GOOGLE_CALENDAR_REDIRECT_URI = legacy;
    const response = await h.exchange(state);
    expect(response.status).toBe(200);
    const tokenBody = new URLSearchParams(h.fetcher.mock.calls[0]?.[1]?.body as string);
    expect(tokenBody.get("redirect_uri")).toBe(next);
    expect((await response.json()).redirect_url).toBe("https://iktracker.fr/profile?oauth_success=true&oauth_provider=google");
  });

  it("continues accepting old signed states without redirect_uri on the legacy callback", async () => {
    const h = harness({ GOOGLE_CALENDAR_REDIRECT_URI: next });
    const key = await webcrypto.subtle.importKey("raw", new TextEncoder().encode("test-signing-key"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const body = Buffer.from(JSON.stringify({ user_id: "test-user", redirect_url: "https://iktracker.fr/profile", exp: Date.now() / 1000 + 600 })).toString("base64url");
    const signature = Buffer.from(await webcrypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))).toString("base64url");
    const response = await h.invoke(new Request(`${legacy}&code=mock-code&state=${body}.${signature}`));
    expect(response.status).toBe(302);
    expect(new URLSearchParams(h.fetcher.mock.calls[0]?.[1]?.body as string).get("redirect_uri")).toBe(legacy);
  });

  it.each(["https://iktracker.fr/profile", "https://www.iktracker.fr/profile", "https://iktracker.lovable.app/profile"])("allows exact origin %s", async (target) => {
    const h = harness();
    const auth = await h.authorize(target);
    const response = await h.exchange(auth.searchParams.get("state") ?? "");
    expect((await response.json()).redirect_url).toBe(`${target}?oauth_success=true&oauth_provider=google`);
  });

  it.each(["https://iktracker.fr.exemple.com/profile", "https://iktracker.fr@exemple.com/profile", "https://evil@iktracker.fr/profile", "http://localhost:8080/profile", "/relative", "not a URL"])("refuses unsafe or production-local redirect %s", async (target) => {
    const h = harness();
    const auth = await h.authorize(target);
    const response = await h.exchange(auth.searchParams.get("state") ?? "");
    expect((await response.json()).redirect_url).toBe("https://iktracker.fr/profile?oauth_success=true&oauth_provider=google");
  });

  it("allows localhost only in explicit development", async () => {
    const h = harness({ ENVIRONMENT: "development" });
    const auth = await h.authorize("http://localhost:8080/profile");
    expect((await (await h.exchange(auth.searchParams.get("state") ?? "")).json()).redirect_url).toBe("http://localhost:8080/profile?oauth_success=true&oauth_provider=google");
  });

  it("rejects forged state before token exchange or storage", async () => {
    const h = harness();
    const response = await h.exchange("invalid.state");
    expect(response.status).toBe(400);
    expect(h.fetcher).not.toHaveBeenCalled();
    expect(h.insert).not.toHaveBeenCalled();
    expect(h.update).not.toHaveBeenCalled();
  });

  it("requires POST for exchange", async () => {
    const h = harness();
    expect((await h.invoke(new Request(`${backend}?action=exchange`))).status).toBe(405);
    expect(h.fetcher).not.toHaveBeenCalled();
  });

  it("forwards code and signed state by POST and redirects without exposing tokens", async () => {
    const h = harness({ GOOGLE_CALENDAR_REDIRECT_URI: next });
    const auth = await h.authorize();
    const state = auth.searchParams.get("state") ?? "";
    const relay = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => h.invoke(new Request(String(_url), init)));
    const result = await forwardGoogleCalendarCallback(new Request(`${next}?code=mock-code&state=${encodeURIComponent(state)}`), backend, relay);
    expect(relay.mock.calls[0]?.[0]).toBe(`${backend}/functions/v1/google-calendar-auth?action=exchange`);
    expect(relay.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(JSON.parse(String(relay.mock.calls[0]?.[1]?.body))).toEqual({ code: "mock-code", state });
    expect(result.status).toBe(302);
    expect(result.headers.get("location")).toBe("https://iktracker.fr/profile?oauth_success=true&oauth_provider=google");
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(result.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await result.text()).toBe("");
  });

  it("forwards Google denial and keeps the existing error redirect", async () => {
    const h = harness();
    const auth = await h.authorize();
    const relay: typeof fetch = async (url, init) => h.invoke(new Request(String(url), init));
    const response = await forwardGoogleCalendarCallback(new Request(`${next}?error=access_denied&state=${encodeURIComponent(auth.searchParams.get("state") ?? "")}`), backend, relay);
    expect(response.headers.get("location")).toBe("https://iktracker.fr/profile?oauth_error=Authentication+failed&oauth_provider=google");
    expect(h.fetcher).not.toHaveBeenCalled();
  });

  it("rejects an incomplete callback without any request", async () => {
    const relay = vi.fn();
    expect((await forwardGoogleCalendarCallback(new Request(next), backend, relay)).status).toBe(400);
    expect(relay).not.toHaveBeenCalled();
  });
});