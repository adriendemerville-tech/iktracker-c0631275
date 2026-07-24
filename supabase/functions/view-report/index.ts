import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper to create HTML response with correct headers
function htmlResponse(html: string, status = 200): Response {
  const headers = new Headers();

  // NOTE: we use lowercase header names + an encoded body to avoid platforms
  // defaulting to text/plain (which makes browsers show raw HTML).
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("access-control-allow-origin", "*");
  headers.set(
    "access-control-allow-headers",
    "authorization, x-client-info, apikey, content-type",
  );
  headers.set("cache-control", "no-cache, no-store, must-revalidate");
  headers.set("x-ik-response-type", "html");

  return new Response(new TextEncoder().encode(html), {
    status,
    headers,
  });
}

// Generate a clean, standalone HTML page for sharing
function generateCleanSharePage(htmlContent: string, expiresAt: Date): string {
  // Extract the content-wrapper div content from the original HTML
  const contentMatch = htmlContent.match(/<div class="content-wrapper">([\s\S]*?)<\/div>\s*<\/div><!-- end content-wrapper -->/i);
  
  // If we can't find the content wrapper, try a simpler extraction
  let pageContent = '';
  if (contentMatch && contentMatch[1]) {
    pageContent = contentMatch[1];
  } else {
    // Fallback: extract everything between the first .page div
    const pageMatch = htmlContent.match(/(<div class="page">[\s\S]*<\/div>)\s*<\/div>/i);
    if (pageMatch) {
      pageContent = pageMatch[1];
    }
  }

  const expiresDateStr = expiresAt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relevé IK Partagé - IKtracker</title>
  <meta name="description" content="Relevé de frais kilométriques partagé via IKtracker">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="https://iktracker.fr/favicon.ico" sizes="48x48">
  <link rel="icon" type="image/svg+xml" href="https://iktracker.fr/favicon.svg">
  <link rel="icon" type="image/png" sizes="48x48" href="https://iktracker.fr/favicon-48x48.png">
  <link rel="apple-touch-icon" href="https://iktracker.fr/apple-touch-icon.png">
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: #1a1a1a;
      background: #f5f5f5;
      line-height: 1.4;
      padding: 0;
      margin: 0;
    }
    
    .share-banner {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 14px 20px;
      text-align: center;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    
    .share-banner svg {
      flex-shrink: 0;
    }
    
    .share-banner-text {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    
    .share-banner-main {
      font-weight: 600;
    }
    
    .share-banner-expires {
      font-size: 12px;
      opacity: 0.85;
    }
    
    .content-area {
      padding: 40px 60px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page {
      width: 100%;
      padding: 30px 40px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    
    .page:last-child {
      margin-bottom: 0;
    }
    
    .footer-link {
      text-align: center;
      padding: 20px;
      font-size: 13px;
      color: #6b7280;
    }
    
    .footer-link a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
    }
    
    .footer-link a:hover {
      text-decoration: underline;
    }
    
    @media print {
      .share-banner, .footer-link {
        display: none !important;
      }
      
      body {
        background: #fff;
        padding: 0;
      }
      
      .content-area {
        padding: 0;
        max-width: none;
      }
      
      .page {
        padding: 0;
        background: transparent;
        box-shadow: none;
        border-radius: 0;
        margin-bottom: 0;
        page-break-after: always;
      }
      
      .page:last-child {
        page-break-after: avoid;
      }
    }
    
    @media (max-width: 768px) {
      .content-area {
        padding: 20px;
      }
      
      .page {
        padding: 20px;
      }
      
      .share-banner {
        flex-direction: column;
        padding: 12px 16px;
      }
    }
  </style>
</head>
<body>
  <div class="share-banner">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" x2="8" y1="13" y2="13"/>
      <line x1="16" x2="8" y1="17" y2="17"/>
      <line x1="10" x2="8" y1="9" y2="9"/>
    </svg>
    <div class="share-banner-text">
      <span class="share-banner-main">Relevé de frais kilométriques partagé via IKtracker</span>
      <span class="share-banner-expires">Ce lien expire le ${expiresDateStr}</span>
    </div>
  </div>
  
  <div class="content-area">
    ${pageContent}
  </div>
  
  <div class="footer-link">
    Généré avec <a href="https://iktracker.fr" target="_blank" rel="noopener">IKtracker</a> - Suivi des indemnités kilométriques
  </div>
</body>
</html>`;
}

function generateErrorPage(title: string, message: string, subMessage?: string, color = "#dc2626"): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - IKtracker</title>
  <link rel="icon" href="https://iktracker.fr/favicon.ico" sizes="48x48">
  <link rel="icon" type="image/svg+xml" href="https://iktracker.fr/favicon.svg">
  <link rel="icon" type="image/png" sizes="48x48" href="https://iktracker.fr/favicon-48x48.png">
  <link rel="apple-touch-icon" href="https://iktracker.fr/apple-touch-icon.png">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 400px;
      margin: 20px;
    }
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 20px;
      background: ${color}15;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon svg { color: ${color}; }
    h1 { color: ${color}; margin-bottom: 16px; font-size: 24px; }
    p { color: #6b7280; line-height: 1.6; }
    .sub { color: #9ca3af; font-size: 14px; margin-top: 16px; }
    .link { margin-top: 24px; }
    .link a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
    }
    .link a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" x2="12" y1="8" y2="12"/>
        <line x1="12" x2="12.01" y1="16" y2="16"/>
      </svg>
    </div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${subMessage ? `<p class="sub">${subMessage}</p>` : ''}
    <p class="link"><a href="https://iktracker.fr">Découvrir IKtracker →</a></p>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      }
    });
  }

  try {
    const url = new URL(req.url);

    // Support both:
    // - GET /view-report?id=...
    // - POST /view-report  { "id": "..." }
    let shareId = url.searchParams.get("id");
    if (!shareId && req.method === "POST") {
      try {
        const body = await req.json().catch(() => ({}));
        if (body && typeof body.id === "string") shareId = body.id;
      } catch {
        // ignore
      }
    }

    console.log("View report request for ID:", shareId);

    if (!shareId) {
      return htmlResponse(
        generateErrorPage("Lien invalide", "Le lien de partage est invalide ou manquant."),
        400
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
      return htmlResponse(
        generateErrorPage("Rapport introuvable", "Ce rapport n'existe pas ou a expiré.", "Les liens de partage sont valides pendant 7 jours."),
        404
      );
    }

    // Check if expired
    const expiresAt = new Date(share.expires_at);
    if (expiresAt < new Date()) {
      return htmlResponse(
        generateErrorPage(
          "Lien expiré", 
          `Ce lien de partage a expiré le ${expiresAt.toLocaleDateString('fr-FR')}.`,
          "Les liens de partage sont valides pendant 7 jours.",
          "#f59e0b"
        ),
        410
      );
    }

    // Increment access count (best effort)
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      await adminClient
        .from("report_shares")
        .update({ accessed_count: (share.accessed_count || 0) + 1 })
        .eq("id", shareId);
    }

    console.log("Generating clean share page for report");

    // Generate clean share page
    const cleanHtml = generateCleanSharePage(share.html_content, expiresAt);

    return htmlResponse(cleanHtml, 200);
  } catch (error) {
    console.error("Error in view-report function:", error);
    return htmlResponse(
      generateErrorPage("Erreur", "Une erreur est survenue lors du chargement du rapport."),
      500
    );
  }
});
