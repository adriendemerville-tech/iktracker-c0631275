// Monthly LinkedIn auto-post for Adrien de Volontat (IKtracker founder identity).
//
// Text generation:
//   • Primary  : Mistral via Wavespeed proxy (WAVESPEED_API_KEY)
//   • Fallback : Gemini via Lovable AI Gateway (LOVABLE_API_KEY)
//
// Media pipeline, chosen per topic via `mediaSource`:
//   • "browserless" → screencast of an actual UI feature (Browserless → MP4)
//   • "wavespeed"   → AI-generated image/video (Wavespeed → MP4 or IA-backed PDF carousel)
//
// Format still drives the LinkedIn upload:
//   • "video"    → LinkedIn VIDEO ugcPost (MP4)
//   • "carousel" → LinkedIn DOCUMENT ugcPost (PDF slides)
//
// Triggered by pg_cron the 1st Wednesday of each month at 07:00 UTC.
// Runtime overrides via query params:
//   ?topic=<slug>      force a specific topic
//   ?format=video|carousel  override the topic's default format
//   ?dry_run=1         generate text (+ slide plan) only, do not upload/post
// Every run is logged in public.linkedin_post_log.

import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { DOC_SECTIONS } from "./docs-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/linkedin";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const BROWSERLESS_BASE = "https://production-sfo.browserless.io";
const WAVESPEED_BASE = "https://api.wavespeed.ai/api/v3";

// Wavespeed model ids (adjust to whatever the catalog exposes; safe defaults).
const WS_MISTRAL_MODEL = "mistral/mistral-large-latest";
const WS_IMAGE_MODEL = "wavespeed-ai/flux-dev";
const WS_VIDEO_MODEL = "wavespeed-ai/wan-2.1-t2v-720p";

type MediaFormat = "video" | "carousel";
type MediaSource = "browserless" | "wavespeed";

type Topic = {
  slug: string;
  title: string;
  url: string;
  focus: string;
  format: MediaFormat;
  mediaSource: MediaSource;
  durationMs: number;     // browserless screencast length
  visualPrompt?: string;  // Wavespeed image/video prompt (mediaSource='wavespeed')
  slideCount?: number;    // number of intermediate carousel slides (default 3 → 5 pages total)
};

// Rotation of 12 topics — with a monthly cadence this covers ~1 year.
// mediaSource='browserless' → real UI screencast (features that must be *shown*).
// mediaSource='wavespeed'   → AI-generated visual (concepts, comparisons, values).
const TOPICS: Topic[] = [
  {
    slug: "simulateur",
    title: "Simulateur d'indemnités kilométriques 2026",
    url: "https://iktracker.fr/bareme-ik-2026#simulateur",
    format: "video",
    mediaSource: "browserless",
    focus:
      "Le simulateur calcule instantanément les IK selon le barème officiel progressif (5 000 / 20 000 km) et applique le bonus 20% pour véhicules 100% électriques. Utile pour un indépendant qui veut estimer son remboursement avant de facturer un client ou d'arbitrer entre véhicule perso et pro.",
    durationMs: 10000,
  },
  {
    slug: "mode-tournee",
    title: "Mode Tournée GPS",
    url: "https://iktracker.fr/mode-tournee",
    format: "video",
    mediaSource: "browserless",
    focus:
      "Détection automatique des arrêts pendant une tournée terrain (2 min à l'arrêt = nouvel arrêt). Pensé pour les visiteurs médicaux, commerciaux, artisans multi-chantiers, aides à domicile. Zéro saisie manuelle, le trajet complet est reconstruit à la fin de la journée.",
    durationMs: 12000,
  },
  {
    slug: "import-takeout",
    title: "Récupération des trajets passés (Google Takeout)",
    url: "https://iktracker.fr/mes-trajets",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Import des trajets Google Timeline depuis un export Takeout. Sauve les indépendants qui n'ont pas suivi leurs déplacements pros toute l'année et qui doivent rattraper en fin d'exercice. Import 100% côté client, aucune donnée transite sur des serveurs tiers.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract representation of GPS trip data being imported, subtle map lines and timeline dots, flat design, clean typography-friendly composition with negative space on the right, no text",
  },
  {
    slug: "sync-calendrier",
    title: "Synchronisation Google Calendar & Outlook",
    url: "https://iktracker.fr/calendrier",
    format: "video",
    mediaSource: "browserless",
    focus:
      "Chaque rendez-vous professionnel dans l'agenda devient automatiquement un trajet indemnisable. Sync 4x par jour, gestion des adresses par défaut (bureau, domicile). Idéal pour les indépendants qui vivent déjà dans leur agenda.",
    durationMs: 10000,
  },
  {
    slug: "detection-plaque",
    title: "Détection véhicule par plaque d'immatriculation",
    url: "https://iktracker.fr/",
    format: "video",
    mediaSource: "browserless",
    focus:
      "Saisir une plaque d'immatriculation renseigne automatiquement la puissance fiscale et la motorisation du véhicule. Le barème IK exact et le bonus électrique 20% s'appliquent sans effort. Fini les recherches sur la carte grise.",
    durationMs: 8000,
  },
  {
    slug: "bareme-progressif",
    title: "Barème progressif fiscal 2026",
    url: "https://iktracker.fr/bareme-ik-2026",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Le barème IK est progressif avec 3 tranches (0-5 000, 5 001-20 000, +20 000 km). Beaucoup d'indépendants perdent de l'argent en appliquant un taux moyen. IKtracker gère les tranches et le reset annuel fiscal automatiquement.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract layered bar-chart representing progressive tax tiers, three tiers of ascending height, clean flat design, ample negative space, no text",
  },
  {
    slug: "bonus-electrique",
    title: "Bonus 20% véhicule électrique",
    url: "https://iktracker.fr/bareme-ik-2026",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Un véhicule 100% électrique donne droit à un bonus fiscal de 20% sur les indemnités kilométriques. C'est cumulable avec le barème standard et souvent oublié. Calculé automatiquement dès que le véhicule est identifié comme électrique.",
    durationMs: 8000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, sleek profile of a modern electric car with a subtle green leaf accent, flat design, clean lines, generous negative space on the right, no text, no logos",
  },
  {
    slug: "export-pdf",
    title: "Export PDF pour l'expert-comptable",
    url: "https://iktracker.fr/expert-comptable",
    format: "video",
    mediaSource: "browserless",
    focus:
      "Export PDF prêt à transmettre au comptable : tableau récapitulatif conforme, signature du dirigeant, détail par trajet, totaux par tranche fiscale. Adieu les Excel bricolés en fin d'exercice.",
    durationMs: 10000,
  },
  {
    slug: "gratuit-a-vie",
    title: "Gratuit à vie — modèle communautaire",
    url: "https://iktracker.fr/",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "IKtracker est gratuit à vie : pas d'abonnement, pas de freemium castré, pas d'investisseurs à rémunérer. Outil créé par un dirigeant qui avait le même problème et qui le partage avec la communauté des indépendants.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract concept of an open community: interconnected human silhouettes forming a light circle, flat design, generous negative space, no text",
  },
  {
    slug: "confidentialite",
    title: "Aucune exploitation commerciale des données",
    url: "https://iktracker.fr/privacy",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Zéro revente de données, zéro publicité, zéro tracking commercial. Contrairement à la plupart des GPS trackers gratuits en apparence dont le vrai business est la donnée. Les trajets restent la propriété de l'utilisateur.",
    durationMs: 8000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract closed padlock over a subtle map grid, flat design, clean lines, generous negative space on the right, no text",
  },
  {
    slug: "comparatif",
    title: "IKtracker vs applications payantes",
    url: "https://iktracker.fr/comparatif-driversnote",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Face aux applications payantes du marché (Drivers Note, Izika, MileageWise) : mêmes fonctionnalités cœur, zéro euro, sans engagement, avec le barème français à jour et un focus indépendants français.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract split composition contrasting a heavy price tag with a light feather, flat design, clean lines, no text, no logos",
  },
  {
    slug: "trajets-recurrents",
    title: "Trajets récurrents automatisés",
    url: "https://iktracker.fr/mes-trajets",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "IKtracker permet de définir des trajets récurrents (visite client hebdomadaire, tournée du mardi, aller-retour bureau chez un partenaire) qui se génèrent automatiquement à la fréquence choisie. L'indépendant configure une fois, l'outil crée les entrées chaque semaine ou chaque mois. Fini les oublis en fin d'exercice et la saisie répétitive des mêmes adresses. Compatible avec le barème progressif, le bonus électrique et l'export comptable.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract representation of a repeating calendar loop with a subtle route line arcing between two points, cyclical pattern, flat design, clean lines, generous negative space on the right, no text, no logos",
    slideCount: 4,
  },

  // ---- Workflows transversaux (chaînes de bout en bout, pas un module isolé) ----
  {
    slug: "workflow-agenda-comptable",
    title: "De l'agenda au comptable, sans ressaisie",
    url: "https://iktracker.fr/expert-comptable",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Chaîne complète : un rendez vous dans Google Calendar ou Outlook devient un trajet, le barème progressif et le bonus électrique s'appliquent, le relevé mensuel part automatiquement au comptable avec un lien sécurisé. Aucune saisie manuelle sur toute la chaîne.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract pipeline of three connected nodes flowing left to right, calendar dot, route line, document sheet, flat design, generous negative space, no text, no logos",
    slideCount: 4,
  },
  {
    slug: "workflow-cloture-exercice",
    title: "Clôture d'exercice : reconstituer une année en une soirée",
    url: "https://iktracker.fr/mes-trajets",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Workflow de rattrapage complet en fin d'exercice : import Google Takeout, contrôle des doublons, recalcul des distances, application du barème par tranche, export PDF annuel et archivage des relevés. Pensé pour l'indépendant qui n'a rien suivi de l'année.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract stack of documents converging into a single clean sheet, twelve small month markers, flat design, generous negative space, no text",
    slideCount: 4,
  },

  // ---- Problèmes visés (angle douleur, pas fonctionnalité) ----
  {
    slug: "probleme-oubli-trajets",
    title: "Les trajets oubliés coûtent cher",
    url: "https://iktracker.fr/",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Le vrai problème n'est pas le calcul, c'est l'oubli : les petits déplacements non notés disparaissent et représentent des centaines d'euros d'indemnités perdues sur un exercice. La capture automatique par agenda ou GPS supprime la charge mentale.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract dotted route with several missing segments fading out, flat design, generous negative space, no text",
  },
  {
    slug: "probleme-justificatif-controle",
    title: "Justifier ses kilomètres en cas de contrôle",
    url: "https://iktracker.fr/note-de-frais-kilometrique",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Un tableur reconstitué après coup ne tient pas face à un contrôle : il faut la date, le motif, le départ, l'arrivée, la distance et le véhicule pour chaque déplacement. IKtracker horodate au fil de l'eau et produit un relevé traçable.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract document with a magnifying glass over aligned rows, flat design, clean lines, generous negative space, no text",
  },

  // ---- Tarifs ----
  {
    slug: "tarifs",
    title: "Tarifs IKtracker : 0 euro, pas de palier caché",
    url: "https://iktracker.fr/tarifs",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "La page tarifs tient en un chiffre : 0 euro par an. Pas d'abonnement, pas de carte bancaire à l'inscription, pas de fonctionnalité bloquée derrière un premium, pas de publicité, pas de revente de données. Toutes les fonctions sont incluses, y compris export et API.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, a single large abstract zero shape as the focal element, flat design, generous negative space on the right, no text, no logos",
  },

  // ---- Lead magnets (ressources gratuites sans compte) ----
  {
    slug: "lead-magnet-note-de-frais",
    title: "Modèle de note de frais kilométrique",
    url: "https://iktracker.fr/note-de-frais-kilometrique",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Ressource gratuite accessible sans compte : la structure exacte d'une note de frais kilométrique conforme, les mentions obligatoires et la façon de la remplir. Point d'entrée pour ceux qui cherchent un modèle avant de chercher un outil.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract expense form with aligned rows and a subtle car glyph, flat design, generous negative space, no text",
  },
  {
    slug: "lead-magnet-lexique",
    title: "Lexique des indemnités kilométriques",
    url: "https://iktracker.fr/lexique",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Ressource gratuite : le vocabulaire fiscal des IK expliqué simplement, puissance fiscale, barème progressif, frais réels, grand déplacement, abattement. Utile avant une déclaration ou un échange avec un comptable.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract open reference book with subtle index tabs, flat design, generous negative space, no text",
  },
  {
    slug: "lead-magnet-api-comptable",
    title: "API gratuite pour les experts-comptables",
    url: "https://iktracker.fr/api-docs",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Ressource destinée aux cabinets : une API gratuite pour récupérer les relevés kilométriques de leurs clients, sans double saisie et sans abonnement par utilisateur. Point d'entrée prescripteur, un cabinet amène plusieurs indépendants.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract connected endpoints exchanging structured data blocks, flat design, generous negative space, no text",
  },

  // ---- Contenu éditorial (article de blog, résolu dynamiquement) ----
  {
    slug: "article-blog",
    title: "Article du blog IKtracker",
    url: "https://iktracker.fr/blog",
    format: "carousel",
    mediaSource: "wavespeed",
    focus:
      "Mise en avant d'un article publié sur le blog IKtracker, avec son angle propre et un renvoi vers la page pour la lecture complète.",
    durationMs: 10000,
    visualPrompt:
      "Editorial minimalist illustration, warm ivory background, indigo-violet accents, abstract article layout with a headline bar and text lines, flat design, generous negative space, no text",
  },
];


// Faits techniques précis par module. Injectés tels quels dans le prompt pour que
// le post décrive une fonctionnalité réelle, avec son mécanisme, et pas une
// généralité marketing sur les indemnités kilométriques.
const TOPIC_FACTS: Record<string, string[]> = {
  simulateur: [
    "Le simulateur est public, sans compte, sur la page barème IK 2026.",
    "Trois tranches officielles : 0 à 5 000 km, 5 001 à 20 000 km, au-delà de 20 000 km, avec un coefficient différent par tranche.",
    "La puissance fiscale se choisit de 3 CV à 7 CV et plus.",
    "Un véhicule 100% électrique applique un multiplicateur de 1,2 sur le résultat, les hybrides non.",
    "Le calcul se met à jour à chaque frappe, sans bouton valider.",
  ],
  "mode-tournee": [
    "Mode disponible sur mobile uniquement, lancé par un bouton unique en bas d'écran.",
    "Position relevée toutes les 10 secondes, points aberrants au-delà de 50 mètres par relevé écartés, micro déplacements sous 5 mètres ignorés.",
    "Un arrêt est validé après 2 minutes d'immobilité dans un rayon de 100 mètres.",
    "Distance en direct par formule de Haversine, puis recalcul exact entre chaque arrêt via Distance Matrix à la clôture.",
    "Le wake lock garde l'écran actif, une session interrompue est proposée en reprise au relancement.",
  ],
  "import-takeout": [
    "Import d'un export Google Takeout au format JSON de la Timeline.",
    "Parsing intégralement dans le navigateur, aucun fichier envoyé à un serveur.",
    "Le wizard est réservé au desktop, à cause de la taille des fichiers Takeout.",
    "Chaque déplacement détecté devient un trajet à valider, avec date, départ, arrivée et distance.",
    "Sert typiquement à reconstituer une année entière avant une clôture d'exercice.",
  ],
  "sync-calendrier": [
    "Connexion Google Calendar et Outlook par OAuth, plusieurs agendas par compte.",
    "Synchronisation quatre fois par jour.",
    "Adresse manquante sur un événement : repli sur l'adresse Maison définie dans le profil.",
    "Filtres automatiques : événements en visio Meet, Zoom, Teams ignorés, événements marqués disponible ignorés, départ identique à l'arrivée ignoré.",
    "Deux rendez vous du même agenda le même jour peuvent être fusionnés en une tournée.",
    "Un rendez vous futur reste masqué tant que sa date n'est pas atteinte.",
  ],
  "detection-plaque": [
    "Saisie de la plaque d'immatriculation, retour de la marque, du modèle, de la motorisation et de la puissance fiscale.",
    "Trois sources interrogées en cascade, avec repli si la première ne répond pas.",
    "Marge de sécurité de plus 1 CV appliquée quand la source est ambiguë, pour ne jamais surestimer l'indemnité.",
    "La motorisation électrique déclenche automatiquement le bonus de 20%.",
    "Plus besoin d'ouvrir la carte grise pour lire la case P.6.",
  ],
  "bareme-progressif": [
    "Barème progressif, pas un taux unique : le compteur annuel change de tranche en cours d'année.",
    "Tranches 0 à 5 000 km, 5 001 à 20 000 km, au-delà de 20 000 km.",
    "Le compteur se remet à zéro au 1er janvier, ou à une date d'exercice personnalisée.",
    "Un seul calcul de référence dans tout l'outil, du simulateur à l'export comptable.",
    "Appliquer un taux moyen sur l'année fait perdre de l'argent dans la première tranche.",
  ],
  "bonus-electrique": [
    "Majoration de 20% sur l'indemnité pour un véhicule 100% électrique.",
    "Appliquée par un multiplicateur de 1,2 après calcul du barème par tranche.",
    "Hybrides et hybrides rechargeables exclus.",
    "Activée automatiquement quand la plaque identifie une motorisation électrique, sinon par une case dans la fiche véhicule.",
    "Changer la motorisation d'un véhicule permet de recalculer, au choix, les trajets passés.",
  ],
  "export-pdf": [
    "Export PDF généré à l'impression native du navigateur, sans dépendance lourde.",
    "Contenu : détail trajet par trajet, totaux par tranche fiscale, récapitulatif annuel, profil du véhicule avec immatriculation, modèle, carburant et chevaux fiscaux.",
    "Envoi automatique au comptable à date fixe, avec lien sécurisé vers le relevé.",
    "Relevé mensuel envoyé à l'utilisateur le 15 du mois pour le mois précédent.",
  ],
  "gratuit-a-vie": [
    "Aucun abonnement, aucune version limitée, aucune carte bancaire demandée.",
    "Outil développé pour les besoins d'une agence de rénovation, infrastructure déjà payée, donc partagée.",
    "Pas d'investisseurs, donc pas d'obligation de monétiser les utilisateurs.",
  ],
  confidentialite: [
    "Aucune revente de données, aucune publicité, aucun tracking commercial.",
    "L'import Google Takeout est traité côté navigateur, les fichiers ne quittent pas la machine.",
    "Les accès aux données sont cloisonnés par utilisateur au niveau de la base.",
    "Suppression de compte et de l'ensemble des trajets à la demande.",
  ],
  comparatif: [
    "Les applications concurrentes facturent un abonnement mensuel par utilisateur.",
    "IKtracker couvre le barème français à jour, le suivi GPS, la synchronisation d'agenda et l'export comptable, à zéro euro.",
    "Pas d'engagement, pas de palier premium qui bloque l'export.",
  ],
  "trajets-recurrents": [
    "Définition d'un trajet type avec sa fréquence, hebdomadaire ou mensuelle.",
    "Les occurrences se créent automatiquement, sans ressaisir les adresses.",
    "Compatible avec le barème progressif, le bonus électrique et l'export comptable.",
    "Modifiable ou interruptible à tout moment, les occurrences passées restent intactes.",
  ],
  "workflow-agenda-comptable": [
    "Chaîne : agenda connecté en OAuth, synchronisation quatre fois par jour, création du trajet, calcul par tranche, relevé mensuel envoyé au comptable.",
    "Les événements en visio et les journées sans déplacement sont filtrés avant création.",
    "Le relevé part par e-mail avec un lien sécurisé à durée limitée vers le PDF.",
    "Aucune ressaisie entre l'agenda et le document comptable.",
  ],
  "workflow-cloture-exercice": [
    "Import Google Takeout côté navigateur pour reconstituer les déplacements passés.",
    "Détection des doublons avant validation, recalcul des distances réelles.",
    "Application du barème par tranche sur l'ensemble de l'année, avec reset au 1er janvier ou à une date d'exercice personnalisée.",
    "Export PDF annuel et archivage des relevés mensuels consultables ensuite.",
  ],
  "probleme-oubli-trajets": [
    "Les déplacements courts non notés sont ceux qui disparaissent le plus souvent.",
    "Sur la première tranche du barème, chaque kilomètre oublié coûte le taux le plus élevé.",
    "La capture automatique par agenda ou par GPS supprime la dépendance à la mémoire.",
    "Le relevé mensuel du 15 sert de point de contrôle mensuel.",
  ],
  "probleme-justificatif-controle": [
    "Un relevé kilométrique doit porter date, motif, départ, arrivée, distance et véhicule.",
    "Les données sont enregistrées au fil de l'eau, pas reconstituées après coup.",
    "Le profil véhicule embarque immatriculation, motorisation et chevaux fiscaux dans l'export.",
    "Les totaux par tranche fiscale figurent sur le document remis au comptable.",
  ],
  tarifs: [
    "0 euro par an, aucune formule payante, aucun palier premium.",
    "Aucune carte bancaire demandée à l'inscription ni ensuite.",
    "Toutes les fonctions sont incluses : mode tournée, synchronisation agenda, export PDF et Excel, envoi au comptable, API.",
    "Pas de publicité et pas de revente de données, les trajets restent cloisonnés par utilisateur.",
  ],
  "lead-magnet-note-de-frais": [
    "Page publique consultable sans compte.",
    "Détaille les mentions obligatoires d'une note de frais kilométrique.",
    "Explique le passage de la distance au montant via le barème par tranche.",
    "Sert de base réutilisable pour un salarié comme pour un indépendant.",
  ],
  "lead-magnet-lexique": [
    "Page publique consultable sans compte.",
    "Définit puissance fiscale, barème progressif, frais réels, grand déplacement, abattement forfaitaire.",
    "Rédigé pour être compris sans formation comptable.",
    "Complète le simulateur public de la page barème 2026.",
  ],
  "lead-magnet-api-comptable": [
    "API gratuite destinée aux cabinets d'expertise comptable.",
    "Récupération des relevés kilométriques des clients qui ont donné leur accord.",
    "Aucune facturation par utilisateur, aucun abonnement cabinet.",
    "Documentation publique accessible en ligne.",
  ],
  "article-blog": [
    "Le blog IKtracker publie des contenus sur le barème, les frais réels et l'organisation des déplacements professionnels.",
    "Chaque article est en accès libre, sans compte ni inscription.",
  ],
};

// Rotation par familles de sujets. Le scope couvre les fonctionnalités, les
// workflows transversaux, les problèmes visés, les articles de blog, les tarifs
// et les lead magnets. Une famille par mois, dans un ordre déterministe.
const PRODUCT_SLUGS = [
  "simulateur",
  "mode-tournee",
  "sync-calendrier",
  "detection-plaque",
  "export-pdf",
  "import-takeout",
  "trajets-recurrents",
];
const CONTEXT_SLUGS = [
  "bareme-progressif",
  "bonus-electrique",
  "gratuit-a-vie",
  "confidentialite",
  "comparatif",
];
const WORKFLOW_SLUGS = ["workflow-agenda-comptable", "workflow-cloture-exercice"];
const PROBLEM_SLUGS = ["probleme-oubli-trajets", "probleme-justificatif-controle"];
const PRICING_SLUGS = ["tarifs"];
const LEAD_MAGNET_SLUGS = [
  "lead-magnet-note-de-frais",
  "lead-magnet-lexique",
  "lead-magnet-api-comptable",
];
const BLOG_SLUGS = ["article-blog"];

// Cadence mensuelle : le produit reste majoritaire, les autres familles
// s'intercalent pour couvrir tout le scope éditorial sur un cycle de 10 mois.
const FAMILY_CYCLE: string[][] = [
  PRODUCT_SLUGS,
  PROBLEM_SLUGS,
  PRODUCT_SLUGS,
  BLOG_SLUGS,
  WORKFLOW_SLUGS,
  PRODUCT_SLUGS,
  LEAD_MAGNET_SLUGS,
  CONTEXT_SLUGS,
  PRODUCT_SLUGS,
  PRICING_SLUGS,
];

function pickTopicForThisMonth(now: Date = new Date(), recentSlugs: string[] = []): Topic {
  const n = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const pool = FAMILY_CYCLE[n % FAMILY_CYCLE.length];
  const cycle = Math.floor(n / FAMILY_CYCLE.length);
  const start = cycle % pool.length;

  // Anti-redondance : on avance dans le pool tant que le sujet a déjà été
  // publié récemment (fenêtre = taille du pool moins un), pour ne jamais
  // répéter un sujet tant que les autres de sa famille n'ont pas été couverts.
  const blocked = new Set(recentSlugs.slice(0, Math.max(pool.length - 1, 0)));
  let slug = pool[start];
  for (let i = 0; i < pool.length; i++) {
    const candidate = pool[(start + i) % pool.length];
    if (!blocked.has(candidate)) { slug = candidate; break; }
  }
  return TOPICS.find((t) => t.slug === slug) ?? TOPICS[0];
}

// Le sujet "article-blog" est générique : on le résout sur un article réellement
// publié, en évitant ceux déjà relayés dans l'historique LinkedIn.
async function resolveBlogTopic(
  supabase: ReturnType<typeof createClient>,
  topic: Topic,
  recentTexts: string[],
): Promise<Topic> {
  if (topic.slug !== "article-blog") return topic;
  try {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, title, subtitle, meta_description, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(12);
    if (error || !data?.length) return topic;
    const rows = data as Array<Record<string, string | null>>;
    const pick = rows.find((r) => !recentTexts.some((t) => t.includes(String(r.slug)))) ?? rows[0];
    const summary = pick.subtitle || pick.meta_description || "";
    return {
      ...topic,
      title: String(pick.title ?? topic.title),
      url: `https://iktracker.fr/blog/${pick.slug}`,
      focus: `Article publié sur le blog IKtracker : "${pick.title}". ${summary} Le post doit donner la valeur principale de l'article et renvoyer vers sa lecture complète, sans le paraphraser intégralement.`,
    };
  } catch (_e) {
    return topic;
  }
}


// Historique des posts publiés : sert à la rotation des sujets ET à interdire
// au modèle de reprendre les mêmes angles, hooks ou chiffres.
type PastPost = { slug: string; title: string; posted_at: string; text: string };

async function fetchPostHistory(
  supabase: ReturnType<typeof createClient>,
  limit = 12,
): Promise<PastPost[]> {
  try {
    const { data, error } = await supabase
      .from("linkedin_post_log")
      .select("topic_slug, topic_title, posted_at, post_text")
      .eq("status", "success")
      .not("linkedin_post_id", "is", null)
      .order("posted_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r: Record<string, unknown>) => ({
      slug: String(r.topic_slug ?? ""),
      title: String(r.topic_title ?? ""),
      posted_at: String(r.posted_at ?? ""),
      text: String(r.post_text ?? ""),
    })).filter((p) => p.slug);
  } catch (err) {
    console.warn(`[history] lecture impossible: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

function historyPromptBlock(history: PastPost[]): string {
  if (!history.length) return "";
  const lines = history.slice(0, 6).map((p) => {
    const date = p.posted_at ? p.posted_at.slice(0, 10) : "date inconnue";
    const hook = (p.text.split("\n").find((l) => l.trim().length > 0) ?? "").trim().slice(0, 160);
    return `. ${date} — ${p.title || p.slug}${hook ? ` — hook : "${hook}"` : ""}`;
  });
  return `POSTS DÉJÀ PUBLIÉS (à ne pas répéter) :
${lines.join("\n")}

ANTI-REDONDANCE : ne reprends ni ces sujets, ni ces angles, ni ces hooks, ni les mêmes exemples chiffrés déjà utilisés. Si un point a déjà été expliqué, traite un autre aspect du module ou une autre étape du parcours.`;
}



function findTopic(slug: string | null): Topic | null {
  if (!slug) return null;
  return TOPICS.find((t) => t.slug === slug) ?? null;
}

// ─── Contexte documentaire technique ───────────────────────────────────────
// docs-context.ts est généré depuis docs/BACKEND.md + docs/FRONTEND.md par
// scripts/generate-linkedin-docs-context.cjs. On sélectionne les sections
// pertinentes pour le topic afin d'ancrer le post dans l'implémentation réelle.

const DOC_KEYWORDS: Record<string, string[]> = {
  simulateur: ["simulateur", "barème", "ik", "calcul", "indemnité", "cv fiscaux"],
  "mode-tournee": ["tournée", "tour", "gps", "géolocalisation", "haversine", "distance matrix", "stop"],
  "import-takeout": ["takeout", "recovery", "import", "wizard", "historique"],
  "sync-calendrier": ["calendar", "calendrier", "sync-calendar-trips", "google calendar", "outlook", "oauth"],
  "detection-plaque": ["plaque", "vehicle-lookup", "immatriculation", "véhicule", "carburant"],
  "bareme-progressif": ["barème", "tranche", "5 000", "20 000", "calcul", "ik"],
  "bonus-electrique": ["électrique", "bonus", "20%", "multiplicateur", "véhicule"],
  "export-pdf": ["pdf", "export", "relevé", "rapport", "print", "comptable"],
  "gratuit-a-vie": ["architecture", "coût", "edge function", "supabase", "infrastructure"],
  confidentialite: ["rls", "policy", "sécurité", "rgpd", "données", "suppression"],
  comparatif: ["architecture", "fonctionnalité", "gps", "confidentialité", "coût"],
  "trajets-recurrents": ["récurrent", "recurring", "generate-recurring-trips", "cron", "trajet"],
};

function normalizeForMatch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Sélection par score de mots-clés (titre pondéré ×3), plafonnée pour ne pas
// noyer le prompt : la doc sert d'ancrage factuel, pas de corpus.
function docContextForTopic(topic: Topic, maxChars = 4500): string {
  const keys = [
    ...(DOC_KEYWORDS[topic.slug] ?? []),
    ...topic.title.split(/\s+/).filter((w) => w.length > 5),
  ].map(normalizeForMatch);
  if (!keys.length) return "";

  const scored = DOC_SECTIONS.map((section) => {
    const heading = normalizeForMatch(section.heading);
    const body = normalizeForMatch(section.body);
    let score = 0;
    for (const k of keys) {
      if (heading.includes(k)) score += 3;
      if (body.includes(k)) score += 1;
    }
    return { section, score };
  })
    .filter((s) => s.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  let out = "";
  for (const { section } of scored) {
    const block = `### ${section.heading} (doc ${section.origin})\n${section.body}\n\n`;
    if (out.length + block.length > maxChars) break;
    out += block;
  }
  return out.trim();
}

// Sections doc utilisées pour orienter la capture vidéo/écran : on indique au
// pipeline média quelles zones d'UI comptent réellement pour ce module.
function captureHintsForTopic(topic: Topic): string {
  const ctx = docContextForTopic(topic, 1200);
  return ctx ? ctx.slice(0, 1200) : topic.focus;
}


// ─── Wavespeed helpers ─────────────────────────────────────────────────────

async function wavespeedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const key = Deno.env.get("WAVESPEED_API_KEY");
  if (!key) throw new Error("WAVESPEED_API_KEY missing");
  const url = `${WAVESPEED_BASE}/${path.replace(/^\/+/, "")}`;
  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${key}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(url, { ...init, headers });
}

async function wavespeedPollUntilDone(requestId: string, timeoutMs = 180_000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await wavespeedFetch(`predictions/${requestId}/result`);
    if (r.ok) {
      const d = await r.json();
      const status = d?.data?.status ?? d?.status;
      if (status === "completed" || status === "failed") return d;
    }
    await new Promise((res) => setTimeout(res, 2000));
  }
  throw new Error(`Wavespeed polling timeout for ${requestId}`);
}

// ─── Text generation ─── Mistral (Wavespeed) with Gemini fallback ─────────

async function callMistralViaWavespeed(system: string, userMsg: string, opts: { json?: boolean; temperature?: number } = {}): Promise<string> {
  // Wavespeed-hosted LLMs are called through the standard /predictions endpoint.
  // Endpoint shape follows Wavespeed's OpenAI-compatible chat schema.
  const res = await wavespeedFetch(`${WS_MISTRAL_MODEL}`, {
    method: "POST",
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      temperature: opts.temperature ?? 0.8,
      max_tokens: 1500,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Wavespeed/Mistral ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const raw = await res.json();
  // Wavespeed may return an OpenAI-style response directly, or a prediction envelope.
  // Try both shapes.
  const direct = raw?.choices?.[0]?.message?.content;
  if (direct) return String(direct).trim();
  const outputs: unknown = raw?.data?.outputs ?? raw?.outputs;
  if (Array.isArray(outputs) && outputs.length > 0 && typeof outputs[0] === "string") {
    return (outputs[0] as string).trim();
  }
  // Prediction envelope: poll if we got a request id back.
  const requestId = raw?.data?.id ?? raw?.id;
  if (requestId) {
    const polled = await wavespeedPollUntilDone(String(requestId));
    const pOutputs: unknown = polled?.data?.outputs ?? polled?.outputs;
    const content = polled?.data?.choices?.[0]?.message?.content ?? polled?.choices?.[0]?.message?.content;
    if (content) return String(content).trim();
    if (Array.isArray(pOutputs) && pOutputs.length > 0 && typeof pOutputs[0] === "string") {
      return (pOutputs[0] as string).trim();
    }
  }
  throw new Error(`Unrecognized Wavespeed/Mistral response: ${JSON.stringify(raw).slice(0, 300)}`);
}

async function callGeminiFallback(system: string, userMsg: string, opts: { json?: boolean; temperature?: number } = {}): Promise<string> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY missing");
  const res = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      temperature: opts.temperature ?? 0.8,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Gemini fallback ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

async function callLLM(system: string, userMsg: string, opts: { json?: boolean; temperature?: number } = {}): Promise<{ text: string; source: "mistral" | "gemini" }> {
  try {
    const text = await callMistralViaWavespeed(system, userMsg, opts);
    return { text, source: "mistral" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[llm] Mistral failed, falling back to Gemini: ${message}`);
    const text = await callGeminiFallback(system, userMsg, opts);
    return { text, source: "gemini" };
  }
}

// ─── Style profiling ───────────────────────────────────────────────────────
// Analyse déterministe des posts passés pour extraire les motifs stylistiques
// (longueurs, rythme, vocabulaire). Injecté dans le prompt en plus des exemples
// bruts, pour guider le modèle avec des cibles chiffrées imitables.

export type StyleProfile = {
  samples_count: number;
  avg_char_length: number;
  avg_word_count: number;
  avg_sentence_count: number;
  avg_sentence_words: number;
  avg_paragraph_count: number;
  avg_paragraph_words: number;
  short_sentence_ratio: number;   // % phrases <= 8 mots (rythme sec)
  first_person_ratio: number;     // % phrases commençant par "je"
  question_ratio: number;         // % phrases interrogatives
  top_opening_words: string[];    // mots typiques de première ligne
  frequent_bigrams: string[];     // bigrammes récurrents (signature lexicale)
  frequent_content_words: string[]; // vocabulaire fort récurrent
};

const FR_STOPWORDS = new Set<string>([
  "le","la","les","un","une","des","de","du","d","l","et","ou","mais","donc","or","ni","car",
  "je","tu","il","elle","on","nous","vous","ils","elles","me","te","se","lui","leur","y","en",
  "mon","ma","mes","ton","ta","tes","son","sa","ses","notre","votre","nos","vos","leurs",
  "ce","cet","cette","ces","ça","cela","celui","celle","ceux","celles",
  "que","qui","quoi","dont","où","quand","comme","si","pour","par","sur","sous","avec","sans","dans","chez","vers","entre","aussi","très","plus","moins","bien","peu","tout","toute","tous","toutes","aux","au","à","a","est","être","été","suis","es","sommes","êtes","sont","était","étaient","serai","sera","seront","fait","faire","fais","font","ai","as","avons","avez","ont","avait","avaient",
  "pas","ne","n","oui","non","déjà","encore","toujours","jamais","alors","puis","ensuite","enfin","ici","là","hier","aujourd","demain","c","s","t","m","qu",
]);

function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, " ")
    .split(/[^\p{L}\p{N}\-]+/u)
    .filter((w) => w.length > 0);
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ý"«])/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
}

function topK<T extends string>(counter: Map<T, number>, k: number): T[] {
  return [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([w]) => w);
}

export function analyzeStyle(samples: string[]): StyleProfile {
  const n = samples.length;
  if (n === 0) {
    return {
      samples_count: 0,
      avg_char_length: 0, avg_word_count: 0,
      avg_sentence_count: 0, avg_sentence_words: 0,
      avg_paragraph_count: 0, avg_paragraph_words: 0,
      short_sentence_ratio: 0, first_person_ratio: 0, question_ratio: 0,
      top_opening_words: [], frequent_bigrams: [], frequent_content_words: [],
    };
  }

  let totalChars = 0, totalWords = 0, totalSentences = 0, totalParagraphs = 0;
  let shortSent = 0, firstPersonSent = 0, questionSent = 0, totalSentWords = 0, totalParaWords = 0;
  const openings = new Map<string, number>();
  const bigrams = new Map<string, number>();
  const contentWords = new Map<string, number>();

  for (const raw of samples) {
    const t = raw.trim();
    totalChars += t.length;
    const words = tokenizeWords(t);
    totalWords += words.length;

    const sentences = splitSentences(t);
    totalSentences += sentences.length;
    for (const s of sentences) {
      const sw = tokenizeWords(s);
      totalSentWords += sw.length;
      if (sw.length > 0 && sw.length <= 8) shortSent += 1;
      if (sw[0] === "je" || sw[0] === "j") firstPersonSent += 1;
      if (/\?\s*$/.test(s)) questionSent += 1;
    }

    const paragraphs = splitParagraphs(t);
    totalParagraphs += paragraphs.length;
    for (const p of paragraphs) totalParaWords += tokenizeWords(p).length;

    // opening: premier mot significatif de la première phrase
    const firstSentWords = sentences[0] ? tokenizeWords(sentences[0]) : [];
    const opener = firstSentWords.find((w) => !FR_STOPWORDS.has(w) && w.length > 2);
    if (opener) openings.set(opener, (openings.get(opener) ?? 0) + 1);

    // content words + bigrams (hors stopwords)
    const content = words.filter((w) => !FR_STOPWORDS.has(w) && w.length > 3);
    for (const w of content) contentWords.set(w, (contentWords.get(w) ?? 0) + 1);
    for (let i = 0; i < words.length - 1; i++) {
      const a = words[i], b = words[i + 1];
      if (FR_STOPWORDS.has(a) || FR_STOPWORDS.has(b)) continue;
      if (a.length < 3 || b.length < 3) continue;
      const bg = `${a} ${b}`;
      bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
    }
  }

  const round = (x: number, p = 1) => Math.round(x * 10 ** p) / 10 ** p;
  return {
    samples_count: n,
    avg_char_length: Math.round(totalChars / n),
    avg_word_count: Math.round(totalWords / n),
    avg_sentence_count: round(totalSentences / n),
    avg_sentence_words: totalSentences ? round(totalSentWords / totalSentences) : 0,
    avg_paragraph_count: round(totalParagraphs / n),
    avg_paragraph_words: totalParagraphs ? round(totalParaWords / totalParagraphs) : 0,
    short_sentence_ratio: totalSentences ? round((shortSent / totalSentences) * 100, 0) : 0,
    first_person_ratio: totalSentences ? round((firstPersonSent / totalSentences) * 100, 0) : 0,
    question_ratio: totalSentences ? round((questionSent / totalSentences) * 100, 0) : 0,
    top_opening_words: topK(openings, 6),
    frequent_bigrams: topK(bigrams, 8).filter((b) => (bigrams.get(b as string) ?? 0) >= 2),
    frequent_content_words: topK(contentWords, 15).filter((w) => (contentWords.get(w as string) ?? 0) >= 2),
  };
}

function styleProfileToPromptBlock(p: StyleProfile): string {
  if (p.samples_count === 0) {
    return "Longueur cible : entre 1000 et 1500 caractères (signes espaces compris). CONTRAINTE STRICTE : ne descends jamais sous 1000 signes, ne dépasse jamais 1500 signes.";
  }
  const lines = [
    `Longueur cible : entre 1000 et 1500 caractères (signes espaces compris). CONTRAINTE STRICTE : ne descends jamais sous 1000 signes, ne dépasse jamais 1500 signes. (Moyenne observée sur ${p.samples_count} posts passés : ${p.avg_char_length} caractères, ${p.avg_word_count} mots — donnée indicative, la fourchette 1000–1500 prime.)`,
    `Rythme : ${p.avg_sentence_count} phrases par post, ${p.avg_sentence_words} mots par phrase en moyenne. ${p.short_sentence_ratio}% des phrases font 8 mots ou moins — garde cette proportion de phrases courtes et sèches.`,
    `Structure : ${p.avg_paragraph_count} paragraphes en moyenne, ${p.avg_paragraph_words} mots par paragraphe. Aère avec des sauts de ligne.`,
    `Première personne : ${p.first_person_ratio}% des phrases commencent par "je" ou "j'". Reste dans cette proportion.`,
    p.question_ratio > 0
      ? `Questions : ${p.question_ratio}% (hors question GEO obligatoire, n'en ajoute pas d'autre).`
      : `Pas de questions rhétoriques dans le corpus : la seule question autorisée est la question GEO obligatoire.`,
    p.top_opening_words.length
      ? `Mots d'ouverture typiques (première ligne) : ${p.top_opening_words.join(", ")}.`
      : "",
    p.frequent_content_words.length
      ? `Vocabulaire signature récurrent : ${p.frequent_content_words.join(", ")}. Puise dedans quand c'est naturel, ne force pas.`
      : "",
    p.frequent_bigrams.length
      ? `Bigrammes récurrents : ${p.frequent_bigrams.join(" · ")}.`
      : "",
  ].filter(Boolean);
  return lines.join("\n");
}

async function generatePostText(
  topic: Topic,
  styleSamples: string[],
  styleProfile: StyleProfile,
  lengthCorrection?: string,
  history: PastPost[] = [],
): Promise<{ text: string; source: string }> {
  const samplesBlock = styleSamples.length
    ? styleSamples
        .slice(0, 6)
        .map((s, i) => `--- Exemple ${i + 1} ---\n${s.trim()}`)
        .join("\n\n")
    : "(aucun exemple disponible — reste sobre et factuel)";

  const profileBlock = styleProfileToPromptBlock(styleProfile);

  const system = `Tu rédiges un post LinkedIn pour Adrien de Volontat, dirigeant d'entreprise et fondateur d'IKtracker (iktracker.fr) — outil GRATUIT À VIE de suivi des indemnités kilométriques pour indépendants (auto-entrepreneurs, freelances, professions libérales, artisans, commerciaux, aides à domicile).

ORIENTATION DU TON (axes à privilégier, pas de contraintes dures) :
- Imite le style d'écriture des exemples fournis plus bas : rythme des phrases, vocabulaire, ponctuation, longueur des paragraphes, façon d'aborder un sujet.
- Français, première personne (je / mon), pragmatique, humain, factuel. Comme un dirigeant qui parle à ses pairs.
- Inscris le texte dans quatre qualités : **précis** (chiffres et faits vérifiés), **pédagogue** (une idée claire par post, analogies simples si utile), **humble** (on montre plutôt qu'on ne vante, pas de dénigrement de la concurrence), **sympathique** (formulation chaleureuse, ton de conversation).
- Emojis autorisés, avec parcimonie : un ou deux maximum, uniquement s'ils renforcent l'idée.

PROFIL DE STYLE MESURÉ SUR LES POSTS PASSÉS (cibles à respecter) :
${profileBlock}

STRUCTURE :
- HOOK obligatoire en toute première ligne : une phrase courte, concrète, qui accroche l'œil dans le feed (fait brut, chiffre, anecdote, tension). Pas de question rhétorique, pas de citation, pas de "Vous savez quoi ?".
- AÉRATION OBLIGATOIRE : le hook est seul sur sa ligne, puis chaque paragraphe fait une à deux phrases maximum, séparé du suivant par une ligne vide. Aucun pavé de plus de deux phrases. Vise au moins six paragraphes.
- Respecte la longueur cible et le rythme indiqués ci-dessus (nombre de phrases, phrases courtes, paragraphes).
- PAS DE CHUTE : ne termine pas par une conclusion, une morale, une leçon, un appel à l'action, un CTA, un lien, une invitation à commenter, ni une phrase de synthèse. Le post s'arrête sur un fait ou un détail, sec.

GARDE-FOUS ANTI-IA (RESPECT ABSOLU) :
- INTERDIT : les tirets cadratins (—), demi-cadratins (–) et les tirets d'incise "-" utilisés comme ponctuation. Utilise des points, des virgules, des points-virgules, des deux-points, ou des retours à la ligne à la place. Les traits d'union à l'intérieur d'un mot composé (ex : "auto-entrepreneur") restent autorisés.
- INTERDIT : hashtags, listes à puces, gras/italique markdown, guillemets français décoratifs.
- INTERDIT (caractères) : ( ) @ [ ] { } < > \\ * _ ~ | — n'utilise jamais ces caractères, ni pour de la mise en forme markdown, ni pour des mentions, ni pour des parenthèses. Reformule la phrase pour t'en passer.
- INTERDIT (formulations IA typiques) : "Découvrez", "révolutionnaire", "game-changer", "unlock", "boostez", "solution ultime", "en un clin d'œil", "à l'ère de", "dans un monde où", "il est essentiel de", "n'hésitez pas à", "je suis ravi/fier de", "spoiler", "TL;DR".
- Pas d'appel vers iktracker.fr, pas de lien, pas de hashtag final (le lien est ajouté automatiquement après coup).
- Les pourcentages s'écrivent toujours avec le signe %, jamais "pour cent" en toutes lettres. Exemples : 100% électrique, bonus de 20%.

SUJET DU POST (RÈGLE CENTRALE) :
- MARQUE OBLIGATOIRE : le module appartient à IKtracker et tu dois le dire. Écris le nom "IKtracker" au moins deux fois, dont une dans les trois premières lignes. Interdit de parler du module comme d'un outil anonyme : jamais "mon simulateur", "mon outil", "mon site" tout seul. On écrit "le simulateur d'IKtracker", "IKtracker calcule", "dans IKtracker". Le nom s'écrit toujours IKtracker, avec I et K majuscules.
- Le post parle DU PRODUIT, pas des utilisateurs. L'angle est toujours : voilà ce que fait IKtracker, comment c'est construit, ce que ça produit comme résultat. Pas de portrait d'utilisateur, pas de persona, pas de témoignage, pas de "les indépendants perdent du temps à...", pas de storytelling client.
- Le post porte sur UN SEUL module précis d'IKtracker, celui indiqué plus bas. Pas de discours général sur les indemnités kilométriques, pas de présentation globale de l'outil.
- Décris le module de l'intérieur : le déclencheur, le mécanisme, la règle de calcul, les seuils ou chiffres réels, ce qui est automatisé, ce que ça affiche en sortie.
- Utilise au moins trois des faits techniques fournis, en les reformulant dans tes mots. N'invente aucun chiffre, aucune fonctionnalité absente de la liste.
- Si tu évoques un cas concret, c'est pour illustrer le comportement du produit dans cette situation, jamais pour raconter la vie d'un client.

GEO (VISIBILITÉ DANS LES RÉPONSES DES IA) :
- Insère UNE SEULE question dans le corps du post, jamais dans le hook ni dans la dernière ligne. Elle doit être formulée exactement comme un utilisateur l'écrirait à une IA ou dans un moteur de recherche, et commencer par Pourquoi, Qui, Quand, Quoi, Comment ou Combien. Exemples de forme : "Comment calculer ses indemnités kilométriques en 2026 ?", "Combien rapporte le bonus électrique sur le barème kilométrique ?".
- Cette question est seule sur sa ligne, sans guillemets, et la réponse suit immédiatement dans le paragraphe suivant : une réponse courte, factuelle, autonome, chiffrée quand c'est possible, compréhensible hors contexte. C'est ce bloc question puis réponse que les IA citent.
- La question doit contenir le vocabulaire réellement tapé par les gens : indemnités kilométriques, barème kilométrique, frais de déplacement, note de frais, véhicule électrique, auto-entrepreneur, selon le module traité.
- Cette question est la seule autorisée du post. Aucune autre phrase interrogative, aucune question rhétorique.

EXEMPLES DE POSTS DÉJÀ ÉCRITS PAR ADRIEN (source d'inspiration stylistique — ne recopie aucune phrase, imite le ton) :
${samplesBlock}`;

  const factsBlock = (TOPIC_FACTS[topic.slug] ?? [])
    .map((f) => `. ${f}`)
    .join("\n");

  const docBlock = docContextForTopic(topic);
  const historyBlock = historyPromptBlock(history);

  const user = `${historyBlock ? `${historyBlock}\n\n` : ""}Module IKtracker à présenter ce mois-ci : ${topic.title}

Résumé du module :
${topic.focus}

Faits techniques vérifiés à exploiter :
${factsBlock || ". (aucun fait complémentaire, reste strictement sur le résumé ci-dessus)"}
${docBlock ? `
EXTRAITS DE LA DOCUMENTATION TECHNIQUE INTERNE (source de vérité sur l'implémentation réelle, à reformuler en langage clair, jamais à recopier ni à citer comme documentation) :
${docBlock}

Sers-toi de ces extraits pour être précis sur le mécanisme réel : déclencheur, fréquence, règle de calcul, seuils, ce qui est automatisé. N'invente rien qui ne figure pas dans ces extraits ou dans les faits ci-dessus. Ne mentionne aucun nom de table, de fonction technique ni de fournisseur d'infrastructure.
` : ""}
Rédige le post LinkedIn complet, prêt à publier. Rappels : hook en première ligne, une seule question GEO dans le corps (Pourquoi / Qui / Quand / Quoi / Comment / Combien) suivie immédiatement de sa réponse factuelle, angle produit uniquement (le module et son fonctionnement, pas les utilisateurs ni leurs galères), un seul module traité et décrit précisément, au moins trois faits techniques exploités, pas de chute, aucun tiret (—, –, -) comme ponctuation. LONGUEUR OBLIGATOIRE : entre ${POST_MIN_CHARS} et ${POST_MAX_CHARS} signes espaces compris. Compte tes caractères avant de rendre le texte.${lengthCorrection ? `\n\n${lengthCorrection}` : ""}`;

  const { text, source } = await callLLM(system, user, { temperature: 0.8 });
  return { text, source };
}

// ─── Video pipeline (PageBolt /v1/video → MP4) ─────────────────────────────
//
// PageBolt enregistre un vrai MP4 côté serveur (Puppeteer + ffmpeg managés),
// ce que le runtime Browserless /function ne permet pas (pas de fs/ffmpeg,
// `page.screencast` indisponible sur l'offre utilisée). On garde le carrousel
// de captures Browserless en repli si PageBolt échoue.
const PAGEBOLT_BASE = "https://pagebolt.dev/api/v1";

type PageboltStep = Record<string, unknown>;

// Sélecteurs RÉELS du DOM par module, vérifiés dans le code du front.
// Ils servent à deux choses : les donner au LLM pour qu'il n'invente pas de
// sélecteur, et refuser à l'exécution tout sélecteur hors de cette liste.
// Sans ce garde-fou, PageBolt exécute des étapes qui ne matchent rien : la
// vidéo se déroule mais on ne voit jamais le module fonctionner.
type UiHint = { selectors: { css: string; label: string }[]; note: string };

const TOPIC_UI_HINTS: Record<string, UiHint> = {
  simulateur: {
    selectors: [
      { css: "input[id^='annualKm']", label: "champ des kilomètres annuels, type number, recalcul en direct à la frappe" },
      { css: "[id^='fiscalPower']", label: "menu déroulant de la puissance fiscale, 3 CV à 7 CV et plus, s'ouvre au clic" },
      { css: "[id^='electric']", label: "interrupteur véhicule 100% électrique qui applique la majoration de 20%" },
      { css: "[id^='simulateur']", label: "titre et ancre du bloc simulateur" },
    ],
    note: "Le montant estimé, la tranche appliquée et le taux au km s'affichent à droite du formulaire et changent instantanément, sans bouton de validation.",
  },
};

function uiHintBlock(topic: Topic): string {
  const hint = TOPIC_UI_HINTS[topic.slug];
  if (!hint) return "Aucun sélecteur vérifié pour ce module : n'utilise ni click, ni fill, ni hover. Limite toi à navigate, wait, scroll et scrollIntoView sur une ancre.";
  return [
    "Sélecteurs CSS vérifiés, les SEULS autorisés pour click, hover et fill :",
    ...hint.selectors.map((s) => `- ${s.css} : ${s.label}`),
    `Comportement observable : ${hint.note}`,
  ].join("\n");
}


// Scénario "aveugle" : simple défilement par positions absolues, toujours
// valide quel que soit le DOM. Sert de repli si le scénario scripté échoue.
function fallbackVideoSteps(topic: Topic): PageboltStep[] {
  return [
    { action: "navigate", url: topic.url },
    { action: "wait", ms: 3000, live: true },
    { action: "scroll", x: 0, y: 700 },
    { action: "wait", ms: 2500, live: true },
    { action: "scroll", x: 0, y: 1500 },
    { action: "wait", ms: 2500, live: true },
    { action: "scroll", x: 0, y: 2400 },
    { action: "wait", ms: 2500, live: true },
  ];
}

// Scénario contrôlé : on cadre réellement le module concerné (ancre #...) puis,
// pour le simulateur, on joue une saisie visible (km + puissance) et le calcul.
// Max 20 étapes côté PageBolt : on reste largement en dessous.
function scriptedVideoSteps(topic: Topic): PageboltStep[] {
  const anchor = topic.url.includes("#") ? topic.url.split("#")[1] : "";
  const steps: PageboltStep[] = [
    { action: "navigate", url: topic.url },
    { action: "wait", ms: 3500, live: true },
  ];

  if (anchor) {
    // Recadrage doux sur l'ancre (scrollIntoView) plutôt qu'un saut brut.
    steps.push({
      action: "evaluate",
      script: `(() => { const el = document.getElementById(${JSON.stringify(anchor)}); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); })()`,
    });
    steps.push({ action: "wait", ms: 2500, live: true });
  }

  if (topic.slug === "simulateur") {
    // Le simulateur recalcule en direct : on saisit un cas concret (12 000 km)
    // puis on active la majoration 100% électrique pour montrer l'effet.
    // Les ids sont suffixés selon l'instance du composant, d'où le sélecteur ^=.
    steps.push({ action: "fill", selector: "input[id^='annualKm']", value: "12000" });
    steps.push({ action: "wait", ms: 2500, live: true });
    steps.push({
      action: "evaluate",
      script: `(() => { const s = document.querySelector("[id^='electric']"); if (s) s.click(); })()`,
    });
    steps.push({ action: "wait", ms: 3000, live: true });
  }


  // Parcours final du module pour montrer le résultat et le contenu associé.
  steps.push({ action: "scroll", x: 0, y: 400, relative: true });
  steps.push({ action: "wait", ms: 2500, live: true });
  steps.push({ action: "scroll", x: 0, y: 500, relative: true });
  steps.push({ action: "wait", ms: 2500, live: true });

  return steps;
}

async function requestPageboltVideo(key: string, steps: PageboltStep[]): Promise<Uint8Array> {
  const res = await fetch(`${PAGEBOLT_BASE}/video`, {
    method: "POST",
    headers: { "x-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      steps,
      viewport: { width: 1280, height: 720 },
      format: "mp4",
      framerate: 30,
      pace: "normal",
      blockBanners: true,
      cursor: { visible: true, style: "highlight", color: "#4F46E5", persist: true },
      clickEffect: { enabled: true, style: "ripple" },
      response_type: "json",
    }),
  });
  if (!res.ok) throw new Error(`PageBolt ${res.status}: ${(await res.text()).slice(0, 400)}`);

  const json = await res.json();
  const b64 = typeof json?.data === "string" ? json.data : null;
  if (!b64) throw new Error(`PageBolt: no video payload (${JSON.stringify(json).slice(0, 300)})`);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  const completed = Number(json?.steps_completed ?? NaN);
  const total = Number(json?.total_steps ?? NaN);
  console.log(`[pagebolt] MP4 ${out.length} bytes, ${json?.frames ?? "?"} frames, ${json?.steps_completed ?? "?"}/${json?.total_steps ?? "?"} étapes`);
  if (out.length < 50_000) throw new Error(`PageBolt video too small (${out.length} bytes)`);
  // Une étape non exécutée = un sélecteur qui ne matche rien : la vidéo tourne
  // mais le module n'est pas montré en action. On préfère basculer sur le
  // scénario scripté aux sélecteurs vérifiés.
  if (Number.isFinite(completed) && Number.isFinite(total) && completed < total) {
    throw new Error(`PageBolt: seulement ${completed}/${total} étapes exécutées (sélecteur introuvable ?)`);
  }
  return out;
}

// Validation stricte des étapes proposées par le LLM : on n'exécute que des
// actions connues, sur le domaine iktracker.fr, avec des durées bornées.
const ALLOWED_STEP_ACTIONS = new Set(["navigate", "wait", "scroll", "click", "fill", "hover", "evaluate"]);

// Un sélecteur proposé par le LLM n'est accepté que s'il figure dans les
// sélecteurs vérifiés du module. Sinon l'étape est retirée : mieux vaut une
// vidéo plus courte qu'une vidéo où rien ne se passe.
function isKnownSelector(topic: Topic, selector: string): boolean {
  const hint = TOPIC_UI_HINTS[topic.slug];
  if (!hint) return false;
  const norm = selector.replace(/["']/g, "'").replace(/\s+/g, "").toLowerCase();
  return hint.selectors.some((s) => {
    const known = s.css.replace(/["']/g, "'").replace(/\s+/g, "").toLowerCase();
    return norm === known || norm.includes(known) || known.includes(norm);
  });
}

function sanitizeAiSteps(raw: unknown, topic: Topic): PageboltStep[] {
  if (!Array.isArray(raw)) throw new Error("scenario: not an array");
  const out: PageboltStep[] = [];
  let dropped = 0;
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const s = item as Record<string, unknown>;
    const action = typeof s.action === "string" ? s.action : "";
    if (!ALLOWED_STEP_ACTIONS.has(action)) continue;

    if (action === "navigate") {
      const url = typeof s.url === "string" ? s.url : topic.url;
      if (!/^https:\/\/(www\.)?iktracker\.fr\//.test(url)) continue;
      out.push({ action, url });
    } else if (action === "wait") {
      const ms = Math.min(4000, Math.max(800, Number(s.ms) || 2000));
      out.push({ action, ms, live: true });
    } else if (action === "scroll") {
      const y = Math.max(-2000, Math.min(3000, Number(s.y) || 0));
      out.push({ action, x: 0, y, relative: s.relative !== false });
    } else if (action === "click" || action === "hover") {
      if (typeof s.selector !== "string" || !s.selector.trim()) continue;
      if (!isKnownSelector(topic, s.selector)) { dropped++; continue; }
      out.push({ action, selector: s.selector.trim() });
    } else if (action === "fill") {
      if (typeof s.selector !== "string" || typeof s.value !== "string") continue;
      if (!isKnownSelector(topic, s.selector)) { dropped++; continue; }
      out.push({ action, selector: s.selector.trim(), value: s.value });
    } else if (action === "evaluate") {
      const script = typeof s.script === "string" ? s.script : "";
      // On n'autorise qu'un recadrage/scrollIntoView, jamais du JS arbitraire.
      if (!/scrollIntoView|\.click\(\)/.test(script) || script.length > 400) continue;
      out.push({ action, script });
    }
    if (out.length >= 18) break;
  }
  if (dropped) console.warn(`[video-scenario] ${dropped} étape(s) écartée(s) : sélecteur non vérifié`);
  if (!out.length) throw new Error("scenario: no valid step");
  // Toujours démarrer par la navigation sur la page du module.
  if ((out[0] as Record<string, unknown>).action !== "navigate") {
    out.unshift({ action: "navigate", url: topic.url });
  }
  if ((out[1] as Record<string, unknown>)?.action !== "wait") {
    out.splice(1, 0, { action: "wait", ms: 3500, live: true });
  }
  return ensureModuleInteractions(topic, out);
}

// Garantit qu'on voit réellement le module manipulé : si le scénario du LLM ne
// contient aucune interaction sur les contrôles vérifiés du module, on injecte
// la séquence scriptée connue juste après la navigation.
function ensureModuleInteractions(topic: Topic, steps: PageboltStep[]): PageboltStep[] {
  if (!TOPIC_UI_HINTS[topic.slug]) return steps;
  const hasInteraction = steps.some((s) => {
    const a = s.action;
    return (a === "fill" || a === "click" || a === "hover") ||
      (a === "evaluate" && /\.click\(\)/.test(String(s.script ?? "")));
  });
  if (hasInteraction) return steps;

  const injected = moduleInteractionSteps(topic);
  if (!injected.length) return steps;
  console.warn(`[video-scenario] aucune interaction proposée, injection de la séquence scriptée du module`);
  const head = steps.slice(0, 2);
  const tail = steps.slice(2);
  return [...head, ...injected, ...tail].slice(0, 18);
}

// Séquence d'interactions vérifiée, par module.
function moduleInteractionSteps(topic: Topic): PageboltStep[] {
  if (topic.slug !== "simulateur") return [];
  return [
    {
      action: "evaluate",
      script: `(() => { const el = document.querySelector("[id^='simulateur']"); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); })()`,
    },
    { action: "wait", ms: 2000, live: true },
    { action: "fill", selector: "input[id^='annualKm']", value: "12000" },
    { action: "wait", ms: 2500, live: true },
    {
      action: "evaluate",
      script: `(() => { const s = document.querySelector("[id^='electric']"); if (s) s.click(); })()`,
    },
    { action: "wait", ms: 3000, live: true },
  ];
}

// Rédige le scénario vidéo APRÈS le post, à partir du texte publié et de la
// documentation technique du module : la vidéo montre précisément le parcours
// dont parle le post.
async function deriveVideoScenario(topic: Topic, postText: string): Promise<PageboltStep[] | null> {
  const system = `Tu écris un scénario de capture vidéo d'une page web réelle (moteur type Puppeteer).
On te donne un post LinkedIn déjà rédigé et la documentation technique du module concerné.
Objectif : filmer EXACTEMENT le parcours ou le module dont parle le post, dans l'ordre où le post en parle.

Réponds uniquement par un JSON strict : {"steps": [ ... ]}
Actions autorisées, rien d'autre :
- {"action":"navigate","url":"https://iktracker.fr/..."} (première étape, page du module)
- {"action":"wait","ms":2500}
- {"action":"scroll","y":600,"relative":true}
- {"action":"click","selector":"CSS"}
- {"action":"hover","selector":"CSS"}
- {"action":"fill","selector":"CSS","value":"12000"}
- {"action":"evaluate","script":"(() => { const el = document.getElementById('simulateur'); if (el) el.scrollIntoView({behavior:'smooth',block:'start'}); })()"}

Règles :
- 8 à 14 étapes, toujours une attente "wait" après chaque action visible pour laisser le temps de voir.
- Uniquement des URLs du domaine iktracker.fr.
- SÉLECTEURS : n'utilise QUE les sélecteurs CSS listés dans la section "Sélecteurs vérifiés" plus bas, copiés à l'identique. Tout autre sélecteur sera supprimé du scénario et l'action ne sera pas jouée.
- Le cœur du scénario doit MONTRER LE MODULE EN TRAIN DE FONCTIONNER : on remplit un champ, on bascule une option, et on laisse le temps de voir le résultat se recalculer. Un simple défilement ne suffit pas.
- Aucun JS arbitraire dans evaluate : seulement scrollIntoView ou un click sur un élément.
- Le scénario doit illustrer les faits cités dans le post, pas une visite générique.`;

  const user = `Page à filmer : ${topic.url}
Module : ${topic.title}

Post LinkedIn publié :
${postText}

Sélecteurs vérifiés :
${uiHintBlock(topic)}

Documentation technique du module :
${captureHintsForTopic(topic)}

JSON :`;

  try {
    const { text } = await callLLM(system, user, { json: true, temperature: 0.3 });
    const parsed = JSON.parse(text) as { steps?: unknown };
    const steps = sanitizeAiSteps(parsed.steps, topic);
    console.log(`[video-scenario] ${steps.length} étapes générées depuis le post`);
    return steps;
  } catch (err) {
    console.warn(`[video-scenario] échec, scénario scripté par défaut: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function capturePageboltVideo(topic: Topic, postText?: string): Promise<Uint8Array> {
  const key = Deno.env.get("PAGEBOLT_API_KEY");
  if (!key) throw new Error("PAGEBOLT_API_KEY missing");

  // 1) Scénario adapté au post (rédigé après le texte), 2) scénario scripté en
  // dur pour le module, 3) défilement aveugle.
  if (postText) {
    const aiSteps = await deriveVideoScenario(topic, postText);
    if (aiSteps) {
      try {
        return await requestPageboltVideo(key, aiSteps);
      } catch (e) {
        console.warn(`[pagebolt] scénario adapté au post échoué: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  try {
    return await requestPageboltVideo(key, scriptedVideoSteps(topic));
  } catch (e) {
    console.warn(`[pagebolt] scénario scripté échoué, repli défilement simple: ${e instanceof Error ? e.message : String(e)}`);
    return await requestPageboltVideo(key, fallbackVideoSteps(topic));
  }
}




async function captureUiFrames(topic: Topic, focusLabels: string[] = []): Promise<Uint8Array[]> {
  const token = Deno.env.get("BROWSERLESS_API_KEY");
  if (!token) throw new Error("BROWSERLESS_API_KEY missing");

  const code = `
export default async function ({ page, context }) {
  const { url, focusLabels } = context;
  await page.setViewport({ width: 1200, height: 1200, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  // Certaines instances Browserless conservent le viewport 800x600 du launch :
  // on le réapplique puis on recharge pour forcer un relayout complet.
  await page.setViewport({ width: 1200, height: 1200, deviceScaleFactor: 1 });
  await page.reload({ waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 2500));

  const labels = Array.isArray(focusLabels) ? focusLabels : [];
  const anchors = [];
  for (const label of labels) {
    const y = await page.evaluate((needle) => {
      const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
      const target = norm(needle);
      const nodes = Array.from(document.querySelectorAll('h1,h2,h3,section,article,button,[data-testid]'));
      const hit = nodes.find((n) => norm(n.textContent || '').includes(target));
      if (!hit) return null;
      const rect = hit.getBoundingClientRect();
      return Math.max(0, window.scrollY + rect.top - 100);
    }, label).catch(() => null);
    if (typeof y === 'number' && !anchors.some((a) => Math.abs(a - y) < 200)) anchors.push(y);
  }

  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  const stops = (anchors.length ? anchors : [])
    .concat(anchors.length >= 4 ? [] : Array.from({ length: 4 }, (_, i) => Math.floor(((totalHeight - 1200) * i) / 3)))
    .slice(0, 5)
    .map((y) => Math.max(0, Math.round(y)));

  const shots = [];
  for (const y of stops) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await new Promise(r => setTimeout(r, 900));
    const b64 = await page.screenshot({ type: 'png', encoding: 'base64' });
    shots.push(b64);
  }
  return { shots, anchor_hits: anchors.length };
}
`;

  const res = await fetch(
    `${BROWSERLESS_BASE}/function?token=${token}&timeout=120000`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, context: { url: topic.url, focusLabels } }),
    },
  );
  if (!res.ok) throw new Error(`Browserless ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const payload = typeof json === "object" && json && "data" in json && typeof (json as any).data === "string"
    ? JSON.parse((json as any).data)
    : json;
  const shots: string[] = Array.isArray(payload?.shots) ? payload.shots : [];
  if (shots.length === 0) throw new Error(`No screenshots returned: ${JSON.stringify(json).slice(0, 300)}`);
  const frames = shots.map((b64) => {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  });
  console.log(`[frames] ${frames.length} captures (${payload?.anchor_hits ?? 0} ancres) sur ${topic.url}`);
  return frames;
}

// Carrousel PDF composé uniquement de vraies captures d'écran de la page.
async function renderScreenshotCarouselPdf(frames: Uint8Array[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  for (const frame of frames) {
    const png = await pdf.embedPng(frame);
    const page = pdf.addPage([1200, 1200]);
    const scale = Math.min(1200 / png.width, 1200 / png.height);
    const w = png.width * scale;
    const h = png.height * scale;
    page.drawRectangle({ x: 0, y: 0, width: 1200, height: 1200, color: rgb(1, 1, 1) });
    page.drawImage(png, { x: (1200 - w) / 2, y: (1200 - h) / 2, width: w, height: h });
  }
  return await pdf.save();
}

// ─── Wavespeed media generation ────────────────────────────────────────────

async function submitWavespeedJob(modelPath: string, input: Record<string, unknown>): Promise<any> {
  const res = await wavespeedFetch(`${modelPath}?wait=1`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Wavespeed ${modelPath} ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const status = json?.data?.status ?? json?.status;
  if (status === "completed") return json;
  // Wait=1 timed out on gateway side → poll ourselves
  const id = json?.data?.id ?? json?.id;
  if (!id) throw new Error(`No request id in Wavespeed response: ${JSON.stringify(json).slice(0, 300)}`);
  return await wavespeedPollUntilDone(String(id));
}

function extractOutputs(payload: any): string[] {
  const outputs = payload?.data?.outputs ?? payload?.outputs;
  if (!Array.isArray(outputs)) throw new Error("Wavespeed response has no outputs[]");
  return outputs.filter((u: unknown): u is string => typeof u === "string");
}

async function downloadBinary(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${url} → ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function generateWavespeedImage(prompt: string): Promise<Uint8Array> {
  const payload = await submitWavespeedJob(WS_IMAGE_MODEL, {
    prompt,
    size: "1024*1024",
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 1,
    enable_safety_checker: true,
  });
  const outputs = extractOutputs(payload);
  if (outputs.length === 0) throw new Error("Wavespeed image job returned no output");
  return await downloadBinary(outputs[0]);
}

async function generateWavespeedVideo(prompt: string): Promise<Uint8Array> {
  const payload = await submitWavespeedJob(WS_VIDEO_MODEL, {
    prompt,
    duration: 5,
    aspect_ratio: "16:9",
  });
  const outputs = extractOutputs(payload);
  if (outputs.length === 0) throw new Error("Wavespeed video job returned no output");
  return await downloadBinary(outputs[0]);
}

// ─── Carousel pipeline (AI slide plan → pdf-lib PDF) ───────────────────────

type SlidePlan = {
  cover_title: string;
  cover_subtitle: string;
  slides: Array<{ heading: string; body: string }>; // exactly 3
  cta: string;
};

async function generateSlidePlan(topic: Topic): Promise<{ plan: SlidePlan; source: string }> {
  const count = topic.slideCount ?? 3;
  const system = `Tu structures un carrousel LinkedIn éditorial sobre pour IKtracker (iktracker.fr), outil gratuit à vie de suivi des indemnités kilométriques pour indépendants français.

Contraintes ABSOLUES :
- Français, ton pragmatique entrepreneurial
- Emojis autorisés avec parcimonie
- Phrases courtes, factuelles, sans marketing
- Interdit : "Découvrez", "révolutionnaire", "boostez", "unlock", "testez"
- Respecte STRICTEMENT les limites de caractères (cover_title ≤ 60, cover_subtitle ≤ 90, heading ≤ 40, body ≤ 180, cta ≤ 60)
- Exactement ${count} slides intermédiaires (heading + body)`;
  const user = `Sujet : ${topic.title}\n\nContexte :\n${topic.focus}\n\nFaits techniques à répartir dans les slides :\n${(TOPIC_FACTS[topic.slug] ?? []).map((f) => `. ${f}`).join("\n")}\n\nChaque slide doit porter un fait concret du module, pas une généralité. Produis le plan du carrousel au format JSON strict avec les clés cover_title, cover_subtitle, slides (array de ${count} objets {heading, body}), cta. Rien d'autre.`;
  const { text, source } = await callLLM(system, user, { json: true, temperature: 0.7 });
  const plan = JSON.parse(text) as SlidePlan;
  if (!plan.cover_title || !Array.isArray(plan.slides) || plan.slides.length !== count) {
    throw new Error(`Malformed slide plan (expected ${count} slides): ${text.slice(0, 300)}`);
  }
  return { plan, source };
}

// ─── Text-to-media coupling helpers ─────────────────────────────────────────
// The visuals must illustrate the *generated* post, not just the topic metadata.

async function deriveVisualPromptFromText(
  topic: Topic,
  postText: string,
): Promise<{ prompt: string; source: string }> {
  const system = `Tu es directeur artistique pour IKtracker.
À partir du post LinkedIn fourni, rédige un prompt visuel en anglais pour un générateur d'images IA.
Le prompt doit refléter le sujet central du post et son ambiance, sans inclure de texte incrusté, sans logos.
Style éditorial minimaliste : warm ivory background, indigo-violet accents, flat design, clean lines, generous negative space, no text, no logos.
Réponds uniquement par le prompt, 2 à 4 phrases.`;
  const user = `Topic : ${topic.title}\n\nPost :\n${postText}\n\nPrompt visuel :`;
  const { text, source } = await callLLM(system, user, { temperature: 0.6 });
  return { prompt: text.trim(), source };
}

// Détermine quelles zones de l'UI filmer, en croisant le post généré et la
// documentation technique du module (ancrage sur ce qui existe réellement).
async function deriveCaptureFocus(topic: Topic, postText: string): Promise<string[]> {
  const system = `Tu prépares une capture vidéo d'écran d'une page web réelle.
On te donne un post LinkedIn et des extraits de documentation technique du module concerné.
Réponds uniquement par un JSON strict {"labels": ["...", "..."]} listant 2 à 4 libellés courts (2 à 5 mots) susceptibles d'apparaître EN TOUTES LETTRES sur la page, correspondant aux blocs d'interface qui illustrent le mieux ce que raconte le post, du plus important au moins important.
Pas de sélecteur CSS, pas de phrase, uniquement des libellés visibles à l'écran, en français.`;
  const user = `Page filmée : ${topic.url}

Post LinkedIn :
${postText}

Documentation technique du module :
${captureHintsForTopic(topic)}

JSON :`;
  try {
    const { text } = await callLLM(system, user, { json: true, temperature: 0.3 });
    const parsed = JSON.parse(text) as { labels?: unknown };
    const labels = Array.isArray(parsed.labels)
      ? parsed.labels.filter((l): l is string => typeof l === "string" && l.trim().length > 2).slice(0, 4)
      : [];
    console.log(`[capture-focus] ${labels.length ? labels.join(" / ") : "aucun libellé, scroll global"}`);
    return labels;
  } catch (err) {
    console.warn(`[capture-focus] échec, scroll global: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}



async function generateSlidePlanFromText(
  topic: Topic,
  postText: string,
): Promise<{ plan: SlidePlan; source: string }> {
  const count = topic.slideCount ?? 3;
  const system = `Tu structures un carrousel LinkedIn éditorial sobre pour IKtracker (iktracker.fr), outil gratuit à vie de suivi des indemnités kilométriques pour indépendants français.

Contraintes ABSOLUES :
- Français, ton pragmatique entrepreneurial
- Emojis autorisés avec parcimonie
- Phrases courtes, factuelles, sans marketing
- Interdit : "Découvrez", "révolutionnaire", "boostez", "unlock", "testez"
- Respecte STRICTEMENT les limites de caractères (cover_title ≤ 60, cover_subtitle ≤ 90, heading ≤ 40, body ≤ 180, cta ≤ 60)
- Exactement ${count} slides intermédiaires (heading + body)`;
  const user = `Sujet : ${topic.title}

Post LinkedIn généré (le carrousel doit en reprendre les points forts, pas inventer d'autres arguments) :
${postText}

Faits techniques disponibles :
${(TOPIC_FACTS[topic.slug] ?? []).map((f) => `. ${f}`).join("\n")}

Extraits de documentation technique interne (source de vérité, à reformuler simplement, sans nom de table ni de fonction) :
${docContextForTopic(topic, 2500)}



Produis le plan du carrousel au format JSON strict avec les clés cover_title, cover_subtitle, slides (array de ${count} objets {heading, body}), cta. Rien d'autre.`;
  const { text, source } = await callLLM(system, user, { json: true, temperature: 0.7 });
  const plan = JSON.parse(text) as SlidePlan;
  if (!plan.cover_title || !Array.isArray(plan.slides) || plan.slides.length !== count) {
    throw new Error(`Malformed slide plan from text (expected ${count} slides): ${text.slice(0, 300)}`);
  }
  return { plan, source };
}

function toWinAnsi(s: string): string {
  return s
    .replace(/[’‘‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/•/g, "-");
}

function wrapText(
  text: string,
  font: import("npm:pdf-lib@1.17.1").PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = toWinAnsi(text).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? current + " " + w : w;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function renderCarouselPdf(
  topic: Topic,
  plan: SlidePlan,
  coverBg: Uint8Array | null,
): Promise<Uint8Array> {
  const W = 1200;
  const H = 1200;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`IKtracker — ${topic.title}`);
  pdf.setAuthor("Adrien de Volontat");
  pdf.setSubject(topic.focus.slice(0, 200));

  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const bg = rgb(0.984, 0.973, 0.949);
  const ink = rgb(0.09, 0.09, 0.13);
  const primary = rgb(0.361, 0.294, 0.902);
  const muted = rgb(0.38, 0.38, 0.44);

  const coverImage = coverBg
    ? await (async () => {
        try { return await pdf.embedJpg(coverBg); }
        catch { return await pdf.embedPng(coverBg); }
      })()
    : null;

  const drawFrame = (page: import("npm:pdf-lib@1.17.1").PDFPage, slideNum: number, total: number) => {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: bg });
    page.drawRectangle({ x: 80, y: H - 100, width: 60, height: 4, color: primary });
    page.drawText("IKtracker", { x: 80, y: H - 140, size: 22, font: helvBold, color: ink });
    const counter = `${slideNum} / ${total}`;
    const cw = helv.widthOfTextAtSize(counter, 18);
    page.drawText(counter, { x: W - 80 - cw, y: H - 140, size: 18, font: helv, color: muted });
    page.drawText("iktracker.fr", { x: 80, y: 80, size: 16, font: helv, color: muted });
    page.drawRectangle({ x: 80, y: 74, width: 40, height: 2, color: primary });
  };

  const totalSlides = plan.slides.length + 2; // cover + N + CTA

  // Cover
  {
    const page = pdf.addPage([W, H]);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: bg });
    if (coverImage) {
      // AI-generated visual as a soft right-side panel (60% width, faded via low opacity rectangle overlay).
      page.drawImage(coverImage, { x: W * 0.42, y: 0, width: W * 0.58, height: H });
      // Soft ivory scrim on the left for text legibility
      page.drawRectangle({ x: 0, y: 0, width: W * 0.55, height: H, color: bg, opacity: 0.92 });
    }
    drawFrame(page, 1, totalSlides);

    const titleSize = 68;
    const titleLines = wrapText(plan.cover_title, helvBold, titleSize, W * 0.55 - 100);
    let y = H / 2 + (titleLines.length * titleSize) / 2 + 40;
    for (const line of titleLines) {
      page.drawText(line, { x: 80, y, size: titleSize, font: helvBold, color: ink });
      y -= titleSize + 8;
    }
    y -= 20;
    const subSize = 26;
    for (const line of wrapText(plan.cover_subtitle, helv, subSize, W * 0.55 - 100)) {
      page.drawText(line, { x: 80, y, size: subSize, font: helv, color: muted });
      y -= subSize + 8;
    }
  }

  // Content slides
  plan.slides.forEach((s, i) => {
    const page = pdf.addPage([W, H]);
    drawFrame(page, i + 2, totalSlides);
    const badge = `0${i + 1}`;
    page.drawText(badge, { x: 80, y: H - 260, size: 96, font: helvBold, color: primary });
    const headSize = 52;
    const headLines = wrapText(s.heading, helvBold, headSize, W - 160);
    let y = H - 380;
    for (const line of headLines) {
      page.drawText(line, { x: 80, y, size: headSize, font: helvBold, color: ink });
      y -= headSize + 6;
    }
    y -= 20;
    page.drawRectangle({ x: 80, y, width: 80, height: 3, color: primary });
    y -= 40;
    const bodySize = 30;
    for (const line of wrapText(s.body, helv, bodySize, W - 160)) {
      page.drawText(line, { x: 80, y, size: bodySize, font: helv, color: ink });
      y -= bodySize + 10;
    }
  });

  // CTA
  {
    const page = pdf.addPage([W, H]);
    drawFrame(page, totalSlides, totalSlides);
    page.drawRectangle({ x: 80, y: H / 2 - 60, width: W - 160, height: 8, color: primary });
    const ctaSize = 56;
    const ctaLines = wrapText(plan.cta, helvBold, ctaSize, W - 160);
    let y = H / 2 + 40;
    for (const line of ctaLines) {
      page.drawText(line, { x: 80, y, size: ctaSize, font: helvBold, color: ink });
      y -= ctaSize + 8;
    }
    const sub = "Outil gratuit a vie pour les independants francais.";
    page.drawText(toWinAnsi(sub), { x: 80, y: H / 2 - 120, size: 26, font: helv, color: muted });
  }

  const bytes = await pdf.save();
  console.log(`Rendered PDF carousel: ${bytes.length} bytes, ${totalSlides} slides`);
  return bytes;
}

// ─── LinkedIn upload (shared for video / document) ─────────────────────────

async function gatewayFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
  const linkedinKey = Deno.env.get("LINKEDIN_API_KEY")!;
  const url = path.startsWith("http")
    ? path
    : `${GATEWAY_URL}${path.startsWith("/") ? path : "/" + path}`;
  return fetch(url, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> || {}),
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": linkedinKey,
    },
  });
}

async function getMemberUrn(): Promise<string> {
  const res = await gatewayFetch("/v2/userinfo");
  if (!res.ok) throw new Error(`userinfo ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (!json.sub) throw new Error("No sub in /v2/userinfo");
  return `urn:li:person:${json.sub}`;
}

// Récupère les derniers posts LinkedIn de l'auteur pour servir d'échantillons de style.
// Renvoie [] silencieusement si l'endpoint échoue (scope manquant, quota, etc.) — le
// prompt reste fonctionnel sans échantillons.
async function fetchRecentAuthorPosts(ownerUrn: string, count = 10): Promise<string[]> {
  try {
    const encoded = encodeURIComponent(ownerUrn);
    const url = `/v2/ugcPosts?q=authors&authors=List(${encoded})&count=${count}&sortBy=LAST_MODIFIED`;
    const res = await gatewayFetch(url, {
      headers: { "X-Restli-Protocol-Version": "2.0.0" },
    });
    if (!res.ok) {
      console.warn(`[style-samples] ugcPosts list ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return [];
    }
    const json = await res.json();
    const elements: any[] = Array.isArray(json.elements) ? json.elements : [];
    const texts = elements
      .map((el) => el?.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text)
      .filter((t): t is string => typeof t === "string" && t.trim().length >= 80)
      .map((t) => t.trim());
    console.log(`[style-samples] fetched ${texts.length} past posts for style reference`);
    return texts;
  } catch (err) {
    console.warn(`[style-samples] failed: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

// Nettoie les tirets d'incise (— – -) laissés par le modèle malgré la consigne.
// Conserve les traits d'union intra-mots (ex : auto-entrepreneur).
// Retire aussi les caractères interdits : ( ) @ [ ] { } < > \ * _ ~ |
// Invariant I2 : le texte publié doit tenir entre POST_MIN_CHARS et
// POST_MAX_CHARS signes. Le prompt le demande, mais on ne fait jamais
// confiance au modèle : la borne haute est appliquée en dur ci-dessous, la
// borne basse déclenche une régénération au niveau de l'appelant.
const POST_MIN_CHARS = 1000;
const POST_MAX_CHARS = 1500;

// Tronque proprement un texte trop long : on retire d'abord des paragraphes
// entiers par la fin, puis des phrases, pour ne jamais couper au milieu d'un
// mot. Le lien du module est ajouté après, il n'est donc pas compté ici.
function enforceMaxLength(text: string, max = POST_MAX_CHARS): string {
  if (text.length <= max) return text;

  const paragraphs = text.split(/\n{2,}/);
  while (paragraphs.length > 1 && paragraphs.join("\n\n").length > max) {
    paragraphs.pop();
  }
  let out = paragraphs.join("\n\n");
  if (out.length <= max) return out.trim();

  const sentences = out.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [out];
  const kept: string[] = [];
  for (const sentence of sentences) {
    if ((kept.join("") + sentence).length > max) break;
    kept.push(sentence);
  }
  out = kept.join("").trim();
  // Sécurité ultime : coupe au dernier espace avant la limite.
  if (!out || out.length > max) out = text.slice(0, max).replace(/\s+\S*$/, "").trim();
  return out;
}

function sanitizePostText(text: string): string {
  let out = text.replace(/[—–]/g, ",");
  // " - " (tiret d'incise entouré d'espaces) → ", "
  out = out.replace(/\s-\s/g, ", ");
  // "- " en début de ligne (puce résiduelle) → ""
  out = out.replace(/^-\s+/gm, "");
  // Caractères interdits (markdown / mentions / brackets) → supprimés
  out = out.replace(/[()@\[\]{}<>\\*_~|]/g, "");
  // "100 pour cent" / "20 pour cent" → "100%" / "20%"
  out = out.replace(/(\d+(?:[.,]\d+)?)\s*pour\s*cents?/gi, "$1%");
  // Nettoie les doubles espaces éventuels laissés par la suppression
  out = out.replace(/[ \t]{2,}/g, " ");
  return out;
}

// Invariant I11 : le post doit nommer IKtracker. Le prompt le demande, mais on
// ne fait jamais confiance au modèle : on normalise la casse et on réécrit les
// tournures anonymes ("mon simulateur", "mon outil") en les rattachant à la
// marque. Retourne le texte corrigé.
function enforceBrandMention(text: string): string {
  // Casse : Iktracker / IKTracker / ik tracker → IKtracker
  let out = text.replace(/\bik[\s-]?tracker\b/gi, "IKtracker");

  if (/\bIKtracker\b/.test(out)) return out;

  // Aucune mention : on rattache la première tournure possessive anonyme.
  const anonymous = /\b(?:mon|Mon|notre|Notre)\s+(simulateur|outil|module|application|appli|site|tableau de bord)\b/;
  const m = out.match(anonymous);
  if (m) {
    const isSentenceStart = m.index === 0 || /[.\n]\s*$/.test(out.slice(0, m.index));
    const replacement = `${isSentenceStart ? "Le" : "le"} ${m[1]} d'IKtracker`;
    out = out.replace(anonymous, replacement);
  }
  return out;
}

function brandMentionCount(text: string): number {
  return (text.match(/\bIKtracker\b/g) ?? []).length;
}


// Ajoute le lien de la page concernée en fin de post : LinkedIn transforme
// automatiquement une URL https en clair en lien cliquable.
function appendTopicLink(text: string, topic: Topic): string {
  const url = topic.url.replace(/#.*$/, "");
  if (text.includes(url)) return text;
  return `${text}\n\n${url}`;
}


// Aère le post : un paragraphe = 2 phrases maximum, séparés par une ligne vide.
// LinkedIn tronque les pavés dans le feed, l'aération est indispensable.
function airifyPostText(text: string): string {
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim())
    .filter(Boolean);

  const paragraphs: string[] = [];
  for (const block of blocks) {
    const sentences = block.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [block];
    const cleaned = sentences.map((s) => s.trim()).filter(Boolean);
    // Première phrase = hook isolé, puis paquets de 2 phrases.
    let i = 0;
    if (paragraphs.length === 0 && cleaned.length > 1) {
      paragraphs.push(cleaned[0]);
      i = 1;
    }
    for (; i < cleaned.length; i += 2) {
      paragraphs.push(cleaned.slice(i, i + 2).join(" "));
    }
  }
  return paragraphs.join("\n\n").trim();
}

// ─── Mention de la page LinkedIn IKtracker ─────────────────────────────────
const MENTION_LABEL = "IKtracker";
let cachedOrgUrn: string | null | undefined;

async function resolveOrgUrn(): Promise<string | null> {
  if (cachedOrgUrn !== undefined) return cachedOrgUrn;
  const fromEnv = Deno.env.get("LINKEDIN_ORG_URN") || Deno.env.get("LINKEDIN_ORG_ID");
  if (fromEnv) {
    cachedOrgUrn = fromEnv.startsWith("urn:") ? fromEnv : `urn:li:organization:${fromEnv}`;
    return cachedOrgUrn;
  }
  try {
    const res = await gatewayFetch(
      "/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&projection=(elements*(organization~(id,localizedName)))",
      { headers: { "X-Restli-Protocol-Version": "2.0.0" } },
    );
    if (!res.ok) {
      console.warn(`[mention] organizationAcls ${res.status}: ${(await res.text()).slice(0, 200)}`);
      cachedOrgUrn = null;
      return null;
    }
    const json = await res.json();
    const elements: any[] = Array.isArray(json.elements) ? json.elements : [];
    const match = elements.find((el) =>
      String(el?.["organization~"]?.localizedName ?? "").toLowerCase().includes("iktracker")
    ) ?? elements[0];
    const id = match?.["organization~"]?.id;
    cachedOrgUrn = id ? `urn:li:organization:${id}` : null;
    if (!cachedOrgUrn) console.warn("[mention] no administered organization found");
    return cachedOrgUrn;
  } catch (err) {
    console.warn(`[mention] resolve failed: ${err instanceof Error ? err.message : String(err)}`);
    cachedOrgUrn = null;
    return null;
  }
}

// Commentaire pour l'API REST versionnée : syntaxe de mention inline.
function restCommentary(text: string, orgUrn: string | null): string {
  return orgUrn ? `${text}\n\n@[${MENTION_LABEL}](${orgUrn})` : text;
}

// Commentaire pour /v2/ugcPosts : texte brut + annotation d'entité.
function ugcCommentary(text: string, orgUrn: string | null): Record<string, unknown> {
  if (!orgUrn) return { text };
  const full = `${text}\n\n${MENTION_LABEL}`;
  return {
    text: full,
    attributes: [{
      length: MENTION_LABEL.length,
      start: full.length - MENTION_LABEL.length,
      value: { "com.linkedin.common.CompanyAttributedEntity": { company: orgUrn } },
    }],
  };
}

function toGatewayUrl(linkedinUrl: string): string {
  const u = new URL(linkedinUrl);
  return `${GATEWAY_URL}${u.pathname}${u.search}`;
}

type UploadTarget = { uploadUrl: string; assetUrn: string; extraHeaders: Record<string, string> };

async function registerUpload(
  ownerUrn: string,
  recipe: "feedshare-video" | "feedshare-document",
): Promise<UploadTarget> {
  const res = await gatewayFetch("/v2/assets?action=registerUpload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: [`urn:li:digitalmediaRecipe:${recipe}`],
        owner: ownerUrn,
        serviceRelationships: [{
          relationshipType: "OWNER",
          identifier: "urn:li:userGeneratedContent",
        }],
      },
    }),
  });
  if (!res.ok) throw new Error(`registerUpload ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const mech = json.value?.uploadMechanism?.[
    "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
  ];
  if (!mech?.uploadUrl || !json.value?.asset) {
    throw new Error(`Unexpected registerUpload payload: ${JSON.stringify(json).slice(0, 500)}`);
  }
  return {
    uploadUrl: mech.uploadUrl,
    assetUrn: json.value.asset,
    extraHeaders: mech.headers || {},
  };
}

async function uploadBytes(
  uploadUrl: string,
  bytes: Uint8Array,
  contentType: string,
  extraHeaders: Record<string, string>,
): Promise<void> {
  const gatewayUrl = toGatewayUrl(uploadUrl);
  const res = await gatewayFetch(gatewayUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType, ...extraHeaders },
    body: bytes,
  });
  if (!res.ok) {
    throw new Error(`uploadBytes ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }
  console.log(`Uploaded ${bytes.length} bytes to LinkedIn (${contentType})`);
}

async function waitForAssetReady(assetUrn: string, maxMs = 5 * 60 * 1000): Promise<void> {
  const assetId = assetUrn.split(":").pop()!;
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const res = await gatewayFetch(`/v2/assets/${assetId}`);
    if (res.ok) {
      const json = await res.json();
      const status = json.recipes?.[0]?.status;
      console.log(`Asset ${assetId} status: ${status}`);
      if (status === "AVAILABLE") return;
      if (status === "PROCESSING_FAILED" || status === "CLIENT_ERROR" || status === "SERVER_ERROR") {
        throw new Error(`Asset processing failed (${status})`);
      }
    } else {
      console.warn(`Asset poll ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    await new Promise(r => setTimeout(r, 8000));
  }
  throw new Error("Asset not AVAILABLE within timeout");
}

async function createUgcPost(
  ownerUrn: string,
  text: string,
  assetUrn: string,
  topic: Topic,
  mediaCategory: "VIDEO" | "DOCUMENT",
): Promise<string> {
  const orgUrn = await resolveOrgUrn();
  const body = {
    author: ownerUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: ugcCommentary(text, orgUrn),
        shareMediaCategory: mediaCategory,
        media: [{
          status: "READY",
          description: { text: topic.title },
          media: assetUrn,
          title: { text: `IKtracker - ${topic.title}` },
        }],
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };
  const res = await gatewayFetch("/v2/ugcPosts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ugcPosts ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.id || json["x-restli-id"] || "unknown";
}

// ─── LinkedIn media upload — modern REST API (/rest/images|videos|documents) ─
// The legacy /v2/assets?action=registerUpload endpoint now returns 403 ACCESS_DENIED
// for member tokens, which is why every run silently degraded to a text-only post.
// The versioned REST API is the supported path and works with w_member_social.

// LinkedIn ne garde actives que ~12 mois de versions : on calcule la version
// glissante (mois courant - 2) plutôt qu'une constante qui expire silencieusement.
function currentLiVersion(): string {
  const override = Deno.env.get("LINKEDIN_API_VERSION");
  if (override) return override;
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - 2);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
const LI_VERSION = currentLiVersion();

function restHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "LinkedIn-Version": LI_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
    ...extra,
  };
}

async function restInitUpload(
  resource: "images" | "documents",
  ownerUrn: string,
): Promise<{ uploadUrl: string; urn: string }> {
  const res = await gatewayFetch(`/rest/${resource}?action=initializeUpload`, {
    method: "POST",
    headers: restHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ initializeUploadRequest: { owner: ownerUrn } }),
  });
  if (!res.ok) throw new Error(`init ${resource} ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const json = await res.json();
  const value = json?.value ?? {};
  const urn = value.image ?? value.document;
  if (!value.uploadUrl || !urn) {
    throw new Error(`Unexpected ${resource} init payload: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return { uploadUrl: value.uploadUrl, urn };
}

async function putBinary(uploadUrl: string, bytes: Uint8Array, contentType: string): Promise<Response> {
  // L'URL d'upload renvoyée par LinkedIn est pré-signée : on tente d'abord un PUT
  // direct (le proxy gateway renvoie 405 sur ces hôtes média), puis le gateway.
  const errors: string[] = [];
  try {
    const direct = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: bytes,
    });
    if (direct.ok) return direct;
    errors.push(`direct ${direct.status}: ${(await direct.text()).slice(0, 200)}`);
  } catch (err) {
    errors.push(`direct threw: ${err instanceof Error ? err.message : String(err)}`);
  }

  const res = await gatewayFetch(toGatewayUrl(uploadUrl), {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: bytes,
  });
  if (!res.ok) {
    errors.push(`gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
    throw new Error(`upload PUT failed — ${errors.join(" | ")}`);
  }
  return res;
}

async function uploadImageRest(ownerUrn: string, bytes: Uint8Array): Promise<string> {
  const { uploadUrl, urn } = await restInitUpload("images", ownerUrn);
  await putBinary(uploadUrl, bytes, "application/octet-stream");
  console.log(`[rest] image uploaded (${bytes.length} bytes) → ${urn}`);
  return urn;
}

async function uploadDocumentRest(ownerUrn: string, bytes: Uint8Array): Promise<string> {
  const { uploadUrl, urn } = await restInitUpload("documents", ownerUrn);
  await putBinary(uploadUrl, bytes, "application/octet-stream");
  console.log(`[rest] document uploaded (${bytes.length} bytes) → ${urn}`);
  return urn;
}

async function uploadVideoRest(ownerUrn: string, bytes: Uint8Array): Promise<string> {
  const initRes = await gatewayFetch("/rest/videos?action=initializeUpload", {
    method: "POST",
    headers: restHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: ownerUrn,
        fileSizeBytes: bytes.length,
        uploadCaptions: false,
        uploadThumbnail: false,
      },
    }),
  });
  if (!initRes.ok) throw new Error(`init videos ${initRes.status}: ${(await initRes.text()).slice(0, 400)}`);
  const initJson = await initRes.json();
  const value = initJson?.value ?? {};
  const instructions: any[] = value.uploadInstructions ?? [];
  const videoUrn = value.video;
  const uploadToken = value.uploadToken ?? "";
  if (!videoUrn || instructions.length === 0) {
    throw new Error(`Unexpected videos init payload: ${JSON.stringify(initJson).slice(0, 300)}`);
  }

  const etags: string[] = [];
  for (const [i, ins] of instructions.entries()) {
    const first = Number(ins.firstByte ?? 0);
    const last = Number(ins.lastByte ?? bytes.length - 1);
    const chunk = bytes.slice(first, last + 1);
    const res = await putBinary(ins.uploadUrl, chunk, "application/octet-stream");
    const etag = res.headers.get("etag") ?? res.headers.get("ETag");
    if (!etag) throw new Error(`No ETag returned for video part ${i}`);
    etags.push(etag.replace(/"/g, ""));
  }

  const finRes = await gatewayFetch("/rest/videos?action=finalizeUpload", {
    method: "POST",
    headers: restHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      finalizeUploadRequest: { video: videoUrn, uploadToken, uploadedPartIds: etags },
    }),
  });
  if (!finRes.ok) throw new Error(`finalize video ${finRes.status}: ${(await finRes.text()).slice(0, 300)}`);
  console.log(`[rest] video uploaded (${bytes.length} bytes) → ${videoUrn}`);
  return videoUrn;
}

async function createRestPost(
  ownerUrn: string,
  text: string,
  mediaUrn: string,
  title: string,
): Promise<string> {
  const orgUrn = await resolveOrgUrn();
  const res = await gatewayFetch("/rest/posts", {
    method: "POST",
    headers: restHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      author: ownerUrn,
      commentary: restCommentary(text, orgUrn),
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { media: { id: mediaUrn, title: title.slice(0, 100) } },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!res.ok) throw new Error(`rest/posts ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return res.headers.get("x-restli-id") ?? res.headers.get("x-linkedin-id") ?? "unknown";
}

// ─── Browserless still image (guaranteed visual fallback) ───────────────────

async function captureScreenshot(topic: Topic): Promise<Uint8Array> {
  const token = Deno.env.get("BROWSERLESS_API_KEY");
  if (!token) throw new Error("BROWSERLESS_API_KEY missing");
  const res = await fetch(`${BROWSERLESS_BASE}/screenshot?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: topic.url,
      options: { type: "png", fullPage: false },
      viewport: { width: 1200, height: 1200, deviceScaleFactor: 2 },
      gotoOptions: { waitUntil: "networkidle2", timeout: 30000 },
      waitForTimeout: 2500,
    }),
  });
  if (!res.ok) throw new Error(`Browserless screenshot ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  console.log(`[screenshot] ${topic.url} → ${bytes.length} bytes`);
  return bytes;
}

// ─── Logging ────────────────────────────────────────────────────────────────

async function logRun(supabase: ReturnType<typeof createClient>, row: Record<string, unknown>) {
  const { error } = await supabase.from("linkedin_post_log").insert(row);
  if (error) console.error("Failed to log run:", error);
}

// ─── Entrypoint ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";
  // Note: le mode "texte seul" a été supprimé — un post LinkedIn embarque toujours un média.
  const forceFormat = url.searchParams.get("format") as MediaFormat | null;
  const forcedTopicSlug = url.searchParams.get("topic");

  // Auth: cron secret OR admin JWT
  const cronSecret = Deno.env.get("CRON_SECRET");
  const altCronSecret = Deno.env.get("SYNC_CRON_TOKEN");
  const xCronSecret = req.headers.get("x-cron-secret");
  const isCron = !!xCronSecret && (
    (cronSecret && xCronSecret === cronSecret) ||
    (altCronSecret && xCronSecret === altCronSecret)
  );
  const triggeredBy: "cron" | "admin" = isCron ? "cron" : "admin";

  if (!isCron) {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuthed = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabaseAuthed.auth.getUser(token);
    if (error || !data.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabaseAuthed.rpc("has_role", {
      _user_id: data.user.id, _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ─── Mode "supprimer + republier" ─────────────────────────────────────────
  // L'API LinkedIn ne permet pas d'éditer le texte d'un post via le gateway
  // (POST /rest/posts en PARTIAL_UPDATE renvoie 426 NONEXISTENT_VERSION).
  // On supprime donc le post et on le republie avec le texte corrigé, en
  // réutilisant l'asset média déjà uploadé : le visuel est conservé à
  // l'identique, aucun nouvel upload n'est nécessaire.
  if (url.searchParams.get("mode") === "repost") {
    const repostStartedAt = Date.now();
    let payload: Record<string, unknown> = {};
    try { payload = await req.json(); } catch { /* body optionnel */ }

    const targetPostId = String(payload.post_id ?? url.searchParams.get("post_id") ?? "").trim();
    const rawText = String(payload.text ?? "").trim();

    if (!targetPostId || rawText.length < 50) {
      return new Response(
        JSON.stringify({ ok: false, error: "post_id et text (>= 50 signes) requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    try {
      // Récupération du run d'origine pour retrouver l'asset média et le topic.
      const { data: original } = await admin
        .from("linkedin_post_log")
        .select("topic_slug, topic_title, linkedin_asset_urn, media_type")
        .eq("linkedin_post_id", targetPostId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const reusedAssetUrn = String(
        payload.asset_urn ?? original?.linkedin_asset_urn ?? "",
      ).trim();
      if (!reusedAssetUrn) {
        throw new Error("Aucun asset média associé à ce post : republication impossible sans média.");
      }

      // Invariant I2 également sur la republication corrigée par l'audit.
      const newText = enforceBrandMention(enforceMaxLength(airifyPostText(sanitizePostText(rawText))));
      const ownerUrn = await getMemberUrn();

      // 1) Suppression du post existant (REST versionné, repli sur /v2/ugcPosts).
      const encoded = encodeURIComponent(targetPostId);
      let delRes = await gatewayFetch(`/rest/posts/${encoded}`, {
        method: "DELETE",
        headers: restHeaders(),
      });
      if (!delRes.ok) {
        const firstErr = (await delRes.text()).slice(0, 300);
        console.warn(`[repost] delete rest/posts ${delRes.status}: ${firstErr}`);
        delRes = await gatewayFetch(`/v2/ugcPosts/${encoded}`, {
          method: "DELETE",
          headers: { "X-Restli-Protocol-Version": "2.0.0" },
        });
        if (!delRes.ok) {
          throw new Error(
            `Suppression impossible (${delRes.status}): ${(await delRes.text()).slice(0, 300)}`,
          );
        }
      }
      console.log(`[repost] post ${targetPostId} supprimé`);

      // 2) Republication avec le même asset média.
      const legacyAsset = reusedAssetUrn.includes("digitalmediaAsset");
      const topicTitle = String(original?.topic_title ?? "IKtracker");
      let newPostId: string;
      if (legacyAsset) {
        const category = original?.media_type === "carousel" ? "DOCUMENT" : "VIDEO";
        newPostId = await createUgcPost(
          ownerUrn,
          newText,
          reusedAssetUrn,
          { slug: String(original?.topic_slug ?? "repost"), title: topicTitle } as Topic,
          category,
        );
      } else {
        newPostId = await createRestPost(
          ownerUrn,
          newText,
          reusedAssetUrn,
          `IKtracker - ${topicTitle}`,
        );
      }

      await logRun(admin, {
        topic_slug: original?.topic_slug ?? "repost",
        topic_title: topicTitle,
        post_text: newText,
        linkedin_post_id: newPostId,
        linkedin_asset_urn: reusedAssetUrn,
        media_type: original?.media_type ?? "repost",
        status: "success",
        duration_ms: Date.now() - repostStartedAt,
        triggered_by: triggeredBy,
      });

      return new Response(
        JSON.stringify({
          ok: true,
          mode: "repost",
          deleted_post_id: targetPostId,
          post_id: newPostId,
          asset_urn: reusedAssetUrn,
          post_text: newText,
          duration_ms: Date.now() - repostStartedAt,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[repost] failed:", message);
      await logRun(admin, {
        topic_slug: "repost",
        topic_title: "Republication",
        post_text: rawText,
        status: "failed",
        error_message: message.slice(0, 2000),
        duration_ms: Date.now() - repostStartedAt,
        triggered_by: triggeredBy,
      });
      return new Response(
        JSON.stringify({ ok: false, error: message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }



  const startedAt = Date.now();
  const postHistory = await fetchPostHistory(admin, 12);
  if (postHistory.length) {
    console.log(`[history] ${postHistory.length} posts passés · derniers sujets: ${postHistory.slice(0, 5).map((p) => p.slug).join(", ")}`);
  }
  const baseTopic = findTopic(forcedTopicSlug)
    ?? pickTopicForThisMonth(new Date(), postHistory.map((p) => p.slug));
  const topic = await resolveBlogTopic(admin, baseTopic, postHistory.map((p) => p.text ?? ""));

  let format: MediaFormat | "text" | "image" = forceFormat === "video" || forceFormat === "carousel"
    ? forceFormat
    : topic.format;

  console.log(`[linkedin-monthly-post] topic=${topic.slug} format=${format} mediaSource=${topic.mediaSource} dryRun=${dryRun} triggeredBy=${triggeredBy}`);

  let postText = "";
  let textSource = "";
  let mediaBytes = 0;
  let assetUrn: string | null = null;
  let postId: string | null = null;
  let slidePlan: SlidePlan | null = null;
  let slideSource = "";

  try {
    // 1) Récupération de l'URN + des posts passés (échantillons de style)
    //    On le fait avant la génération pour que le prompt puisse imiter le ton d'Adrien,
    //    y compris en dry-run. En cas d'échec, on continue sans échantillon.
    let ownerUrn: string | null = null;
    let styleSamples: string[] = [];

    // 1a) Corpus manuel saisi dans l'admin — source de vérité du style d'Adrien.
    //     L'API LinkedIn ne rend pas les posts passés sans scope de lecture, donc
    //     sans ce corpus le modèle écrivait "à l'aveugle".
    try {
      const { data: manual, error: manualErr } = await admin
        .from("linkedin_style_samples")
        .select("content")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (manualErr) throw manualErr;
      styleSamples = (manual ?? [])
        .map((r: { content: string }) => (r.content ?? "").trim())
        .filter((c: string) => c.length >= 80);
      console.log(`[style-samples] ${styleSamples.length} échantillons manuels chargés`);
    } catch (err) {
      console.warn(`[style-samples] lecture DB impossible: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 1b) Complément éventuel via l'API LinkedIn (souvent indisponible côté scopes).
    try {
      ownerUrn = await getMemberUrn();
      console.log(`LinkedIn owner: ${ownerUrn}`);
      if (styleSamples.length < 4) {
        const remote = await fetchRecentAuthorPosts(ownerUrn, 10);
        styleSamples = [...styleSamples, ...remote];
      }
    } catch (err) {
      console.warn(`[style-samples] URN/list unavailable, continuing without samples: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 1bis) Profil de style déterministe (longueurs, rythme, vocabulaire)
    const styleProfile = analyzeStyle(styleSamples);
    console.log(`[style-profile] ${styleProfile.samples_count} samples · avg ${styleProfile.avg_word_count} mots · ${styleProfile.avg_sentence_count} phrases · ${styleProfile.short_sentence_ratio}% phrases courtes`);

    // 2) Text
    // Invariants I2 (longueur) et I11 (marque nommée) : on régénère une fois si
    // le modèle rend un texte hors gabarit ou sans mention d'IKtracker, puis on
    // applique les corrections déterministes.
    let t = await generatePostText(topic, styleSamples, styleProfile, undefined, postHistory);
    let body = enforceBrandMention(airifyPostText(sanitizePostText(t.text)));
    const outOfRange = (n: number) => n < POST_MIN_CHARS || n > POST_MAX_CHARS;
    if (outOfRange(body.length) || brandMentionCount(body) < 2) {
      const parts: string[] = [];
      if (body.length < POST_MIN_CHARS) {
        parts.push(`Ta version précédente faisait ${body.length} signes, c'est TROP COURT. Ajoute des faits techniques et des paragraphes pour atteindre au moins ${POST_MIN_CHARS} signes sans dépasser ${POST_MAX_CHARS}.`);
      } else if (body.length > POST_MAX_CHARS) {
        parts.push(`Ta version précédente faisait ${body.length} signes, c'est TROP LONG. Resserre le texte pour rester sous ${POST_MAX_CHARS} signes tout en restant au dessus de ${POST_MIN_CHARS}.`);
      }
      if (brandMentionCount(body) < 2) {
        parts.push(`Ta version précédente ne nommait pas assez IKtracker (${brandMentionCount(body)} occurrence(s)). Écris "IKtracker" au moins deux fois, dont une dans les trois premières lignes, et ne parle jamais du module comme d'un outil anonyme.`);
      }
      const correction = parts.join("\n");
      console.warn(`[llm] texte non conforme (${body.length} signes, ${brandMentionCount(body)} mention(s) marque), régénération`);
      try {
        const retry = await generatePostText(topic, styleSamples, styleProfile, correction, postHistory);
        const retryBody = enforceBrandMention(airifyPostText(sanitizePostText(retry.text)));
        // On garde la version la plus proche du gabarit, marque prioritaire.
        const distance = (n: number) => (n < POST_MIN_CHARS ? POST_MIN_CHARS - n : n > POST_MAX_CHARS ? n - POST_MAX_CHARS : 0);
        const score = (txt: string) => distance(txt.length) + (brandMentionCount(txt) === 0 ? 5000 : brandMentionCount(txt) < 2 ? 1000 : 0);
        if (score(retryBody) < score(body)) {
          body = retryBody;
          t = retry;
        }
      } catch (err) {
        console.warn(`[llm] régénération échouée: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    body = enforceBrandMention(enforceMaxLength(body));
    console.log(`[llm] longueur finale du corps: ${body.length} signes (gabarit ${POST_MIN_CHARS}-${POST_MAX_CHARS}), marque citée ${brandMentionCount(body)}x`);
    postText = appendTopicLink(body, topic);
    textSource = t.source;
    console.log(`Generated post text (${postText.length} chars) via ${textSource}, ${styleSamples.length} style samples`);

    // 2bis) Derive media content from the generated text so visuals match the post.
    let derivedVisualPrompt: string | null = null;
    let visualPromptSource: string | null = null;

    if (format === "carousel") {
      try {
        const sp = await generateSlidePlanFromText(topic, postText);
        slidePlan = sp.plan;
        slideSource = sp.source;
        console.log(`Slide plan derived from text (${slidePlan.slides.length} content slides) via ${slideSource}`);
      } catch (err) {
        console.warn(
          `[slide-plan] text-derived plan failed, falling back to topic plan: ${err instanceof Error ? err.message : String(err)}`,
        );
        const sp = await generateSlidePlan(topic);
        slidePlan = sp.plan;
        slideSource = sp.source;
      }
      if (topic.mediaSource === "wavespeed") {
        try {
          const vp = await deriveVisualPromptFromText(topic, postText);
          derivedVisualPrompt = vp.prompt;
          visualPromptSource = vp.source;
          console.log(`Cover visual prompt derived from text via ${visualPromptSource}`);
        } catch (err) {
          console.warn(
            `[visual-prompt] derivation failed, using topic.visualPrompt: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    } else if (format === "video" && topic.mediaSource === "wavespeed") {
      try {
        const vp = await deriveVisualPromptFromText(topic, postText);
        derivedVisualPrompt = vp.prompt;
        visualPromptSource = vp.source;
        console.log(`Video visual prompt derived from text via ${visualPromptSource}`);
      } catch (err) {
        console.warn(
          `[visual-prompt] derivation failed, using topic.visualPrompt: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          topic,
          format,
          media_source: topic.mediaSource,
          post_text: postText,
          text_source: textSource,
          derived_visual_prompt: derivedVisualPrompt,
          visual_prompt_source: visualPromptSource,
          style_samples_count: styleSamples.length,
          style_profile: styleProfile,
          slide_plan: slidePlan,
          slide_source: slideSource || null,
        }, null, 2),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) LinkedIn owner URN (fallback si non résolu plus haut)
    if (!ownerUrn) ownerUrn = await getMemberUrn();

    // Média strictement obligatoire : aucun chemin de publication sans visuel.
    let mediaFallback = false;
    let mediaFallbackReason: string | null = null;


    // Legacy /v2/assets path, kept as a secondary attempt.
    const legacyPublish = async (
      bytes: Uint8Array,
      recipe: "feedshare-video" | "feedshare-document",
      contentType: string,
      category: "VIDEO" | "DOCUMENT",
    ): Promise<string> => {
      const upload = await registerUpload(ownerUrn!, recipe);
      assetUrn = upload.assetUrn;
      await uploadBytes(upload.uploadUrl, bytes, contentType, upload.extraHeaders);
      await waitForAssetReady(assetUrn);
      return await createUgcPost(ownerUrn!, postText, assetUrn, topic, category);
    };

    // Last visual resort: a real screenshot of the feature page, posted as an image.
    const publishScreenshot = async (): Promise<string> => {
      const png = await captureScreenshot(topic);
      mediaBytes = png.length;
      assetUrn = await uploadImageRest(ownerUrn!, png);
      return await createRestPost(ownerUrn!, postText, assetUrn, `IKtracker - ${topic.title}`);
    };

    // 3) Build media + upload — média obligatoire, aucune publication texte seul.
    {

      // Build the media bytes first (independent from the LinkedIn transport).
      // Visual prompts are derived from the generated post text whenever possible,
      // so the image/video actually illustrates what the text says.
      let bytes: Uint8Array;
      if (format === "video") {
        if (topic.mediaSource === "browserless") {
          try {
            // 1er choix : vraie vidéo MP4 de l'UI via PageBolt.
            bytes = await capturePageboltVideo(topic, postText);
          } catch (videoErr) {
            const videoReason = videoErr instanceof Error ? videoErr.message : String(videoErr);
            console.warn(`[media] PageBolt vidéo échouée, repli carrousel de captures: ${videoReason}`);
            try {
              const focusLabels = await deriveCaptureFocus(topic, postText);
              const frames = await captureUiFrames(topic, focusLabels);
              bytes = await renderScreenshotCarouselPdf(frames);
              format = "carousel";
              mediaFallback = true;
              mediaFallbackReason = videoReason;
            } catch (err) {
              const reason = err instanceof Error ? err.message : String(err);
              console.warn(`[media] Capture UI échouée, repli sur une capture unique: ${reason}`);
              mediaFallback = true;
              mediaFallbackReason = `${videoReason} | ${reason}`;
              bytes = await captureScreenshot(topic);
              format = "image";
            }
          }
        } else {

          bytes = await generateWavespeedVideo(derivedVisualPrompt || topic.visualPrompt || topic.focus);
        }
      } else {
        let coverBg: Uint8Array | null = null;
        const coverPrompt = derivedVisualPrompt || topic.visualPrompt;
        if (topic.mediaSource === "wavespeed" && coverPrompt) {
          try {
            coverBg = await generateWavespeedImage(coverPrompt);
            console.log(`Wavespeed cover image: ${coverBg.length} bytes`);
          } catch (err) {
            console.warn(`Wavespeed cover image failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        bytes = await renderCarouselPdf(topic, slidePlan!, coverBg);
      }
      mediaBytes = bytes.length;

      const attempts: Array<{ label: string; run: () => Promise<string> }> = format === "image"
        ? [
            { label: "rest-image", run: async () => {
              assetUrn = await uploadImageRest(ownerUrn!, bytes);
              return await createRestPost(ownerUrn!, postText, assetUrn, `IKtracker - ${topic.title}`);
            } },
          ]
        : format === "video"
        ? [
            { label: "rest-video", run: async () => {
              assetUrn = await uploadVideoRest(ownerUrn!, bytes);
              return await createRestPost(ownerUrn!, postText, assetUrn, `IKtracker - ${topic.title}`);
            } },
            { label: "legacy-video", run: () => legacyPublish(bytes, "feedshare-video", "application/octet-stream", "VIDEO") },
            { label: "screenshot-image", run: publishScreenshot },
          ]
        : [
            { label: "rest-document", run: async () => {
              assetUrn = await uploadDocumentRest(ownerUrn!, bytes);
              return await createRestPost(ownerUrn!, postText, assetUrn, `IKtracker - ${topic.title}`);
            } },
            { label: "legacy-document", run: () => legacyPublish(bytes, "feedshare-document", "application/pdf", "DOCUMENT") },
            { label: "screenshot-image", run: publishScreenshot },
          ];

      for (const attempt of attempts) {
        try {
          postId = await attempt.run();
          console.log(`[media] published via ${attempt.label}`);
          if (attempt.label === "screenshot-image") {
            mediaFallback = true;
          }
          break;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(`[media] ${attempt.label} failed: ${message}`);
          mediaFallbackReason = `${attempt.label}: ${message}`;
          assetUrn = null;
        }
      }

      // Média obligatoire : aucun post texte seul. Si toutes les voies média
      // échouent, on remonte l'erreur au lieu de publier un post nu.
      if (!postId) {
        throw new Error(
          `Média obligatoire indisponible, publication annulée. Dernier échec: ${mediaFallbackReason ?? "inconnu"}`,
        );
      }
    }

    console.log(`Published UGC post ${postId}`);

    await logRun(admin, {
      topic_slug: topic.slug,
      topic_title: topic.title,
      post_text: postText,
      linkedin_post_id: postId,
      linkedin_asset_urn: assetUrn,
      video_bytes: mediaBytes,
      media_type: format,
      status: "success",
      duration_ms: Date.now() - startedAt,
      triggered_by: triggeredBy,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        topic_slug: topic.slug,
        format,
        media_source: topic.mediaSource,
        text_source: textSource,
        post_id: postId,
        asset_urn: assetUrn,
        media_bytes: mediaBytes,
        media_fallback: mediaFallback,
        media_fallback_reason: mediaFallbackReason,
        duration_ms: Date.now() - startedAt,

      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[linkedin-monthly-post] failed:", message);
    await logRun(admin, {
      topic_slug: topic.slug,
      topic_title: topic.title,
      post_text: postText || null,
      linkedin_asset_urn: assetUrn,
      video_bytes: mediaBytes || null,
      media_type: format,
      status: "failed",
      error_message: message.slice(0, 2000),
      duration_ms: Date.now() - startedAt,
      triggered_by: triggeredBy,
    });
    return new Response(
      JSON.stringify({ ok: false, error: message, topic_slug: topic.slug, format }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
