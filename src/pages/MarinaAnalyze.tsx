import { useState, useRef, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";

const MarinaAnalyze = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const fetchReportHtml = useCallback(async (reportUrl: string) => {
    try {
      const res = await fetch(reportUrl);
      const html = await res.text();
      setReportHtml(html);
    } catch {
      console.error('Failed to fetch report HTML');
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
        const resultData = data.data ?? data;
        setResult(resultData);
        setLoading(false);
        setProgress(100);
        // Fetch HTML content for iframe rendering
        if (resultData?.report_url) {
          fetchReportHtml(resultData.report_url);
        }
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
    // Immediate first poll
    doPoll(jobId);
    pollingRef.current = setInterval(() => doPoll(jobId), 5000);
  }, [doPoll]);

  // Re-poll immediately when tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && jobIdRef.current) {
        // Tab is back — do an immediate poll and restart interval
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
    setReportHtml(null);
    setError(null);
    setProgress(0);
    setPhase("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("marina-analyze", {
        body: { url: url.trim() },
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

      // If we got a job_id, start polling
      if (data?.job_id) {
        setProgress(5);
        setPhase("Démarrage…");
        pollJob(data.job_id);
        return;
      }

      // If already completed (instant response)
      if (data?.status === 'completed' || data?.data) {
        const resultData = data.data ?? data;
        setResult(resultData);
        setLoading(false);
        setProgress(100);
        if (resultData?.report_url) {
          fetchReportHtml(resultData.report_url);
        }
        return;
      }

      // Fallback: show raw response
      setResult(data);
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

          {/* Results */}
          {result && result.report_url && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <CheckCircle className="text-green-500 h-5 w-5" />
                  Rapport prêt
                </div>
                <a
                  href={result.report_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ouvrir dans un nouvel onglet
                </a>
              </div>
              <div className="w-full rounded-lg border border-border overflow-hidden" style={{ height: '80vh' }}>
                {reportHtml ? (
                  <iframe
                    srcDoc={reportHtml}
                    title="Rapport Marina"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    Chargement du rapport…
                  </div>
                )}
              </div>
            </div>
          )}

          {result && !result.report_url && (
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
