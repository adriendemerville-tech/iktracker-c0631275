import { useState, useRef, useCallback } from "react";
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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollJob = useCallback((jobId: string) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const baseUrl = `https://${projectId}.supabase.co/functions/v1/marina-analyze`;

    pollingRef.current = setInterval(async () => {
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
          setResult(data.data ?? data);
          setLoading(false);
          setProgress(100);
        } else if (data.status === 'failed' || data.status === 'error' || data.error) {
          stopPolling();
          setError(data.error || "Échec de l'analyse");
          setLoading(false);
        }
      } catch {
        stopPolling();
        setError("Connexion perdue avec le service d'analyse");
        setLoading(false);
      }
    }, 5000);
  }, [stopPolling]);

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
        setResult(data.data ?? data);
        setLoading(false);
        setProgress(100);
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
          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="text-success" />
                  Résultat de l'analyse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.report_url && (
                  <a
                    href={result.report_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Voir le rapport complet
                  </a>
                )}
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
