import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Clean the HTML to remove action bar, scripts, and make it read-only
function cleanHtmlForSharing(html: string): string {
  let cleaned = html;
  
  // Remove the action-bar div completely
  cleaned = cleaned.replace(/<div class="action-bar">[\s\S]*?<\/div>\s*<\/div>/i, '');
  
  // Remove all script tags (including the html2pdf CDN and our custom scripts)
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');
  
  // Remove the spin animation style if present
  cleaned = cleaned.replace(/<style>\s*@keyframes spin[\s\S]*?<\/style>/gi, '');
  
  // Fix the content-wrapper margin (remove the top margin since action bar is gone)
  cleaned = cleaned.replace(/\.content-wrapper\s*\{[^}]*margin-top:\s*70px[^}]*\}/i, 
    '.content-wrapper { margin-top: 0; }');
  
  // Add a read-only banner at the top
  const readOnlyBanner = `
  <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 12px 20px; text-align: center; font-family: system-ui, sans-serif; font-size: 14px; position: fixed; top: 0; left: 0; right: 0; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
    <span style="display: inline-flex; align-items: center; gap: 8px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
      Relevé de frais kilométriques partagé via <strong style="margin-left: 4px;">IKtracker</strong>
    </span>
  </div>`;
  
  // Add margin-top to body to account for the banner
  cleaned = cleaned.replace(/<body([^>]*)>/i, `<body$1>${readOnlyBanner}<div style="margin-top: 50px;">`);
  cleaned = cleaned.replace(/<\/body>/i, '</div></body>');
  
  // Update title to indicate it's a shared report
  cleaned = cleaned.replace(/<title>([^<]*)<\/title>/i, '<title>$1 (Partagé)</title>');
  
  return cleaned;
}

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
      .maybeSingle();

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

    // Clean the HTML for sharing (remove action bar, scripts, add read-only banner)
    const cleanedHtml = cleanHtmlForSharing(share.html_content);

    // Return the cleaned HTML content
    return new Response(cleanedHtml, {
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
