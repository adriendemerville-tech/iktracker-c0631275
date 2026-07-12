import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Linkedin, PlayCircle, Send, RefreshCcw } from 'lucide-react';

// Miroir client de la liste de topics de l'edge function.
// Sert uniquement à peupler le sélecteur du bouton test — la vérité reste côté serveur.
const TOPICS = [
  { slug: 'simulateur', label: 'Simulateur IK 2026', format: 'video', source: 'browserless' },
  { slug: 'mode-tournee', label: 'Mode Tournée GPS', format: 'video', source: 'browserless' },
  { slug: 'import-takeout', label: 'Import Google Takeout', format: 'carousel', source: 'wavespeed' },
  { slug: 'sync-calendrier', label: 'Synchronisation calendrier', format: 'video', source: 'browserless' },
  { slug: 'detection-plaque', label: 'Détection plaque', format: 'video', source: 'browserless' },
  { slug: 'bareme-progressif', label: 'Barème progressif 2026', format: 'carousel', source: 'wavespeed' },
  { slug: 'bonus-electrique', label: 'Bonus 20% électrique', format: 'carousel', source: 'wavespeed' },
  { slug: 'export-pdf', label: 'Export PDF comptable', format: 'video', source: 'browserless' },
  { slug: 'ik-velo', label: 'IK vélo', format: 'carousel', source: 'wavespeed' },
  { slug: 'gratuit-a-vie', label: 'Gratuit à vie', format: 'carousel', source: 'wavespeed' },
  { slug: 'confidentialite', label: 'Confidentialité', format: 'carousel', source: 'wavespeed' },
  { slug: 'comparatif', label: 'IKtracker vs payants', format: 'carousel', source: 'wavespeed' },
] as const;

type RunResult = {
  dry_run?: boolean;
  ok?: boolean;
  topic?: unknown;
  topic_slug?: string;
  format?: string;
  media_source?: string;
  post_text?: string;
  text_source?: string;
  style_samples_count?: number;
  style_profile?: {
    samples_count: number;
    avg_char_length: number;
    avg_word_count: number;
    avg_sentence_count: number;
    avg_sentence_words: number;
    avg_paragraph_count: number;
    avg_paragraph_words: number;
    short_sentence_ratio: number;
    first_person_ratio: number;
    question_ratio: number;
    top_opening_words: string[];
    frequent_bigrams: string[];
    frequent_content_words: string[];
  };
  slide_plan?: unknown;
  slide_source?: string;
  post_id?: string;
  asset_urn?: string;
  media_bytes?: number;
  duration_ms?: number;
  error?: string;
};

export function AdminLinkedIn() {
  const { toast } = useToast();
  const [topic, setTopic] = useState<string>('');
  const [format, setFormat] = useState<'auto' | 'video' | 'carousel'>('auto');
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<RunResult | null>(null);
  const [rawResponse, setRawResponse] = useState<string>('');

  const logs = useQuery({
    queryKey: ['linkedin_post_log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('linkedin_post_log')
        .select('id, topic_slug, topic_title, media_type, status, error_message, posted_at, triggered_by, duration_ms')
        .order('posted_at', { ascending: false })
        .limit(15);
      if (error) throw error;
      return data ?? [];
    },
  });

  const run = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      if (topic) params.set('topic', topic);
      if (format !== 'auto') params.set('format', format);
      if (dryRun) params.set('dry_run', '1');
      const path = `linkedin-weekly-post${params.toString() ? `?${params.toString()}` : ''}`;
      const { data, error } = await supabase.functions.invoke(path, { method: 'POST' as any });
      if (error) throw error;
      return data as RunResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setRawResponse(JSON.stringify(data, null, 2));
      const label = data?.dry_run ? 'Dry-run terminé' : (data?.ok ? 'Post publié' : 'Réponse reçue');
      toast({ title: label, description: data?.dry_run ? 'Aperçu prêt ci-dessous.' : `post_id: ${data?.post_id ?? '—'}` });
      logs.refetch();
    },
    onError: (e: any) => {
      setResult(null);
      const message = e?.message ?? String(e);
      setRawResponse(message);
      toast({ title: 'Erreur', description: message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="w-5 h-5 text-primary" />
            LinkedIn — post mensuel
          </CardTitle>
          <CardDescription>
            Publication automatique : 1<sup>er</sup> mercredi du mois, 07h00 UTC (~08h Paris). Texte via <strong>Mistral (Wavespeed)</strong> avec fallback Gemini. Média : <strong>Browserless</strong> pour les screencasts de features, <strong>Wavespeed</strong> pour les visuels IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="li-topic">Topic</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger id="li-topic">
                  <SelectValue placeholder="Auto (rotation mensuelle)" />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.label} <span className="text-muted-foreground text-xs ml-1">· {t.format} · {t.source}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="li-format">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as any)}>
                <SelectTrigger id="li-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (selon topic)</SelectItem>
                  <SelectItem value="video">Vidéo</SelectItem>
                  <SelectItem value="carousel">Carrousel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="li-dry" className="block">Mode</Label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border">
                <Switch id="li-dry" checked={dryRun} onCheckedChange={setDryRun} />
                <Label htmlFor="li-dry" className="text-sm cursor-pointer flex-1">
                  {dryRun ? 'Dry-run (aperçu)' : 'Publier sur LinkedIn'}
                </Label>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => run.mutate()} disabled={run.isPending}>
              {run.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {dryRun ? 'Génération…' : 'Publication…'}</>
              ) : (
                <>{dryRun ? <PlayCircle className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {dryRun ? 'Tester maintenant' : 'Publier maintenant'}
                </>
              )}
            </Button>
            <Button variant="outline" size="icon" onClick={() => logs.refetch()} title="Rafraîchir les logs">
              <RefreshCcw className="w-4 h-4" />
            </Button>
          </div>
          {!dryRun && (
            <p className="text-xs text-destructive">
              Attention : ce bouton publie réellement sur le compte LinkedIn d'Adrien de Volontat.
            </p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">Résultat</CardTitle>
              {result.dry_run && <Badge variant="secondary">Dry-run</Badge>}
              {result.ok && <Badge>Publié</Badge>}
              {result.format && <Badge variant="outline">{result.format}</Badge>}
              {result.media_source && <Badge variant="outline">{result.media_source}</Badge>}
              {result.text_source && <Badge variant="outline">texte: {result.text_source}</Badge>}
              {result.slide_source && <Badge variant="outline">slides: {result.slide_source}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.post_text && (
              <div>
                <Label className="text-xs text-muted-foreground">Post LinkedIn</Label>
                <pre className="mt-1 p-3 rounded-md bg-muted whitespace-pre-wrap text-sm">{result.post_text}</pre>
              </div>
            )}
            {result.style_profile && result.style_profile.samples_count > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">
                  Profil de style ({result.style_profile.samples_count} posts analysés)
                </Label>
                <div className="mt-1 p-3 rounded-md bg-muted text-xs grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                  <div><span className="text-muted-foreground">Longueur moy. :</span> {result.style_profile.avg_word_count} mots ({result.style_profile.avg_char_length} car.)</div>
                  <div><span className="text-muted-foreground">Phrases / post :</span> {result.style_profile.avg_sentence_count}</div>
                  <div><span className="text-muted-foreground">Mots / phrase :</span> {result.style_profile.avg_sentence_words}</div>
                  <div><span className="text-muted-foreground">Paragraphes :</span> {result.style_profile.avg_paragraph_count} ({result.style_profile.avg_paragraph_words} mots)</div>
                  <div><span className="text-muted-foreground">Phrases courtes :</span> {result.style_profile.short_sentence_ratio}%</div>
                  <div><span className="text-muted-foreground">"Je" en début :</span> {result.style_profile.first_person_ratio}%</div>
                  <div><span className="text-muted-foreground">Questions :</span> {result.style_profile.question_ratio}%</div>
                </div>
                {result.style_profile.top_opening_words.length > 0 && (
                  <p className="mt-2 text-xs"><span className="text-muted-foreground">Ouvertures :</span> {result.style_profile.top_opening_words.join(', ')}</p>
                )}
                {result.style_profile.frequent_content_words.length > 0 && (
                  <p className="mt-1 text-xs"><span className="text-muted-foreground">Vocabulaire signature :</span> {result.style_profile.frequent_content_words.join(', ')}</p>
                )}
                {result.style_profile.frequent_bigrams.length > 0 && (
                  <p className="mt-1 text-xs"><span className="text-muted-foreground">Bigrammes :</span> {result.style_profile.frequent_bigrams.join(' · ')}</p>
                )}
              </div>
            )}

            {result.slide_plan && (
              <div>
                <Label className="text-xs text-muted-foreground">Plan du carrousel</Label>
                <pre className="mt-1 p-3 rounded-md bg-muted whitespace-pre-wrap text-xs overflow-auto max-h-64">
                  {JSON.stringify(result.slide_plan, null, 2)}
                </pre>
              </div>
            )}
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Réponse brute</summary>
              <pre className="mt-2 p-3 rounded-md bg-muted overflow-auto max-h-80 whitespace-pre-wrap break-all">
                {rawResponse}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique des runs</CardTitle>
          <CardDescription>15 derniers enregistrements de <code>linkedin_post_log</code>.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (logs.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun run enregistré.</p>
          ) : (
            <div className="space-y-2">
              {logs.data!.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{l.topic_title ?? l.topic_slug}</span>
                      <Badge variant={l.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                        {l.status}
                      </Badge>
                      {l.media_type && <Badge variant="outline" className="text-xs">{l.media_type}</Badge>}
                      {l.triggered_by && <Badge variant="outline" className="text-xs">{l.triggered_by}</Badge>}
                    </div>
                    {l.error_message && (
                      <p className="text-xs text-destructive mt-1 truncate">{l.error_message}</p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {l.posted_at ? new Date(l.posted_at).toLocaleString('fr-FR') : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
