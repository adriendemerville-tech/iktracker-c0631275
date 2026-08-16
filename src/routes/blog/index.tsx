import { createFileRoute } from "@tanstack/react-router";
import Blog from "@/pages/Blog";

export const Route = createFileRoute("/blog/")({
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
