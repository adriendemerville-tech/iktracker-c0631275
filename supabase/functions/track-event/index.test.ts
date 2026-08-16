import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const BASE_URL = `${SUPABASE_URL}/functions/v1/track-event`;

async function post(body: unknown, extraHeaders: Record<string, string> = {}) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, body: json, headers: res.headers };
}

Deno.test("rejects unknown event_type with 400", async () => {
  const { status, body } = await post({ event_type: "nope", page: "/x" });
  assertEquals(status, 400);
  assertEquals(body.error, "Invalid event_type");
});

Deno.test("rejects missing page with 400", async () => {
  const { status } = await post({ event_type: "page_view" });
  assertEquals(status, 400);
});

Deno.test("skips bot user-agents (200 skipped=bot)", async () => {
  const { status, body } = await post(
    { event_type: "page_view", page: "/test-bot" },
    { "user-agent": "Googlebot/2.1" },
  );
  assertEquals(status, 200);
  assertEquals(body.skipped, "bot");
});

Deno.test("accepts a valid anonymous event", async () => {
  const { status, body } = await post({
    event_type: "page_view",
    page: "/test-deno",
    device_type: "desktop",
    session_id: `deno-test-${Date.now()}`,
    user_agent: "Mozilla/5.0 (deno-test)",
  });
  assertEquals(status, 200);
  assertEquals(body.ok, true);
});

Deno.test("OPTIONS preflight from allowed origin echoes origin", async () => {
  const res = await fetch(BASE_URL, {
    method: "OPTIONS",
    headers: {
      Origin: "https://iktracker.fr",
      "Access-Control-Request-Method": "POST",
    },
  });
  await res.text();
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("access-control-allow-origin"), "https://iktracker.fr");
});

Deno.test("OPTIONS preflight from disallowed origin returns null ACAO", async () => {
  const res = await fetch(BASE_URL, {
    method: "OPTIONS",
    headers: {
      Origin: "https://evil.example.com",
      "Access-Control-Request-Method": "POST",
    },
  });
  await res.text();
  assertEquals(res.headers.get("access-control-allow-origin"), "null");
});

Deno.test("GET is rejected with 405", async () => {
  const res = await fetch(BASE_URL, {
    method: "GET",
    headers: { apikey: SUPABASE_ANON_KEY },
  });
  const body = await res.json();
  assertEquals(res.status, 405);
  assertEquals(body.error, "Method not allowed");
});
