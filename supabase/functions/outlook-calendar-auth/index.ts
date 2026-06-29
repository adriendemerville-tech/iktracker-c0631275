import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID');
const MICROSOFT_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const ALLOWED_REDIRECT_ORIGINS = [
  'https://iktracker.fr',
  'https://iktracker.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

function validateRedirectUrl(url: string | undefined): string {
  const fallback = 'https://iktracker.fr/profile';
  if (!url) return fallback;
  const isAllowed = ALLOWED_REDIRECT_ORIGINS.some(origin => url.startsWith(origin));
  return isAllowed ? url : fallback;
}

function b64urlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlEncodeStr(s: string): string { return b64urlEncode(new TextEncoder().encode(s)); }
function b64urlDecodeStr(s: string): string {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  return atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
}
async function hmacSign(payload: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(payload));
  return b64urlEncode(new Uint8Array(sig));
}
async function signState(payload: object, key: string): Promise<string> {
  const body = b64urlEncodeStr(JSON.stringify(payload));
  return `${body}.${await hmacSign(body, key)}`;
}
async function verifyState(state: string, key: string): Promise<any | null> {
  const dot = state.indexOf('.');
  if (dot < 0) return null;
  const body = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = await hmacSign(body, key);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const data = JSON.parse(b64urlDecodeStr(body));
    if (typeof data.exp === 'number' && Date.now() / 1000 > data.exp) return null;
    return data;
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log('Outlook Calendar Auth - Action:', action);

    if (action === 'authorize') {
      const authHeader = req.headers.get('Authorization') || '';
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (!bearer) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      const { data: userData, error: userErr } = await supabase.auth.getUser(bearer);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const rawClientState = url.searchParams.get('state') || '';
      let clientPayload: { redirect_url?: string; use_redirect?: boolean } = {};
      if (rawClientState) {
        try { clientPayload = JSON.parse(atob(rawClientState)); } catch { /* ignore */ }
      }

      const signedState = await signState({
        user_id: userData.user.id,
        redirect_url: clientPayload.redirect_url,
        use_redirect: clientPayload.use_redirect,
        nonce: crypto.randomUUID(),
        exp: Math.floor(Date.now() / 1000) + 600,
      }, SUPABASE_SERVICE_ROLE_KEY!);

      const redirectUri = `${SUPABASE_URL}/functions/v1/outlook-calendar-auth?action=callback`;
      const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      authUrl.searchParams.set('client_id', MICROSOFT_CLIENT_ID!);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'offline_access Calendars.Read');
      authUrl.searchParams.set('response_mode', 'query');
      authUrl.searchParams.set('state', signedState);

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      const stateData = state ? await verifyState(state, SUPABASE_SERVICE_ROLE_KEY!) : null;
      if (!stateData) {
        return new Response('Invalid or expired state', { status: 400 });
      }
      const { user_id, redirect_url } = stateData as {
        user_id?: string; redirect_url?: string;
      };

      const finalRedirectUrl = validateRedirectUrl(redirect_url);

      const returnResponse = (success: boolean, errorMessage?: string) => {
        const redirectTarget = new URL(finalRedirectUrl);
        if (success) {
          redirectTarget.searchParams.set('oauth_success', 'true');
          redirectTarget.searchParams.set('oauth_provider', 'outlook');
        } else {
          const safeError = (errorMessage || 'Unknown error').replace(/[<>"'&\\]/g, '');
          redirectTarget.searchParams.set('oauth_error', safeError);
          redirectTarget.searchParams.set('oauth_provider', 'outlook');
        }
        return Response.redirect(redirectTarget.toString(), 302);
      };

      if (error) {
        console.error('OAuth error:', error);
        return returnResponse(false, 'Authentication failed');
      }

      if (!code || !user_id) {
        return new Response('Missing required parameters', { status: 400 });
      }

      console.log('Callback received, processing...');

      const redirectUri = `${SUPABASE_URL}/functions/v1/outlook-calendar-auth?action=callback`;
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: MICROSOFT_CLIENT_ID!,
          client_secret: MICROSOFT_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();
      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokens);
        return returnResponse(false, 'Authentication failed');
      }

      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      const { data: existing } = await supabase
        .from('calendar_connections')
        .select('id')
        .eq('user_id', user_id)
        .eq('provider', 'outlook')
        .single();

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      if (existing) {
        await supabase.from('calendar_connections').update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: expiresAt,
          is_active: true,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id);
      } else {
        await supabase.from('calendar_connections').insert({
          user_id,
          provider: 'outlook',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          token_expires_at: expiresAt,
          is_active: true,
        });
      }

      console.log('Calendar connection saved successfully');
      return returnResponse(true);
    }

    return new Response('Invalid action', { status: 400 });
  } catch (error) {
    console.error('Error in outlook-calendar-auth:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
