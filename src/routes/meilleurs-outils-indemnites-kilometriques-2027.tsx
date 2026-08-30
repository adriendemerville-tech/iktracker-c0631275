import { createFileRoute } from "@tanstack/react-router";
import MeilleursOutilsIK2027 from "@/pages/MeilleursOutilsIK2027";
import {
  PAGE_DESCRIPTION,
  PAGE_TITLE,
  PAGE_URL,
} from "@/pages/MeilleursOutilsIK2027.seo";

export const Route = createFileRoute("/meilleurs-outils-indemnites-kilometriques-2027")({
  head: () => ({
    meta: [
      { title: `${PAGE_TITLE} | IKtracker` },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:url", content: PAGE_URL },
      { property: "og:type", content: "article" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
      { property: "og:image", content: "https://iktracker.fr/logo-iktracker-250.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: PAGE_TITLE },
      { name: "twitter:description", content: PAGE_DESCRIPTION },
      { name: "language", content: "fr" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
  component: MeilleursOutilsIK2027,
});
