import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Car,
  Users,
  MapPin,
  Clock,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Bot,
  Hand,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

interface TourModeStats {
  total_tours: number;
  finalized_manual: number;
  finalized_auto: number;
  active_sessions: number;
  abandoned_sessions: number;
  avg_stops: number;
  avg_km: number;
  avg_duration_min: number;
  unique_users_7d: number;
  unique_users_period: number;
}

interface DailyRow {
  day: string;
  tours_created: number;
  unique_users_7d_rolling: number;
}

interface UserRow {
  user_id: string;
  email: string;
  persona: string;
  tours_count: number;
  total_km: number;
  first_tour_at: string;
  last_tour_at: string;
}

interface PersonaRow {
  persona: string;
  users_count: number;
  tours_count: number;
}

const PERSONA_LABELS: Record<string, string> = {
  chauffeur_vtc: 'Chauffeur VTC',
  livreur: 'Livreur',
  commercial: 'Commercial',
  freelance: 'Freelance',
  artisan: 'Artisan',
  salarie: 'Salarié',
  infirmier: 'Infirmier·ère',
  autre: 'Autre',
  'non renseigné': 'Non renseigné',
};

export const AdminTourMode = () => {
  const [daysBack, setDaysBack] = useState(30);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['tour-mode-stats', daysBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tour_mode_stats' as any, { days_back: daysBack });
      if (error) throw error;
      return data as unknown as TourModeStats;
    },
  });

  const { data: daily = [], isLoading: dailyLoading, refetch: refetchDaily } = useQuery({
    queryKey: ['tour-mode-daily', daysBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tour_mode_daily' as any, { days_back: daysBack });
      if (error) throw error;
      return (data || []) as DailyRow[];
    },
  });

  const { data: personas = [], isLoading: personasLoading, refetch: refetchPersonas } = useQuery({
    queryKey: ['tour-mode-personas', daysBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tour_mode_personas' as any, { days_back: daysBack });
      if (error) throw error;
      return (data || []) as PersonaRow[];
    },
  });

  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['tour-mode-users', daysBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tour_mode_users' as any, { days_back: daysBack });
      if (error) throw error;
      return (data || []) as UserRow[];
    },
  });

  const handleRefresh = () => {
    refetchStats();
    refetchDaily();
    refetchPersonas();
    refetchUsers();
  };

  const manualPct =
    stats && stats.total_tours > 0
      ? Math.round((stats.finalized_manual / stats.total_tours) * 100)
      : 0;
  const autoPct =
    stats && stats.total_tours > 0
      ? Math.round((stats.finalized_auto / stats.total_tours) * 100)
      : 0;

  const dailyFormatted = daily.map((d) => ({
    ...d,
    label: new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
  }));

  const personasFormatted = personas.map((p) => ({
    ...p,
    label: PERSONA_LABELS[p.persona] || p.persona,
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">Mode Tournée — Usage</h2>
          <p className="text-sm text-muted-foreground">
            Suivi de l'activité, des finalisations et des personas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={String(daysBack)} onValueChange={(v) => setDaysBack(Number(v))}>
            <TabsList>
              <TabsTrigger value="7">7j</TabsTrigger>
              <TabsTrigger value="30">30j</TabsTrigger>
              <TabsTrigger value="90">90j</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Compteurs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<Car className="w-4 h-4" />}
          label="Tournées totales"
          value={statsLoading ? '…' : stats?.total_tours ?? 0}
          sub={`${stats?.unique_users_period ?? 0} utilisateurs uniques`}
        />
        <KpiCard
          icon={<Users className="w-4 h-4" />}
          label="Utilisateurs uniques 7j"
          value={statsLoading ? '…' : stats?.unique_users_7d ?? 0}
          sub="Ont créé au moins 1 tournée"
        />
        <KpiCard
          icon={<Activity className="w-4 h-4 text-emerald-600" />}
          label="Sessions actives"
          value={statsLoading ? '…' : stats?.active_sessions ?? 0}
          sub="En cours maintenant"
        />
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4 text-destructive" />}
          label="Tournées abandonnées"
          value={statsLoading ? '…' : stats?.abandoned_sessions ?? 0}
          sub="Actives sans activité > 24h"
          variant={Number(stats?.abandoned_sessions ?? 0) > 0 ? 'destructive' : 'default'}
        />

        <KpiCard
          icon={<Hand className="w-4 h-4" />}
          label="Finalisations manuelles"
          value={statsLoading ? '…' : stats?.finalized_manual ?? 0}
          sub={`${manualPct}% des tournées`}
        />
        <KpiCard
          icon={<Bot className="w-4 h-4" />}
          label="Auto-finalisations"
          value={statsLoading ? '…' : stats?.finalized_auto ?? 0}
          sub={`${autoPct}% des tournées`}
        />
        <KpiCard
          icon={<MapPin className="w-4 h-4" />}
          label="Étapes / tournée"
          value={statsLoading ? '…' : stats?.avg_stops ?? 0}
          sub={`${stats?.avg_km ?? 0} km en moyenne`}
        />
        <KpiCard
          icon={<Clock className="w-4 h-4" />}
          label="Durée moyenne"
          value={statsLoading ? '…' : `${stats?.avg_duration_min ?? 0} min`}
          sub="Sessions finalisées"
        />
      </div>

      {/* Graph : utilisateurs uniques 7j glissants */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Utilisateurs uniques actifs (fenêtre glissante 7 jours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyFormatted}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="unique_users_7d_rolling"
                  name="Utilisateurs uniques (7j glissants)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Graph : tournées créées par jour */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="w-4 h-4" />
            Tournées créées par jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyLoading ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyFormatted}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="tours_created" name="Tournées" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Personas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Personas utilisant le Mode Tournée
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {personasLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : personasFormatted.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">
              Aucune donnée sur la période.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead className="text-right">Utilisateurs</TableHead>
                  <TableHead className="text-right">Tournées</TableHead>
                  <TableHead className="text-right">Tournées / user</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personasFormatted.map((p) => (
                  <TableRow key={p.persona}>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{p.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{p.users_count}</TableCell>
                    <TableCell className="text-right text-sm">{p.tours_count}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {p.users_count > 0 ? (p.tours_count / p.users_count).toFixed(1) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const KpiCard = ({
  icon,
  label,
  value,
  sub,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  variant?: 'default' | 'destructive';
}) => (
  <Card className={variant === 'destructive' ? 'border-destructive/30' : ''}>
    <CardContent className="pt-4 pb-3">
      <div className="flex items-center justify-between text-muted-foreground text-xs mb-1">
        <span>{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </CardContent>
  </Card>
);
