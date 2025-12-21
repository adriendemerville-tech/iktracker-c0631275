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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log('Google Calendar Auth - Action:', action);
    console.log('Google Calendar Auth - SUPABASE_URL:', SUPABASE_URL);
    console.log('Google Calendar Auth - GOOGLE_CLIENT_ID exists:', !!GOOGLE_CLIENT_ID);
    console.log('Google Calendar Auth - GOOGLE_CLIENT_SECRET exists:', !!GOOGLE_CLIENT_SECRET);

    // Generate OAuth URL
    if (action === 'authorize') {
      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        console.error('Missing Google OAuth credentials');
        return new Response(JSON.stringify({ error: 'Missing Google OAuth credentials' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-auth?action=callback`;
      const state = url.searchParams.get('state') || '';
      
      console.log('Google Calendar Auth - Redirect URI:', redirectUri);
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID!);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', state);

      console.log('Generated auth URL, redirecting...');

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
      
      // Helper function to return response based on mode (popup vs redirect)
      const returnResponse = (success: boolean, errorMessage?: string) => {
        // Determine the final redirect URL
        const finalRedirectUrl = redirect_url || 'https://iktracker.fr/profile';
        
        if (use_redirect) {
          // Mobile mode: redirect back to app with query params
          const redirectTarget = new URL(finalRedirectUrl);
          if (success) {
            redirectTarget.searchParams.set('oauth_success', 'true');
            redirectTarget.searchParams.set('oauth_provider', 'google');
          } else {
            redirectTarget.searchParams.set('oauth_error', errorMessage || 'Unknown error');
            redirectTarget.searchParams.set('oauth_provider', 'google');
          }
          return Response.redirect(redirectTarget.toString(), 302);
        } else {
          // Desktop mode: try postMessage first, but always redirect as fallback
          const successHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Connexion réussie</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white; }
    .container { text-align: center; padding: 2rem; }
    .success { color: #22c55e; font-size: 3rem; margin-bottom: 1rem; }
    p { color: #94a3b8; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">✓</div>
    <h2>Calendrier connecté !</h2>
    <p>Cette fenêtre va se fermer automatiquement...</p>
  </div>
  <script>
    // Try to notify the opener window
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage({ type: 'google-auth-success' }, '*');
        setTimeout(() => window.close(), 1500);
      } catch(e) {
        // If postMessage fails, redirect instead
        setTimeout(() => { window.location.href = '${finalRedirectUrl}?oauth_success=true&oauth_provider=google'; }, 1500);
      }
    } else {
      // No opener, redirect to the app
      setTimeout(() => { window.location.href = '${finalRedirectUrl}?oauth_success=true&oauth_provider=google'; }, 1500);
    }
  </script>
</body>
</html>`;

          const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Erreur de connexion</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: white; }
    .container { text-align: center; padding: 2rem; }
    .error { color: #ef4444; font-size: 3rem; margin-bottom: 1rem; }
    p { color: #94a3b8; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="error">✗</div>
    <h2>Erreur de connexion</h2>
    <p>${errorMessage || 'Une erreur est survenue'}</p>
    <p>Redirection en cours...</p>
  </div>
  <script>
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage({ type: 'google-auth-error', error: '${errorMessage}' }, '*');
        setTimeout(() => window.close(), 2000);
      } catch(e) {
        setTimeout(() => { window.location.href = '${finalRedirectUrl}?oauth_error=${encodeURIComponent(errorMessage || 'Unknown error')}&oauth_provider=google'; }, 2000);
      }
    } else {
      setTimeout(() => { window.location.href = '${finalRedirectUrl}?oauth_error=${encodeURIComponent(errorMessage || 'Unknown error')}&oauth_provider=google'; }, 2000);
    }
  </script>
</body>
</html>`;

          return new Response(success ? successHtml : errorHtml, {
            headers: { 'Content-Type': 'text/html' },
          });
        }
      };

      if (error) {
        console.error('OAuth error:', error);
        return returnResponse(false, error);
      }

      if (!code || !user_id) {
        return new Response('Missing code or user_id', { status: 400 });
      }

      console.log('Callback received for user:', user_id);

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
      console.log('Token exchange response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokens);
        return returnResponse(false, 'Token exchange failed');
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
