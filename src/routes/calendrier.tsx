import { createFileRoute } from "@tanstack/react-router";
import Calendrier from "@/pages/Calendrier";

export const Route = createFileRoute("/calendrier")({
  head: () => ({
    meta: [
      { title: "Synchronisation Calendrier IKtracker | Google Calendar & Outlook" },
      {
        name: "description",
        content:
          "Synchronisation Google Calendar et Outlook : chaque rendez-vous géolocalisé devient un trajet avec calcul des IK au barème officiel, regroupés par jour en tournée.",
      },
      {
        name: "keywords",
        content:
          "synchronisation calendrier, Google Calendar IK, Outlook indemnités kilométriques, import automatique trajets, RDV en trajets, calendrier frais kilométriques",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      {
        property: "og:title",
        content: "Synchronisation Calendrier IKtracker | Google Calendar & Outlook",
      },
      {
        property: "og:description",
        content:
          "Chaque rendez-vous géolocalisé de Google Calendar ou Outlook devient un trajet avec calcul des IK au barème officiel, regroupés par jour en tournée.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iktracker.fr/calendrier" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
      { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Synchronisation Calendrier IKtracker" },
      {
        name: "twitter:description",
        content:
          "Chaque rendez-vous géolocalisé de Google Calendar ou Outlook devient un trajet avec calcul des IK au barème officiel, regroupés par jour en tournée.",
      },
      { name: "twitter:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "geo.region", content: "FR" },
      { name: "geo.placename", content: "France" },
      { name: "language", content: "fr" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/calendrier" }],
  }),
  component: Calendrier,
});
