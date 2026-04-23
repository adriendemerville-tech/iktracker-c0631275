import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Copy, Plus, Power, Trash2, Webhook, RefreshCw } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

interface Partner {
  id: string;
  partner_name: string;
  key_prefix: string;
  scopes: string[];
  monthly_quota: number;
  usage_current_month: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

interface RequestLog {
  id: string;
  partner_id: string | null;
  method: string;
  path: string;
  status_code: number;
  response_time_ms: number | null;
  external_user_id: string | null;
  error_message: string | null;
  created_at: string;
}

function generateRandomKey(prefix = 'ikt'): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${prefix}_live_${hex}`;
}

function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function AdminPartners() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [newName, setNewName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: l }] = await Promise.all([
      supabase.from('partner_api_keys').select('*').order('created_at', { ascending: false }),
      supabase.from('partner_request_logs').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setPartners((p as Partner[]) || []);
    setLogs((l as RequestLog[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (adminLoading) return <div className="p-8">Chargement…</div>;
  if (!isAdmin) return <Navigate to="/app" replace />;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const key = generateRandomKey();
    const keyHash = await sha256Hex(key);
    const jwtSecret = generateSecret();
    const prefix = key.slice(0, 16) + '…';

    const { error } = await supabase.from('partner_api_keys').insert({
      partner_name: newName.trim(),
      key_hash: keyHash,
      key_prefix: prefix,
      jwt_secret: jwtSecret,
      scopes: ['read', 'write', 'sso'],
      monthly_quota: 100000,
    });

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }

    setCreatedKey(key);
    setNewName('');
    load();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('partner_api_keys').update({ is_active: !current }).eq('id', id);
    load();
  };

  const deletePartner = async (id: string) => {
    if (!confirm('Révoquer définitivement cette clé ? Cette action est irréversible.')) return;
    await supabase.from('partner_api_keys').delete().eq('id', id);
    load();
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <Helmet><title>Partenaires API — Admin IKtracker</title></Helmet>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Partenaires API</h1>
          <Button onClick={load} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Recharger
          </Button>
        </div>

        {createdKey && (
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">⚠️ Nouvelle clé API — copiez-la maintenant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Cette clé ne sera plus jamais affichée. Stockez-la en lieu sûr et transmettez-la au partenaire.
              </p>
              <div className="flex items-center gap-2 bg-background p-3 rounded-lg border font-mono text-xs break-all">
                {createdKey}
                <Button size="icon" variant="ghost" onClick={() => {
                  navigator.clipboard.writeText(createdKey);
                  toast({ title: 'Copié' });
                }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCreatedKey(null)}>
                J'ai copié la clé
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Créer une clé partenaire</CardTitle></CardHeader>
          <CardContent className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="name">Nom du partenaire</Label>
              <Input id="name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="dictadevi" />
            </div>
            <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-2" /> Créer</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Clés actives ({partners.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : partners.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun partenaire. Créez la première clé ci-dessus.</p>
            ) : (
              <div className="space-y-3">
                {partners.map(p => (
                  <div key={p.id} className="border rounded-lg p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.partner_name}</span>
                        {p.is_active ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Désactivée</Badge>}
                      </div>
                      <code className="text-xs text-muted-foreground">{p.key_prefix}</code>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                        <span>Scopes: {p.scopes.join(', ')}</span>
                        <span>•</span>
                        <span>Usage: {p.usage_current_month.toLocaleString()} / {p.monthly_quota.toLocaleString()} ce mois</span>
                        {p.last_used_at && <><span>•</span><span>Dernier appel: {new Date(p.last_used_at).toLocaleString('fr-FR')}</span></>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggleActive(p.id, p.is_active)}>
                        <Power className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deletePartner(p.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Logs récents (50 derniers appels)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs font-mono max-h-96 overflow-y-auto">
              {logs.length === 0 && <p className="text-muted-foreground">Aucun appel pour l'instant.</p>}
              {logs.map(log => {
                const partner = partners.find(p => p.id === log.partner_id);
                const statusColor = log.status_code >= 500 ? 'text-destructive' : log.status_code >= 400 ? 'text-orange-500' : 'text-green-600';
                return (
                  <div key={log.id} className="flex items-center gap-2 border-b pb-1">
                    <span className="text-muted-foreground w-32 truncate">{new Date(log.created_at).toLocaleTimeString('fr-FR')}</span>
                    <span className={`w-12 ${statusColor}`}>{log.status_code}</span>
                    <span className="w-16">{log.method}</span>
                    <span className="flex-1 truncate">{log.path}</span>
                    <span className="text-muted-foreground w-24 truncate">{partner?.partner_name || '—'}</span>
                    <span className="text-muted-foreground w-12 text-right">{log.response_time_ms}ms</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          <a href="/api-docs" target="_blank" className="underline">Voir la documentation API publique →</a>
        </p>
      </div>
    </div>
  );
}
