import { createFileRoute } from "@tanstack/react-router";
import ComparatifIzika from "@/pages/ComparatifIzika";

export const Route = createFileRoute("/comparatif-izika")({
  head: () => ({
    meta: [
      { title: "Comparatif Izika vs IKtracker : barème, fonctionnalités et tarifs 2026" },
      {
        name: "description",
        content:
          "Comparatif Izika vs IKtracker : abonnement vs 0 €, synchronisation agenda, rapports fiscaux conformes au barème officiel, vie privée. Tableau fonction par fonction.",
      },
      {
        name: "keywords",
        content:
          "izika alternative, izika gratuit, alternative izika 2026, izika vs iktracker, application indemnités kilométriques gratuite, izika prix",
      },
      {
        property: "og:title",
        content: "Izika vs IKtracker : Le Comparatif 2026 (Alternative Gratuite)",
      },
      {
        property: "og:description",
        content:
          "Pourquoi payer un abonnement Izika ? Découvrez IKtracker, l'alternative 100% gratuite.",
      },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:url", content: "https://iktracker.fr/comparatif-izika" },
      { property: "og:site_name", content: "IKtracker" },
      { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Izika vs IKtracker : Comparatif 2026" },
      {
        name: "twitter:description",
        content: "L'alternative gratuite à Izika pour vos indemnités kilométriques.",
      },
      { name: "geo.region", content: "FR" },
      { name: "geo.placename", content: "France" },
      { name: "language", content: "fr" },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/comparatif-izika" }],
  }),
  component: ComparatifIzika,
});
