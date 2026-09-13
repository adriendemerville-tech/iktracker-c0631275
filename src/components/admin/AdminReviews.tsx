import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Check, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ReviewRow {
  id: string;
  rating: number;
  content: string;
  first_name: string;
  last_name: string;
  company: string;
  job: string | null;
  city: string | null;
  status: string;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  published: "Publié",
  rejected: "Refusé",
};

export default function AdminReviews() {
  const [filter, setFilter] = useState<string>("pending");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews", filter],
    queryFn: async () => {
      let q = (supabase.from("reviews" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ReviewRow[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-reviews-stats"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("reviews" as any) as any)
        .select("rating")
        .eq("status", "published");
      if (error) throw error;
      const list = (data ?? []) as { rating: number }[];
      const avg = list.length
        ? list.reduce((s, r) => s + Number(r.rating), 0) / list.length
        : 0;
      return { count: list.length, avg: Math.round(avg * 10) / 10 };
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase.from("reviews" as any) as any)
        .update({
          status,
          published_at: status === "published" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["admin-reviews-stats"] });
      toast({ title: "Avis mis à jour" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("reviews" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: "Avis supprimé" });
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            Avis publics
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Note moyenne publiée :{" "}
            <span className="font-semibold text-foreground">{stats?.avg ?? 0}/5</span> sur{" "}
            <span className="font-semibold text-foreground">{stats?.count ?? 0}</span> avis
          </div>
          <div className="flex gap-2 ml-auto">
            {["pending", "published", "rejected", "all"].map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Tous" : STATUS_LABEL[f]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground p-4">Aucun avis dans cette catégorie.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={cn(
                          "w-4 h-4",
                          Number(r.rating) >= n - 0.5
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30",
                        )}
                      />
                    ))}
                    <span className="ml-1 text-sm font-medium">{Number(r.rating)}/5</span>
                  </div>
                  <Badge variant={r.status === "published" ? "default" : "outline"}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(r.created_at), "dd MMM yyyy", { locale: fr })}
                  </span>
                </div>

                <p className="text-sm">« {r.content} »</p>

                <p className="text-xs text-muted-foreground">
                  {r.first_name} {r.last_name} — {r.company}
                  {r.job ? ` · ${r.job}` : ""}
                  {r.city ? ` · ${r.city}` : ""}
                </p>

                <div className="flex gap-2">
                  {r.status !== "published" && (
                    <Button
                      size="sm"
                      onClick={() => setStatus.mutate({ id: r.id, status: "published" })}
                    >
                      <Check className="w-4 h-4 mr-1" /> Publier
                    </Button>
                  )}
                  {r.status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus.mutate({ id: r.id, status: "rejected" })}
                    >
                      <X className="w-4 h-4 mr-1" /> Refuser
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive ml-auto"
                    onClick={() => remove.mutate(r.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
