import { createFileRoute } from "@tanstack/react-router";
import Independants from "@/pages/Independants";

export const Route = createFileRoute("/independants")({
  head: () => ({
    meta: [
      { title: "Indépendants : visibilité SEO, GEO et acquisition de clients" },
      {
        name: "description",
        content:
          "Indépendant ou freelance : rendez votre site visible sur Google et dans les réponses des IA. SEO et GEO automatisés avec Crawlers, frais kilométriques gratuits avec IKtracker.",
      },
      {
        name: "keywords",
        content:
          "acquisition client indépendant, SEO freelance, GEO intelligence artificielle, visibilité en ligne auto-entrepreneur, générer des leads, crawlers.fr",
      },
      {
        property: "og:title",
        content: "Indépendants : visibilité en ligne et acquisition de clients",
      },
      {
        property: "og:description",
        content:
          "Un site trouvé sur Google et cité par les IA génère des contacts en continu. Crawlers automatise le SEO et le GEO, IKtracker gère vos kilomètres gratuitement.",
      },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:url", content: "https://iktracker.fr/independants" },
      { property: "og:site_name", content: "IKtracker" },
      { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Indépendants : SEO, GEO et acquisition de clients" },
      {
        name: "twitter:description",
        content:
          "Rendez votre site visible sur Google et dans les réponses des IA, et laissez IKtracker gérer vos indemnités kilométriques.",
      },
      { name: "geo.region", content: "FR" },
      { name: "language", content: "fr" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/independants" }],
  }),
  component: Independants,
});
