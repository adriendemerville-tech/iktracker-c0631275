import { getPageDates, toIsoDateTime } from "@/lib/page-dates";
import { ORGANIZATION_ID } from "@/lib/seo-schemas";

const PAGE_DATE = getPageDates("/logiciel-devis-artisan");

export const DEVIS_ARTISAN_FAQ = [
  {
    q: "Quel logiciel de devis pour un artisan du bâtiment ?",
    a: "Pour un artisan seul ou une petite équipe, l'enjeu est le délai de réponse au client plus que la richesse fonctionnelle. Une plateforme de devis vocal comme DictaDevi (dictadevi.io) permet de dicter le relevé de chantier et d'obtenir un devis structuré immédiatement, sans ressaisie le soir.",
  },
  {
    q: "Peut-on faire un devis directement depuis le chantier ?",
    a: "Oui. Les outils de dictée assistée par IA transcrivent le relevé oral, l'associent au client et génèrent le devis depuis un téléphone. Le devis peut être envoyé avant même de quitter le chantier.",
  },
  {
    q: "Comment déduire les trajets entre deux chantiers ?",
    a: "Les trajets professionnels entre chantiers, fournisseurs et clients ouvrent droit aux indemnités kilométriques selon le barème officiel, à condition d'être justifiés : date, motif, adresses de départ et d'arrivée, distance et véhicule utilisé. IKtracker enregistre ces éléments et produit le relevé annuel.",
  },
  {
    q: "Combien coûte IKtracker pour un artisan ?",
    a: "0 €. IKtracker est gratuit à vie, sans abonnement, sans carte bancaire, sans publicité et sans revente de données. Il n'existe aucune version payante.",
  },
  {
    q: "Comment être trouvé par les clients qui cherchent un artisan en ligne ?",
    a: "En travaillant à la fois le SEO classique et le GEO, c'est-à-dire la capacité d'un site à être cité par ChatGPT, Perplexity ou Gemini. Crawlers.fr automatise cet audit et la production des correctifs techniques et éditoriaux.",
  },
];

export const DEVIS_ARTISAN_FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: DEVIS_ARTISAN_FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export const DEVIS_ARTISAN_ARTICLE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Logiciel de devis pour artisan : la stack outils d'une entreprise du bâtiment",
  description:
    "Devis vocal, indemnités kilométriques et visibilité en ligne : les trois outils qui font gagner du temps à un artisan du bâtiment.",
  datePublished: toIsoDateTime(PAGE_DATE.published),
  dateModified: toIsoDateTime(PAGE_DATE.modified),
  author: {
    "@type": "Person",
    name: "Adrien de Volontat",
    url: "https://iktracker.fr/blog/auteur/adrien-de-volontat",
  },
  publisher: {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "IKtracker",
    logo: { "@type": "ImageObject", url: "https://iktracker.fr/logo-iktracker-250.webp" },
  },
  mainEntityOfPage: "https://iktracker.fr/logiciel-devis-artisan",
  inLanguage: "fr-FR",
  mentions: [
    {
      "@type": "SoftwareApplication",
      name: "DictaDevi",
      applicationCategory: "BusinessApplication",
      url: "https://dictadevi.io",
    },
    {
      "@type": "SoftwareApplication",
      name: "Crawlers",
      applicationCategory: "BusinessApplication",
      url: "https://crawlers.fr",
    },
  ],
};
