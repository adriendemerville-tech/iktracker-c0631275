import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { RefreshCw, ExternalLink, CheckCircle2, EyeOff, PlayCircle, Sparkles } from "lucide-react";
import { IndexingHealthBanner } from "./IndexingHealthBanner";

type Reason = { code: string; label: string; weight: number; detail?: string };

type Finding = {
  id: string;
  post_id: string;
  slug: string;
  title: string;
  reasons: Reason[];
  score: number;
  status: string;
  last_content_update: string | null;
  detected_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "À réviser",
  in_progress: "En cours",
  dismissed: "Ignoré",
  resolved: "Résolu",
};

function scoreVariant(score: number): "destructive" | "default" | "secondary" {
  if (score >= 60) return "destructive";
  if (score >= 30) return "default";
  return "secondary";
}

export function AdminContentFreshness() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [running, setRunning] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["content-freshness", statusFilter],
    queryFn: async (): Promise<Finding[]> => {
      const { data, error } = await supabase
        .from("content_freshness_findings")
        .select("*")
        .eq("status", statusFilter)
        .order("score", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Finding[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("content_freshness_findings")
        .update({
          status,
          resolved_at: status === "resolved" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-freshness"] });
      toast.success("Statut mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runAudit = async () => {
    setRunning(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch("/api/public/content-freshness-audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ checkLinks: true }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        scanned?: number;
        flagged?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      toast.success(`${json.scanned ?? 0} articles analysés — ${json.flagged ?? 0} à réviser`);
      queryClient.invalidateQueries({ queryKey: ["content-freshness"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'audit");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <IndexingHealthBanner />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Fraîcheur du contenu
              </CardTitle>
              <CardDescription>
                Audit hebdomadaire (lundi 06:00 UTC). Aucun article n'est modifié automatiquement :
                cette file sert à prioriser les vraies révisions éditoriales.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={runAudit} disabled={running}>
              <RefreshCw className={`w-4 h-4 mr-2 ${running ? "animate-spin" : ""}`} />
              Lancer un audit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              {["pending", "in_progress", "dismissed", "resolved"].map((s) => (
                <TabsTrigger key={s} value={s} className="text-xs sm:text-sm">
                  {STATUS_LABEL[s]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="mt-4 space-y-3">
            {isLoading && (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </>
            )}

            {!isLoading && (data?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Aucun article dans cette catégorie.
              </p>
            )}

            {data?.map((f) => (
              <div key={f.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={scoreVariant(f.score)}>Priorité {f.score}</Badge>
                      <h3 className="font-semibold text-sm truncate">{f.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dernière modif.{" "}
                      {f.last_content_update
                        ? formatDistanceToNow(new Date(f.last_content_update), {
                            addSuffix: true,
                            locale: fr,
                          })
                        : "inconnue"}{" "}
                      · détecté{" "}
                      {formatDistanceToNow(new Date(f.detected_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                  <a
                    href={`/blog/${f.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Voir <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <ul className="space-y-1">
                  {(f.reasons ?? []).map((r) => {
                    const isLink = r.code === "broken_link" || r.code === "broken_internal_link";
                    return (
                      <li
                        key={r.code}
                        className={`text-xs ${isLink ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        • {r.label}
                        {r.detail && isLink && (
                          <span className="block ml-3 break-all opacity-80">
                            {r.detail.split(" | ").map((url) => (
                              <span key={url} className="block truncate">
                                {url}
                              </span>
                            ))}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <div className="flex gap-2 flex-wrap">
                  {f.status !== "in_progress" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: f.id, status: "in_progress" })}
                    >
                      <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                      En cours
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus.mutate({ id: f.id, status: "resolved" })}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Révisé
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateStatus.mutate({ id: f.id, status: "dismissed" })}
                  >
                    <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                    Ignorer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminContentFreshness;
