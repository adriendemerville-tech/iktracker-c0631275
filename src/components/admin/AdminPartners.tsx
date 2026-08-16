import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Handshake, Trash2, MousePointerClick, TrendingUp, Euro, Pencil } from "lucide-react";

interface Partner {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  tagline: string | null;
  description: string | null;
  category: string;
  target_url: string;
  commission_amount: number;
  commission_model: string;
  is_active: boolean;
  priority: number;
  target_personas: string[];
  target_pages: string[];
}

interface PartnerStats {
  partner_id: string;
  slug: string;
  name: string;
  category: string;
  is_active: boolean;
  total_clicks: number;
  unique_sessions: number;
  estimated_revenue: number;
  top_page: string | null;
  last_click_at: string | null;
}

const emptyForm: Omit<Partner, "id"> = {
  slug: "",
  name: "",
  logo_url: "",
  tagline: "",
  description: "",
  category: "neobank",
  target_url: "",
  commission_amount: 0,
  commission_model: "cpa",
  is_active: true,
  priority: 100,
  target_personas: ["all"],
  target_pages: ["/"],
};

export function AdminPartners() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState<Omit<Partner, "id">>(emptyForm);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outbound_partners")
        .select("*")
        .order("priority", { ascending: false });
      if (error) throw error;
      return data as Partner[];
    },
  });

  const { data: stats = [] } = useQuery({
    queryKey: ["admin-partner-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_partner_stats", {
        days_back: 30,
      });
      if (error) throw error;
      return data as PartnerStats[];
    },
  });

  const statsByPartner = new Map(stats.map((s) => [s.partner_id, s]));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        category: form.category as
          "neobank" | "accounting" | "insurance" | "fuel_card" | "leasing" | "other",
        commission_model: form.commission_model as "cpa" | "cps" | "cpc",
        logo_url: form.logo_url?.trim() || null,
        tagline: form.tagline?.trim() || null,
        description: form.description?.trim() || null,
      };
      if (editing) {
        const { error } = await supabase
          .from("outbound_partners")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("outbound_partners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      toast({ title: editing ? "Partenaire modifié" : "Partenaire créé" });
    },
    onError: (err: Error) =>
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("outbound_partners").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-partners"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("outbound_partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      toast({ title: "Partenaire supprimé" });
    },
  });

  const startEdit = (p: Partner) => {
    setEditing(p);
    setForm({
      slug: p.slug,
      name: p.name,
      logo_url: p.logo_url ?? "",
      tagline: p.tagline ?? "",
      description: p.description ?? "",
      category: p.category,
      target_url: p.target_url,
      commission_amount: p.commission_amount,
      commission_model: p.commission_model,
      is_active: p.is_active,
      priority: p.priority,
      target_personas: p.target_personas,
      target_pages: p.target_pages,
    });
    setOpen(true);
  };

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const totalClicks = stats.reduce((s, p) => s + (p.total_clicks ?? 0), 0);
  const totalRevenue = stats.reduce((s, p) => s + Number(p.estimated_revenue ?? 0), 0);
  const activeCount = partners.filter((p) => p.is_active).length;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Handshake className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-bold">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Partenaires actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <MousePointerClick className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{totalClicks}</p>
            <p className="text-xs text-muted-foreground">Clics 30j</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2">
              <Euro className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold">{totalRevenue.toFixed(0)}€</p>
            <p
              className="text-xs text-muted-foreground"
              title="Estimation basée sur un taux de conversion forfaitaire de 4% appliqué aux clics"
            >
              Revenu estimé 30j (conv. 4%)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Handshake className="h-4 w-4 text-primary" />
            Partenaires sortants
          </CardTitle>
          <Button size="sm" className="gap-1.5" onClick={startCreate}>
            <Plus className="h-3.5 w-3.5" />
            Nouveau partenaire
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32" />
          ) : partners.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun partenaire configuré. Créez-en un pour commencer.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partenaire</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Clics 30j</TableHead>
                    <TableHead className="text-right">Revenu est.</TableHead>
                    <TableHead className="text-center">Actif</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((p) => {
                    const s = statsByPartner.get(p.id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {p.logo_url && (
                              <img
                                src={p.logo_url}
                                alt={p.name}
                                className="h-7 w-7 rounded object-contain"
                              />
                            )}
                            <div>
                              <p className="text-sm font-medium">{p.name}</p>
                              <p className="text-[10px] text-muted-foreground">{p.slug}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {p.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {p.commission_amount}€
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            {p.commission_model.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {s?.total_clicks ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm text-emerald-600 dark:text-emerald-400">
                            {Number(s?.estimated_revenue ?? 0).toFixed(0)}€
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={p.is_active}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({
                                id: p.id,
                                is_active: checked,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => startEdit(p)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm(`Supprimer ${p.name} ?`)) {
                                  deleteMutation.mutate(p.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Modifier ${editing.name}` : "Nouveau partenaire"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                  placeholder="qonto"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nom *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Qonto"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>URL d'affiliation *</Label>
              <Input
                value={form.target_url}
                onChange={(e) => setForm({ ...form, target_url: e.target.value })}
                placeholder="https://qonto.com/?ref=iktracker"
              />
            </div>

            <div className="space-y-1.5">
              <Label>URL du logo</Label>
              <Input
                value={form.logo_url ?? ""}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tagline (1 ligne)</Label>
              <Input
                value={form.tagline ?? ""}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                placeholder="Le compte pro nouvelle génération"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Comptabilité auto des notes de frais, cartes virtuelles…"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neobank">Néobanque</SelectItem>
                    <SelectItem value="accounting">Comptabilité</SelectItem>
                    <SelectItem value="insurance">Assurance</SelectItem>
                    <SelectItem value="fuel_card">Carte carburant</SelectItem>
                    <SelectItem value="leasing">Leasing / LLD</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Commission (€)</Label>
                <Input
                  type="number"
                  value={form.commission_amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      commission_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Modèle</Label>
                <Select
                  value={form.commission_model}
                  onValueChange={(v) => setForm({ ...form, commission_model: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpa">CPA (par conversion)</SelectItem>
                    <SelectItem value="cps">CPS (revshare)</SelectItem>
                    <SelectItem value="cpc">CPC (par clic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pages cibles (séparées par virgule)</Label>
                <Input
                  value={form.target_pages.join(",")}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      target_pages: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="/, /frais-reels, /tarifs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Vide ou "all" = toutes les pages
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Personas (séparées par virgule)</Label>
                <Input
                  value={form.target_personas.join(",")}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      target_personas: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="all"
                />
                <p className="text-[10px] text-muted-foreground">"all" = tous personas</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priorité</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      priority: parseInt(e.target.value) || 100,
                    })
                  }
                />
              </div>
              <div className="flex items-end gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label>Actif</Label>
              </div>
            </div>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.slug || !form.name || !form.target_url || saveMutation.isPending}
              className="w-full"
            >
              {saveMutation.isPending
                ? "Enregistrement..."
                : editing
                  ? "Enregistrer"
                  : "Créer le partenaire"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
