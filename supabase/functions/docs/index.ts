import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BACKEND_MD = `PLACEHOLDER`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Check auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check admin or viewer role
  const serviceClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: roles } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const userRoles = (roles || []).map((r: any) => r.role);
  if (!userRoles.includes("admin") && !userRoles.includes("viewer")) {
    return new Response(JSON.stringify({ error: "Access denied" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "markdown";

  if (format === "html") {
    // Simple markdown to HTML (headings, tables, code blocks, lists)
    let html = BACKEND_MD;
    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="$1">$2</code></pre>');
    // Headings
    html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    // Blockquotes
    html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");
    // HR
    html = html.replace(/^---$/gm, "<hr>");
    // Paragraphs
    html = html.replace(/\n\n/g, "</p><p>");

    const fullHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>IKTracker — Documentation Backend</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#1a1a1a;line-height:1.6}
h1,h2,h3,h4{margin-top:2rem}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}
th{background:#f5f5f5}pre{background:#f5f5f5;padding:1rem;overflow-x:auto;border-radius:4px}code{background:#f0f0f0;padding:2px 4px;border-radius:3px}
pre code{background:none;padding:0}blockquote{border-left:3px solid #ddd;margin-left:0;padding-left:1rem;color:#666}</style></head>
<body><p>${html}</p></body></html>`;

    return new Response(fullHtml, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Default: raw markdown
  return new Response(BACKEND_MD, {
    headers: { ...corsHeaders, "Content-Type": "text/markdown; charset=utf-8" },
  });
});
