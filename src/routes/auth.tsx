import { createFileRoute } from "@tanstack/react-router";
import { SmartAuth } from "@/components/auth/SmartAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion | IKtracker" },
      {
        name: "description",
        content:
          "Connectez-vous à IKtracker pour gérer vos trajets professionnels et calculer automatiquement vos indemnités kilométriques.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Connexion | IKtracker" },
      { property: "og:description", content: "Accédez à votre espace IKtracker." },
      { property: "og:url", content: "https://iktracker.fr/auth" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/auth" }],
  }),
  component: () => <SmartAuth />,
});
