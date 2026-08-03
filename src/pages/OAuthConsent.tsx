import { useEffect, useState } from 'react';
import { useSearchParams } from '@/lib/router-compat';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ShieldCheck } from 'lucide-react';

// Beta helper types — the SDK exposes these at runtime.
type OAuthClient = {
  name?: string;
  client_name?: string;
  redirect_uri?: string;
  redirect_uris?: string[];
  scope?: string;
};

type AuthorizationDetails = {
  client?: OAuthClient;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
};

function oauthNs() {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id') ?? '';
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError('Paramètre authorization_id manquant.');
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = '/auth?next=' + encodeURIComponent(next);
        return;
      }
      setUserEmail(sess.session.user.email ?? null);
      try {
        const { data, error } = await oauthNs().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message);
          return;
        }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Impossible de charger la demande.');
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const ns = oauthNs();
      const { data, error } = approve
        ? await ns.approveAuthorization(authorizationId)
        : await ns.denyAuthorization(authorizationId);
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setError('Aucune URL de redirection renvoyée par le serveur d\'autorisation.');
        setBusy(false);
        return;
      }
      window.location.href = target;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue');
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Autorisation impossible</CardTitle>
            <CardDescription>Cette demande de connexion n'a pas pu être chargée.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground break-words">{error}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const clientName = details.client?.client_name ?? details.client?.name ?? 'une application externe';

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary mb-2">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-medium uppercase tracking-wide">Autorisation IKtracker</span>
          </div>
          <CardTitle>Connecter {clientName} à votre compte IKtracker</CardTitle>
          <CardDescription>
            {clientName} pourra utiliser les outils IKtracker en votre nom : lister vos trajets, véhicules,
            cumuls annuels, et créer de nouveaux trajets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userEmail && (
            <p className="text-sm text-muted-foreground">
              Compte : <span className="font-medium text-foreground">{userEmail}</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Cette autorisation ne contourne pas les règles d'accès IKtracker : {clientName} ne verra que
            vos données, selon les mêmes permissions que dans l'application.
          </p>
          <div className="flex gap-2 pt-2">
            <Button onClick={() => decide(true)} disabled={busy} className="flex-1">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Autoriser'}
            </Button>
            <Button onClick={() => decide(false)} disabled={busy} variant="outline" className="flex-1">
              Refuser
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
