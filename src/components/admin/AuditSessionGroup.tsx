import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Clock, Layers, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

export interface AuditSession {
  key: string;
  api_key_name: string | null;
  startedAt: string;
  endedAt: string;
  logs: AuditLog[];
  byAction: Record<string, number>;
  byResource: Record<string, number>;
}

const SESSION_GAP_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Group consecutive audit logs (same api_key_name, < 5 min apart) into sessions.
 * Logs are expected to come ordered desc (most recent first).
 */
export function buildAuditSessions(logs: AuditLog[]): AuditSession[] {
  if (!logs.length) return [];
  // Work chronologically asc to detect runs, then re-reverse
  const asc = [...logs].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const sessions: AuditSession[] = [];
  let current: AuditSession | null = null;

  for (const log of asc) {
    const ts = +new Date(log.created_at);
    if (
      current &&
      current.api_key_name === log.api_key_name &&
      ts - +new Date(current.endedAt) <= SESSION_GAP_MS
    ) {
      current.logs.push(log);
      current.endedAt = log.created_at;
      current.byAction[log.action] = (current.byAction[log.action] || 0) + 1;
      current.byResource[log.resource_type] = (current.byResource[log.resource_type] || 0) + 1;
    } else {
      current = {
        key: `${log.api_key_name ?? "none"}-${log.id}`,
        api_key_name: log.api_key_name,
        startedAt: log.created_at,
        endedAt: log.created_at,
        logs: [log],
        byAction: { [log.action]: 1 },
        byResource: { [log.resource_type]: 1 },
      };
      sessions.push(current);
    }
  }
  // Most recent session first; logs inside also desc
  return sessions.map((s) => ({ ...s, logs: [...s.logs].reverse() })).reverse();
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
  update: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  delete: "bg-red-500/15 text-red-700 border-red-500/20",
};

export function AuditSessionGroup({
  session,
  defaultOpen,
  onOpenDetails,
  children,
}: {
  session: AuditSession;
  defaultOpen?: boolean;
  onOpenDetails?: (session: AuditSession) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const durationMin = useMemo(() => {
    const ms = +new Date(session.endedAt) - +new Date(session.startedAt);
    return Math.max(1, Math.round(ms / 60000));
  }, [session.startedAt, session.endedAt]);

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          {open ? (
            <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
          )}
          <Layers className="w-4 h-4 shrink-0 text-primary" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">
                Session {session.api_key_name ?? "sans clé"}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {session.logs.length} action{session.logs.length > 1 ? "s" : ""}
              </Badge>
              {Object.entries(session.byAction).map(([action, count]) => (
                <Badge
                  key={action}
                  variant="outline"
                  className={`text-[10px] ${ACTION_COLORS[action] || ""}`}
                >
                  {action} ×{count}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>
                {format(new Date(session.startedAt), "dd MMM HH:mm", { locale: fr })}
                {" → "}
                {format(new Date(session.endedAt), "HH:mm", { locale: fr })}
              </span>
              <span>•</span>
              <span>{durationMin} min</span>
              <span>•</span>
              <span>
                {Object.entries(session.byResource)
                  .map(([r, c]) => `${r}:${c}`)
                  .join(", ")}
              </span>
            </div>
          </div>
        </button>
        {onOpenDetails && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-7 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(session);
            }}
            title="Vue détaillée de la session"
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Détails
          </Button>
        )}
      </div>
      {open && <div className="px-3 pb-3 pt-1 space-y-3 border-t bg-muted/20">{children}</div>}
    </div>
  );
}
