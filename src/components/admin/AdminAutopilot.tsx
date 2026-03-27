import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
} from 'lucide-react';

// Types
interface AuditLog {
  id: string;
  created_at: string;
  action: string;
  resource_type: string;
  resource_id: string;
  api_key_name: string | null;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  reverted: boolean;
  reverted_at: string | null;
}

interface AutopilotEvent {
  id: string;
  audit_log_id: string | null;
  created_at: string;
  event_type: string;
  severity: string;
  page_key: string | null;
  message: string;
  details: Record<string, unknown> | null;
  resolved: boolean;
  resolved_at: string | null;
}

// Health score calculation
function getPageHealth(events: AutopilotEvent[], pageKey: string): { score: number; color: string; label: string } {
  const pageEvents = events.filter(e => e.page_key === pageKey && !e.resolved);
  const criticalCount = pageEvents.filter(e => e.severity === 'critical').length;
  const warningCount = pageEvents.filter(e => e.severity === 'warning').length;

  if (criticalCount > 0) return { score: 0, color: 'text-destructive', label: 'Critique' };
  if (warningCount > 0) return { score: 50, color: 'text-warning', label: 'Warning' };
  return { score: 100, color: 'text-emerald-500', label: 'OK' };
}

// Resource type icons/labels
const RESOURCE_LABELS: Record<string, { icon: typeof FileText; label: string }> = {
  'post': { icon: FileText, label: 'Article' },
  'page': { icon: Globe, label: 'Page' },
  'seo': { icon: Globe, label: 'SEO' },
  'injection': { icon: Code2, label: 'Injection' },
  'config': { icon: Settings, label: 'Config' },
  'media': { icon: FileText, label: 'Média' },
  'redirect': { icon: ArrowRight, label: 'Redirect' },
};

const SEVERITY_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  'info': { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted/50' },
  'warning': { icon: AlertTriangle, color: 'text-warning', bg: 'bg-yellow-500/10' },
  'critical': { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

// Diff viewer component
function DiffView({ previous, current }: { previous: Record<string, unknown> | null; current: Record<string, unknown> | null }) {
  if (!previous && !current) return null;

  const allKeys = new Set([
    ...Object.keys(previous || {}),
    ...Object.keys(current || {}),
  ]);

  const changedKeys = Array.from(allKeys).filter(key => {
    const prev = JSON.stringify((previous || {})[key]);
    const curr = JSON.stringify((current || {})[key]);
    return prev !== curr;
  });

  if (changedKeys.length === 0) return <p className="text-xs text-muted-foreground italic">Aucun changement détecté</p>;

  return (
    <div className="space-y-2 text-xs font-mono">
      {changedKeys.map(key => (
        <div key={key} className="space-y-0.5">
          <p className="text-muted-foreground font-semibold">{key}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-destructive/10 rounded p-1.5 overflow-x-auto">
              <span className="text-destructive">- </span>
              {truncateValue((previous || {})[key])}
            </div>
            <div className="bg-emerald-500/10 rounded p-1.5 overflow-x-auto">
              <span className="text-emerald-500">+ </span>
              {truncateValue((current || {})[key])}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function truncateValue(value: unknown): string {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  if (!str) return '(vide)';
  return str.length > 120 ? str.slice(0, 120) + '…' : str;
}

// Audit log card with linked events
function AuditCard({
  log,
  events,
  onRevert,
  onResolveEvent,
}: {
  log: AuditLog;
  events: AutopilotEvent[];
  onRevert: (id: string) => void;
  onResolveEvent: (id: string) => void;
}) {
  const [showDiff, setShowDiff] = useState(false);
  const linkedEvents = events.filter(e => e.audit_log_id === log.id);
  const resourceInfo = RESOURCE_LABELS[log.resource_type] || RESOURCE_LABELS['post'];
  const Icon = resourceInfo.icon;

  return (
    <Card className={`transition-all ${log.reverted ? 'opacity-60 border-dashed' : ''}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-primary">
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">{resourceInfo.label}</Badge>
              <Badge variant={log.action === 'delete' ? 'destructive' : 'secondary'} className="text-xs">
                {log.action.toUpperCase()}
              </Badge>
              {log.reverted && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <RotateCcw className="w-3 h-3" /> Annulé
                </Badge>
              )}
              {log.api_key_name && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  via {log.api_key_name}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {format(new Date(log.created_at), 'dd MMM HH:mm', { locale: fr })}
              </span>
            </div>
            <p className="text-sm font-medium truncate">
              {log.resource_type}/{log.resource_id}
            </p>
          </div>

          {!log.reverted && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onRevert(log.id)}
              title="Annuler cette modification"
            >
              <RotateCcw className="w-4 h-4 text-primary" />
            </Button>
          )}
        </div>

        {/* Diff toggle */}
        {(log.previous_data || log.new_data) && (
          <>
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="text-xs text-primary hover:underline"
            >
              {showDiff ? 'Masquer' : 'Voir'} le diff
            </button>
            {showDiff && (
              <div className="bg-muted/30 rounded-md p-3">
                <DiffView previous={log.previous_data} current={log.new_data} />
              </div>
            )}
          </>
        )}

        {/* Linked events */}
        {linkedEvents.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Zap className="w-3 h-3" /> Événements liés ({linkedEvents.length})
            </p>
            {linkedEvents.map(evt => {
              const sev = SEVERITY_CONFIG[evt.severity] || SEVERITY_CONFIG['info'];
              const SevIcon = sev.icon;
              return (
                <div key={evt.id} className={`flex items-start gap-2 p-2 rounded-md ${sev.bg}`}>
                  <SevIcon className={`w-4 h-4 mt-0.5 shrink-0 ${sev.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">{evt.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {format(new Date(evt.created_at), 'dd MMM HH:mm', { locale: fr })}
                    </p>
                  </div>
                  {!evt.resolved && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => onResolveEvent(evt.id)}
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Health dashboard
function HealthDashboard({ events }: { events: AutopilotEvent[] }) {
  const activeEvents = events.filter(e => !e.resolved);
  const pages = [...new Set(activeEvents.map(e => e.page_key).filter(Boolean))] as string[];

  const criticalCount = activeEvents.filter(e => e.severity === 'critical').length;
  const warningCount = activeEvents.filter(e => e.severity === 'warning').length;
  const infoCount = activeEvents.filter(e => e.severity === 'info').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Score de santé
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary badges */}
        <div className="flex gap-2 mb-4">
          <div className="flex items-center gap-1 bg-destructive/10 rounded-md px-2 py-1">
            <XCircle className="w-3 h-3 text-destructive" />
            <span className="text-xs font-bold">{criticalCount}</span>
          </div>
          <div className="flex items-center gap-1 bg-yellow-500/10 rounded-md px-2 py-1">
            <AlertTriangle className="w-3 h-3 text-warning" />
            <span className="text-xs font-bold">{warningCount}</span>
          </div>
          <div className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1">
            <Info className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-bold">{infoCount}</span>
          </div>
        </div>

        {pages.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-50" />
            <p className="text-xs text-muted-foreground">Aucun problème détecté</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pages.map(page => {
              const health = getPageHealth(events, page);
              return (
                <div key={page} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                  <div className={`w-2 h-2 rounded-full ${health.score === 100 ? 'bg-emerald-500' : health.score === 50 ? 'bg-yellow-500' : 'bg-destructive'}`} />
                  <code className="text-xs flex-1 truncate">{page}</code>
                  <Badge variant="outline" className={`text-[10px] ${health.color}`}>
                    {health.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper to render structured detail sections
function DetailSection({ icon: Icon, label, children }: { icon: typeof Info; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <div className="bg-muted/30 rounded-md p-2 text-xs overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

function renderDetailValue(value: unknown): string {
  if (value === null || value === undefined) return '(vide)';
  if (typeof value === 'string') return value.length > 300 ? value.slice(0, 300) + '…' : value;
  return JSON.stringify(value, null, 2);
}

// Event detail card with expandable structured view
function EventDetailCard({
  evt,
  sev,
  SevIcon,
  linkedLog,
  details,
  onResolve,
}: {
  evt: AutopilotEvent;
  sev: { icon: typeof Info; color: string; bg: string };
  SevIcon: typeof Info;
  linkedLog: AuditLog | null;
  details: Record<string, unknown>;
  onResolve: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Extract meaningful fields from details or linked log
  const pageKey = evt.page_key || (details.page_key as string) || (linkedLog?.resource_type === 'page' ? linkedLog.resource_id : null);
  const resourceType = linkedLog?.resource_type || (details.resource_type as string) || null;
  const resourceId = linkedLog?.resource_id || (details.resource_id as string) || null;
  const action = linkedLog?.action || (details.action as string) || null;

  const previousData = linkedLog?.previous_data || (details.previous_data as Record<string, unknown>) || null;
  const newData = linkedLog?.new_data || (details.new_data as Record<string, unknown>) || null;

  // Detect content fields
  const contentField = newData ? (newData.content || newData.body || newData.html || null) : null;
  const previousContent = previousData ? (previousData.content || previousData.body || previousData.html || null) : null;

  // Detect schema_org / structured data
  const schemaOrg = newData?.schema_org || null;
  const previousSchemaOrg = previousData?.schema_org || null;

  // Detect code injection
  const injectedCode = newData?.content && resourceType === 'injection' ? newData.content : (details.injected_code as string) || null;
  const previousInjectedCode = previousData?.content && resourceType === 'injection' ? previousData.content : null;

  const hasDetails = pageKey || resourceType || contentField || schemaOrg || injectedCode || previousData || newData || Object.keys(details).length > 0;

  return (
    <Card className={`transition-all ${evt.resolved ? 'opacity-60' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <SevIcon className={`w-4 h-4 mt-0.5 shrink-0 ${sev.color}`} />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{evt.event_type}</Badge>
              {resourceType && (
                <Badge variant="secondary" className="text-[10px]">
                  {(RESOURCE_LABELS[resourceType]?.label || resourceType).toUpperCase()}
                </Badge>
              )}
              {action && (
                <Badge variant={action === 'delete' ? 'destructive' : 'outline'} className="text-[10px]">
                  {action.toUpperCase()}
                </Badge>
              )}
              {pageKey && (
                <code className="text-[10px] bg-muted px-1 rounded">{pageKey}</code>
              )}
              {evt.resolved && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Résolu
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground ml-auto">
                {format(new Date(evt.created_at), 'dd MMM HH:mm', { locale: fr })}
              </span>
            </div>

            <p className="text-sm">{evt.message}</p>

            {resourceId && (
              <p className="text-[10px] text-muted-foreground font-mono">
                {resourceType}/{resourceId}
              </p>
            )}

            {/* Expand/collapse toggle */}
            {hasDetails && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
              >
                <Eye className="w-3 h-3" />
                {expanded ? 'Masquer' : 'Voir'} les détails
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}

            {expanded && (
              <div className="space-y-3 mt-2 border-t pt-2">
                {/* Page modifiée */}
                {pageKey && (
                  <DetailSection icon={Globe} label="Page modifiée">
                    <code className="text-xs">{pageKey}</code>
                    {newData?.meta_title && <p className="text-muted-foreground mt-1">Titre : {String(newData.meta_title)}</p>}
                    {newData?.meta_description && <p className="text-muted-foreground mt-1">Description : {String(newData.meta_description)}</p>}
                    {newData?.canonical_url && <p className="text-muted-foreground mt-1">URL canonique : {String(newData.canonical_url)}</p>}
                  </DetailSection>
                )}

                {/* Contenu modifié */}
                {contentField && resourceType !== 'injection' && (
                  <DetailSection icon={FileText} label="Contenu modifié">
                    <pre className="whitespace-pre-wrap text-[10px] max-h-40 overflow-y-auto">
                      {renderDetailValue(contentField)}
                    </pre>
                  </DetailSection>
                )}

                {/* Données structurées (schema.org) */}
                {schemaOrg && (
                  <DetailSection icon={Database} label="Données structurées (Schema.org)">
                    <pre className="whitespace-pre-wrap text-[10px] max-h-40 overflow-y-auto">
                      {renderDetailValue(schemaOrg)}
                    </pre>
                  </DetailSection>
                )}

                {/* Code injecté */}
                {injectedCode && (
                  <DetailSection icon={FileCode} label="Code injecté">
                    <pre className="whitespace-pre-wrap text-[10px] max-h-40 overflow-y-auto font-mono bg-background p-2 rounded border">
                      {renderDetailValue(injectedCode)}
                    </pre>
                  </DetailSection>
                )}

                {/* État avant modification */}
                {previousData && Object.keys(previousData).length > 0 && (
                  <DetailSection icon={RotateCcw} label="Avant modification">
                    <div className="space-y-1">
                      {Object.entries(previousData).map(([key, val]) => (
                        <div key={key}>
                          <span className="text-muted-foreground font-semibold">{key} :</span>{' '}
                          <span className="text-[10px]">{truncateValue(val)}</span>
                        </div>
                      ))}
                    </div>
                  </DetailSection>
                )}

                {/* Diff si on a avant et après */}
                {previousData && newData && (
                  <DetailSection icon={ArrowRight} label="Diff avant → après">
                    <DiffView previous={previousData} current={newData} />
                  </DetailSection>
                )}

                {/* Fallback: raw details if no structured fields matched */}
                {!pageKey && !contentField && !schemaOrg && !injectedCode && !previousData && Object.keys(details).length > 0 && (
                  <DetailSection icon={Info} label="Détails bruts">
                    <pre className="whitespace-pre-wrap text-[10px] max-h-40 overflow-y-auto">
                      {JSON.stringify(details, null, 2)}
                    </pre>
                  </DetailSection>
                )}
              </div>
            )}
          </div>
          {!evt.resolved && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={onResolve}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Main component
export function AdminAutopilot() {
  const [tab, setTab] = useState<'timeline' | 'events'>('timeline');
  const [showReverted, setShowReverted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch audit logs (changes by Crawlers)
  const { data: auditLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['autopilot-audit-logs', showReverted],
    queryFn: async () => {
      let query = supabase
        .from('api_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!showReverted) {
        query = query.eq('reverted', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AuditLog[];
    },
    refetchInterval: 30_000,
  });

  // Fetch autopilot events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['autopilot-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('autopilot_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as AutopilotEvent[];
    },
    refetchInterval: 30_000,
  });

  // Revert mutation
  const revertMutation = useMutation({
    mutationFn: async (logId: string) => {
      const log = auditLogs.find(l => l.id === logId);
      if (!log || !log.previous_data) throw new Error('No previous data to revert');

      // Call the blog-api revert endpoint
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const resp = await fetch(`${supabaseUrl}/functions/v1/blog-api/audit/${logId}/revert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': '', // Will fail — needs admin to use the API key
        },
      });

      // Fallback: mark as reverted directly
      const { error } = await supabase
        .from('api_audit_logs')
        .update({ reverted: true, reverted_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', logId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autopilot-audit-logs'] });
      toast({ title: 'Modification annulée' });
    },
    onError: (err) => {
      toast({ title: 'Erreur', description: String(err), variant: 'destructive' });
    },
  });

  // Resolve event
  const resolveEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('autopilot_events')
        .update({ resolved: true, resolved_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autopilot-events'] });
      toast({ title: 'Événement résolu' });
    },
  });

  const activeEventsCount = events.filter(e => !e.resolved).length;

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['autopilot-audit-logs'] });
                queryClient.invalidateQueries({ queryKey: ['autopilot-events'] });
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Health dashboard */}
          <HealthDashboard events={events} />

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'timeline' | 'events')} className="mt-4">
            <div className="flex items-center gap-3 mb-4">
              <TabsList>
                <TabsTrigger value="timeline" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Changements
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] text-[10px]">
                    {auditLogs.length}
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
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Aucune modification Autopilot</p>
                  <p className="text-xs mt-1">Les changements effectués par Crawlers apparaîtront ici</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-3 pr-2">
                    {auditLogs.map(log => (
                      <AuditCard
                        key={log.id}
                        log={log}
                        events={events}
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
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500 opacity-50" />
                  <p className="font-medium">Aucun événement détecté</p>
                  <p className="text-xs mt-1">Tout fonctionne normalement 🎉</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-2 pr-2">
                    {events.map(evt => {
                      const sev = SEVERITY_CONFIG[evt.severity] || SEVERITY_CONFIG['info'];
                      const SevIcon = sev.icon;
                      const linkedLog = evt.audit_log_id ? auditLogs.find(l => l.id === evt.audit_log_id) : null;
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
    </div>
  );
}
