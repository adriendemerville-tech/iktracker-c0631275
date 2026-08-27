import { createFileRoute } from "@tanstack/react-router";
import Install from "@/pages/Install";

export const Route = createFileRoute("/installer")({
  head: () => ({
    meta: [
      { title: "Installer IKtracker gratuitement sur iPhone et Android" },
      {
        name: "description",
        content:
          "Installer IKtracker sur iPhone ou Android en 2 minutes : ajout à l'écran d'accueil depuis le navigateur (PWA), sans App Store ni Play Store. Guide illustré, application gratuite.",
      },
      {
        name: "keywords",
        content:
          "installer IKtracker, PWA indemnités kilométriques, application iOS IK, Android frais kilométriques, installer sans App Store, application gratuite mobile",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { property: "og:title", content: "Installer IKtracker | Application PWA iOS et Android" },
      {
        property: "og:description",
        content:
          "Installez librement IKtracker sur votre smartphone iOS ou Android en 2 minutes. Outil professionnel PWA gratuit, sans App Store.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iktracker.fr/installer" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
      { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Installer IKtracker | PWA iOS et Android" },
      {
        name: "twitter:description",
        content:
          "Installez librement IKtracker sur votre smartphone iOS ou Android en 2 minutes. Outil professionnel PWA gratuit, sans App Store.",
      },
      { name: "twitter:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "geo.region", content: "FR" },
      { name: "geo.placename", content: "France" },
      { name: "language", content: "fr" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/installer" }],
  }),
  component: Install,
});
