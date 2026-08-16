import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { getGitHubActionsRuns } from "@/lib/github.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Github,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  PlayCircle,
} from "lucide-react";

const OWNER = "adriendemerville-tech";
const REPO = "iktracker-mobile";

function statusIcon(status: string, conclusion: string | null) {
  if (status === "queued" || status === "waiting") return <Clock className="w-4 h-4" />;
  if (status === "in_progress") return <PlayCircle className="w-4 h-4" />;
  if (conclusion === "success") return <CheckCircle2 className="w-4 h-4" />;
  if (conclusion === "failure" || conclusion === "cancelled" || conclusion === "timed_out")
    return <XCircle className="w-4 h-4" />;
  return <Clock className="w-4 h-4" />;
}

function statusVariant(
  status: string,
  conclusion: string | null,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "in_progress") return "default";
  if (status === "queued" || status === "waiting") return "secondary";
  if (conclusion === "success") return "outline";
  if (conclusion === "failure" || conclusion === "timed_out") return "destructive";
  return "secondary";
}

function statusLabel(status: string, conclusion: string | null) {
  if (conclusion) return conclusion === "success" ? "réussi" : conclusion;
  return status === "in_progress" ? "en cours" : status;
}

export function AdminGitHubActions() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["github-actions-runs", OWNER, REPO],
    queryFn: async () => {
      const result = await getGitHubActionsRuns({
        data: { owner: OWNER, repo: REPO, per_page: 15 },
      });
      return result;
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Github className="w-5 h-5 text-primary" />
                Builds mobile — GitHub Actions
              </CardTitle>
              <CardDescription>
                Statut des workflows du repo{" "}
                <code className="text-xs">
                  {OWNER}/{REPO}
                </code>
                .
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Rafraîchir
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <div className="flex items-start gap-3 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">Impossible de récupérer les builds</p>
                <p className="text-xs opacity-90">
                  {error instanceof Error ? error.message : String(error)}
                </p>
              </div>
            </div>
          )}

          {!isLoading && !error && data && data.workflow_runs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun workflow run trouvé pour ce repo.
            </p>
          )}

          {!isLoading && !error && data && data.workflow_runs.length > 0 && (
            <div className="space-y-2">
              {data.workflow_runs.map((run) => (
                <a
                  key={run.id}
                  href={run.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={statusVariant(run.status, run.conclusion)}
                        className="gap-1 text-[10px] h-5"
                      >
                        {statusIcon(run.status, run.conclusion)}
                        {statusLabel(run.status, run.conclusion)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">#{run.run_number}</span>
                    </div>
                    <p className="text-sm font-medium truncate">{run.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {run.head_branch} · {run.event} ·{" "}
                      {formatDistanceToNow(new Date(run.created_at), {
                        locale: fr,
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
