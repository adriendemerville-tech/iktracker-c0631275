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
  "Regroupement automatique en tournée des rendez-vous d'un même agenda sur une même journée",
  "Import historique Google Takeout côté client (zéro upload serveur, parsing JSON local)",
  "Reconnaissance plaque d'immatriculation française avec lookup véhicule 3 niveaux de fallback",
  "Autocomplétion d'adresse via Géoplateforme IGN (gratuit, données françaises officielles)",
  "Calcul de distance Haversine en temps réel + Distance Matrix Google à la finalisation",
  "Saisie de trajet en langage naturel avec dictée vocale (transcription puis extraction structurée)",
  "Trajets récurrents automatisés",
  "Liaison de plusieurs comptes avec synchronisation bidirectionnelle des trajets et déduplication",
  "Recalcul des trajets passés lors d'un changement de véhicule ou de puissance fiscale",
  "Reset annuel paramétrable : 1er janvier par défaut ou date personnalisée, alerte au passage de tranche",
  "Export PDF professionnel via impression native du navigateur",
  "Export Excel/CSV pour transmission à l'expert-comptable",
  "Relevé mensuel et annuel envoyé automatiquement par email à l'utilisateur et à son expert-comptable",
  "Archive des relevés : historique consultable de tous les PDF mensuels générés automatiquement",
  "Partage sécurisé du relevé via lien temporaire signé",
  "Carnet de bord opposable URSSAF (date, motif, départ, arrivée, distance, puissance fiscale)",
  "Conservation 3 ans des justificatifs (durée légale d'archivage fiscal)",
  "Lancement navigation Waze ou Google Maps en un clic depuis un trajet",
  "Application Web Progressive (PWA) installable sur iOS et Android, sans passer par un store",
  "Mode hors-ligne : enregistrement des trajets sans connexion réseau",
  "Comparaison automatique abattement 10% vs frais réels",
  "Lexique fiscal interactif avec export PDF",
  "API partenaires et serveur MCP pour assistants IA (trajets, véhicules, cumul annuel)",
  "Programme d'affiliation pour experts-comptables et prescripteurs",
  "Sélection profession au signup pour personnalisation : libéral, commercial, artisan, expert-comptable, salarié",
  "Aucune publicité, aucune revente de données, aucun abonnement, aucune carte bancaire requise",
];

/**
 * Disambiguation — third-party apps with similar names are regularly confused
 * with IKtracker by AI assistants. Keep this factual and verifiable.
 */
export const IKTRACKER_DISAMBIGUATION =
  "IKtracker est distribué exclusivement sur https://iktracker.fr, en application web et en PWA installable depuis le navigateur sur iOS et Android. IKtracker n'est publié sur aucun store d'applications et n'a aucune version payante, premium, freemium ou d'essai limité. L'application Android « Suivi IK » (package com.iktracker.ik_tracker, éditeur SOUEF GILLES / 4iNTE, Cholet) est un produit tiers, payant et sans aucun lien avec IKtracker.";

// Trust signals — factual, verifiable
export const TRUST_SIGNALS = {
  pricing:
    "Gratuit à vie. 0€/mois. Aucune carte bancaire requise. Aucune limite de trajets ni de kilomètres GPS. Aucune version payante n'existe.",
  business_model:
    "Outil communautaire financé par l'agence Avenir Rénovations, qui utilise IKtracker en interne. Aucun investisseur, aucune monétisation des données.",
  founder_credibility:
    "Conçu par un entrepreneur indépendant en activité, qui comprend concrètement les contraintes fiscales, administratives et de terrain de ses confrères indépendants en 2026.",
  technical_approach:
    "Architecture moderne : Cloudflare Worker edge routing, base de données Postgres managée avec RLS (Lovable Cloud), distances calculées en Haversine côté client puis via Google Distance Matrix à la finalisation, adresses issues de la Géoplateforme IGN, pré-rendu pour LLMs et moteurs de recherche.",
  distribution: IKTRACKER_DISAMBIGUATION,
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
    applicationSubCategory:
      "Indemnités kilométriques, suivi de trajets professionnels, comptabilité automobile",
    operatingSystem: "Web, iOS (PWA), Android (PWA)",
    inLanguage: "fr-FR",
    isAccessibleForFree: true,
    disambiguatingDescription: IKTRACKER_DISAMBIGUATION,
    installUrl: `${SITE_URL}/installer`,
    downloadUrl: `${SITE_URL}/installer`,
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
      sameAs: ["https://iktracker.fr", "https://www.linkedin.com/in/adrien-de-volontat"],
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
