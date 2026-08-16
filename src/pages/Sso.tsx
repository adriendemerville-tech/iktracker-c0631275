import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * SSO landing page. Receives a partner-signed JWT, exchanges it for a Supabase session.
 * URL: /sso?token=<jwt>&partner=<name>&redirect=<path>
 */
export default function Sso() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string>("");

  useEffect(() => {
    const token = params.get("token");
    const partner = params.get("partner") || "votre partenaire";
    const redirect = params.get("redirect") || "/app";
    setPartnerName(partner);

    if (!token) {
      setError("Token manquant");
      return;
    }

    (async () => {
      try {
        // Decode JWT payload (no verify here — backend verifies)
        const payloadB64 = token.split(".")[1];
        const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
        const partnerId = payload.partner_id;
        if (!partnerId) throw new Error("Token invalide");

        // Exchange token for a Supabase magic link
        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/partner-api/sso/verify`;
        const res = await fetch(fnUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, partner_id: partnerId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Échec de la vérification");

        // The action_link is a Supabase magiclink — following it sets the session and redirects to /app
        // We want to go to the chosen redirect path after, so override the redirectTo via a wrapper
        const actionUrl = new URL(data.action_link);
        actionUrl.searchParams.set("redirect_to", `${window.location.origin}${redirect}`);
        window.location.href = actionUrl.toString();
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [params, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Connexion impossible</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate("/auth")}
            className="text-sm text-primary hover:underline"
          >
            Se connecter manuellement
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">Connexion en cours…</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Authentification depuis <span className="font-medium">{partnerName}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
