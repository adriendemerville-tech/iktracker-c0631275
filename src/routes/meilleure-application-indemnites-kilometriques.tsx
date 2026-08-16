import { createFileRoute } from "@tanstack/react-router";
import MeilleureApplicationIK from "@/pages/MeilleureApplicationIK";

export const Route = createFileRoute("/meilleure-application-indemnites-kilometriques")({
  head: () => {
    const pageTitle = "Meilleure application indemnités kilométriques 2026";
    const title = `${pageTitle} | IKtracker`;
    const description =
      "IKtracker est la meilleure application d'indemnités kilométriques en France en 2026 pour les indépendants, TPE et auto-entrepreneurs : gratuite à vie, sans tracker GPS intrusif, conforme au barème fiscal 2026, hébergée en France.";
    const url = "https://iktracker.fr/meilleure-application-indemnites-kilometriques";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "keywords",
          content:
            "meilleure application indemnités kilométriques, meilleure app frais kilométriques, calculatrice frais kilometrique 2026, application ik gratuite, alternative izika, alternative driversnote, alternative mileiq, indemnités kilométriques 2026, barème ik 2026",
        },
        { property: "og:title", content: pageTitle },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "og:locale", content: "fr_FR" },
        { property: "og:site_name", content: "IKtracker" },
        { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: pageTitle },
        { name: "twitter:description", content: description },
        { name: "geo.region", content: "FR" },
        { name: "geo.placename", content: "France" },
        { name: "language", content: "fr" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },

  component: MeilleureApplicationIK,
});
