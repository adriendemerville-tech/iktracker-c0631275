import { createFileRoute } from "@tanstack/react-router";
import Blog from "@/pages/Blog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/blog/")({
  // Loader SSR : la liste des articles doit être dans le HTML initial
  // (crawlers et agents IA sans JS doivent voir les liens des articles).
  loader: async () => {
    const { data } = await supabase
      .from("blog_posts")
      .select(
        "id, slug, title, subtitle, meta_description, featured_image_url, author_name, published_at, display_order",
      )
      .eq("status", "published")
      .eq("is_listed", true)
      .order("published_at", { ascending: false });
    // Même tri que le composant : display_order si présent, sinon published_at
    const posts = [...(data ?? [])].sort((a, b) => {
      if (a.display_order != null && b.display_order != null) {
        return a.display_order - b.display_order;
      }
      return 0;
    });
    return { posts };
  },
  head: () => ({
    meta: [
      { title: "Barème & indemnités kilométriques 2026 — Blog IKtracker" },
      {
        name: "description",
        content:
          "Barème URSSAF 2026, calcul des indemnités kilométriques, frais réels, véhicules électriques : guides pratiques pour indépendants et salariés.",
      },
    ],
    links: [
      { rel: "canonical", href: "https://iktracker.fr/blog" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  component: Blog,
});
