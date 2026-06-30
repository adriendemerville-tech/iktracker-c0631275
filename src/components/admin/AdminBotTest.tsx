import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Bot, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const ALL_BOTS = [
  'GPTBot',
  'CCBot',
  'Google-Extended',
  'ClaudeBot',
  'Applebot-Extended',
  'PerplexityBot',
];

interface BotResult {
  bot: string;
  status: number;
  ok: boolean;
  contentLength: number;
  renderedBy: string | null;
  prerendered: boolean;
  hasH1: boolean;
  h1?: string;
  title?: string;
  metaDescription?: string;
  jsonLdCount: number;
  bodyTextLength: number;
  isSpaShell: boolean;
  durationMs: number;
  error?: string;
}

export function AdminBotTest() {
  const [url, setUrl] = useState('https://iktracker.fr/');
  const [selected, setSelected] = useState<string[]>(ALL_BOTS);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BotResult[] | null>(null);
  const [testedAt, setTestedAt] = useState<string | null>(null);

  const toggle = (bot: string) => {
    setSelected((prev) => (prev.includes(bot) ? prev.filter((b) => b !== bot) : [...prev, bot]));
  };

  const run = async () => {
    if (!url.trim()) {
      toast.error('URL requise');
      return;
    }
    setLoading(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke('test-bot-rendering', {
        body: { url: url.trim(), bots: selected.length ? selected : undefined },
      });
      if (error) throw error;
      setResults(data.results);
      setTestedAt(data.testedAt);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const verdict = (r: BotResult) => {
    if (!r.ok || r.error) return { icon: XCircle, label: 'Échec', color: 'bg-destructive text-destructive-foreground' };
    if (r.isSpaShell) return { icon: XCircle, label: 'SPA shell', color: 'bg-destructive text-destructive-foreground' };
    if (r.prerendered) return { icon: CheckCircle2, label: 'Pré-rendu', color: 'bg-emerald-600 text-white' };
    if (r.hasH1 && r.bodyTextLength > 500) return { icon: CheckCircle2, label: 'Contenu OK', color: 'bg-emerald-600 text-white' };
    return { icon: AlertTriangle, label: 'Suspect', color: 'bg-amber-500 text-white' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" /> Test rendu bots IA
        </CardTitle>
        <CardDescription>
          Vérifie ce que GPTBot, CCBot, Google-Extended, ClaudeBot, Applebot-Extended et PerplexityBot reçoivent sur une URL.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://iktracker.fr/blog/..."
            className="flex-1"
            disabled={loading}
          />
          <Button onClick={run} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Tester
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          {ALL_BOTS.map((bot) => (
            <label key={bot} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={selected.includes(bot)} onCheckedChange={() => toggle(bot)} disabled={loading} />
              {bot}
            </label>
          ))}
        </div>

        {testedAt && (
          <p className="text-xs text-muted-foreground">Test effectué à {new Date(testedAt).toLocaleString('fr-FR')}</p>
        )}

        {results && (
          <div className="space-y-3">
            {results.map((r) => {
              const v = verdict(r);
              const Icon = v.icon;
              return (
                <div key={r.bot} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className={v.color}>
                        <Icon className="w-3 h-3 mr-1" />
                        {v.label}
                      </Badge>
                      <span className="font-medium">{r.bot}</span>
                      <Badge variant="outline">HTTP {r.status}</Badge>
                      <span className="text-xs text-muted-foreground">{r.durationMs} ms</span>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>{(r.contentLength / 1024).toFixed(1)} KB HTML</span>
                      <span>{r.bodyTextLength} car. texte</span>
                      <span>{r.jsonLdCount} JSON-LD</span>
                    </div>
                  </div>
                  {r.error && <p className="text-xs text-destructive">{r.error}</p>}
                  {r.renderedBy && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">X-Rendered-By:</span> <code>{r.renderedBy}</code>
                    </p>
                  )}
                  {r.title && (
                    <p className="text-xs truncate">
                      <span className="text-muted-foreground">title:</span> {r.title}
                    </p>
                  )}
                  {r.h1 && (
                    <p className="text-xs truncate">
                      <span className="text-muted-foreground">h1:</span> {r.h1}
                    </p>
                  )}
                  {r.metaDescription && (
                    <p className="text-xs truncate">
                      <span className="text-muted-foreground">meta:</span> {r.metaDescription}
                    </p>
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
