import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log('Google Calendar Auth - Action:', action);

    // Generate OAuth URL
    if (action === 'authorize') {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        console.error('Missing Google OAuth credentials');
        return new Response(JSON.stringify({ error: 'Configuration error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-auth?action=callback`;
      const state = url.searchParams.get('state') || '';
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID!);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', state);

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle OAuth callback
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      // Parse state first to get use_redirect and redirect_url
      let stateData: { user_id?: string; redirect_url?: string; use_redirect?: boolean } = {};
      if (state) {
        try {
          stateData = JSON.parse(atob(state));
        } catch {
          return new Response('Invalid state', { status: 400 });
        }
      }

      const { user_id, redirect_url, use_redirect } = stateData;
      
      // Validate redirect_url against allowlist
      const finalRedirectUrl = validateRedirectUrl(redirect_url);
      
      // Helper function to return response based on mode (popup vs redirect)
      const returnResponse = (success: boolean, errorMessage?: string) => {
        if (use_redirect) {
          const redirectTarget = new URL(finalRedirectUrl);
          if (success) {
            redirectTarget.searchParams.set('oauth_success', 'true');
            redirectTarget.searchParams.set('oauth_provider', 'google');
          } else {
            const safeError = (errorMessage || 'Unknown error').replace(/[<>"'&\\]/g, '');
            redirectTarget.searchParams.set('oauth_error', safeError);
            redirectTarget.searchParams.set('oauth_provider', 'google');
          }
          return Response.redirect(redirectTarget.toString(), 302);
        } else {
          // Desktop mode: always redirect (eliminates script injection risk)
          const redirectTarget = new URL(finalRedirectUrl);
          if (success) {
            redirectTarget.searchParams.set('oauth_success', 'true');
            redirectTarget.searchParams.set('oauth_provider', 'google');
          } else {
            const safeError = (errorMessage || 'Unknown error').replace(/[<>"'&\\]/g, '');
            redirectTarget.searchParams.set('oauth_error', safeError);
            redirectTarget.searchParams.set('oauth_provider', 'google');
          }
          return Response.redirect(redirectTarget.toString(), 302);
        }
      };

      if (error) {
        console.error('OAuth error:', error);
        return returnResponse(false, 'Authentication failed');
      }

      if (!code || !user_id) {
        return new Response('Missing required parameters', { status: 400 });
      }

      console.log('Callback received, processing...');

      // Exchange code for tokens
      const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-auth?action=callback`;
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokens);
        return returnResponse(false, 'Authentication failed');
      }

      // Save tokens to database
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      // Check if connection exists
      const { data: existing } = await supabase
        .from('calendar_connections')
        .select('id')
        .eq('user_id', user_id)
        .eq('provider', 'google')
        .single();

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      if (existing) {
        await supabase
          .from('calendar_connections')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_expires_at: expiresAt,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('calendar_connections')
          .insert({
            user_id,
            provider: 'google',
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
    console.error('Error in google-calendar-auth:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
