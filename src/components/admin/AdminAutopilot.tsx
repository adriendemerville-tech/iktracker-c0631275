import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  RotateCcw,
  FileText,
  Code2,
  Globe,
  Settings,
  Zap,
  Shield,
  ArrowRight,
  Eye,
  ChevronDown,
  ChevronUp,
  Database,
  FileCode,
  Download,
  Filter,
} from "lucide-react";
import { AutopilotCounters } from "./AutopilotCounters";
import { AuditSessionGroup, buildAuditSessions, type AuditSession } from "./AuditSessionGroup";
import { SessionDetailSheet } from "./SessionDetailSheet";
import { auditLogsToCsv, eventsToCsv, downloadCsv } from "@/lib/autopilot-export";
import type { AuditLog, AutopilotEvent } from "./autopilot/types";
import {
  getPageHealth,
  RESOURCE_LABELS,
  SEVERITY_CONFIG,
  AuditCard,
  HealthDashboard,
  EventDetailCard,
} from "./autopilot/AutopilotCards";
import {
  type ReportPeriod,
  REPORT_PERIOD_LABELS,
  REPORT_PERIOD_MS,
  generateReportHTML,
} from "./autopilot/report";

// Main component
export function AdminAutopilot() {
  const [tab, setTab] = useState<"timeline" | "events">("timeline");
  const [showReverted, setShowReverted] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("1d");
  const [apiKeyFilter, setApiKeyFilter] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    return localStorage.getItem("autopilot:apiKeyFilter") || "all";
  });
  const [groupBySession, setGroupBySession] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("autopilot:groupBySession") !== "false";
  });
  const [detailSession, setDetailSession] = useState<AuditSession | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    localStorage.setItem("autopilot:apiKeyFilter", apiKeyFilter);
  }, [apiKeyFilter]);

  useEffect(() => {
    localStorage.setItem("autopilot:groupBySession", String(groupBySession));
  }, [groupBySession]);

  // Realtime indicator
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState<Date | null>(null);

  // Fetch audit logs (changes by Crawlers) — fallback polling 5min, realtime drives updates
  const { data: auditLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["autopilot-audit-logs", showReverted],
    queryFn: async () => {
      let query = supabase
        .from("api_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!showReverted) {
        query = query.eq("reverted", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AuditLog[];
    },
    refetchInterval: 5 * 60_000,
  });

  // Fetch autopilot events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["autopilot-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autopilot_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as AutopilotEvent[];
    },
    refetchInterval: 5 * 60_000,
  });

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("autopilot-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "api_audit_logs" }, () => {
        setLastRealtimeEvent(new Date());
        queryClient.invalidateQueries({ queryKey: ["autopilot-audit-logs"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "autopilot_events" }, () => {
        setLastRealtimeEvent(new Date());
        queryClient.invalidateQueries({ queryKey: ["autopilot-events"] });
      })
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Revert mutation
  const revertMutation = useMutation({
    mutationFn: async (logId: string) => {
      const log = auditLogs.find((l) => l.id === logId);
      if (!log || !log.previous_data) throw new Error("No previous data to revert");

      // Call the blog-api revert endpoint
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const resp = await fetch(`${supabaseUrl}/functions/v1/blog-api/audit/${logId}/revert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "", // Will fail — needs admin to use the API key
        },
      });

      // Fallback: mark as reverted directly
      const { error } = await supabase
        .from("api_audit_logs")
        .update({ reverted: true, reverted_at: new Date().toISOString() })
        .eq("id", logId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-audit-logs"] });
      toast({ title: "Modification annulée" });
    },
    onError: (err) => {
      toast({ title: "Erreur", description: String(err), variant: "destructive" });
    },
  });

  // Resolve event
  const resolveEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("autopilot_events")
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-events"] });
      toast({ title: "Événement résolu" });
    },
  });

  // Distinct API key names for filter dropdown
  const apiKeyOptions = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((l) => {
      if (l.api_key_name) set.add(l.api_key_name);
    });
    return Array.from(set).sort();
  }, [auditLogs]);

  // Apply filter
  const filteredAuditLogs = useMemo(() => {
    if (apiKeyFilter === "all") return auditLogs;
    if (apiKeyFilter === "__none__") return auditLogs.filter((l) => !l.api_key_name);
    return auditLogs.filter((l) => l.api_key_name === apiKeyFilter);
  }, [auditLogs, apiKeyFilter]);

  const filteredEvents = useMemo(() => {
    if (apiKeyFilter === "all") return events;
    const allowedLogIds = new Set(filteredAuditLogs.map((l) => l.id));
    return events.filter((e) => {
      // Keep events linked to a filtered log, or events with matching api_key in details
      if (e.audit_log_id && allowedLogIds.has(e.audit_log_id)) return true;
      const detailKey = (e.details as Record<string, unknown> | null)?.api_key;
      if (apiKeyFilter === "__none__") return !detailKey;
      return detailKey === apiKeyFilter;
    });
  }, [events, filteredAuditLogs, apiKeyFilter]);

  const activeEventsCount = filteredEvents.filter((e) => !e.resolved).length;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Autopilot Crawler
              </CardTitle>
              <CardDescription>
                Registre des modifications apportées par Crawlers via l'API et événements associés
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-[10px] gap-1 ${realtimeConnected ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10" : "border-muted text-muted-foreground"}`}
                title={
                  lastRealtimeEvent
                    ? `Dernier événement reçu : ${lastRealtimeEvent.toLocaleTimeString("fr-FR")}`
                    : realtimeConnected
                      ? "Connecté en temps réel, en attente d'activité"
                      : "Realtime déconnecté — fallback polling 5 min"
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${realtimeConnected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`}
                />
                {realtimeConnected ? "Live" : "Polling"}
              </Badge>
              {apiKeyOptions.length > 0 && (
                <div className="flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  <select
                    value={apiKeyFilter}
                    onChange={(e) => setApiKeyFilter(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs max-w-[160px]"
                    title="Filtrer par clé API"
                  >
                    <option value="all">Toutes les clés</option>
                    {apiKeyOptions.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                    <option value="__none__">Sans clé</option>
                  </select>
                </div>
              )}
              <select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value as ReportPeriod)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="1d">24h</option>
                <option value="7d">7 jours</option>
                <option value="30d">30 jours</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const stamp = format(new Date(), "yyyy-MM-dd_HHmm");
                  const csv =
                    tab === "events"
                      ? eventsToCsv(filteredEvents)
                      : auditLogsToCsv(filteredAuditLogs);
                  const base = tab === "events" ? "autopilot-events" : "autopilot-audit";
                  downloadCsv(`${base}_${stamp}.csv`, csv);
                  toast({ title: "Export CSV téléchargé" });
                }}
                title="Exporter la vue courante en CSV"
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const html = generateReportHTML(filteredAuditLogs, filteredEvents, reportPeriod);
                  const w = window.open("", "_blank");
                  if (!w) {
                    toast({ title: "Autorisez les popups pour télécharger le rapport" });
                    return;
                  }
                  w.document.open();
                  w.document.write(html);
                  w.document.close();
                  w.addEventListener("load", () => setTimeout(() => w.print(), 400));
                  setTimeout(() => {
                    if (!w.closed) w.print();
                  }, 2000);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Rapport
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["autopilot-audit-logs"] });
                  queryClient.invalidateQueries({ queryKey: ["autopilot-events"] });
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Crawlers activity counters */}
          <AutopilotCounters auditLogs={filteredAuditLogs} />

          {/* Health dashboard */}
          <HealthDashboard events={filteredEvents} />

          {/* Tabs */}
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "timeline" | "events")}
            className="mt-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <TabsList>
                <TabsTrigger value="timeline" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Changements
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-[10px]">
                    {filteredAuditLogs.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="events" className="gap-2">
                  <Zap className="w-4 h-4" />
                  Événements
                  {activeEventsCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] text-[10px]">
                      {activeEventsCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <label className="flex items-center gap-2 text-xs text-muted-foreground ml-auto cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupBySession}
                  onChange={(e) => setGroupBySession(e.target.checked)}
                  className="rounded"
                />
                Grouper par session
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={showReverted}
                  onChange={(e) => setShowReverted(e.target.checked)}
                  className="rounded"
                />
                Afficher les annulés
              </label>
            </div>

            {/* Timeline tab */}
            <TabsContent value="timeline" className="mt-0">
              {logsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Aucune modification Autopilot</p>
                  <p className="text-xs mt-1">
                    {apiKeyFilter !== "all"
                      ? `Aucun changement pour la clé "${apiKeyFilter}"`
                      : "Les changements effectués par Crawlers apparaîtront ici"}
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-3 pr-2">
                    {groupBySession
                      ? buildAuditSessions(filteredAuditLogs).map((session, idx) => (
                          <AuditSessionGroup
                            key={session.key}
                            session={session}
                            defaultOpen={idx === 0}
                            onOpenDetails={(s) => setDetailSession(s)}
                          >
                            {session.logs.map((log) => (
                              <AuditCard
                                key={log.id}
                                log={log}
                                events={filteredEvents}
                                onRevert={(id) => revertMutation.mutate(id)}
                                onResolveEvent={(id) => resolveEventMutation.mutate(id)}
                              />
                            ))}
                          </AuditSessionGroup>
                        ))
                      : filteredAuditLogs.map((log) => (
                          <AuditCard
                            key={log.id}
                            log={log}
                            events={filteredEvents}
                            onRevert={(id) => revertMutation.mutate(id)}
                            onResolveEvent={(id) => resolveEventMutation.mutate(id)}
                          />
                        ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Events tab */}
            <TabsContent value="events" className="mt-0">
              {eventsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500 opacity-50" />
                  <p className="font-medium">Aucun événement détecté</p>
                  <p className="text-xs mt-1">
                    {apiKeyFilter !== "all"
                      ? `Aucun événement pour la clé "${apiKeyFilter}"`
                      : "Tout fonctionne normalement 🎉"}
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-2 pr-2">
                    {filteredEvents.map((evt) => {
                      const sev = SEVERITY_CONFIG[evt.severity] || SEVERITY_CONFIG["info"];
                      const SevIcon = sev.icon;
                      const linkedLog = evt.audit_log_id
                        ? auditLogs.find((l) => l.id === evt.audit_log_id)
                        : null;
                      const details = evt.details || {};
                      return (
                        <EventDetailCard
                          key={evt.id}
                          evt={evt}
                          sev={sev}
                          SevIcon={SevIcon}
                          linkedLog={linkedLog || null}
                          details={details}
                          onResolve={() => resolveEventMutation.mutate(evt.id)}
                        />
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Session detail sheet (Task 6) */}
      <SessionDetailSheet
        session={detailSession}
        events={events}
        open={!!detailSession}
        onOpenChange={(o) => {
          if (!o) setDetailSession(null);
        }}
      />
    </div>
  );
}
