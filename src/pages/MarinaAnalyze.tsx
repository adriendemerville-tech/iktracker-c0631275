import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, ExternalLink, AlertTriangle, CheckCircle } from "lucide-react";

const MarinaAnalyze = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("marina-analyze", {
        body: { url: url.trim() },
      });

      if (fnError) {
        setError(fnError.message || "Erreur lors de l'analyse");
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      setResult(data);
    } catch (err) {
      setError("Impossible de contacter le service d'analyse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Marina — Analyse SEO</title>
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col items-center justify-start pt-16 px-4">
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
            />
            <Button type="submit" disabled={loading || !url.trim()} className="gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <Search />}
              Analyser
            </Button>
          </form>

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
