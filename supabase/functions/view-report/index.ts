import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const shareId = url.searchParams.get("id");

    if (!shareId) {
      return new Response(
        `<!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><title>Erreur</title></head>
        <body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5;">
          <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h1 style="color: #dc2626; margin-bottom: 16px;">Lien invalide</h1>
            <p style="color: #6b7280;">Le lien de partage est invalide ou manquant.</p>
          </div>
        </body>
        </html>`,
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the shared report
    const { data: share, error } = await supabase
      .from("report_shares")
      .select("*")
      .eq("id", shareId)
      .single();

    if (error || !share) {
      console.error("Error fetching share:", error);
      return new Response(
        `<!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><title>Rapport introuvable</title></head>
        <body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5;">
          <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h1 style="color: #dc2626; margin-bottom: 16px;">Rapport introuvable</h1>
            <p style="color: #6b7280;">Ce rapport n'existe pas ou a expiré.</p>
            <p style="color: #9ca3af; font-size: 14px; margin-top: 16px;">Les liens de partage sont valides pendant 7 jours.</p>
          </div>
        </body>
        </html>`,
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    // Check if expired
    const expiresAt = new Date(share.expires_at);
    if (expiresAt < new Date()) {
      return new Response(
        `<!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><title>Lien expiré</title></head>
        <body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5;">
          <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h1 style="color: #f59e0b; margin-bottom: 16px;">Lien expiré</h1>
            <p style="color: #6b7280;">Ce lien de partage a expiré le ${expiresAt.toLocaleDateString('fr-FR')}.</p>
            <p style="color: #9ca3af; font-size: 14px; margin-top: 16px;">Les liens de partage sont valides pendant 7 jours.</p>
          </div>
        </body>
        </html>`,
        {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    // Increment access count (best effort, don't fail if this errors)
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      await adminClient
        .from("report_shares")
        .update({ accessed_count: (share.accessed_count || 0) + 1 })
        .eq("id", shareId);
    }

    // Return the HTML content
    return new Response(share.html_content, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Error in view-report function:", error);
    return new Response(
      `<!DOCTYPE html>
      <html lang="fr">
      <head><meta charset="UTF-8"><title>Erreur</title></head>
      <body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5;">
        <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h1 style="color: #dc2626; margin-bottom: 16px;">Erreur</h1>
          <p style="color: #6b7280;">Une erreur est survenue lors du chargement du rapport.</p>
        </div>
      </body>
      </html>`,
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
});
