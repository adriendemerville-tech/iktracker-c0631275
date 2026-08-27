import { createFileRoute } from "@tanstack/react-router";
import { SmartSignup } from "@/components/auth/SmartSignup";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Créer un compte gratuit - Outil communautaire IK | IKtracker" },
      {
        name: "description",
        content:
          "Création de compte IKtracker : calcul des IK au barème 2026, mode Tournée GPS, synchronisation calendrier, comparateur frais réels vs abattement 10 %, exports PDF. 100 % gratuit, sans carte.",
      },
      {
        property: "og:title",
        content: "Créer un compte gratuit | IKtracker - Outil communautaire",
      },
      {
        property: "og:description",
        content:
          "Rejoignez la communauté IKtracker. Automatisez vos IK : mode tournée GPS, synchronisation calendrier, comparateur frais réels. 100% gratuit.",
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
          "Outil communautaire 100% gratuit. Mode Tournée GPS, synchronisation calendrier, comparateur frais réels, export PDF.",
      },
      { name: "twitter:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/signup" }],
  }),
  component: () => <SmartSignup />,
});
