import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Ban, Plus, Trash2 } from 'lucide-react';

interface BlacklistEntry {
  id: string;
  slug_pattern: string;
  is_pattern: boolean;
  reason: string | null;
  created_at: string;
}

export function BlogBlacklistManager() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pattern, setPattern] = useState('');
  const [isPattern, setIsPattern] = useState(false);
  const [reason, setReason] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('blog_slug_blacklist')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Erreur chargement liste noire');
    setEntries((data as BlacklistEntry[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    const trimmed = pattern.trim();
    if (!trimmed) return;
    const { error } = await (supabase as any).from('blog_slug_blacklist').insert({
      slug_pattern: trimmed,
      is_pattern: isPattern,
      reason: reason.trim() || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Slug ajouté à la liste noire');
    setPattern(''); setReason(''); setIsPattern(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Retirer ce slug de la liste noire ? Il pourra à nouveau être (re)créé par l\'API.')) return;
    const { error } = await (supabase as any).from('blog_slug_blacklist').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Retiré');
    load();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold">Bloquer un slug</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Empêche définitivement la création/recréation d'un article via l'API blog.
            L'API renverra <code>409 slug_blacklisted</code> avec le message "Non, ce contenu existe déjà".
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="pattern">Slug ou motif</Label>
              <Input
                id="pattern"
                placeholder={isPattern ? 'frais-reels-%-2026' : 'frais-reels-ou-forfait-independants-2026'}
                value={pattern}
                onChange={e => setPattern(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="reason">Raison (interne)</Label>
              <Input id="reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="Doublon, contenu obsolète…" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch id="is-pattern" checked={isPattern} onCheckedChange={setIsPattern} />
              <Label htmlFor="is-pattern" className="cursor-pointer">
                Motif <code className="text-xs">LIKE</code> (utiliser <code>%</code> comme jokers)
              </Label>
            </div>
            <Button onClick={add} disabled={!pattern.trim()}>
              <Plus className="h-4 w-4 mr-2" /> Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3">Slugs bloqués ({entries.length})</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune entrée. La liste noire est vide.</p>
          ) : (
            <div className="space-y-2">
              {entries.map(e => (
                <div key={e.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm font-mono break-all">{e.slug_pattern}</code>
                      {e.is_pattern && <Badge variant="secondary">motif</Badge>}
                    </div>
                    {e.reason && <p className="text-xs text-muted-foreground mt-1">{e.reason}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Ajouté le {new Date(e.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => remove(e.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
