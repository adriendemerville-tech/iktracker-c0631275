import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

const MICROSOFT_CLIENT_ID = Deno.env.get("MICROSOFT_CLIENT_ID");
const MICROSOFT_CLIENT_SECRET = Deno.env.get("MICROSOFT_CLIENT_SECRET");

type Provider = "google" | "outlook";

type CalendarConnectionRow = {
  id: string;
  user_id: string;
  provider: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    ...init,
  });
}

function safeJsonParse(text: string) {
  try {
    return { ok: true as const, json: JSON.parse(text) };
  } catch {
    return { ok: false as const, text };
  }
}

function decodeJwtPayload(jwt: string) {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
    const jsonStr = atob(padded);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function computeWindow(daysBack: number, daysForward: number) {
  const now = new Date();
  const timeMin = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const timeMax = new Date(now.getTime() + daysForward * 24 * 60 * 60 * 1000);
  return { now: now.toISOString(), timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString() };
}

async function refreshGoogleIfNeeded(connection: CalendarConnectionRow, supabase: any) {
  if (!connection.access_token) {
    return { access_token: null as string | null, refreshed: false, refresh_error: "missing_access_token" };
  }

  const safetyWindowMs = 60_000;
  if (connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at).getTime();
    if (expiresAt - safetyWindowMs > Date.now()) {
      return { access_token: connection.access_token, refreshed: false };
    }
  }

  if (!connection.refresh_token) {
    return { access_token: connection.access_token, refreshed: false, refresh_error: "missing_refresh_token" };
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return { access_token: connection.access_token, refreshed: false, refresh_error: "missing_google_client_credentials" };
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokenText = await tokenResponse.text();
  const tokenParsed = safeJsonParse(tokenText);

  if (!tokenResponse.ok) {
    return {
      access_token: connection.access_token,
      refreshed: false,
      refresh_error: {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: tokenParsed.ok ? tokenParsed.json : tokenParsed.text,
      },
    };
  }

  const tokens = tokenParsed.ok ? tokenParsed.json : null;
  const access_token = tokens?.access_token ?? null;
  const expires_in = Number(tokens?.expires_in ?? 0);
  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  if (access_token) {
    await supabase
      .from("calendar_connections")
      .update({
        access_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
  }

  return { access_token, refreshed: true, token_response: tokens, token_response_raw: tokenText };
}

async function refreshOutlookIfNeeded(connection: CalendarConnectionRow, supabase: any) {
  if (!connection.access_token) {
    return { access_token: null as string | null, refreshed: false, refresh_error: "missing_access_token" };
  }

  const safetyWindowMs = 60_000;
  if (connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at).getTime();
    if (expiresAt - safetyWindowMs > Date.now()) {
      return { access_token: connection.access_token, refreshed: false };
    }
  }

  if (!connection.refresh_token) {
    return { access_token: connection.access_token, refreshed: false, refresh_error: "missing_refresh_token" };
  }

  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
    return { access_token: connection.access_token, refreshed: false, refresh_error: "missing_microsoft_client_credentials" };
  }

  const tokenResponse = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
      scope: "offline_access Calendars.Read",
    }),
  });

  const tokenText = await tokenResponse.text();
  const tokenParsed = safeJsonParse(tokenText);

  if (!tokenResponse.ok) {
    return {
      access_token: connection.access_token,
      refreshed: false,
      refresh_error: {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: tokenParsed.ok ? tokenParsed.json : tokenParsed.text,
      },
    };
  }

  const tokens = tokenParsed.ok ? tokenParsed.json : null;
  const access_token = tokens?.access_token ?? null;
  const expires_in = Number(tokens?.expires_in ?? 0);
  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

  if (access_token) {
    await supabase
      .from("calendar_connections")
      .update({
        access_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
  }

  return { access_token, refreshed: true, token_response: tokens, token_response_raw: tokenText };
}

async function fetchGoogleEvents(accessToken: string, timeMin: string, timeMax: string) {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "2500",
  });

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const text = await response.text();
  const parsed = safeJsonParse(text);

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body: parsed.ok ? parsed.json : parsed.text,
    rawText: text,
  };
}

async function fetchGoogleTokenInfo(accessToken: string) {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
  const text = await response.text();
  const parsed = safeJsonParse(text);
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body: parsed.ok ? parsed.json : parsed.text,
    rawText: text,
  };
}

async function fetchOutlookEvents(accessToken: string, timeMin: string, timeMax: string) {
  const url = new URL("https://graph.microsoft.com/v1.0/me/calendarview");
  url.searchParams.set("startDateTime", timeMin);
  url.searchParams.set("endDateTime", timeMax);
  url.searchParams.set("$top", "1000");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });

  const text = await response.text();
  const parsed = safeJsonParse(text);

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    body: parsed.ok ? parsed.json : parsed.text,
    rawText: text,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json(
        {
          ok: false,
          requestId,
          error: "Missing backend configuration (SUPABASE_URL or SUPABASE_ANON_KEY)",
        },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) {
      return json(
        {
          ok: false,
          requestId,
          error: "Missing Authorization header",
        },
        { status: 401 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return json(
        {
          ok: false,
          requestId,
          error: "Unable to resolve user from token",
          userError,
        },
        { status: 401 }
      );
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const provider = (body?.provider ?? "google") as Provider;
    const daysBack = Number.isFinite(body?.daysBack) ? Number(body.daysBack) : 7;
    const daysForward = Number.isFinite(body?.daysForward) ? Number(body.daysForward) : 7;

    if (provider !== "google" && provider !== "outlook") {
      return json(
        {
          ok: false,
          requestId,
          error: "Invalid provider. Expected 'google' or 'outlook'.",
          provider,
        },
        { status: 400 }
      );
    }

    const { now, timeMin, timeMax } = computeWindow(daysBack, daysForward);

    const { data: connection, error: connectionError } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("user_id", userData.user.id)
      .eq("provider", provider)
      .single();

    if (connectionError || !connection) {
      return json(
        {
          ok: false,
          requestId,
          provider,
          timeMin,
          timeMax,
          error: "No calendar connection found for user/provider",
          connectionError,
        },
        { status: 404 }
      );
    }

    const connectionRow = connection as CalendarConnectionRow;

    if (!connectionRow.is_active) {
      return json(
        {
          ok: true,
          requestId,
          provider,
          now,
          timeMin,
          timeMax,
          note: "Connection exists but is inactive (is_active=false)",
          connection: {
            id: connectionRow.id,
            provider: connectionRow.provider,
            is_active: connectionRow.is_active,
            token_expires_at: connectionRow.token_expires_at,
          },
          eventsCount: 0,
          events: [],
        },
        { status: 200 }
      );
    }

    // Refresh if needed
    const refreshResult =
      provider === "google"
        ? await refreshGoogleIfNeeded(connectionRow, supabase)
        : await refreshOutlookIfNeeded(connectionRow, supabase);

    const accessToken = refreshResult.access_token;
    if (!accessToken) {
      return json(
        {
          ok: false,
          requestId,
          provider,
          now,
          timeMin,
          timeMax,
          error: "No usable access token",
          refreshResult,
        },
        { status: 401 }
      );
    }

    if (provider === "google") {
      const [tokenInfo, eventsRes] = await Promise.all([
        fetchGoogleTokenInfo(accessToken),
        fetchGoogleEvents(accessToken, timeMin, timeMax),
      ]);

      const items = (eventsRes.ok && (eventsRes.body?.items ?? null)) ? eventsRes.body.items : [];

      return json(
        {
          ok: eventsRes.ok,
          requestId,
          provider,
          now,
          timeMin,
          timeMax,
          connection: {
            id: connectionRow.id,
            token_expires_at: connectionRow.token_expires_at,
            refreshed: refreshResult.refreshed,
          },
          oauth: {
            requested_scopes: [
              "https://www.googleapis.com/auth/calendar.readonly",
              "https://www.googleapis.com/auth/calendar.events.readonly",
            ],
          },
          tokenInfo,
          eventsHttp: {
            status: eventsRes.status,
            statusText: eventsRes.statusText,
          },
          eventsCount: Array.isArray(items) ? items.length : 0,
          events: items,
          raw: {
            eventsResponse: eventsRes.body,
          },
        },
        { status: eventsRes.ok ? 200 : eventsRes.status }
      );
    }

    // Outlook
    const tokenClaims = decodeJwtPayload(accessToken);
    const eventsRes = await fetchOutlookEvents(accessToken, timeMin, timeMax);
    const items = eventsRes.ok && (eventsRes.body?.value ?? null) ? eventsRes.body.value : [];

    return json(
      {
        ok: eventsRes.ok,
        requestId,
        provider,
        now,
        timeMin,
        timeMax,
        connection: {
          id: connectionRow.id,
          token_expires_at: connectionRow.token_expires_at,
          refreshed: refreshResult.refreshed,
        },
        oauth: {
          requested_scopes: ["offline_access", "Calendars.Read"],
        },
        tokenClaims,
        eventsHttp: {
          status: eventsRes.status,
          statusText: eventsRes.statusText,
        },
        eventsCount: Array.isArray(items) ? items.length : 0,
        events: items,
        raw: {
          eventsResponse: eventsRes.body,
        },
      },
      { status: eventsRes.ok ? 200 : eventsRes.status }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json(
      {
        ok: false,
        requestId,
        error: message,
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
});
