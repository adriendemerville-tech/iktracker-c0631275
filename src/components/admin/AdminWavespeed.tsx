import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, RefreshCw, Copy, ExternalLink, Activity } from 'lucide-react';

const DEFAULT_MODEL = 'wavespeed-ai/flux-dev';
const DEFAULT_INPUT = JSON.stringify(
  {
    prompt: 'A minimalist illustration of a red car driving on a mountain road at sunset, flat design',
    size: '1024*1024',
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 1,
    enable_safety_checker: true,
  },
  null,
  2
);

type PredictionResult = {
  id?: string;
  status?: string;
  outputs?: string[];
  error?: string;
  timings?: { inference?: number };
  data?: {
    id?: string;
    status?: string;
    outputs?: string[];
    error?: string;
    timings?: { inference?: number };
  };
};

function normalize(res: PredictionResult) {
  return {
    id: res.data?.id ?? res.id,
    status: res.data?.status ?? res.status,
    outputs: res.data?.outputs ?? res.outputs ?? [],
    error: res.data?.error ?? res.error,
    inference: res.data?.timings?.inference ?? res.timings?.inference,
  };
}

export function AdminWavespeed() {
  const { toast } = useToast();
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [inputText, setInputText] = useState(DEFAULT_INPUT);
  const [wait, setWait] = useState(true);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [rawResponse, setRawResponse] = useState<string>('');
  const [balance, setBalance] = useState<string | null>(null);
  const [connectionTest, setConnectionTest] = useState<{ ok: boolean; message: string; raw: string } | null>(null);

  const generate = useMutation({
    mutationFn: async () => {
      let parsedInput: unknown;
      try {
        parsedInput = JSON.parse(inputText);
      } catch {
        throw new Error('Input JSON invalide');
      }
      const cleanModel = model.trim().replace(/^\/+|\/+$/g, '');
      const path = wait ? `wavespeed/${cleanModel}?wait=1` : `wavespeed/${cleanModel}`;
      const { data, error } = await supabase.functions.invoke(path, {
        body: parsedInput,
      });
      if (error) throw error;
      return data as PredictionResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setRawResponse(JSON.stringify(data, null, 2));
      toast({ title: 'Requête envoyée', description: 'Voir le résultat ci-dessous.' });
    },
    onError: (e: any) => {
      setResult(null);
      setRawResponse(String(e?.message ?? e));
      toast({ title: 'Erreur', description: e?.message ?? 'Échec de la génération', variant: 'destructive' });
    },
  });

  const refresh = useMutation({
    mutationFn: async () => {
      const id = normalize(result ?? {}).id;
      if (!id) throw new Error('Aucun request_id à rafraîchir');
      const { data, error } = await supabase.functions.invoke(`wavespeed/predictions/${id}/result`, {
        method: 'GET' as any,
      });
      if (error) throw error;
      return data as PredictionResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setRawResponse(JSON.stringify(data, null, 2));
    },
    onError: (e: any) => {
      toast({ title: 'Erreur', description: e?.message ?? 'Échec du refresh', variant: 'destructive' });
    },
  });

  const fetchBalance = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('wavespeed/balance', {
        method: 'GET' as any,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data) => {
      const b = data?.data?.balance ?? data?.balance ?? JSON.stringify(data);
      const value = typeof b === 'string' ? b : JSON.stringify(b);
      setBalance(value);
      setConnectionTest({
        ok: true,
        message: `Connexion OK — solde : ${value}`,
        raw: JSON.stringify(data, null, 2),
      });
    },
    onError: (e: any) => {
      setConnectionTest({
        ok: false,
        message: e?.message ?? 'Impossible de contacter Wavespeed',
        raw: JSON.stringify(e, null, 2),
      });
      toast({ title: 'Erreur', description: e?.message ?? 'Impossible de récupérer le solde', variant: 'destructive' });
    },
  });

  const n = result ? normalize(result) : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Wavespeed.ai
              </CardTitle>
              <CardDescription>
                Test des générations via l'edge function <code className="text-xs">wavespeed</code>.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchBalance.mutate()} disabled={fetchBalance.isPending}>
              {fetchBalance.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Activity className="w-4 h-4 mr-2" />}
              Tester la connexion
              {balance !== null && <Badge variant="secondary" className="ml-2">{balance}</Badge>}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ws-model">Modèle</Label>
            <Input
              id="ws-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="wavespeed-ai/flux-dev"
            />
            <p className="text-xs text-muted-foreground">
              Ex: <code>wavespeed-ai/flux-dev</code>, <code>wavespeed-ai/flux-schnell</code>, <code>bytedance/seedream-v4</code>.{' '}
              <a
                href="https://wavespeed.ai/models"
                target="_blank"
                rel="noreferrer"
                className="underline inline-flex items-center gap-1"
              >
                Catalogue <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ws-input">Input JSON</Label>
            <Textarea
              id="ws-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={12}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch id="ws-wait" checked={wait} onCheckedChange={setWait} />
              <Label htmlFor="ws-wait" className="text-sm cursor-pointer">
                Attendre le résultat (polling ~90s)
              </Label>
            </div>
            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
              {generate.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {wait ? 'Génération…' : 'Envoi…'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Lancer
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && n && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Résultat</CardTitle>
                {n.status && (
                  <Badge
                    variant={
                      n.status === 'completed' ? 'default' : n.status === 'failed' ? 'destructive' : 'secondary'
                    }
                  >
                    {n.status}
                  </Badge>
                )}
                {n.inference !== undefined && (
                  <span className="text-xs text-muted-foreground">{n.inference.toFixed(2)}s</span>
                )}
              </div>
              <div className="flex gap-2">
                {n.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(n.id!);
                      toast({ title: 'request_id copié' });
                    }}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> {n.id.slice(0, 8)}…
                  </Button>
                )}
                {n.id && n.status !== 'completed' && n.status !== 'failed' && (
                  <Button variant="outline" size="sm" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
                    {refresh.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    )}
                    Rafraîchir
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {n.error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
                {n.error}
              </div>
            )}

            {n.outputs && n.outputs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {n.outputs.map((url, i) => {
                  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);
                  return (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-md overflow-hidden border bg-muted"
                    >
                      {isVideo ? (
                        <video src={url} controls className="w-full h-auto" />
                      ) : (
                        <img src={url} alt={`output ${i + 1}`} className="w-full h-auto" loading="lazy" />
                      )}
                    </a>
                  );
                })}
              </div>
            )}

            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Réponse brute
              </summary>
              <pre className="mt-2 p-3 rounded-md bg-muted overflow-auto max-h-80 whitespace-pre-wrap break-all">
                {rawResponse}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
