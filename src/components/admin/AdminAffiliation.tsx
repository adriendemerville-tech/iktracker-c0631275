import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Copy, Trash2, Link2, Users, Percent } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AffiliateCode {
  id: string;
  code: string;
  label: string | null;
  commission_pct: number;
  is_active: boolean;
  uses_count: number;
  created_at: string;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function AdminAffiliation() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newCode, setNewCode] = useState(generateCode());
  const [newLabel, setNewLabel] = useState('');
  const [newCommission, setNewCommission] = useState('10');

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['affiliate-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_codes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as AffiliateCode[];
    },
  });

  const { data: usesData = [] } = useQuery({
    queryKey: ['affiliate-uses-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_uses')
        .select('affiliate_code_id, created_at');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('affiliate_codes').insert({
        code: newCode.toUpperCase().trim(),
        label: newLabel.trim() || null,
        commission_pct: parseFloat(newCommission) || 10,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-codes'] });
      setOpen(false);
      setNewCode(generateCode());
      setNewLabel('');
      setNewCommission('10');
      toast({ title: 'Code créé', description: `Code ${newCode} ajouté avec succès` });
    },
    onError: (err: any) => {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('affiliate_codes')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['affiliate-codes'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('affiliate_codes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-codes'] });
      toast({ title: 'Code supprimé' });
    },
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copié', description: `${code} copié dans le presse-papier` });
  };

  const totalUses = codes.reduce((sum, c) => sum + c.uses_count, 0);
  const activeCodes = codes.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">{codes.length}</p>
            <p className="text-xs text-muted-foreground">Codes créés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{totalUses}</p>
            <p className="text-xs text-muted-foreground">Utilisations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold">{activeCodes}</p>
            <p className="text-xs text-muted-foreground">Codes actifs</p>
          </CardContent>
        </Card>
      </div>

      {/* Create button + table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            Codes d'affiliation
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Nouveau code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un code d'affiliation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                      placeholder="CODE123"
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setNewCode(generateCode())}
                      title="Générer un code"
                    >
                      🎲
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Libellé (optionnel)</Label>
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Ex: Partenaire YouTube"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Commission (%)</Label>
                  <Input
                    type="number"
                    value={newCommission}
                    onChange={(e) => setNewCommission(e.target.value)}
                    min="0"
                    max="100"
                    step="0.5"
                  />
                </div>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!newCode.trim() || createMutation.isPending}
                  className="w-full"
                >
                  {createMutation.isPending ? 'Création...' : 'Créer le code'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : codes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aucun code d'affiliation créé
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Utilisations</TableHead>
                    <TableHead className="text-center">Actif</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-medium">{c.code}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyCode(c.code)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.label || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {c.commission_pct}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {c.uses_count}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={c.is_active}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: c.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Supprimer le code ${c.code} ?`)) {
                              deleteMutation.mutate(c.id);
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
