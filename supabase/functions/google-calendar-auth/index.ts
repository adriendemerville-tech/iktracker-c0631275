import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const ALLOWED_REDIRECT_ORIGINS = [
  "https://iktracker.fr",
  "https://iktracker.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function validateRedirectUrl(url: string | undefined): string {
  const fallback = "https://iktracker.fr/profile";
  if (!url) return fallback;
  const isAllowed = ALLOWED_REDIRECT_ORIGINS.some((origin) => url.startsWith(origin));
  return isAllowed ? url : fallback;
}

function b64urlEncode(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlEncodeStr(s: string): string {
  return b64urlEncode(new TextEncoder().encode(s));
}
function b64urlDecodeStr(s: string): string {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const norm = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  return atob(norm);
}

async function hmacSign(payload: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(payload));
  return b64urlEncode(new Uint8Array(sig));
}

async function signState(payload: object, key: string): Promise<string> {
  const body = b64urlEncodeStr(JSON.stringify(payload));
  const sig = await hmacSign(body, key);
  return `${body}.${sig}`;
}

async function verifyState(state: string, key: string): Promise<any | null> {
  const dot = state.indexOf(".");
  if (dot < 0) return null;
  const body = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = await hmacSign(body, key);
  // constant-time compare
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const data = JSON.parse(b64urlDecodeStr(body));
    if (typeof data.exp === "number" && Date.now() / 1000 > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

async function logCalendarAttempt(
  supabase: any,
  userId: string,
  provider: "google" | "outlook" | "ics",
  status: "success" | "failure",
  errorMessage?: string,
  metadata: Record<string, any> = {},
) {
  try {
    await supabase.from("calendar_connection_attempts").insert({
      user_id: userId,
      provider,
      status,
      error_message: errorMessage || null,
      metadata,
    });
  } catch (e) {
    console.error(`Failed to log ${provider} attempt:`, e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    console.log("Google Calendar Auth - Action:", action);

    // Generate OAuth URL — REQUIRES authenticated user; user_id is derived from JWT, not from client state.
    if (action === "authorize") {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        console.error("Missing Google OAuth credentials");
        return new Response(JSON.stringify({ error: "Configuration error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const authHeader = req.headers.get("Authorization") || "";
      const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!bearer) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      const { data: userData, error: userErr } = await supabase.auth.getUser(bearer);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Parse optional client-supplied state for non-trusted fields (redirect_url, use_redirect)
      const rawClientState = url.searchParams.get("state") || "";
      let clientPayload: { redirect_url?: string; use_redirect?: boolean } = {};
      if (rawClientState) {
        try {
          clientPayload = JSON.parse(atob(rawClientState));
        } catch {
          /* ignore */
        }
      }

      const signedState = await signState(
        {
          user_id: userData.user.id,
          redirect_url: clientPayload.redirect_url,
          use_redirect: clientPayload.use_redirect,
          nonce: crypto.randomUUID(),
          exp: Math.floor(Date.now() / 1000) + 600,
        },
        SUPABASE_SERVICE_ROLE_KEY!,
      );

      const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-auth?action=callback`;
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID!);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set(
        "scope",
        "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly",
      );
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", signedState);

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle OAuth callback — verify signed state
    if (action === "callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      const stateData = state ? await verifyState(state, SUPABASE_SERVICE_ROLE_KEY!) : null;
      if (!stateData) {
        return new Response("Invalid or expired state", { status: 400 });
      }

      const { user_id, redirect_url, use_redirect } = stateData as {
        user_id?: string;
        redirect_url?: string;
        use_redirect?: boolean;
      };

      const finalRedirectUrl = validateRedirectUrl(redirect_url);
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      const returnResponse = (success: boolean, errorMessage?: string) => {
        const redirectTarget = new URL(finalRedirectUrl);
        if (success) {
          redirectTarget.searchParams.set("oauth_success", "true");
          redirectTarget.searchParams.set("oauth_provider", "google");
        } else {
          const safeError = (errorMessage || "Unknown error").replace(/[<>"'&\\]/g, "");
          redirectTarget.searchParams.set("oauth_error", safeError);
          redirectTarget.searchParams.set("oauth_provider", "google");
        }
        return Response.redirect(redirectTarget.toString(), 302);
      };

      if (error || !user_id) {
        console.error("OAuth error:", error);
        await logCalendarAttempt(
          supabase,
          user_id || "00000000-0000-0000-0000-000000000000",
          "google",
          "failure",
          error || "Missing user id",
        );
        return returnResponse(false, "Authentication failed");
      }

      if (!code) {
        await logCalendarAttempt(
          supabase,
          user_id,
          "google",
          "failure",
          "Missing authorization code",
        );
        return new Response("Missing required parameters", { status: 400 });
      }

      console.log("Callback received, processing...");

      const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-auth?action=callback`;
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error("Token exchange failed:", tokens);
        await logCalendarAttempt(
          supabase,
          user_id,
          "google",
          "failure",
          tokens?.error_description || tokens?.error || "Token exchange failed",
        );
        return returnResponse(false, "Authentication failed");
      }

      const { data: existing } = await supabase
        .from("calendar_connections")
        .select("id")
        .eq("user_id", user_id)
        .eq("provider", "google")
        .single();

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      if (existing) {
        await supabase
          .from("calendar_connections")
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_expires_at: expiresAt,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("calendar_connections").insert({
          user_id,
          provider: "google",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: expiresAt,
          is_active: true,
        });
      }

      await logCalendarAttempt(supabase, user_id, "google", "success", undefined, {
        has_refresh_token: !!tokens.refresh_token,
      });
      console.log("Calendar connection saved successfully");
      return returnResponse(true);
    }

    return new Response("Invalid action", { status: 400 });
  } catch (error) {
    console.error("Error in google-calendar-auth:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
