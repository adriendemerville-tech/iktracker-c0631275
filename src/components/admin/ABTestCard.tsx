import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FlaskConical, Trophy } from "lucide-react";
import { HERO_VARIANTS, AB_TEST_ID, type HeroVariant } from "@/lib/ab-test";

interface Row {
  variant: string;
  visitors: number;
  cta_clicks: number;
  signup_views: number;
  signup_starts: number;
  signups: number;
}

interface Props {
  daysBack: number;
}

const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

export function ABTestCard({ daysBack }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-ab-test", daysBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_ab_test_results" as never, {
        days_back: daysBack,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Test A/B — Titre du hero</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const rows = (data ?? []).filter((r) => r.variant?.startsWith(`${AB_TEST_ID}:`));
  const best = rows.reduce<Row | null>((acc, r) => {
    if (!acc) return r;
    return pct(r.signups, r.visitors) > pct(acc.signups, acc.visitors) ? r : acc;
  }, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" aria-hidden="true" />
          Test A/B — Titre du hero
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucune donnée pour cette période. Les variantes sont attribuées aux nouveaux visiteurs
            (50/50) et remontent ici dès les premiers évènements.
          </p>
        )}

        {rows.map((row) => {
          const key = row.variant.split(":")[1] as HeroVariant;
          const meta = HERO_VARIANTS[key];
          const conv = pct(row.signups, row.visitors);
          const clickRate = pct(row.cta_clicks, row.visitors);
          const isBest = rows.length > 1 && best?.variant === row.variant && row.signups > 0;

          return (
            <div key={row.variant} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{meta?.label ?? row.variant}</span>
                    {isBest && (
                      <Badge variant="secondary" className="gap-1">
                        <Trophy className="h-3 w-3" aria-hidden="true" />
                        En tête
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    « {meta?.title} {meta?.highlight} »
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold">{conv.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">visiteur → inscrit</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-sm">
                {[
                  { l: "Visiteurs", v: row.visitors },
                  { l: "Clics CTA", v: row.cta_clicks },
                  { l: "Vues signup", v: row.signup_views },
                  { l: "Démarrages", v: row.signup_starts },
                  { l: "Inscrits", v: row.signups },
                ].map((s) => (
                  <div key={s.l} className="rounded-md bg-muted/50 py-2">
                    <div className="font-semibold">{s.v}</div>
                    <div className="text-[11px] text-muted-foreground">{s.l}</div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Taux de clic CTA : {clickRate.toFixed(1)}%
              </p>
            </div>
          );
        })}

        {rows.length > 1 && (
          <p className="text-xs text-muted-foreground">
            Attendre au moins ~300 visiteurs par variante avant de conclure : en dessous, l&apos;écart
            n&apos;est pas statistiquement fiable.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
