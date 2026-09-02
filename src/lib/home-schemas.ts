/**
 * JSON-LD de la page d'accueil, injecté côté SSR via le head() de la route "/".
 * Ces données doivent rester statiques (sérialisables au rendu serveur) pour être
 * visibles par Googlebot et les crawlers LLM sans exécution de JavaScript.
 */
import { buildSoftwareApplicationSchema } from "@/lib/seo-schemas";

export const HOME_FAQ_ENTRIES: Array<{ question: string; answer: string }> = [
  {
    question: "IKtracker est-il vraiment gratuit ?",
    answer:
      "Oui, IKtracker est un outil communautaire gratuit. Aucune carte bancaire n'est requise et toutes les fonctionnalités sont accessibles sans frais : mode tournée GPS, synchronisation calendrier, comparateur frais réels, export PDF et CSV.",
  },
  {
    question: "Comment fonctionne le calcul des indemnités kilométriques ?",
    answer:
      "IKtracker applique automatiquement le barème fiscal officiel 2026 publié par la DGFiP (BOFiP) en fonction de la puissance fiscale de votre véhicule et du nombre de kilomètres parcourus. Le calcul prend en compte les 3 tranches (jusqu'à 5000 km, de 5001 à 20000 km, au-delà) et la majoration de 20% pour les véhicules électriques.",
  },
  {
    question: "Puis-je utiliser IKtracker sur mon téléphone ?",
    answer:
      "Oui, IKtracker est une Progressive Web App (PWA) installable sur iPhone et Android. Elle fonctionne hors-ligne et permet d'enregistrer vos trajets en déplacement grâce au Mode Tournée GPS.",
  },
  {
    question: "Comment synchroniser mon calendrier avec IKtracker ?",
    answer:
      "IKtracker se connecte à Google Calendar et Outlook pour importer automatiquement vos rendez-vous professionnels. L'application crée les trajets correspondants avec calcul automatique des distances et des indemnités.",
  },
  {
    question: "Qu'est-ce que le Mode Tournée GPS ?",
    answer:
      "Le Mode Tournée utilise la géolocalisation GPS de votre smartphone pour détecter automatiquement chaque arrêt client. Chaque étape génère un trajet avec distance calculée via Google Maps et indemnités kilométriques calculées instantanément.",
  },
  {
    question: "Comment comparer frais réels et abattement de 10% ?",
    answer:
      "IKtracker propose un comparateur interactif qui calcule votre économie potentielle entre l'abattement forfaitaire de 10% et la déduction des frais réels kilométriques, basé sur le barème 2026 officiel.",
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer:
      "Oui, vos données sont chiffrées et stockées de manière sécurisée en Europe. IKtracker est conforme au RGPD et vos informations ne sont jamais partagées avec des tiers. Vous pouvez exporter ou supprimer vos données à tout moment.",
  },
];

const FAQ_PAGE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": "https://iktracker.fr/#faq",
  mainEntity: HOME_FAQ_ENTRIES.map((entry) => ({
    "@type": "Question",
    name: entry.question,
    acceptedAnswer: { "@type": "Answer", text: entry.answer },
  })),
};

/** SoftwareApplication + Organization + fondateur (E-E-A-T / GEO). */
const SOFTWARE_APPLICATION_SCHEMA = buildSoftwareApplicationSchema({
  pageUrl: "https://iktracker.fr/",
});

/**
 * Parties du site déclarées depuis la home (forum, blog). Le nœud WebSite
 * lui-même est unique et vit dans `__root.tsx` (#website) : on ne le
 * redéclare pas ici pour éviter deux entités WebSite sur la même page.
 */
const SITE_PARTS_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://iktracker.fr/forum#collection",
      url: "https://iktracker.fr/forum",
      name: "Forum IKtracker — entraide des professionnels itinérants",
      description:
        "Forum communautaire francophone où les indépendants itinérants (infirmiers libéraux, artisans, commerciaux, consultants) échangent sur les déplacements professionnels : justificatifs et contrôles URSSAF, choix et entretien de véhicule, passage à l'électrique, organisation de tournées, outils et comptabilité.",
      inLanguage: "fr-FR",
      isPartOf: { "@id": "https://iktracker.fr/#website" },
      publisher: { "@id": "https://iktracker.fr/#organization" },
      about: [
        "Déplacements professionnels des indépendants",
        "Justificatifs et contrôle URSSAF",
        "Choix et entretien de véhicule professionnel",
        "Véhicules électriques et coût d'usage",
        "Organisation des tournées",
      ],
    },
    {
      "@type": "Blog",
      "@id": "https://iktracker.fr/blog#blog",
      url: "https://iktracker.fr/blog",
      name: "Blog IKtracker",
      isPartOf: { "@id": "https://iktracker.fr/#website" },
    },
  ],
};

/** Scripts JSON-LD prêts à être passés à `head().scripts` de la route "/". */
export const HOME_JSON_LD_SCRIPTS = [
  { type: "application/ld+json", children: JSON.stringify(SOFTWARE_APPLICATION_SCHEMA) },
  { type: "application/ld+json", children: JSON.stringify(SITE_PARTS_SCHEMA) },
  { type: "application/ld+json", children: JSON.stringify(FAQ_PAGE_SCHEMA) },
];


