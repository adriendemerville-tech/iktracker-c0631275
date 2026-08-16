import { createFileRoute } from "@tanstack/react-router";
import Terms from "@/pages/Terms";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "CGVU | IKtracker — Conditions d'utilisation" },
      {
        name: "description",
        content:
          "Consultez les CGVU d'IKtracker. Conditions de vente, modalités d'utilisation, responsabilités et droits pour l'application gratuite de calcul d'indemnités kilométriques.",
      },
      {
        name: "keywords",
        content:
          "CGVU, CGU, CGV, conditions générales vente utilisation, IKtracker, termes service, modalités utilisation",
      },
      { name: "robots", content: "index, follow" },
      {
        property: "og:title",
        content: "CGVU — Conditions Générales de Vente et d'Utilisation | IKtracker",
      },
      {
        property: "og:description",
        content:
          "Consultez les CGVU d'IKtracker. Conditions de vente et d'utilisation de l'application gratuite.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://iktracker.fr/terms" },
      { property: "og:locale", content: "fr_FR" },
      { property: "og:site_name", content: "IKtracker" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "CGVU | IKtracker" },
      {
        name: "twitter:description",
        content:
          "Consultez les CGVU d'IKtracker. Conditions de vente et d'utilisation de l'application gratuite.",
      },
    ],
    links: [{ rel: "canonical", href: "https://iktracker.fr/terms" }],
  }),
  component: Terms,
});
