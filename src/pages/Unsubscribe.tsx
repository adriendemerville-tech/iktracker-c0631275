import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

type State = 'loading' | 'ready' | 'confirming' | 'success' | 'already' | 'invalid';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: ANON } },
        );
        const json = await res.json();
        if (!res.ok) return setState('invalid');
        if (json.valid === false && json.reason === 'already_unsubscribed') return setState('already');
        setState('ready');
      } catch {
        setState('invalid');
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState('confirming');
    const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
      body: { token },
    });
    if (error) return setState('invalid');
    if ((data as any)?.reason === 'already_unsubscribed') return setState('already');
    setState('success');
  };

  return (
    <>
      <Helmet>
        <title>Désabonnement | IKtracker</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://iktracker.fr/unsubscribe" />
      </Helmet>
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-sm text-center space-y-5">
        <h1 className="text-2xl font-semibold">Désabonnement IKtracker</h1>

        {state === 'loading' && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Vérification du lien…
          </div>
        )}

        {state === 'ready' && (
          <>
            <p className="text-muted-foreground">
              Confirmez-vous vouloir ne plus recevoir d'emails d'IKtracker à cette adresse ?
            </p>
            <Button onClick={confirm} className="w-full">Confirmer le désabonnement</Button>
          </>
        )}

        {state === 'confirming' && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> En cours…
          </div>
        )}

        {state === 'success' && (
          <p className="text-emerald-600 dark:text-emerald-400">
            Vous êtes désabonné. Vous ne recevrez plus d'emails d'IKtracker.
          </p>
        )}

        {state === 'already' && (
          <p className="text-muted-foreground">Cette adresse est déjà désabonnée.</p>
        )}

        {state === 'invalid' && (
          <p className="text-red-600 dark:text-red-400">
            Lien invalide ou expiré.
          </p>
        )}
      </div>
      </main>
    </>
  );
}
