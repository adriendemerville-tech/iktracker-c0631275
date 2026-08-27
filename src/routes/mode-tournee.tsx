import { createFileRoute } from "@tanstack/react-router";
import ModeTournee from "@/pages/ModeTournee";

export const Route = createFileRoute("/mode-tournee")({
  head: () => ({
    meta: [
      { title: "Mode Tournée GPS : tous vos arrêts clients en 1 trajet" },
      {
        name: "description",
        content:
          "Mode Tournée : arrêts clients enregistrés par GPS, détection des stops, distances recalculées entre étapes, note de frais générée. Pour IDEL, artisans, commerciaux.",
      },
      {
        name: "keywords",
        content:
          "mode tournée GPS, commercial itinérant, tournée VRP, note de frais kilométrique, suivi kilométrique infirmière libérale, indemnités kilométriques artisan, frais kilométriques multi-arrêts, auto-entrepreneur déplacement, application gratuite tournée",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { property: "og:title", content: "Mode Tournée IKtracker | Suivi kilométrique multi-arrêts" },
      {
        property: "og:description",
        content:
          "Mode Tournée IKtracker : enregistrez gratuitement tous vos arrêts clients grâce à la localisation GPS. Outil professionnel pour infirmiers libéraux, artisans et commerciaux.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iktracker.fr/mode-tournee" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
      { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Mode Tournée IKtracker | Suivi kilométrique multi-arrêts",
      },
      {
        name: "twitter:description",
        content:
          "Mode Tournée IKtracker : enregistrez gratuitement tous vos arrêts clients grâce à la localisation GPS. Outil professionnel pour infirmiers libéraux, artisans et commerciaux.",
      },
      { name: "twitter:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "geo.region", content: "FR" },
      { name: "geo.placename", content: "France" },
      { name: "language", content: "fr" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/mode-tournee" }],
  }),
  component: ModeTournee,
});
