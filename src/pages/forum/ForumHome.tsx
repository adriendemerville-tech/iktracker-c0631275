import { useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { EnhancedMarketingFooter } from "@/components/marketing/EnhancedMarketingFooter";
import { DiscussionCard } from "@/components/forum/DiscussionCard";
import { ForumComposer } from "@/components/forum/ForumComposer";
import { LevelUpDialog } from "@/components/forum/LevelUpDialog";
import { ForumLevelBadge } from "@/components/forum/ForumLevelBadge";
import { ForumAvatar } from "@/components/forum/ForumAvatar";
import { useForumProfile } from "@/hooks/useForumProfile";
import { useLevelUpEvents } from "@/hooks/useLevelUpEvents";
import type {
  ForumCategory,
  ForumDiscussionListItem,
  ForumTopContributor,
} from "@/lib/forum/queries";
import { MessageSquare, Users, Flame, LifeBuoy, GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ForumHomeData {
  categories: ForumCategory[];
  recent: ForumDiscussionListItem[];
  popular: ForumDiscussionListItem[];
  stats: { discussions: number; replies: number; members: number; active_7d: number };
  topContributors?: ForumTopContributor[];
  activeCategory?: string | null;
}

export default function ForumHome({ data }: { data: ForumHomeData }) {
  const { profile, user, loading } = useForumProfile();
  const { event, dismiss } = useLevelUpEvents(Boolean(user));
  const [tab, setTab] = useState<"recent" | "popular">("recent");

  const composerState = useMemo<"anonymous" | "profile-missing" | "ready">(() => {
    if (!user) return "anonymous";
    return profile ? "ready" : "profile-missing";
  }, [user, profile]);

  const list = tab === "recent" ? data.recent : data.popular;

  return (
    <div className="min-h-screen bg-background">
      <MarketingNav user={user ? { email: user.email ?? "" } : null} loading={loading} />

      <main id="main-content" tabIndex={-1} className="container mx-auto px-4 pb-16 pt-24 md:pt-28">
        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold md:text-4xl">
            Forum IKtracker : entraide des indépendants
          </h1>
          <p className="mt-3 text-muted-foreground">
            Posez vos questions sur le barème kilométrique, l'URSSAF, les frais réels, le choix du
            véhicule ou la facturation électronique. Les réponses viennent d'indépendants qui
            roulent tous les jours — infirmiers libéraux, artisans, commerciaux, consultants.
          </p>

          <dl className="mt-5 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
              <dt className="sr-only">Discussions</dt>
              <dd>
                <strong>{data.stats.discussions}</strong> discussions
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" aria-hidden="true" />
              <dt className="sr-only">Réponses</dt>
              <dd>
                <strong>{data.stats.replies}</strong> réponses
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" aria-hidden="true" />
              <dt className="sr-only">Membres</dt>
              <dd>
                <strong>{data.stats.members}</strong> membres
              </dd>
            </div>
          </dl>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <nav aria-label="Catégories du forum" className="mb-5 flex flex-wrap gap-2">
              <Link
                to="/forum"
                className={`rounded-full border px-3 py-1 text-sm ${
                  !data.activeCategory
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Toutes
              </Link>
              {data.categories.map((c) => (
                <Link
                  key={c.slug}
                  to={`/forum/categorie/${c.slug}`}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    data.activeCategory === c.slug
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.label}
                </Link>
              ))}
            </nav>

            <div className="mb-4 flex gap-2" role="tablist" aria-label="Tri des discussions">
              {(["recent", "popular"] as const).map((key) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    tab === key ? "bg-muted text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {key === "recent" ? "Récentes" : "Populaires"}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {list.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Aucune discussion pour le moment. Lancez la première.
                </p>
              ) : (
                list.map((d) => (
                  <DiscussionCard
                    key={d.id}
                    discussion={d}
                    categories={data.categories}
                    canInteract={Boolean(user)}
                  />
                ))
              )}
            </div>

            <div className="mt-8">
              <ForumComposer
                categories={data.categories}
                state={composerState}
                defaultCategory={data.activeCategory ?? undefined}
              />
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Mon profil</h2>
              {profile ? (
                <>
                  <div className="flex items-center gap-3">
                    <ForumAvatar pseudo={profile.pseudo} avatarUrl={profile.avatar_url} size={44} />
                    <div>
                      <p className="text-sm font-medium">{profile.pseudo}</p>
                      <ForumLevelBadge level={profile.level} />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {profile.points} points · {profile.discussions_count} discussions ·{" "}
                    {profile.replies_count} réponses
                  </p>
                  <Link to="/app/forum/profil">
                    <Button variant="outline" size="sm" className="mt-3 w-full">
                      Modifier ma fiche
                    </Button>
                  </Link>
                </>
              ) : user ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Créez votre fiche membre (surnom, métier, photo) pour publier et voter sur le
                    forum.
                  </p>
                  <Link to="/app/forum/profil">
                    <Button variant="outline" size="sm" className="mt-3 w-full">
                      Créer ma fiche
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Connectez-vous pour publier, voter et gagner des niveaux sur le forum.
                  </p>
                  <Link to="/auth">
                    <Button variant="outline" size="sm" className="mt-3 w-full">
                      Connexion
                    </Button>
                  </Link>
                </>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Aide IKtracker</h2>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <LifeBuoy className="h-4 w-4 text-primary" aria-hidden="true" />
                    Assistance et SAV
                  </Link>
                </li>
                <li>
                  <Link
                    to="/fonctionnalites"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <GraduationCap className="h-4 w-4 text-primary" aria-hidden="true" />
                    Tutoriels et fonctionnalités
                  </Link>
                </li>
                <li>
                  <Link
                    to="/bareme-ik-2026"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
                    Barème kilométrique 2026
                  </Link>
                </li>
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Discussions recommandées</h2>
              <ul className="space-y-2 text-sm">
                {data.popular.slice(0, 5).map((d) => (
                  <li key={d.id}>
                    <Link
                      to={`/forum/${d.slug}`}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {d.title}
                    </Link>
                  </li>
                ))}
                {data.popular.length === 0 && (
                  <li className="text-xs text-muted-foreground">
                    Les recommandations apparaîtront dès les premières discussions.
                  </li>
                )}
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Membres les plus actifs</h2>
              {data.topContributors && data.topContributors.length > 0 ? (
                <ul className="space-y-2.5">
                  {data.topContributors.slice(0, 8).map((m, i) => (
                    <li
                      key={m.user_id}
                      className="flex items-center gap-2.5 rounded-lg px-1 py-1"
                    >
                      <span
                          className="w-4 text-center text-xs font-semibold text-muted-foreground"
                          aria-hidden="true"
                        >
                          {i + 1}
                        </span>
                        <ForumAvatar pseudo={m.pseudo} avatarUrl={m.avatar_url} size={28} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{m.pseudo}</span>
                          <span className="text-xs text-muted-foreground">
                            {m.contributions} contribution{m.contributions > 1 ? "s" : ""}
                          </span>
                        </span>
                        <ForumLevelBadge level={m.level} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Le classement apparaîtra dès les premières contributions.
                </p>
              )}
            </section>
          </aside>
        </div>
      </main>

      <EnhancedMarketingFooter />

      <LevelUpDialog
        level={event?.level ?? null}
        previousLevel={event?.previous_level ?? null}
        onClose={dismiss}
      />
    </div>
  );
}
