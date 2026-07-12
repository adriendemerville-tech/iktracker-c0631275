// Public edge function that returns the connected LinkedIn profile
// used for verified founder identity on /blog/auteur/adrien-de-volontat
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/linkedin";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const linkedinApiKey = Deno.env.get("LINKEDIN_API_KEY");

    if (!lovableApiKey || !linkedinApiKey) {
      return new Response(
        JSON.stringify({ error: "LinkedIn connector not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const upstream = await fetch(`${GATEWAY_URL}/v2/userinfo`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": linkedinApiKey,
      },
    });

    if (!upstream.ok) {
      const details = await upstream.text();
      console.error(`LinkedIn userinfo failed [${upstream.status}]: ${details}`);
      return new Response(
        JSON.stringify({ error: "LinkedIn request failed", status: upstream.status, details }),
        { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await upstream.json();

    // Only expose fields safe for public display
    const publicProfile = {
      name: data.name,
      given_name: data.given_name,
      family_name: data.family_name,
      picture: data.picture,
      locale: data.locale,
      verified: true,
      profile_url: "https://www.linkedin.com/in/adrien-de-volontat",
    };

    return new Response(JSON.stringify(publicProfile), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // Cache on the edge for 1 hour to limit gateway calls
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("linkedin-profile error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
