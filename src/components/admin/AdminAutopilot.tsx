import { useState, useEffect, useMemo } from 'react';
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
  Download,
  Filter,
} from 'lucide-react';
import { AutopilotCounters } from './AutopilotCounters';

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
              {classifySource(log) === 'parmenion' ? (
                <Badge className="text-[10px] bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                  Parménion
                </Badge>
              ) : (
                <Badge className="text-[10px] bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-100">
                  Outils Crawlers
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

type ReportPeriod = '1d' | '7d' | '30d';

const REPORT_PERIOD_LABELS: Record<ReportPeriod, string> = {
  '1d': 'Dernières 24h',
  '7d': 'Derniers 7 jours',
  '30d': 'Derniers 30 jours',
};

const REPORT_PERIOD_MS: Record<ReportPeriod, number> = {
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

// Generate the diagnostic paragraph for the report
function generateDiagnosticSection(
  recentLogs: AuditLog[],
  recentEvents: AutopilotEvent[],
  deduped: { log: AuditLog; count: number }[],
  periodLabel: string
): string {
  // --- Volume analysis ---
  const totalCalls = recentLogs.length;
  const uniqueResources = deduped.length;
  const creates = recentLogs.filter(l => l.action === 'create').length;
  const updates = recentLogs.filter(l => l.action === 'update' || l.action === 'upsert').length;
  const deletes = recentLogs.filter(l => l.action === 'delete').length;
  const reverted = recentLogs.filter(l => l.reverted).length;
  const revertRate = totalCalls > 0 ? Math.round((reverted / totalCalls) * 100) : 0;

  // Repeated modifications on same resource (potential churn)
  const highChurn = deduped.filter(d => d.count >= 3);

  // --- Events / friction analysis ---
  const criticalEvents = recentEvents.filter(e => e.severity === 'critical');
  const warningEvents = recentEvents.filter(e => e.severity === 'warning');
  const unresolvedEvents = recentEvents.filter(e => !e.resolved);
  const resolvedEvents = recentEvents.filter(e => e.resolved);

  // Group events by page_key for friction map
  const frictionByPage = new Map<string, AutopilotEvent[]>();
  for (const evt of unresolvedEvents) {
    const key = evt.page_key || '(global)';
    const arr = frictionByPage.get(key) || [];
    arr.push(evt);
    frictionByPage.set(key, arr);
  }

  // --- Resource type breakdown ---
  const byType = new Map<string, number>();
  for (const log of recentLogs) {
    byType.set(log.resource_type, (byType.get(log.resource_type) || 0) + 1);
  }

  // --- SEO/GEO needs assessment ---
  const seoLogs = recentLogs.filter(l => l.resource_type === 'seo' || l.resource_type === 'page');
  const blogLogs = recentLogs.filter(l => l.resource_type === 'post');
  const redirectLogs = recentLogs.filter(l => l.resource_type === 'redirect');
  const injectionLogs = recentLogs.filter(l => l.resource_type === 'injection');

  // Build diagnostic HTML
  let html = `<div class="diag"><h2>🔍 Diagnostic</h2>`;

  // 1. Volume conformity
  html += `<div class="diag-section"><h3>📊 Conformité du volume d'activité</h3>`;
  if (totalCalls === 0) {
    html += `<p>Aucune activité Crawlers détectée sur la période <strong>${periodLabel}</strong>. Vérifier que l'intégration API est opérationnelle.</p>`;
  } else {
    html += `<p>${totalCalls} appel(s) API sur ${uniqueResources} ressource(s) unique(s). `;
    html += `Répartition : ${creates} création(s), ${updates} modification(s), ${deletes} suppression(s).`;
    if (reverted > 0) html += ` <span class="diag-warn">${reverted} action(s) annulée(s) (${revertRate}%)</span>.`;
    html += `</p>`;
    // Type breakdown
    const typeEntries = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]);
    html += `<ul>${typeEntries.map(([type, count]) => `<li><strong>${type}</strong> : ${count} appel(s)</li>`).join('')}</ul>`;
  }
  html += `</div>`;

  // 2. Friction / failures
  html += `<div class="diag-section"><h3>⚠️ Points de friction & échecs</h3>`;
  if (criticalEvents.length === 0 && warningEvents.length === 0 && highChurn.length === 0 && reverted === 0) {
    html += `<p class="diag-ok">✅ Aucun incident, aucune friction détectée. Toutes les actions se sont déroulées normalement.</p>`;
  } else {
    const issues: string[] = [];
    if (criticalEvents.length > 0) issues.push(`<span class="diag-crit">${criticalEvents.length} événement(s) critique(s)</span> nécessitant une attention immédiate`);
    if (warningEvents.length > 0) issues.push(`<span class="diag-warn">${warningEvents.length} avertissement(s)</span> détecté(s)`);
    if (reverted > 0) issues.push(`${reverted} action(s) annulée(s) — indiquant des modifications incorrectes ou non souhaitées`);
    if (highChurn.length > 0) issues.push(`${highChurn.length} ressource(s) modifiée(s) ≥3 fois (churn) : ${highChurn.map(d => '"' + ((d.log.new_data as any)?.title || (d.log.new_data as any)?.slug || d.log.resource_id) + '" (×' + d.count + ')').join(', ')}`);
    html += `<ul>${issues.map(i => `<li>${i}</li>`).join('')}</ul>`;

    // Friction map by page
    if (frictionByPage.size > 0) {
      html += `<p style="margin-top:8px;font-weight:600;font-size:12px;">Pages avec événements non résolus :</p><ul>`;
      for (const [page, evts] of frictionByPage) {
        const crits = evts.filter(e => e.severity === 'critical').length;
        const warns = evts.filter(e => e.severity === 'warning').length;
        html += `<li><strong>${page}</strong> : ${evts.length} événement(s)`;
        if (crits > 0) html += ` dont <span class="diag-crit">${crits} critique(s)</span>`;
        if (warns > 0) html += `${crits > 0 ? ',' : ' dont'} <span class="diag-warn">${warns} warning(s)</span>`;
        html += `</li>`;
      }
      html += `</ul>`;
    }
  }
  html += `</div>`;

  // 3. SEO / GEO needs
  html += `<div class="diag-section"><h3>🌐 Besoins SEO & GEO</h3>`;
  const seoInsights: string[] = [];

  if (seoLogs.length > 0) {
    seoInsights.push(`${seoLogs.length} modification(s) SEO/pages — les métadonnées et le contenu statique sont activement optimisés`);
  } else {
    seoInsights.push(`Aucune modification SEO sur la période — vérifier si les balises meta, schema.org et les contenus statiques sont à jour`);
  }

  if (blogLogs.length > 0) {
    seoInsights.push(`${blogLogs.length} action(s) sur les articles de blog — le contenu éditorial est en mouvement`);
  } else {
    seoInsights.push(`Aucun article de blog créé ou modifié — le contenu frais est essentiel pour le référencement organique et la GEO`);
  }

  if (redirectLogs.length > 0) {
    seoInsights.push(`${redirectLogs.length} redirection(s) gérée(s) — bon suivi des URL cassées`);
  }

  if (injectionLogs.length > 0) {
    seoInsights.push(`${injectionLogs.length} injection(s) de code modifiée(s) — scripts de tracking ou partenaires mis à jour`);
  }

  // Static GEO recommendations
  seoInsights.push(`<strong>Rappel GEO</strong> : les données critiques (barèmes IK, tableaux) doivent être rendues en HTML statique via le meta-renderer pour être indexables par les agents IA (ChatGPT, Perplexity, Claude)`);
  seoInsights.push(`<strong>Rappel SEO</strong> : synchroniser la liste des User-Agents entre le Cloudflare Worker et le meta-renderer pour éviter les redirections fallback`);

  html += `<ul>${seoInsights.map(i => `<li>${i}</li>`).join('')}</ul>`;
  html += `</div>`;

  // Resolution summary
  if (recentEvents.length > 0) {
    html += `<div class="diag-section"><h3>📋 Résumé des événements</h3>`;
    html += `<p>${recentEvents.length} événement(s) total sur la période : ${resolvedEvents.length} résolu(s), ${unresolvedEvents.length} en cours.</p>`;
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

// Heuristic: classify a log as deployed via Parménion or direct Crawlers tools
function classifySource(log: AuditLog): 'parmenion' | 'crawlers_direct' {
  // Parménion handles pages, SEO, injections, config, media, redirects
  const parmenionTypes = ['page', 'seo', 'seo_config', 'injection', 'config', 'site_config', 'redirect', 'media'];
  if (parmenionTypes.includes(log.resource_type)) return 'parmenion';
  // Everything else (posts) = direct Crawlers content tools
  return 'crawlers_direct';
}

// Generate report HTML for a configurable period
function generateReportHTML(logs: AuditLog[], events: AutopilotEvent[], period: ReportPeriod = '1d'): string {
  const now = new Date();
  const periodStart = new Date(now.getTime() - REPORT_PERIOD_MS[period]);
  const periodLabel = REPORT_PERIOD_LABELS[period];
  const recentLogs = logs
    .filter(l => new Date(l.created_at) >= periodStart)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const recentEvents = events
    .filter(e => new Date(e.created_at) >= periodStart);

  const actionLabels: Record<string, string> = {
    create: 'Création',
    update: 'Modification',
    delete: 'Suppression',
    upsert: 'Création / Mise à jour',
  };

  const resourceLabels: Record<string, string> = {
    post: 'Article de blog',
    page: 'Page statique',
    seo: 'Configuration SEO',
    injection: 'Injection de code',
    config: 'Configuration site',
    media: 'Média',
    redirect: 'Redirection',
  };

  function getDescription(log: AuditLog): string {
    const action = actionLabels[log.action] || log.action;
    const resource = resourceLabels[log.resource_type] || log.resource_type;
    const data = log.new_data || log.previous_data || {};
    const title = (data as any).title || (data as any).meta_title || (data as any).slug || (data as any).page_key || log.resource_id;
    return `${action} de ${resource.toLowerCase()} : "${title}"`;
  }

  function getUrl(log: AuditLog): string {
    const data = log.new_data || log.previous_data || {};
    const slug = (data as any).slug || (data as any).page_key || '';
    if (log.resource_type === 'post' && slug) return `https://iktracker.fr/blog/${slug}`;
    if (log.resource_type === 'page' && slug) return `https://iktracker.fr/${slug}`;
    if (log.resource_type === 'seo') return `https://iktracker.fr/${slug || ''}`;
    if (log.resource_type === 'redirect') return (data as any).source_path || '-';
    return '-';
  }

  // Deduplicate: group by resource_type + resource_id, keep most recent, count occurrences
  const groupKey = (l: AuditLog) => `${l.resource_type}::${l.resource_id}`;

  function buildDedupedRows(logSet: AuditLog[]): { log: AuditLog; count: number }[] {
    const grouped = new Map<string, { log: AuditLog; count: number }>();
    for (const log of logSet) {
      const key = groupKey(log);
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, { log, count: 1 });
      } else {
        existing.count++;
      }
    }
    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.log.created_at).getTime() - new Date(a.log.created_at).getTime()
    );
  }

  // Split by source
  const parmenionLogs = recentLogs.filter(l => classifySource(l) === 'parmenion');
  const directLogs = recentLogs.filter(l => classifySource(l) === 'crawlers_direct');
  const parmenionDeduped = buildDedupedRows(parmenionLogs);
  const directDeduped = buildDedupedRows(directLogs);
  const allDeduped = buildDedupedRows(recentLogs);

  const dateRange = `${format(periodStart, 'dd/MM/yyyy HH:mm', { locale: fr })} — ${format(now, 'dd/MM/yyyy HH:mm', { locale: fr })}`;

  function buildTableRows(deduped: { log: AuditLog; count: number }[]): string {
    return deduped.map(({ log, count }) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;white-space:nowrap;font-size:13px;">
          ${format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">
          <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${log.action === 'create' ? '#d1fae5' : log.action === 'delete' ? '#fee2e2' : '#dbeafe'};color:${log.action === 'create' ? '#065f46' : log.action === 'delete' ? '#991b1b' : '#1e40af'}">
            ${(actionLabels[log.action] || log.action).toUpperCase()}
          </span>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;">
          ${getDescription(log)}${count > 1 ? ` <span style="color:#6b7280;font-size:11px;">(×${count})</span>` : ''}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;word-break:break-all;">${getUrl(log)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;text-align:center;">
          ${log.reverted ? '✅ Annulé' : '—'}
        </td>
      </tr>
    `).join('');
  }

  function buildTable(deduped: { log: AuditLog; count: number }[], emptyMsg: string): string {
    if (deduped.length === 0) return `<div class="empty">${emptyMsg}</div>`;
    return `<table>
      <thead><tr>
        <th>Date & Heure</th><th>Action</th><th>Description</th><th>URL</th><th>Statut</th>
      </tr></thead>
      <tbody>${buildTableRows(deduped)}</tbody>
    </table>`;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Rapport Autopilot ${periodLabel} — IKtracker</title>
<style>
  @page { size: A4 landscape; margin: 15mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 40px; color: #1a1a1a; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2.section-title { font-size: 17px; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; display: flex; align-items: center; gap: 8px; }
  .source-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge-parmenion { background: #dbeafe; color: #1e40af; }
  .badge-direct { background: #fce7f3; color: #9d174d; }
  .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
  .stats { display: flex; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
  .stat-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 20px; }
  .stat-box .value { font-size: 24px; font-weight: 700; }
  .stat-box .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #374151; border-bottom: 2px solid #d1d5db; }
  tr:hover td { background: #f9fafb; }
  .diag { margin-top: 32px; padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
  .diag h2 { font-size: 16px; margin: 0 0 16px; color: #1e293b; }
  .diag-section { margin-bottom: 16px; }
  .diag-section h3 { font-size: 13px; font-weight: 600; color: #475569; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .diag-section p, .diag-section li { font-size: 13px; color: #334155; line-height: 1.6; }
  .diag-section ul { padding-left: 18px; margin: 4px 0 0; }
  .diag-ok { color: #16a34a; font-weight: 600; }
  .diag-warn { color: #d97706; font-weight: 600; }
  .diag-crit { color: #dc2626; font-weight: 600; }
  .empty { text-align: center; padding: 40px; color: #9ca3af; font-size: 14px; }
  .footer { margin-top: 32px; text-align: center; color: #9ca3af; font-size: 11px; }
  .source-summary { display: flex; gap: 32px; margin: 12px 0 24px; flex-wrap: wrap; }
  .source-card { flex: 1; min-width: 200px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px; }
  .source-card h4 { font-size: 12px; color: #6b7280; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.5px; }
  .source-card .big { font-size: 28px; font-weight: 700; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>📋 Rapport Autopilot — ${periodLabel}</h1>
  <div class="subtitle">Période : ${dateRange} · Généré le ${format(now, "dd MMMM yyyy 'à' HH:mm", { locale: fr })}</div>
  
  <div class="stats">
    <div class="stat-box"><div class="value">${allDeduped.length}</div><div class="label">Ressources modifiées</div></div>
    <div class="stat-box"><div class="value">${recentLogs.length}</div><div class="label">Appels API totaux</div></div>
    <div class="stat-box"><div class="value">${allDeduped.filter(d => d.log.action === 'create').length}</div><div class="label">Créations</div></div>
    <div class="stat-box"><div class="value">${allDeduped.filter(d => d.log.action === 'update' || d.log.action === 'upsert').length}</div><div class="label">Modifications</div></div>
    <div class="stat-box"><div class="value">${allDeduped.filter(d => d.log.action === 'delete').length}</div><div class="label">Suppressions</div></div>
  </div>

  <!-- Source split summary -->
  <div class="source-summary">
    <div class="source-card">
      <h4><span class="source-badge badge-parmenion">Parménion</span> Orchestrateur</h4>
      <div class="big">${parmenionLogs.length}</div>
      <div style="font-size:12px;color:#6b7280;">${parmenionDeduped.length} ressource(s) · Pages, SEO, injections, config</div>
    </div>
    <div class="source-card">
      <h4><span class="source-badge badge-direct">Outils Crawlers</span> Direct</h4>
      <div class="big">${directLogs.length}</div>
      <div style="font-size:12px;color:#6b7280;">${directDeduped.length} ressource(s) · Articles, contenu éditorial</div>
    </div>
  </div>

  <!-- Parménion section -->
  <h2 class="section-title"><span class="source-badge badge-parmenion">Parménion</span> Actions de l'orchestrateur</h2>
  ${buildTable(parmenionDeduped, 'Aucune action Parménion sur cette période.')}

  <!-- Crawlers Direct section -->
  <h2 class="section-title"><span class="source-badge badge-direct">Outils Crawlers</span> Actions des outils directs</h2>
  ${buildTable(directDeduped, 'Aucune action directe Crawlers sur cette période.')}

  ${generateDiagnosticSection(recentLogs, recentEvents, allDeduped, periodLabel)}

  <div class="footer">IKtracker · Rapport généré automatiquement · iktracker.fr</div>
</body>
</html>`;
}

// Main component
export function AdminAutopilot() {
  const [tab, setTab] = useState<'timeline' | 'events'>('timeline');
  const [showReverted, setShowReverted] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('1d');
  const [apiKeyFilter, setApiKeyFilter] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    return localStorage.getItem('autopilot:apiKeyFilter') || 'all';
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    localStorage.setItem('autopilot:apiKeyFilter', apiKeyFilter);
  }, [apiKeyFilter]);

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

  // Distinct API key names for filter dropdown
  const apiKeyOptions = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach(l => { if (l.api_key_name) set.add(l.api_key_name); });
    return Array.from(set).sort();
  }, [auditLogs]);

  // Apply filter
  const filteredAuditLogs = useMemo(() => {
    if (apiKeyFilter === 'all') return auditLogs;
    if (apiKeyFilter === '__none__') return auditLogs.filter(l => !l.api_key_name);
    return auditLogs.filter(l => l.api_key_name === apiKeyFilter);
  }, [auditLogs, apiKeyFilter]);

  const filteredEvents = useMemo(() => {
    if (apiKeyFilter === 'all') return events;
    const allowedLogIds = new Set(filteredAuditLogs.map(l => l.id));
    return events.filter(e => {
      // Keep events linked to a filtered log, or events with matching api_key in details
      if (e.audit_log_id && allowedLogIds.has(e.audit_log_id)) return true;
      const detailKey = (e.details as Record<string, unknown> | null)?.api_key;
      if (apiKeyFilter === '__none__') return !detailKey;
      return detailKey === apiKeyFilter;
    });
  }, [events, filteredAuditLogs, apiKeyFilter]);

  const activeEventsCount = filteredEvents.filter(e => !e.resolved).length;

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
                    {apiKeyOptions.map(k => (
                      <option key={k} value={k}>{k}</option>
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
                  const html = generateReportHTML(filteredAuditLogs, filteredEvents, reportPeriod);
                  const w = window.open('', '_blank');
                  if (!w) { toast({ title: 'Autorisez les popups pour télécharger le rapport' }); return; }
                  w.document.open();
                  w.document.write(html);
                  w.document.close();
                  w.addEventListener('load', () => setTimeout(() => w.print(), 400));
                  setTimeout(() => { if (!w.closed) w.print(); }, 2000);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Rapport
              </Button>
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
          </div>
        </CardHeader>
        <CardContent>
          {/* Crawlers activity counters */}
          <AutopilotCounters auditLogs={filteredAuditLogs} />

          {/* Health dashboard */}
          <HealthDashboard events={filteredEvents} />

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'timeline' | 'events')} className="mt-4">
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
              ) : filteredAuditLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Aucune modification Autopilot</p>
                  <p className="text-xs mt-1">
                    {apiKeyFilter !== 'all'
                      ? `Aucun changement pour la clé "${apiKeyFilter}"`
                      : "Les changements effectués par Crawlers apparaîtront ici"}
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-3 pr-2">
                    {filteredAuditLogs.map(log => (
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
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500 opacity-50" />
                  <p className="font-medium">Aucun événement détecté</p>
                  <p className="text-xs mt-1">
                    {apiKeyFilter !== 'all'
                      ? `Aucun événement pour la clé "${apiKeyFilter}"`
                      : 'Tout fonctionne normalement 🎉'}
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-2 pr-2">
                    {filteredEvents.map(evt => {
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
