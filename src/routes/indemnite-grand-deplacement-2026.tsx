import { createFileRoute } from "@tanstack/react-router";
import IndemniteGrandDeplacement2026 from "@/pages/IndemniteGrandDeplacement2026";

export const Route = createFileRoute("/indemnite-grand-deplacement-2026")({
  head: () => {
    const title = "Indemnité grand déplacement 2026 — barème URSSAF & calcul";
    const description =
      "Barème URSSAF 2026 de l'indemnité de grand déplacement : plafonds repas, nuitée + petit-déjeuner (Paris/province/DOM), conditions de distance et de temps, cumul avec les indemnités kilométriques.";
    const url = "https://iktracker.fr/indemnite-grand-deplacement-2026";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "keywords",
          content:
            "indemnité grand déplacement 2026, barème grand déplacement URSSAF, indemnité repas 2026, indemnité nuitée 2026, frais de mission, forfait grand déplacement, découcher professionnel",
        },
        { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "og:locale", content: "fr_FR" },
        { property: "og:site_name", content: "IKtracker" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },

  component: IndemniteGrandDeplacement2026,
});
