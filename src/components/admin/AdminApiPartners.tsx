import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Key,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "@/lib/router-compat";

interface Partner {
  id: string;
  partner_name: string;
  key_prefix: string;
  scopes: string[];
  monthly_quota: number;
  usage_current_month: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

interface RequestLog {
  id: string;
  partner_id: string | null;
  method: string;
  path: string;
  status_code: number;
  response_time_ms: number | null;
  external_user_id: string | null;
  iktracker_user_id: string | null;
  error_message: string | null;
  created_at: string;
}

const PERIODS = [
  { value: "1", label: "24h" },
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
  { value: "90", label: "90 jours" },
];

export function AdminApiPartners() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("7");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("all");

  const { data: partners = [], refetch: refetchPartners } = useQuery({
    queryKey: ["admin-api-partners-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_api_keys_safe")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Partner[];
    },
    refetchInterval: 60_000,
  });

  const sinceIso = useMemo(() => subDays(new Date(), parseInt(period, 10)).toISOString(), [period]);

  const {
    data: logs = [],
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ["admin-api-partner-logs", period, selectedPartnerId],
    queryFn: async () => {
      let q = supabase
        .from("partner_request_logs")
        .select("*")
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(500);
      if (selectedPartnerId !== "all") q = q.eq("partner_id", selectedPartnerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as RequestLog[];
    },
    refetchInterval: 60_000,
  });

  const partnersById = useMemo(() => {
    const m = new Map<string, Partner>();
    for (const p of partners) m.set(p.id, p);
    return m;
  }, [partners]);

  // Stats
  const stats = useMemo(() => {
    const total = logs.length;
    const errors = logs.filter((l) => l.status_code >= 400).length;
    const success = total - errors;
    const errorRate = total > 0 ? (errors / total) * 100 : 0;
    const avgLatency =
      total > 0
        ? Math.round(logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / total)
        : 0;
    const uniqueUsers = new Set(
      logs.map((l) => l.external_user_id || l.iktracker_user_id).filter(Boolean),
    ).size;

    // By endpoint
    const byEndpoint = new Map<
      string,
      { total: number; errors: number; avgMs: number; sumMs: number }
    >();
    for (const l of logs) {
      const key = `${l.method} ${l.path}`;
      const cur = byEndpoint.get(key) || { total: 0, errors: 0, avgMs: 0, sumMs: 0 };
      cur.total += 1;
      if (l.status_code >= 400) cur.errors += 1;
      cur.sumMs += l.response_time_ms || 0;
      byEndpoint.set(key, cur);
    }
    const endpoints = Array.from(byEndpoint.entries())
      .map(([key, v]) => ({
        key,
        total: v.total,
        errors: v.errors,
        avgMs: v.total > 0 ? Math.round(v.sumMs / v.total) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // By status code
    const byStatus = new Map<number, number>();
    for (const l of logs) byStatus.set(l.status_code, (byStatus.get(l.status_code) || 0) + 1);
    const statuses = Array.from(byStatus.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => a.code - b.code);

    return { total, errors, success, errorRate, avgLatency, uniqueUsers, endpoints, statuses };
  }, [logs]);

  const errorLogs = useMemo(() => logs.filter((l) => l.status_code >= 400), [logs]);

  const refresh = () => {
    refetchPartners();
    refetchLogs();
  };

  const getStatusColor = (code: number) => {
    if (code >= 500) return "text-destructive";
    if (code >= 400) return "text-orange-500";
    if (code >= 300) return "text-blue-500";
    return "text-emerald-600";
  };

  const getStatusBadge = (code: number) => {
    if (code >= 500) return "destructive";
    if (code >= 400) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-4">
      {/* Header & filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Partenaires — Dictadevi & co.
              </CardTitle>
              <CardDescription>
                Statistiques d'utilisation et registre des erreurs des appels API partenaires
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Partenaire" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les partenaires</SelectItem>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.partner_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/app/admin/partners")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Gérer les clés
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={Activity}
          label="Requêtes"
          value={stats.total.toLocaleString("fr-FR")}
          loading={logsLoading}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Erreurs"
          value={stats.errors.toLocaleString("fr-FR")}
          sub={`${stats.errorRate.toFixed(1)}%`}
          tone={stats.errors > 0 ? "destructive" : "success"}
          loading={logsLoading}
        />
        <KpiCard
          icon={Zap}
          label="Latence moy."
          value={`${stats.avgLatency} ms`}
          loading={logsLoading}
        />
        <KpiCard
          icon={Users}
          label="Utilisateurs"
          value={stats.uniqueUsers.toLocaleString("fr-FR")}
          loading={logsLoading}
        />
      </div>

      {/* Active partners summary */}
      {selectedPartnerId === "all" && partners.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Quotas mensuels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {partners.map((p) => {
              const pct = p.monthly_quota > 0 ? (p.usage_current_month / p.monthly_quota) * 100 : 0;
              const tone =
                pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-orange-500" : "bg-emerald-500";
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{p.partner_name}</span>
                      {p.is_active ? (
                        <Badge variant="outline" className="text-[10px] h-4">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] h-4">
                          Désactivée
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground tabular-nums shrink-0">
                      {p.usage_current_month.toLocaleString("fr-FR")} /{" "}
                      {p.monthly_quota.toLocaleString("fr-FR")}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${tone}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Aperçu
          </TabsTrigger>
          <TabsTrigger value="errors" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Erreurs
            {errorLogs.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] text-[10px]">
                {errorLogs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="w-4 h-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-3 mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Endpoints les plus appelés</CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : stats.endpoints.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Aucun appel sur cette période.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {stats.endpoints.slice(0, 10).map((e) => {
                    const errorPct = e.total > 0 ? (e.errors / e.total) * 100 : 0;
                    return (
                      <div
                        key={e.key}
                        className="flex items-center gap-3 text-xs py-1.5 border-b last:border-0"
                      >
                        <code className="flex-1 truncate font-mono">{e.key}</code>
                        <span className="text-muted-foreground tabular-nums w-16 text-right">
                          {e.avgMs}ms
                        </span>
                        {e.errors > 0 && (
                          <Badge variant="destructive" className="text-[10px] h-5">
                            {e.errors} err ({errorPct.toFixed(0)}%)
                          </Badge>
                        )}
                        <span className="font-semibold tabular-nums w-16 text-right">
                          {e.total.toLocaleString("fr-FR")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Répartition par code HTTP</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.statuses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {stats.statuses.map((s) => (
                    <div
                      key={s.code}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 text-xs"
                    >
                      <span className={`font-mono font-bold ${getStatusColor(s.code)}`}>
                        {s.code}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {s.count.toLocaleString("fr-FR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Errors */}
        <TabsContent value="errors" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Registre des erreurs ({errorLogs.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Toutes les requêtes avec un code HTTP ≥ 400 sur la période sélectionnée
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : errorLogs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500 opacity-60" />
                  <p className="font-medium">Aucune erreur API</p>
                  <p className="text-xs mt-1">Tous les appels ont réussi 🎉</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-2 pr-2">
                    {errorLogs.map((log) => {
                      const partner = log.partner_id ? partnersById.get(log.partner_id) : null;
                      return (
                        <div
                          key={log.id}
                          className="border rounded-md p-3 space-y-1.5 bg-destructive/5"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={getStatusBadge(log.status_code)}
                              className="font-mono text-xs"
                            >
                              {log.status_code}
                            </Badge>
                            <span className="font-mono text-xs font-semibold">{log.method}</span>
                            <code className="text-xs flex-1 min-w-0 truncate">{log.path}</code>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                              <Clock className="w-3 h-3 inline mr-0.5 -mt-0.5" />
                              {format(new Date(log.created_at), "dd MMM HH:mm:ss", { locale: fr })}
                            </span>
                          </div>
                          {log.error_message && (
                            <div className="bg-background/60 rounded p-2 mt-1">
                              <p className="text-xs font-mono text-destructive whitespace-pre-wrap break-all">
                                {log.error_message}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                            {partner && (
                              <span>
                                Partenaire : <strong>{partner.partner_name}</strong>
                              </span>
                            )}
                            {log.external_user_id && (
                              <span>
                                Ext. user : <code>{log.external_user_id}</code>
                              </span>
                            )}
                            {log.response_time_ms != null && <span>{log.response_time_ms}ms</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All logs */}
        <TabsContent value="logs" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tous les appels ({logs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Aucun appel sur cette période.
                </p>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-1 text-xs font-mono pr-2">
                    {logs.map((log) => {
                      const partner = log.partner_id ? partnersById.get(log.partner_id) : null;
                      return (
                        <div
                          key={log.id}
                          className="flex items-center gap-2 border-b py-1.5 last:border-0"
                        >
                          <span className="text-muted-foreground w-20 truncate text-[10px]">
                            {format(new Date(log.created_at), "HH:mm:ss")}
                          </span>
                          <span className={`w-10 font-bold ${getStatusColor(log.status_code)}`}>
                            {log.status_code}
                          </span>
                          <span className="w-14">{log.method}</span>
                          <span className="flex-1 truncate">{log.path}</span>
                          <span className="text-muted-foreground w-20 truncate text-[10px]">
                            {partner?.partner_name || "—"}
                          </span>
                          <span className="text-muted-foreground w-12 text-right tabular-nums text-[10px]">
                            {log.response_time_ms ?? "—"}ms
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  loading,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  sub?: string;
  tone?: "destructive" | "success";
  loading?: boolean;
}) {
  const toneClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "success"
        ? "text-emerald-600"
        : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </div>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold tabular-nums ${toneClass}`}>{value}</span>
            {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
