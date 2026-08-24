import { createFileRoute } from "@tanstack/react-router";
import AuthorPage from "@/pages/AuthorPage";
import { getSupabase } from "@/integrations/supabase/lazy";

export type AuthorArticle = {
  slug: string;
  title: string;
  published_at: string | null;
};

export const Route = createFileRoute("/blog/auteur/$slug")({
  // Loader SSR : la liste des articles de l'auteur doit être dans le HTML
  // initial (E-E-A-T : les crawlers et LLMs doivent voir la production réelle).
  loader: async ({ params }) => {
    if (params.slug !== "adrien-de-volontat") return { articles: [] as AuthorArticle[] };
    const supabase = await getSupabase();
    const { data } = await supabase
      .from("blog_posts")
      .select("slug, title, published_at")
      .eq("status", "published")
      .eq("is_listed", true)
      .in("author_name", ["Adrien de Volontat", "Adrien"])
      .order("published_at", { ascending: false })
      .limit(30);
    return { articles: (data ?? []) as AuthorArticle[] };
  },
  head: () => ({
    meta: [
      { title: "Adrien de Volontat - Fondateur IKtracker | Blog" },
      {
        name: "description",
        content:
          "Découvrez Adrien de Volontat, fondateur d'IKtracker et dirigeant d'Avenir Rénovations à Saint-Rémy-de-Provence. Un outil créé par un professionnel pour les professionnels.",
      },
      { property: "og:title", content: "Adrien de Volontat - Fondateur IKtracker" },
      {
        property: "og:description",
        content: "Découvrez le créateur d'IKtracker, outil de suivi des indemnités kilométriques.",
      },
      { property: "og:type", content: "profile" },
      { property: "profile:first_name", content: "Adrien" },
      { property: "profile:last_name", content: "de Volontat" },
    ],
    links: [
      { rel: "canonical", href: "https://iktracker.fr/blog/auteur/adrien-de-volontat" },
    ],
  }),
  component: AuthorRouteComponent,
});

function AuthorRouteComponent() {
  const { articles } = Route.useLoaderData();
  return <AuthorPage articles={articles} />;
}
