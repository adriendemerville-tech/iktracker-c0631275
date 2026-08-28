import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Eye,
  EyeOff,
  Flag,
  Lock,
  LockOpen,
  MessageSquare,
  Pin,
  RefreshCcw,
  Search,
  Trash2,
  Users,
} from "lucide-react";

type Discussion = {
  id: string;
  title: string;
  slug: string;
  category_slug: string;
  author_id: string | null;
  status: string;
  seo_indexable: boolean;
  is_pinned: boolean;
  is_locked: boolean;
  is_bot: boolean;
  reply_count: number;
  vote_score: number;
  view_count: number;
  created_at: string;
};

type Report = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  status: string;
  created_at: string;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });

export function AdminForum() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const discussionsQuery = useQuery({
    queryKey: ["admin-forum-discussions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_discussions")
        .select(
          "id, title, slug, category_slug, author_id, status, seo_indexable, is_pinned, is_locked, is_bot, reply_count, vote_score, view_count, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as Discussion[];
    },
  });

  const repliesQuery = useQuery({
    queryKey: ["admin-forum-replies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_replies")
        .select("id, discussion_id, body, status, is_bot, vote_score, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const reportsQuery = useQuery({
    queryKey: ["admin-forum-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_reports")
        .select("id, target_type, target_id, reason, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Report[];
    },
  });

  const profilesQuery = useQuery({
    queryKey: ["admin-forum-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_profiles")
        .select(
          "user_id, pseudo, persona, level, points, discussions_count, replies_count, upvotes_received, is_moderator, member_since, last_seen_at, city",
        )
        .order("points", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const botsQuery = useQuery({
    queryKey: ["admin-forum-bots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_bot_profiles")
        .select("user_id, is_active, lifecycle, activity_weight, last_discussion_at, last_reply_at");
      if (error) throw error;
      return data ?? [];
    },
  });


  const visitsQuery = useQuery({
    queryKey: ["admin-forum-visits"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("marketing_analytics")
        .select("created_at, page, session_id, device_type")
        .like("page", "/forum%")
        .gte("created_at", since)
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const visitStats = useMemo(() => {
    const rows = visitsQuery.data ?? [];
    const now = Date.now();
    const in7 = rows.filter((r) => now - new Date(r.created_at).getTime() <= 7 * 86400000);
    const uniq = (list: typeof rows) => new Set(list.map((r) => r.session_id ?? "")).size;
    const byPage = new Map<string, number>();
    for (const r of rows) byPage.set(r.page, (byPage.get(r.page) ?? 0) + 1);
    const mobile = rows.filter((r) => r.device_type === "mobile").length;
    return {
      views30: rows.length,
      views7: in7.length,
      uniq30: uniq(rows),
      uniq7: uniq(in7),
      mobileShare: rows.length ? Math.round((mobile / rows.length) * 100) : 0,
      topPages: [...byPage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
    };
  }, [visitsQuery.data]);

  const themeStats = useMemo(() => {
    const rows = discussionsQuery.data ?? [];
    const map = new Map<string, { count: number; replies: number; views: number }>();
    for (const d of rows) {
      const cur = map.get(d.category_slug) ?? { count: 0, replies: 0, views: 0 };
      cur.count += 1;
      cur.replies += d.reply_count ?? 0;
      cur.views += d.view_count ?? 0;
      map.set(d.category_slug, cur);
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [discussionsQuery.data]);

  const updateDiscussion = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Discussion> }) => {
      const { error } = await supabase.from("forum_discussions").update(patch as unknown as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-forum-discussions"] });
      toast({ title: "Discussion mise à jour" });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteDiscussion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forum_discussions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-forum-discussions"] });
      toast({ title: "Discussion supprimée" });
    },
    onError: (e: Error) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updateReply = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("forum_replies").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-forum-replies"] });
      toast({ title: "Réponse mise à jour" });
    },
  });

  const resolveReport = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("forum_reports").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-forum-reports"] });
      toast({ title: "Signalement traité" });
    },
  });

  const discussions = discussionsQuery.data ?? [];
  const filtered = discussions.filter((d) =>
    search.trim() ? d.title.toLowerCase().includes(search.trim().toLowerCase()) : true,
  );
  const pendingReports = (reportsQuery.data ?? []).filter((r) => r.status === "pending");

  const totalReplies = (repliesQuery.data ?? []).length;

  const botIds = useMemo(
    () => new Set((botsQuery.data ?? []).map((b) => b.user_id)),
    [botsQuery.data],
  );
  const botMeta = useMemo(
    () => new Map((botsQuery.data ?? []).map((b) => [b.user_id, b])),
    [botsQuery.data],
  );
  const viewsByAuthor = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of discussions) {
      if (!d.author_id) continue;
      m.set(d.author_id, (m.get(d.author_id) ?? 0) + (d.view_count ?? 0));
    }
    return m;
  }, [discussions]);

  const contributors = useMemo(() => {
    const rows = (profilesQuery.data ?? []).map((p) => ({
      ...p,
      isBot: botIds.has(p.user_id),
      bot: botMeta.get(p.user_id),
      views: viewsByAuthor.get(p.user_id) ?? 0,
      contributions: (p.discussions_count ?? 0) + (p.replies_count ?? 0),
    }));
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => (q ? (r.pseudo ?? "").toLowerCase().includes(q) : true))
      .sort((a, b) => b.contributions - a.contributions || b.views - a.views);
  }, [profilesQuery.data, botIds, botMeta, viewsByAuthor, search]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Discussions" value={discussions.length} icon={<MessageSquare className="w-4 h-4" />} />
        <StatCard label="Réponses (200 dern.)" value={totalReplies} icon={<MessageSquare className="w-4 h-4" />} />
        <StatCard label="Contributeurs" value={(profilesQuery.data ?? []).length} icon={<Users className="w-4 h-4" />} />
        <StatCard label="Vues /forum 7j" value={visitStats.views7} icon={<Eye className="w-4 h-4" />} />
        <StatCard
          label="Signalements en attente"
          value={pendingReports.length}
          icon={<Flag className="w-4 h-4" />}
        />
      </div>

      <Tabs defaultValue="moderation">
        <TabsList>
          <TabsTrigger value="moderation">Modération</TabsTrigger>
          <TabsTrigger value="contributors">Contributeurs</TabsTrigger>
          <TabsTrigger value="visits">Visites</TabsTrigger>
          <TabsTrigger value="themes">Thèmes</TabsTrigger>
          <TabsTrigger value="indexation">Indexation</TabsTrigger>
        </TabsList>

        {/* Contributeurs */}
        <TabsContent value="contributors" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Contributeurs & bots</CardTitle>
                <CardDescription>
                  {contributors.filter((c) => !c.isBot).length} humains ·{" "}
                  {contributors.filter((c) => c.isBot).length} bots · vues cumulées de leurs discussions
                </CardDescription>
              </div>
              <div className="relative w-56">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Rechercher un pseudo…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {profilesQuery.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-muted-foreground text-xs">
                    <tr className="border-b">
                      <th className="text-left py-2">Membre</th>
                      <th className="text-left py-2">Type</th>
                      <th className="text-left py-2">Niveau</th>
                      <th className="text-right py-2">Discussions</th>
                      <th className="text-right py-2">Réponses</th>
                      <th className="text-right py-2">Contributions</th>
                      <th className="text-right py-2">Vues</th>
                      <th className="text-right py-2">Votes reçus</th>
                      <th className="text-right py-2">Points</th>
                      <th className="text-right py-2">Inscrit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contributors.map((c) => (
                      <tr key={c.user_id} className="border-b last:border-0">
                        <td className="py-2">
                          <div className="font-medium">{c.pseudo || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {[c.persona, c.city].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </td>
                        <td className="py-2">
                          {c.isBot ? (
                            <Badge variant="secondary">
                              Bot{c.bot?.is_active === false ? " (inactif)" : ""}
                            </Badge>
                          ) : c.is_moderator ? (
                            <Badge>Modérateur</Badge>
                          ) : (
                            <Badge variant="outline">Membre</Badge>
                          )}
                        </td>
                        <td className="py-2 text-xs">{c.level ?? "—"}</td>
                        <td className="py-2 text-right">{c.discussions_count ?? 0}</td>
                        <td className="py-2 text-right">{c.replies_count ?? 0}</td>
                        <td className="py-2 text-right font-medium">{c.contributions}</td>
                        <td className="py-2 text-right">{c.views}</td>
                        <td className="py-2 text-right">{c.upvotes_received ?? 0}</td>
                        <td className="py-2 text-right">{c.points ?? 0}</td>
                        <td className="py-2 text-right text-xs text-muted-foreground">
                          {c.member_since ? fmtDate(c.member_since) : "—"}
                        </td>
                      </tr>
                    ))}
                    {contributors.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-6 text-center text-muted-foreground">
                          Aucun contributeur
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Modération */}
        <TabsContent value="moderation" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Signalements</CardTitle>
                <CardDescription>Contenus signalés par les membres</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void reportsQuery.refetch()}
                aria-label="Rafraîchir les signalements"
              >
                <RefreshCcw className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {reportsQuery.isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (reportsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun signalement.</p>
              ) : (
                (reportsQuery.data ?? []).map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Badge variant="outline">{r.target_type}</Badge>
                        <Badge variant={r.status === "pending" ? "destructive" : "secondary"}>
                          {r.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {r.reason || "Sans motif"}
                      </p>
                    </div>
                    {r.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveReport.mutate({ id: r.id, status: "dismissed" })}
                        >
                          Ignorer
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => resolveReport.mutate({ id: r.id, status: "resolved" })}
                        >
                          Traité
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Discussions</CardTitle>
              <CardDescription>Épingler, verrouiller, masquer ou supprimer</CardDescription>
              <div className="relative pt-2">
                <Search className="absolute left-2 top-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Rechercher un titre…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {discussionsQuery.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                filtered.map((d) => (
                  <div key={d.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`/forum/${d.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline"
                      >
                        {d.title}
                      </a>
                      <Badge variant="outline">{d.category_slug}</Badge>
                      {d.is_bot && <Badge variant="secondary">bot</Badge>}
                      {d.status !== "published" && <Badge variant="destructive">{d.status}</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {fmtDate(d.created_at)} · {d.reply_count} rép. · {d.view_count} vues
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={d.is_pinned ? "default" : "outline"}
                        onClick={() =>
                          updateDiscussion.mutate({ id: d.id, patch: { is_pinned: !d.is_pinned } })
                        }
                      >
                        <Pin className="w-3.5 h-3.5 mr-1" /> {d.is_pinned ? "Épinglée" : "Épingler"}
                      </Button>
                      <Button
                        size="sm"
                        variant={d.is_locked ? "default" : "outline"}
                        onClick={() =>
                          updateDiscussion.mutate({ id: d.id, patch: { is_locked: !d.is_locked } })
                        }
                      >
                        {d.is_locked ? (
                          <Lock className="w-3.5 h-3.5 mr-1" />
                        ) : (
                          <LockOpen className="w-3.5 h-3.5 mr-1" />
                        )}
                        {d.is_locked ? "Verrouillée" : "Verrouiller"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateDiscussion.mutate({
                            id: d.id,
                            patch: { status: d.status === "published" ? "hidden" : "published" },
                          })
                        }
                      >
                        {d.status === "published" ? (
                          <EyeOff className="w-3.5 h-3.5 mr-1" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 mr-1" />
                        )}
                        {d.status === "published" ? "Masquer" : "Publier"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (window.confirm(`Supprimer définitivement « ${d.title} » ?`))
                            deleteDiscussion.mutate(d.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Supprimer
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dernières réponses</CardTitle>
              <CardDescription>Masquer une réponse problématique</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(repliesQuery.data ?? []).slice(0, 30).map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm line-clamp-2">{r.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(r.created_at)} · score {r.vote_score}
                      {r.is_bot ? " · bot" : ""}
                      {r.status !== "published" ? ` · ${r.status}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateReply.mutate({
                        id: r.id,
                        status: r.status === "published" ? "hidden" : "published",
                      })
                    }
                  >
                    {r.status === "published" ? "Masquer" : "Publier"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visites */}
        <TabsContent value="visits" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Pages vues 7j" value={visitStats.views7} />
            <StatCard label="Pages vues 30j" value={visitStats.views30} />
            <StatCard label="Sessions uniques 7j" value={visitStats.uniq7} />
            <StatCard label="Part mobile" value={`${visitStats.mobileShare}%`} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pages forum les plus vues (30j)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {visitsQuery.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : visitStats.topPages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune visite enregistrée.</p>
              ) : (
                visitStats.topPages.map(([page, count]) => (
                  <div key={page} className="flex items-center justify-between text-sm border-b py-1">
                    <span className="truncate">{page}</span>
                    <span className="font-medium tabular-nums">{count}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thèmes */}
        <TabsContent value="themes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Répartition par thème</CardTitle>
              <CardDescription>Discussions, réponses et vues par catégorie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {themeStats.map(([slug, s]) => {
                const max = themeStats[0]?.[1].count || 1;
                return (
                  <div key={slug} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{slug}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {s.count} disc. · {s.replies} rép. · {s.views} vues
                      </span>
                    </div>
                    <div className="h-2 rounded bg-muted">
                      <div
                        className="h-2 rounded bg-primary"
                        style={{ width: `${Math.round((s.count / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Indexation */}
        <TabsContent value="indexation">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Indexation des discussions</CardTitle>
              <CardDescription>
                Une discussion indexable apparaît dans sitemap-forum.xml et est ouverte aux moteurs.
                {" "}
                {discussions.filter((d) => d.seo_indexable).length}/{discussions.length} indexables.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {filtered.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground truncate">/forum/{d.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {d.seo_indexable ? "index" : "noindex"}
                    </span>
                    <Switch
                      checked={d.seo_indexable}
                      onCheckedChange={(v) =>
                        updateDiscussion.mutate({ id: d.id, patch: { seo_indexable: v } })
                      }
                      aria-label={`Indexation de ${d.title}`}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          {icon}
        </div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
