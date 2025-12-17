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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log('Outlook Calendar Auth - Action:', action);

    // Generate OAuth URL
    if (action === 'authorize') {
      const redirectUri = `${SUPABASE_URL}/functions/v1/outlook-calendar-auth?action=callback`;
      const state = url.searchParams.get('state') || '';
      
      const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      authUrl.searchParams.set('client_id', MICROSOFT_CLIENT_ID!);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'offline_access Calendars.Read');
      authUrl.searchParams.set('response_mode', 'query');
      authUrl.searchParams.set('state', state);

      console.log('Generated Outlook auth URL, redirecting...');

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle OAuth callback
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      if (error) {
        console.error('OAuth error:', error, errorDescription);
        return new Response(`<html><body><script>window.opener.postMessage({type:'outlook-auth-error',error:'${error}: ${errorDescription}'},'*');window.close();</script></body></html>`, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (!code || !state) {
        return new Response('Missing code or state', { status: 400 });
      }

      // Parse state (contains user_id and redirect_url)
      let stateData;
      try {
        stateData = JSON.parse(atob(state));
      } catch {
        return new Response('Invalid state', { status: 400 });
      }

      const { user_id, redirect_url } = stateData;
      console.log('Callback received for user:', user_id);

      // Exchange code for tokens
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
      console.log('Token exchange response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', tokens);
        return new Response(`<html><body><script>window.opener.postMessage({type:'outlook-auth-error',error:'Token exchange failed: ${tokens.error_description || tokens.error}'},'*');window.close();</script></body></html>`, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      // Save tokens to database
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      // Check if connection exists
      const { data: existing } = await supabase
        .from('calendar_connections')
        .select('id')
        .eq('user_id', user_id)
        .eq('provider', 'outlook')
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
            provider: 'outlook',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || null,
            token_expires_at: expiresAt,
            is_active: true,
          });
      }

      console.log('Outlook calendar connection saved successfully');

      // Redirect back to app
      return new Response(`<html><body><script>window.opener.postMessage({type:'outlook-auth-success'},'*');window.close();</script></body></html>`, {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return new Response('Invalid action', { status: 400 });
  } catch (error) {
    console.error('Error in outlook-calendar-auth:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
