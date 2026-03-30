import { useState, useRef, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, AlertTriangle, CheckCircle, ExternalLink, BarChart3, Network, Brain } from "lucide-react";

interface MarinaResult {
  report_url?: string;
  report_view_url?: string;
  expert_seo_score?: number;
  expert_seo_max?: number;
  strategic_score?: number;
  cocoon_nodes?: number;
  cocoon_clusters?: number;
  domain?: string;
  language?: string;
  generated_at?: string;
  [key: string]: unknown;
}

const ScoreCard = ({ label, value, max, icon: Icon }: { label: string; value?: number; max?: number; icon: React.ElementType }) => {
  if (value === undefined) return null;
  const pct = max ? Math.round((value / max) * 100) : value;
  const color = pct >= 70 ? "text-green-500" : pct >= 40 ? "text-yellow-500" : "text-red-500";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
      <Icon className={`h-5 w-5 ${color} shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold ${color}`}>
          {value}{max ? `/${max}` : ""}
        </p>
      </div>
    </div>
  );
};

const MarinaAnalyze = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const [result, setResult] = useState<MarinaResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const doPoll = useCallback(async (jobId: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const baseUrl = `https://${projectId}.supabase.co/functions/v1/marina-analyze`;

    try {
      const res = await fetch(`${baseUrl}?job_id=${encodeURIComponent(jobId)}`, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
      });
      const data = await res.json();

      if (data.status === 'processing') {
        setProgress(data.progress ?? 0);
        setPhase(data.phase ?? "");
      } else if (data.status === 'completed') {
        stopPolling();
        jobIdRef.current = null;
        const resultData = (data.data ?? data) as MarinaResult;
        setResult(resultData);
        setLoading(false);
        setProgress(100);
      } else if (data.status === 'failed' || data.status === 'error' || data.error) {
        stopPolling();
        jobIdRef.current = null;
        setError(data.error || "Échec de l'analyse");
        setLoading(false);
      }
    } catch {
      stopPolling();
      jobIdRef.current = null;
      setError("Connexion perdue avec le service d'analyse");
      setLoading(false);
    }
  }, [stopPolling]);

  const pollJob = useCallback((jobId: string) => {
    jobIdRef.current = jobId;
    doPoll(jobId);
    pollingRef.current = setInterval(() => doPoll(jobId), 5000);
  }, [doPoll]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && jobIdRef.current) {
        stopPolling();
        doPoll(jobIdRef.current);
        pollingRef.current = setInterval(() => doPoll(jobIdRef.current!), 5000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopPolling();
    };
  }, [doPoll, stopPolling]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    stopPolling();
    setLoading(true);
    setResult(null);
    setError(null);
    setProgress(0);
    setPhase("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("marina-analyze", {
        body: { url: url.trim(), lang: "fr" },
      });

      if (fnError) {
        setError(fnError.message || "Erreur lors du lancement de l'analyse");
        setLoading(false);
        return;
      }

      if (data?.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      if (data?.job_id) {
        setProgress(5);
        setPhase("Démarrage…");
        pollJob(data.job_id);
        return;
      }

      if (data?.status === 'completed' || data?.data) {
        const resultData = (data.data ?? data) as MarinaResult;
        setResult(resultData);
        setLoading(false);
        setProgress(100);
        return;
      }

      setResult(data as MarinaResult);
      setLoading(false);
    } catch {
      setError("Impossible de contacter le service d'analyse");
      setLoading(false);
    }
  };

  const phaseLabels: Record<string, string> = {
    phase1: "Crawl & extraction",
    phase2: "Analyse SEO",
    phase3: "Génération du rapport",
  };

  const viewUrl = result?.report_view_url || result?.report_url;
  const [reportHtml, setReportHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!viewUrl) { setReportHtml(null); return; }
    let cancelled = false;
    fetch(viewUrl)
      .then(r => r.text())
      .then(html => { if (!cancelled) setReportHtml(html); })
      .catch(() => { if (!cancelled) setReportHtml(null); });
    return () => { cancelled = true; };
  }, [viewUrl]);

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Marina — Analyse SEO</title>
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col items-center justify-start pt-16 px-4 pb-16">
        <div className="w-full max-w-2xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              🔍 Marina — Analyse SEO
            </h1>
            <p className="text-muted-foreground">
              Entrez une URL pour obtenir une analyse complète via l'API Marina de{" "}
              <a href="https://crawlers.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Crawlers
              </a>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleAnalyze} className="flex gap-3">
            <Input
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="flex-1"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !url.trim()} className="gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <Search />}
              Analyser
            </Button>
          </form>

          {/* Progress */}
          {loading && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {phaseLabels[phase] || phase || "Analyse en cours…"}
                  </span>
                  <span className="font-medium text-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>
          )}

          {/* Error */}
          {error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="flex items-center gap-3 pt-6">
                <AlertTriangle className="text-destructive shrink-0" />
                <p className="text-destructive text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Results with scores */}
          {result && viewUrl && (
            <div className="space-y-4">
              {/* Score cards */}
              {(result.expert_seo_score !== undefined || result.strategic_score !== undefined || result.cocoon_nodes !== undefined) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <ScoreCard label="Score SEO" value={result.expert_seo_score} max={result.expert_seo_max} icon={BarChart3} />
                  <ScoreCard label="Score stratégique" value={result.strategic_score} icon={Brain} />
                  <ScoreCard label="Nœuds cocon" value={result.cocoon_nodes} icon={Network} />
                </div>
              )}

              {/* Meta info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle className="text-green-500 h-5 w-5" />
                  Rapport prêt
                  {result.domain && <Badge variant="secondary" className="text-xs">{result.domain}</Badge>}
                </div>
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir dans un nouvel onglet
                </a>
              </div>

              {/* Iframe using report_view_url directly */}
              <div className="w-full rounded-lg border border-border overflow-hidden" style={{ height: '80vh' }}>
                <iframe
                  src={viewUrl}
                  title="Rapport Marina"
                  className="w-full h-full border-0"
                />
              </div>
            </div>
          )}

          {result && !viewUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="text-green-500" />
                  Résultat de l'analyse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted rounded-lg p-4 overflow-auto max-h-[60vh] text-xs leading-relaxed whitespace-pre-wrap break-words">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

export default MarinaAnalyze;
