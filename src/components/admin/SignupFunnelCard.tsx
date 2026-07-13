import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';

interface SignupFunnel {
  days_back: number;
  views: number;
  oauth_start: number;
  form_submit: number;
  errors: number;
  success_tracked: number;
  new_users: number;
  by_provider: { google: number; apple: number; email: number };
  conversion_rate: number;
  error_rate: number;
  top_errors: Array<{ message: string; count: number }>;
}

interface Props {
  daysBack: number;
}

export function SignupFunnelCard({ daysBack }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-signup-funnel', daysBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_signup_funnel' as any, { days_back: daysBack });
      if (error) throw error;
      return data as unknown as SignupFunnel;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Funnel Signup</CardTitle></CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const totalStart = data.oauth_start + data.form_submit;
  // Denominator = max(vues trackées, comptes créés) — évite les % > 100% quand les vues sont sous-trackées
  // (OAuth direct, /auth, bots/admins filtrés, requestIdleCallback qui rate les visites rapides)
  const denom = Math.max(data.views, data.new_users, 1);
  const undertracked = data.new_users > data.views;

  const steps = [
    { label: 'Vues page (trackées)', value: data.views, pct: Math.round((data.views / denom) * 100) },
    { label: 'Formulaire ou OAuth démarré', value: totalStart, pct: Math.round((totalStart / denom) * 100) },
    { label: 'Erreurs d\'inscription', value: data.errors, pct: data.form_submit ? Math.round((data.errors / data.form_submit) * 100) : 0, isError: true },
    { label: 'Comptes créés (réels)', value: data.new_users, pct: Math.round((data.new_users / denom) * 100), isSuccess: true },
  ];
  // Conversion : comptes créés sur vues trackées, capée à 100% pour rester lisible
  const displayConversion = data.views > 0 ? Math.min(100, Math.round((data.new_users / data.views) * 100)) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Funnel Signup</span>
          <span className="text-sm font-normal text-muted-foreground">
            {daysBack} derniers jours · conversion <strong className="text-foreground">{data.conversion_rate}%</strong>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Funnel steps */}
        <div className="space-y-3">
          {steps.map((s) => (
            <div key={s.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-medium">
                  {s.value.toLocaleString('fr-FR')} · {s.pct}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={
                    s.isError ? 'bg-destructive h-full' :
                    s.isSuccess ? 'bg-green-500 h-full' :
                    'bg-primary h-full'
                  }
                  style={{ width: `${Math.min(100, s.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Provider breakdown */}
        <div>
          <h4 className="text-sm font-medium mb-2">Par provider (comptes créés trackés)</h4>
          <div className="grid grid-cols-3 gap-3">
            {(['google', 'apple', 'email'] as const).map((p) => (
              <div key={p} className="rounded-lg border border-border p-3">
                <div className="text-xs uppercase text-muted-foreground">{p}</div>
                <div className="text-lg font-semibold">{data.by_provider[p]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top errors */}
        {data.top_errors.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4 text-destructive" />
              Top erreurs ({data.error_rate}% des soumissions)
            </h4>
            <ul className="space-y-1 text-sm">
              {data.top_errors.map((e, i) => (
                <li key={i} className="flex justify-between gap-2 text-muted-foreground">
                  <span className="truncate">{e.message}</span>
                  <span className="tabular-nums font-medium text-foreground">{e.count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.views === 0 && (
          <p className="text-xs text-muted-foreground italic">
            Aucune donnée sur cette période. Le tracking commence à s'accumuler dès maintenant.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
