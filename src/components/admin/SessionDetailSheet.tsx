import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { format, formatDistanceStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, Layers, FileText, Globe, Code2, Settings, ArrowRight, Zap, AlertTriangle, XCircle, Info, CheckCircle2, RotateCcw } from 'lucide-react';
import type { AuditSession } from './AuditSessionGroup';

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

const RESOURCE_ICONS: Record<string, typeof FileText> = {
  post: FileText,
  page: Globe,
  seo: Globe,
  injection: Code2,
  config: Settings,
  redirect: ArrowRight,
};

const SEVERITY_ICONS: Record<string, { icon: typeof Info; color: string }> = {
  info: { icon: Info, color: 'text-muted-foreground' },
  warning: { icon: AlertTriangle, color: 'text-warning' },
  critical: { icon: XCircle, color: 'text-destructive' },
};

const ACTION_BADGE: Record<string, string> = {
  create: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  update: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  delete: 'bg-red-500/15 text-red-700 border-red-500/30',
  upsert: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
};

export function SessionDetailSheet({
  session,
  events,
  open,
  onOpenChange,
}: {
  session: AuditSession | null;
  events: AutopilotEvent[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const stats = useMemo(() => {
    if (!session) return null;
    const logIds = new Set(session.logs.map(l => l.id));
    const linkedEvents = events.filter(e => e.audit_log_id && logIds.has(e.audit_log_id));
    const uniqueResources = new Set(session.logs.map(l => `${l.resource_type}/${l.resource_id}`));
    const reverted = session.logs.filter(l => l.reverted).length;
    const duration = formatDistanceStrict(new Date(session.startedAt), new Date(session.endedAt), { locale: fr });
    return {
      totalActions: session.logs.length,
      uniqueResources: uniqueResources.size,
      linkedEvents,
      reverted,
      duration,
      criticalCount: linkedEvents.filter(e => e.severity === 'critical').length,
      warningCount: linkedEvents.filter(e => e.severity === 'warning').length,
    };
  }, [session, events]);

  if (!session || !stats) return null;

  // Chronological asc for timeline
  const chronoLogs = [...session.logs].sort(
    (a, b) => +new Date(a.created_at) - +new Date(b.created_at)
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Session {session.api_key_name ?? 'sans clé'}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2 text-xs">
            <Clock className="w-3 h-3" />
            {format(new Date(session.startedAt), 'dd MMM yyyy HH:mm', { locale: fr })}
            {' → '}
            {format(new Date(session.endedAt), 'HH:mm', { locale: fr })}
            <span>·</span>
            <span>{stats.duration}</span>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Actions</p>
                <p className="text-2xl font-bold">{stats.totalActions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ressources</p>
                <p className="text-2xl font-bold">{stats.uniqueResources}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Événements</p>
                <p className="text-2xl font-bold">
                  {stats.linkedEvents.length}
                  {stats.criticalCount > 0 && (
                    <span className="text-xs text-destructive ml-1">({stats.criticalCount}!)</span>
                  )}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Annulés</p>
                <p className="text-2xl font-bold">{stats.reverted}</p>
              </CardContent>
            </Card>
          </div>

          {/* By action */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Répartition par action</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(session.byAction).map(([action, count]) => (
                <Badge key={action} variant="outline" className={`text-[11px] ${ACTION_BADGE[action] || ''}`}>
                  {action} ×{count}
                </Badge>
              ))}
            </div>
          </div>

          {/* By resource type */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Types de ressources</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(session.byResource).map(([type, count]) => {
                const Icon = RESOURCE_ICONS[type] || FileText;
                return (
                  <Badge key={type} variant="secondary" className="text-[11px] gap-1">
                    <Icon className="w-3 h-3" />
                    {type} ×{count}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Linked events warnings */}
          {stats.linkedEvents.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Événements générés ({stats.linkedEvents.length})
              </p>
              <div className="space-y-1.5">
                {stats.linkedEvents.map(evt => {
                  const sev = SEVERITY_ICONS[evt.severity] || SEVERITY_ICONS.info;
                  const SevIcon = sev.icon;
                  return (
                    <div key={evt.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/40 text-xs">
                      <SevIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${sev.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="leading-snug">{evt.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(evt.created_at), 'HH:mm:ss', { locale: fr })}
                          {evt.resolved && ' · ✓ résolu'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chronological timeline */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Chronologie ({chronoLogs.length} action{chronoLogs.length > 1 ? 's' : ''})
            </p>
            <div className="relative pl-5 space-y-2 border-l-2 border-muted ml-1">
              {chronoLogs.map((log, idx) => {
                const Icon = RESOURCE_ICONS[log.resource_type] || FileText;
                const prev = idx > 0 ? chronoLogs[idx - 1] : null;
                const gapMs = prev ? +new Date(log.created_at) - +new Date(prev.created_at) : 0;
                const gapSec = Math.round(gapMs / 1000);
                return (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-[27px] w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                      <Icon className="w-2.5 h-2.5 text-primary" />
                    </div>
                    {prev && gapSec > 30 && (
                      <p className="text-[10px] text-muted-foreground italic mb-1 -mt-1">
                        +{gapSec < 60 ? `${gapSec}s` : `${Math.round(gapSec / 60)}min`}
                      </p>
                    )}
                    <div className={`p-2 rounded-md border bg-card ${log.reverted ? 'opacity-60 border-dashed' : ''}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${ACTION_BADGE[log.action] || ''}`}>
                          {log.action}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">{log.resource_type}</Badge>
                        {log.reverted && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <RotateCcw className="w-2.5 h-2.5" /> annulé
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                          {format(new Date(log.created_at), 'HH:mm:ss', { locale: fr })}
                        </span>
                      </div>
                      <p className="text-xs font-mono mt-1 truncate" title={log.resource_id}>
                        {log.resource_id}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer summary */}
          <div className="mt-4 p-3 rounded-md bg-muted/40 text-[11px] text-muted-foreground">
            {stats.criticalCount > 0 ? (
              <p className="flex items-center gap-1 text-destructive font-medium">
                <XCircle className="w-3 h-3" /> {stats.criticalCount} événement(s) critique(s) à examiner
              </p>
            ) : stats.warningCount > 0 ? (
              <p className="flex items-center gap-1 text-warning font-medium">
                <AlertTriangle className="w-3 h-3" /> {stats.warningCount} avertissement(s)
              </p>
            ) : (
              <p className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" /> Aucune anomalie détectée pour cette session
              </p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
