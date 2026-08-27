import { createFileRoute } from "@tanstack/react-router";
import { SmartSignup } from "@/components/auth/SmartSignup";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Créer un compte IKtracker : suivi kilométrique gratuit et relevés" },
      {
        name: "description",
        content:
          "Création de compte IKtracker : calcul IK au barème 2026, mode Tournée GPS, sync calendrier, comparateur frais réels, exports PDF. 100 % gratuit, sans carte bancaire.",
      },
      {
        property: "og:title",
        content: "Créer un compte IKtracker : suivi kilométrique gratuit et relevés",
      },
      {
        property: "og:description",
        content:
          "Compte IKtracker : calcul IK barème 2026, mode tournée GPS, synchronisation calendrier, comparateur frais réels, exports PDF. 100 % gratuit.",
      },
      { property: "og:url", content: "https://iktracker.fr/signup" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
      { name: "twitter:card", content: "summary" },
      {
        name: "twitter:title",
        content: "Créer un compte gratuit | IKtracker - Outil communautaire",
      },
      {
        name: "twitter:description",
        content:
          "Calcul IK barème 2026, mode Tournée GPS, synchronisation calendrier, comparateur frais réels, export PDF. 100 % gratuit.",
      },
      { name: "twitter:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/signup" }],
  }),
  component: () => <SmartSignup />,
});
