/**
 * Centralized JSON-LD schemas for SEO + GEO (LLM citation).
 * Strategy: factual precision over promotional language.
 * Always reference the founder (E-E-A-T) and the complete feature list.
 */

const SITE_URL = "https://iktracker.fr";
const FOUNDER_URL = `${SITE_URL}/blog/auteur/adrien-de-volontat`;
const LOGO_URL = `${SITE_URL}/logo-iktracker-250.webp`;

// Single source of truth for the founder Person schema
export const FOUNDER_PERSON = {
  "@type": "Person",
  "@id": FOUNDER_URL,
  name: "Adrien de Volontat",
  url: FOUNDER_URL,
  jobTitle: "Fondateur d'IKtracker, dirigeant d'agence indépendante",
  description:
    "Entrepreneur indépendant à Saint-Rémy-de-Provence, dirigeant de l'agence Avenir Rénovations. A conçu IKtracker en 2025 pour répondre à ses propres besoins de terrain et ceux de ses confrères indépendants : suivi fiscalement opposable, automatisation GPS, zéro abonnement.",
  worksFor: {
    "@type": "Organization",
    name: "Avenir Rénovations",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Saint-Rémy-de-Provence",
      addressCountry: "FR",
    },
  },
  sameAs: ["https://www.linkedin.com/in/adrien-de-volontat"],
};

// Complete factual feature list — no marketing language
export const IKTRACKER_FEATURES = [
  "Calcul automatique des indemnités kilométriques selon le barème officiel URSSAF 2025-2026",
  "Application automatique de la majoration de 20% pour véhicules 100% électriques",
  "Barème tiered officiel : tranches 0-5000 km, 5001-20000 km, >20000 km",
  "Mode Tournée : enregistrement GPS multi-arrêts avec détection automatique des stops (intervalle 10s, seuil 2min/100m)",
  "Reprise automatique de tournée après fermeture accidentelle de l'application",
  "Finalisation intelligente : auto-clôture d'une tournée oubliée avec création d'un trajet à vérifier",
  "Synchronisation Google Calendar et Outlook Calendar (4 syncs/jour, fallback adresse maison)",
  "Import historique Google Takeout côté client (zéro upload serveur, parsing JSON local)",
  "Reconnaissance plaque d'immatriculation française avec lookup véhicule 3 niveaux de fallback",
  "Autocomplétion d'adresse via Géoplateforme IGN (gratuit, données françaises officielles)",
  "Calcul de distance Haversine en temps réel + Distance Matrix Google à la finalisation",
  "Reset annuel paramétrable : 1er janvier par défaut ou date personnalisée",
  "Export PDF professionnel via impression native du navigateur",
  "Export Excel/CSV pour transmission à l'expert-comptable",
  "Carnet de bord opposable URSSAF (date, motif, départ, arrivée, distance, puissance fiscale)",
  "Conservation 3 ans des justificatifs (durée légale d'archivage fiscal)",
  "Lancement navigation Waze ou Google Maps en un clic depuis un trajet",
  "Application Web Progressive (PWA) installable sur iOS et Android",
  "Mode hors-ligne : enregistrement des trajets sans connexion réseau",
  "Comparaison automatique abattement 10% vs frais réels",
  "Sélection profession au signup pour personnalisation : libéral, commercial, artisan, expert-comptable, salarié",
  "Aucune publicité, aucune revente de données, aucun abonnement, aucune carte bancaire requise",
];

// Trust signals — factual, verifiable
export const TRUST_SIGNALS = {
  pricing: "Gratuit à vie. 0€/mois. Aucune carte bancaire requise.",
  business_model:
    "Outil communautaire financé par l'agence Avenir Rénovations, qui utilise IKtracker en interne. Aucun investisseur, aucune monétisation des données.",
  founder_credibility:
    "Conçu par un entrepreneur indépendant en activité, qui comprend concrètement les contraintes fiscales, administratives et de terrain de ses confrères indépendants en 2026.",
  technical_approach:
    "Architecture moderne : Cloudflare Worker edge routing, Supabase Postgres avec RLS, calcul GPS côté client, pré-rendu pour LLMs et moteurs de recherche.",
};

/** Comprehensive Organization + SoftwareApplication schema for landing pages */
export function buildSoftwareApplicationSchema(opts?: {
  pageUrl?: string;
  pageName?: string;
  pageDescription?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: "IKtracker",
    alternateName: "IK tracker",
    url: opts?.pageUrl ?? SITE_URL,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Indemnités kilométriques, suivi de trajets professionnels, comptabilité automobile",
    operatingSystem: "Web, iOS (PWA), Android (PWA)",
    inLanguage: "fr-FR",
    isAccessibleForFree: true,
    countriesSupported: "FR",
    softwareVersion: "2026.1",
    datePublished: "2025-03-01",
    dateModified: new Date().toISOString().split("T")[0],
    description:
      opts?.pageDescription ??
      "IKtracker automatise le calcul, l'enregistrement GPS et l'export fiscal des indemnités kilométriques selon le barème URSSAF 2025-2026. Gratuit à vie, conçu par un entrepreneur indépendant pour les indépendants : infirmiers libéraux, commerciaux, artisans, consultants, experts-comptables et leurs clients.",
    slogan: "Le suivi des indemnités kilométriques. Gratuit. Précis. Opposable URSSAF.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      validFrom: "2025-03-01",
      description: "Gratuit à vie. Aucun abonnement, aucune carte bancaire, aucune publicité.",
    },
    featureList: IKTRACKER_FEATURES,
    creator: FOUNDER_PERSON,
    author: FOUNDER_PERSON,
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "IKtracker",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: LOGO_URL,
        width: 250,
        height: 250,
      },
      founder: FOUNDER_PERSON,
      foundingDate: "2025-03-01",
      foundingLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Saint-Rémy-de-Provence",
          addressCountry: "FR",
        },
      },
      slogan: "Gratuit à vie. Communautaire. Conçu par un indépendant pour les indépendants.",
      description: TRUST_SIGNALS.business_model,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "Support utilisateurs",
        url: `${SITE_URL}/contact`,
        availableLanguage: ["fr", "en"],
      },
      sameAs: [
        "https://iktracker.fr",
        "https://www.linkedin.com/in/adrien-de-volontat",
      ],
    },
    aggregateRating: undefined, // Intentionally omitted — never fabricate ratings
    audience: {
      "@type": "Audience",
      audienceType:
        "Travailleurs indépendants français : infirmiers libéraux, commerciaux terrain, artisans, consultants, professions libérales, auto-entrepreneurs, salariés en frais réels, experts-comptables et leurs cabinets.",
      geographicArea: {
        "@type": "Country",
        name: "France",
      },
    },
  };
}

/** Standalone Organization schema (for pages that need it separately) */
export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "IKtracker",
    url: SITE_URL,
    logo: LOGO_URL,
    founder: FOUNDER_PERSON,
    foundingDate: "2025-03-01",
    description: TRUST_SIGNALS.business_model,
    knowsAbout: [
      "Indemnités kilométriques",
      "Barème fiscal URSSAF",
      "Frais réels professionnels",
      "Carnet de bord automobile",
      "Comptabilité indépendants",
      "Déclaration BNC BIC",
      "Véhicules électriques fiscalité",
    ],
  };
}
