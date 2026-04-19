import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertCircle, CheckCircle2, Eye, MapPin, RefreshCw, Bell, Activity } from 'lucide-react';

interface RegistryRow {
  session_id: string | null;
  trip_id: string | null;
  user_id: string;
  user_email: string | null;
  source: 'active' | 'finalized';
  is_active: boolean;
  started_at: string;
  last_activity: string;
  finalized_at: string | null;
  stops_count: number;
  distance_km: number;
  recovery_attempts: number;
  recovery_success: number;
  notifications_count: number;
  errors_count: number;
  last_error: string | null;
}

interface RecoveryEvent {
  id: string;
  event_type: string;
  context: string | null;
  inactivity_seconds: number | null;
  is_mobile: boolean | null;
  stops_count: number | null;
  distance_km: number | null;
  error_message: string | null;
  metadata: any;
  created_at: string;
}

const EVENT_LABELS: Record<string, string> = {
  modal_shown: 'Modal affichée',
  resume_clicked: 'Reprise cliquée',
  resume_success: 'Reprise réussie',
  resume_error: 'Erreur reprise',
  finalize_clicked: 'Finalisation cliquée',
  transparent_resume_attempt: 'Reprise auto tentée',
  transparent_resume_success: 'Reprise auto réussie',
  transparent_resume_error: 'Erreur reprise auto',
  auto_finalize_attempt: 'Auto-finalisation tentée',
  auto_finalize_success: 'Auto-finalisation réussie',
  auto_finalize_error: 'Erreur auto-finalisation',
  toast_shown: 'Notification toast',
  session_end: 'Session terminée',
  check_error: 'Erreur de vérification',
};

const EVENT_VARIANTS: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  modal_shown: 'secondary',
  resume_success: 'default',
  transparent_resume_success: 'default',
  auto_finalize_success: 'default',
  resume_error: 'destructive',
  transparent_resume_error: 'destructive',
  auto_finalize_error: 'destructive',
  check_error: 'destructive',
};

type FilterMode = 'all' | 'recovery';

export const AdminTourRecovery = () => {
  const [daysBack, setDaysBack] = useState(30);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['tour-recovery-stats', daysBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tour_recovery_stats' as any, { days_back: daysBack });
      if (error) throw error;
      return data as any;
    },
  });

  const { data: registryRaw = [], isLoading: registryLoading, refetch: refetchRegistry } = useQuery({
    queryKey: ['tour-recovery-registry', daysBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tour_recovery_registry' as any, {
        days_back: daysBack,
        limit_count: 200,
      });
      if (error) throw error;
      return (data || []) as RegistryRow[];
    },
  });

  // Filter rows for "Reprise tournée" mode (only sessions with at least one recovery attempt)
  const registry = filterMode === 'recovery'
    ? registryRaw.filter(r => r.recovery_attempts > 0)
    : registryRaw;

  // Compute aggregated KPIs for filtered rows
  const recoveryRows = registryRaw.filter(r => r.recovery_attempts > 0);
  const totalRecoveryAttempts = recoveryRows.reduce((s, r) => s + r.recovery_attempts, 0);
  const totalRecoverySuccess = recoveryRows.reduce((s, r) => s + r.recovery_success, 0);
  const totalRecoveryFailed = totalRecoveryAttempts - totalRecoverySuccess;
  const sessionsWithErrors = recoveryRows.filter(r => r.errors_count > 0).length;
  const avgNotifsPerRecoverySession = recoveryRows.length > 0
    ? (recoveryRows.reduce((s, r) => s + r.notifications_count, 0) / recoveryRows.length).toFixed(1)
    : '0';
  const successRateGlobal = totalRecoveryAttempts > 0
    ? Math.round((totalRecoverySuccess / totalRecoveryAttempts) * 100)
    : null;

  const { data: sessionEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['tour-recovery-events', selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return [];
      const { data, error } = await supabase
        .from('tour_recovery_events' as any)
        .select('*')
        .eq('session_id', selectedSessionId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as RecoveryEvent[];
    },
    enabled: !!selectedSessionId,
  });

  const handleRefresh = () => {
    refetchStats();
    refetchRegistry();
  };

  // Determine recovery result for a row
  const getRecoveryResult = (row: RegistryRow): { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' } | null => {
    if (row.recovery_attempts === 0) return null;
    if (row.recovery_success === 0) return { label: 'Échec', variant: 'destructive' };
    if (row.recovery_success === row.recovery_attempts) return { label: 'Réussie', variant: 'default' };
    return { label: 'Partielle', variant: 'secondary' };
  };

  return (
    <div className="space-y-4">
      {/* Header + filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">Mode Tournée — Reprise</h2>
          <p className="text-sm text-muted-foreground">
            Registre des tournées et télémétrie de reprise.
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

      {/* Stats KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<MapPin className="w-4 h-4" />}
          label="Tournées (total)"
          value={statsLoading ? '…' : (stats?.total_sessions ?? 0)}
          sub={`${stats?.active_sessions ?? 0} actives · ${stats?.finalized_tours ?? 0} finalisées`}
        />
        <KpiCard
          icon={<Activity className="w-4 h-4" />}
          label="Tentatives reprise"
          value={statsLoading ? '…' : (stats?.recovery_attempts ?? 0)}
          sub={`${stats?.recovery_success ?? 0} réussies`}
        />
        <KpiCard
          icon={<AlertCircle className="w-4 h-4 text-destructive" />}
          label="Erreurs"
          value={statsLoading ? '…' : (stats?.recovery_errors ?? 0)}
          variant={Number(stats?.recovery_errors ?? 0) > 0 ? 'destructive' : 'default'}
        />
        <KpiCard
          icon={<Bell className="w-4 h-4" />}
          label="Notifications"
          value={statsLoading ? '…' : (stats?.notifications_total ?? 0)}
          sub="modals + toasts"
        />
      </div>

      {/* Registre */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registre des tournées ({registry.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {registryLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : registry.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">
              Aucune tournée sur la période sélectionnée.
            </p>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Étapes</TableHead>
                    <TableHead className="text-right">Km</TableHead>
                    <TableHead className="text-right">Reprises</TableHead>
                    <TableHead className="text-right">Notifs</TableHead>
                    <TableHead className="text-right">Erreurs</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registry.map((row) => {
                    const id = row.session_id || row.trip_id || '';
                    const successRate = row.recovery_attempts > 0
                      ? Math.round((row.recovery_success / row.recovery_attempts) * 100)
                      : null;
                    return (
                      <TableRow key={id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(row.last_activity), 'dd/MM HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate">
                          {row.user_email || row.user_id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          {row.is_active ? (
                            <Badge variant="secondary" className="text-xs">Active</Badge>
                          ) : row.source === 'finalized' ? (
                            <Badge variant="outline" className="text-xs">Finalisée</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs">{row.stops_count}</TableCell>
                        <TableCell className="text-right text-xs">{Number(row.distance_km).toFixed(1)}</TableCell>
                        <TableCell className="text-right text-xs">
                          {row.recovery_attempts > 0 ? (
                            <span className="flex items-center justify-end gap-1">
                              <span>{row.recovery_success}/{row.recovery_attempts}</span>
                              {successRate !== null && (
                                <Badge
                                  variant={successRate === 100 ? 'default' : successRate >= 50 ? 'secondary' : 'destructive'}
                                  className="text-[10px] h-4 px-1"
                                >
                                  {successRate}%
                                </Badge>
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {row.notifications_count > 0 ? row.notifications_count : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {row.errors_count > 0 ? (
                            <Badge variant="destructive" className="text-[10px] h-4 px-1">{row.errors_count}</Badge>
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-muted-foreground inline" />
                          )}
                        </TableCell>
                        <TableCell>
                          {row.session_id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => setSelectedSessionId(row.session_id)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Détail événements session */}
      <Sheet open={!!selectedSessionId} onOpenChange={(o) => !o && setSelectedSessionId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Événements de reprise</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {eventsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : sessionEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun événement enregistré.</p>
            ) : (
              sessionEvents.map((ev) => (
                <div key={ev.id} className="border rounded-md p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={EVENT_VARIANTS[ev.event_type] || 'outline'} className="text-xs">
                      {EVENT_LABELS[ev.event_type] || ev.event_type}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(ev.created_at), 'dd/MM HH:mm:ss', { locale: fr })}
                    </span>
                  </div>
                  {ev.context && (
                    <p className="text-xs text-muted-foreground">{ev.context}</p>
                  )}
                  {ev.error_message && (
                    <p className="text-xs text-destructive">⚠ {ev.error_message}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    {ev.is_mobile !== null && <span>{ev.is_mobile ? '📱 Mobile' : '🖥 Desktop'}</span>}
                    {ev.inactivity_seconds !== null && <span>Inactif {Math.round(ev.inactivity_seconds / 60)}min</span>}
                    {ev.stops_count !== null && <span>{ev.stops_count} étapes</span>}
                    {ev.distance_km !== null && <span>{Number(ev.distance_km).toFixed(1)} km</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
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
