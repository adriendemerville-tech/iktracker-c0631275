import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Meta Renderer Edge Function — Full-content version
 * Serves complete, crawlable HTML to bots/crawlers with:
 * - Full textual content (paragraphs, features, FAQ)
 * - JSON-LD structured data
 * - Internal navigation links for crawl depth
 * - Blog post content rendered as clean HTML
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = 'https://www.iktracker.fr';
const LOGO = `${BASE_URL}/logo-iktracker-250.webp`;

const BOT_PATTERNS = [
  'facebookexternalhit', 'Twitterbot', 'LinkedInBot', 'WhatsApp', 'Slackbot',
  'TelegramBot', 'Discordbot', 'Pinterest', 'Embedly', 'Quora Link Preview',
  'Showyoubot', 'outbrain', 'vkShare', 'W3C_Validator', 'redditbot',
  'Applebot', 'rogerbot', 'Googlebot', 'Bingbot', 'DuckDuckBot',
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'Google-Extended',
  'Claude-Web', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'Anthropic-AI',
  'PerplexityBot', 'Cohere-AI', 'YouBot', 'ia_archiver',
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some(p => ua.includes(p.toLowerCase()));
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface PageMeta {
  title: string;
  h1?: string; // Optional separate H1 (defaults to title without site suffix)
  description: string;
  ogType?: string;
  ogImage?: string;
  canonical: string;
  content?: string; // Rich HTML content for the body
  jsonLd?: object | object[];
}

// Navigation links for internal crawl depth
const NAV_LINKS = [
  { href: '/', label: 'Accueil' },
  { href: '/signup', label: 'Créer un compte gratuit' },
  { href: '/mode-tournee', label: 'Mode Tournée GPS' },
  { href: '/calendrier', label: 'Synchronisation Calendrier' },
  { href: '/bareme-ik-2026', label: 'Barème IK 2026' },
  { href: '/frais-reels', label: 'Frais Réels vs Abattement' },
  { href: '/note-de-frais-kilometrique', label: 'Note de frais kilométrique' },
  { href: '/indemnite-kilometrique-velo', label: 'Indemnité kilométrique vélo' },
  { href: '/mes-trajets', label: 'Mes Trajets — journal kilométrique' },
  { href: '/expert-comptable', label: 'Espace Expert-Comptable' },
  { href: '/install', label: 'Installer l\'application' },
  { href: '/lexique', label: 'Lexique IK' },
  { href: '/comparatif-izika', label: 'IKtracker vs Izika' },
  { href: '/comparatif-drivers-note', label: 'IKtracker vs Driversnote' },
  { href: '/blog', label: 'Blog' },
  { href: '/mentions-legales', label: 'Mentions Légales' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Politique de Confidentialité' },
  { href: '/terms', label: 'CGVU' },
  { href: '/blog/auteur/adrien-de-volontat', label: 'À propos – Adrien de Volontat' },
];

// ──────────────────────────────────────────────────────
// Static page definitions with full content
// ──────────────────────────────────────────────────────

const STATIC_PAGES: Record<string, PageMeta> = {
  '/': {
    title: 'IKtracker — Outil Gratuit de Calcul des Indemnités Kilométriques 2026',
    description: 'Automatisez gratuitement vos indemnités kilométriques avec IKtracker : mode tournée GPS, synchronisation calendrier, barème fiscal 2026, export PDF. 100% gratuit.',
    canonical: BASE_URL,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "IKtracker",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Web, iOS, Android",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" },
        "description": "Outil gratuit de calcul et suivi des indemnités kilométriques pour les professionnels en France.",
        "url": BASE_URL,
        "image": LOGO,
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "IKtracker",
        "url": BASE_URL,
        "logo": LOGO,
        "foundingDate": "2025",
        "founder": { "@type": "Person", "name": "Adrien de Volontat" },
        "address": { "@type": "PostalAddress", "addressLocality": "Lyon", "addressCountry": "FR" },
      },
    ],
    content: `
      <section>
        <h2>Qu'est-ce qu'IKtracker ?</h2>
        <p>IKtracker est un <strong>outil 100% gratuit</strong> de calcul et de suivi des indemnités kilométriques (IK) pour les professionnels en France. Il automatise la déclaration de vos frais kilométriques grâce au barème fiscal officiel 2026.</p>
        <p>Conçu pour les <strong>infirmiers libéraux, artisans, commerciaux, VRP, consultants</strong> et tous les professionnels qui se déplacent, IKtracker remplace vos tableaux Excel par une solution moderne et conforme.</p>
      </section>
      <section>
        <h2>Fonctionnalités principales</h2>
        <ul>
          <li><strong>Mode Tournée GPS</strong> — Enregistrez automatiquement tous vos arrêts clients grâce à la géolocalisation. Idéal pour les infirmiers libéraux et les artisans itinérants.</li>
          <li><strong>Synchronisation Calendrier</strong> — Connectez Google Calendar ou Outlook pour transformer automatiquement vos rendez-vous en trajets professionnels.</li>
          <li><strong>Barème fiscal 2026</strong> — Calcul automatique selon le barème officiel des indemnités kilométriques, avec majoration de 20% pour les véhicules électriques.</li>
          <li><strong>Export PDF et Excel</strong> — Générez des rapports fiscaux conformes pour votre expert-comptable ou votre déclaration d'impôts.</li>
          <li><strong>Application PWA</strong> — Installez IKtracker sur votre smartphone iOS ou Android sans passer par l'App Store. Fonctionne hors ligne.</li>
          <li><strong>Comparateur frais réels</strong> — Comparez l'abattement forfaitaire de 10% avec les frais réels kilométriques pour optimiser votre déclaration.</li>
        </ul>
      </section>
      <section>
        <h2>Questions fréquentes</h2>
        <dl>
          <dt>IKtracker est-il vraiment gratuit ?</dt>
          <dd>Oui, IKtracker est 100% gratuit, sans publicité et sans limite de trajets. C'est un projet communautaire.</dd>
          <dt>Comment fonctionne le Mode Tournée ?</dt>
          <dd>Le Mode Tournée utilise le GPS de votre téléphone pour enregistrer automatiquement chaque arrêt chez vos clients. À la fin de votre tournée, tous les trajets sont calculés et enregistrés.</dd>
          <dt>Quel barème fiscal est utilisé ?</dt>
          <dd>IKtracker utilise le barème kilométrique officiel 2026 publié par l'administration fiscale française, incluant la majoration de 20% pour les véhicules électriques.</dd>
          <dt>Mes données sont-elles sécurisées ?</dt>
          <dd>Oui, vos données sont chiffrées et stockées sur des serveurs européens conformes au RGPD. Vous pouvez supprimer votre compte et vos données à tout moment.</dd>
        </dl>
      </section>`,
  },

  '/signup': {
    title: 'Créer un compte gratuit - Outil communautaire IK | IKtracker',
    description: 'Rejoignez la communauté IKtracker : automatisez vos indemnités kilométriques via GPS et calendrier. Mode Tournée, comparateur frais réels, barème 2026, export PDF. 100% gratuit.',
    canonical: `${BASE_URL}/signup`,
    content: `
      <section>
        <h2>Créez votre compte IKtracker gratuitement</h2>
        <p>Inscrivez-vous en quelques secondes pour commencer à suivre vos indemnités kilométriques. Aucune carte bancaire requise, 100% gratuit.</p>
        <ul>
          <li>Calcul automatique selon le barème fiscal 2026</li>
          <li>Mode Tournée GPS pour infirmiers et artisans</li>
          <li>Synchronisation avec Google Calendar et Outlook</li>
          <li>Export PDF pour votre expert-comptable</li>
        </ul>
      </section>`,
  },

  '/mode-tournee': {
    title: 'Mode Tournée IKtracker | Suivi kilométrique pour infirmiers et artisans',
    description: 'Mode Tournée IKtracker : enregistrez gratuitement tous vos arrêts clients grâce à la localisation GPS. Outil professionnel pour infirmiers libéraux, artisans et commerciaux.',
    canonical: `${BASE_URL}/mode-tournee`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Comment utiliser le Mode Tournée IKtracker",
      "description": "Guide pour enregistrer automatiquement vos trajets professionnels avec le GPS.",
      "step": [
        { "@type": "HowToStep", "name": "Démarrer la tournée", "text": "Appuyez sur le bouton 'Démarrer la tournée' depuis l'écran principal d'IKtracker." },
        { "@type": "HowToStep", "name": "Effectuer vos visites", "text": "IKtracker enregistre automatiquement chaque arrêt grâce au GPS de votre téléphone." },
        { "@type": "HowToStep", "name": "Terminer et enregistrer", "text": "Finalisez votre tournée pour calculer les distances et les indemnités kilométriques." },
      ],
    },
    content: `
      <section>
        <h2>Le Mode Tournée : suivi GPS automatique de vos déplacements professionnels</h2>
        <p>Le Mode Tournée d'IKtracker est conçu pour les professionnels itinérants qui effectuent <strong>plusieurs visites par jour</strong> : infirmiers libéraux, aides à domicile, artisans, commerciaux, VRP.</p>
        <p>Activez le Mode Tournée avant de partir en tournée. IKtracker utilise le GPS de votre smartphone pour <strong>détecter automatiquement chaque arrêt</strong> chez vos clients ou patients. À la fin de la journée, tous vos trajets sont calculés avec les distances réelles et les indemnités kilométriques correspondantes.</p>
        <h3>Avantages du Mode Tournée</h3>
        <ul>
          <li>Aucune saisie manuelle — tout est automatique</li>
          <li>Détection intelligente des arrêts (géofencing)</li>
          <li>Historique complet de chaque tournée</li>
          <li>Calcul des IK selon le barème 2026</li>
          <li>Fonctionne en arrière-plan sur votre téléphone</li>
        </ul>
      </section>
      <section>
        <h2>Pour quels métiers ?</h2>
        <p>Le Mode Tournée est particulièrement adapté aux : <strong>infirmiers libéraux (IDEL)</strong>, kinésithérapeutes, sages-femmes, aides à domicile, artisans du bâtiment, plombiers, électriciens, commerciaux, techniciens de maintenance, livreurs, et tout professionnel effectuant des déplacements multiples.</p>
      </section>`,
  },

  '/calendrier': {
    title: 'Synchronisation Calendrier IKtracker | Google Calendar & Outlook',
    description: 'Synchronisez librement IKtracker avec Google Calendar ou Outlook. Vos rendez-vous deviennent automatiquement des trajets avec calcul des IK en illimité.',
    canonical: `${BASE_URL}/calendrier`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": "Synchroniser IKtracker avec votre calendrier",
      "step": [
        { "@type": "HowToStep", "name": "Connecter votre agenda", "text": "Autorisez IKtracker à accéder à votre Google Calendar ou Outlook." },
        { "@type": "HowToStep", "name": "Synchroniser les rendez-vous", "text": "IKtracker importe vos rendez-vous avec adresse et les convertit en trajets." },
        { "@type": "HowToStep", "name": "Vérifier et exporter", "text": "Validez les trajets importés et exportez votre rapport PDF." },
      ],
    },
    content: `
      <section>
        <h2>Synchronisez votre calendrier avec IKtracker</h2>
        <p>IKtracker se connecte à <strong>Google Calendar</strong> et <strong>Microsoft Outlook</strong> pour transformer automatiquement vos rendez-vous professionnels en trajets kilométriques.</p>
        <p>Chaque rendez-vous contenant une adresse est converti en trajet avec calcul automatique de la distance et de l'indemnité kilométrique. Plus besoin de saisir vos trajets manuellement.</p>
        <h3>Comment ça fonctionne ?</h3>
        <ol>
          <li>Connectez votre compte Google ou Microsoft en un clic</li>
          <li>IKtracker importe vos rendez-vous avec adresse</li>
          <li>Les distances sont calculées automatiquement via Google Maps</li>
          <li>Les indemnités kilométriques sont appliquées selon le barème 2026</li>
        </ol>
      </section>`,
  },

  '/expert-comptable': {
    title: 'IKtracker pour Experts-Comptables | Export IK PDF et Excel',
    description: 'Recommandez IKtracker à vos clients en illimité : exports PDF/Excel standardisés, calcul automatique des indemnités kilométriques selon barème fiscal 2026.',
    canonical: `${BASE_URL}/expert-comptable`,
    content: `
      <section>
        <h2>Simplifiez la gestion des IK de vos clients</h2>
        <p>IKtracker génère des <strong>rapports PDF et Excel conformes</strong> que vos clients peuvent vous transmettre directement. Chaque rapport contient le détail des trajets, les distances, les véhicules utilisés et le calcul des indemnités kilométriques selon le barème fiscal officiel.</p>
        <h3>Pourquoi recommander IKtracker à vos clients ?</h3>
        <ul>
          <li>Rapports standardisés et conformes au barème fiscal 2026</li>
          <li>Traçabilité complète des trajets professionnels</li>
          <li>Gain de temps pour vos clients et pour votre cabinet</li>
          <li>100% gratuit — aucun coût pour vos clients</li>
          <li>Données exportables en PDF ou Excel</li>
        </ul>
      </section>`,
  },

  '/bareme-ik-2026': {
    title: 'Barème Kilométrique 2026 Officiel : Tableau IK et Simulateur Gratuit | IKtracker',
    description: 'Barème kilométrique 2026 officiel : tableau des indemnités kilométriques par CV, simulateur IK gratuit et calcul automatique. Outil professionnel conforme au barème fiscal.',
    canonical: `${BASE_URL}/bareme-ik-2026`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Barème Kilométrique 2026 Officiel : guide complet et simulateur",
        "description": "Découvrez le barème kilométrique 2026 officiel. Tableau des taux IK, simulateur gratuit et conseils fiscaux.",
        "author": { "@type": "Organization", "name": "IKtracker" },
        "publisher": { "@type": "Organization", "name": "IKtracker", "logo": { "@type": "ImageObject", "url": LOGO } },
        "datePublished": "2024-12-01",
        "dateModified": "2026-04-09",
        "mainEntityOfPage": `${BASE_URL}/bareme-ik-2026`,
        "inLanguage": "fr-FR",
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "Quel est le barème kilométrique 2026 ?", "acceptedAnswer": { "@type": "Answer", "text": "Le barème kilométrique 2026 est identique au barème 2024, inchangé pour 2025 et 2026. Il prévoit des taux allant de 0,529 €/km pour un véhicule de 3 CV jusqu'à 5000 km, à 0,470 €/km pour un véhicule de 7 CV et plus au-delà de 20 000 km." } },
          { "@type": "Question", "name": "Comment calculer ses indemnités kilométriques ?", "acceptedAnswer": { "@type": "Answer", "text": "Multipliez le nombre de kilomètres professionnels parcourus par le taux correspondant à la puissance fiscale de votre véhicule et à votre tranche kilométrique (jusqu'à 5000 km, de 5001 à 20000 km, ou plus de 20000 km)." } },
          { "@type": "Question", "name": "Les véhicules électriques bénéficient-ils d'un avantage ?", "acceptedAnswer": { "@type": "Answer", "text": "Oui, les véhicules 100% électriques bénéficient d'une majoration de 20% sur le barème kilométrique. Par exemple, un véhicule de 5 CV parcourant 10 000 km obtiendrait 5 958 € au lieu de 4 965 €." } },
          { "@type": "Question", "name": "Quelle différence entre frais réels et indemnités kilométriques ?", "acceptedAnswer": { "@type": "Answer", "text": "Les indemnités kilométriques sont calculées selon un barème forfaitaire qui couvre tous les frais (carburant, entretien, assurance, dépréciation). Les frais réels nécessitent de justifier chaque dépense individuellement avec des factures." } },
          { "@type": "Question", "name": "Dois-je tenir un carnet de bord pour mes trajets professionnels ?", "acceptedAnswer": { "@type": "Answer", "text": "Oui, en cas de contrôle fiscal, vous devez pouvoir justifier vos déplacements professionnels. Un relevé précis (date, motif, destination, distance) est recommandé. IKtracker automatise cette tâche." } },
          { "@type": "Question", "name": "Pourquoi les IK sont-elles importantes pour les indépendants ?", "acceptedAnswer": { "@type": "Answer", "text": "Les indépendants supportent seuls tous les frais liés à l'usage de leur véhicule personnel : carburant lourdement taxé (TICPE), assurance, entretien et dépréciation du véhicule (15 à 20% de perte de valeur la première année). Le barème IK compense forfaitairement l'ensemble de ces coûts." } },
          { "@type": "Question", "name": "Combien de kilomètres les utilisateurs d'IKtracker enregistrent-ils ?", "acceptedAnswer": { "@type": "Answer", "text": "Sur la plateforme IKtracker, les utilisateurs les plus mobiles enregistrent jusqu'à 5 900 km par mois. En moyenne, chaque utilisateur cumule environ 4 886 km de trajets professionnels. Le montant maximum d'IK comptabilisé par un seul utilisateur dépasse 58 000 €, avec une moyenne de 2 730 € par utilisateur." } },
          { "@type": "Question", "name": "Que risque-t-on en cas de mauvais suivi de ses trajets professionnels ?", "acceptedAnswer": { "@type": "Answer", "text": "L'administration fiscale exige un relevé détaillé de chaque trajet (date, lieu de départ, destination, distance, motif). En cas de contrôle, l'absence de justificatifs peut entraîner un redressement fiscal portant sur l'ensemble des frais déclarés." } },
        ],
      },
    ],
    content: `
      <section>
        <h2>Barème des indemnités kilométriques 2026 — Voitures</h2>
        <p>Le barème kilométrique 2026 est le barème officiel applicable pour le calcul des indemnités kilométriques. Il est identique au barème 2024, reconduit sans modification pour 2025 et 2026.</p>
        <table>
          <thead><tr><th>Puissance fiscale (CV)</th><th>Jusqu'à 5 000 km</th><th>De 5 001 à 20 000 km</th><th>Au-delà de 20 000 km</th></tr></thead>
          <tbody>
            <tr><td>3 CV et moins</td><td>d × 0,529 €</td><td>(d × 0,316) + 1 065 €</td><td>d × 0,370 €</td></tr>
            <tr><td>4 CV</td><td>d × 0,606 €</td><td>(d × 0,340) + 1 330 €</td><td>d × 0,407 €</td></tr>
            <tr><td>5 CV</td><td>d × 0,636 €</td><td>(d × 0,357) + 1 395 €</td><td>d × 0,427 €</td></tr>
            <tr><td>6 CV</td><td>d × 0,665 €</td><td>(d × 0,374) + 1 457 €</td><td>d × 0,447 €</td></tr>
            <tr><td>7 CV et plus</td><td>d × 0,697 €</td><td>(d × 0,394) + 1 515 €</td><td>d × 0,470 €</td></tr>
          </tbody>
        </table>
        <p><strong>d</strong> = distance parcourue en kilomètres sur l'année. <strong>Véhicules 100% électriques :</strong> majoration de 20% sur le montant calculé.</p>
      </section>

      <section>
        <h2>Barème kilométrique 2026 — Motos (&gt; 50 cm³)</h2>
        <table>
          <thead><tr><th>Puissance fiscale</th><th>Jusqu'à 3 000 km</th><th>De 3 001 à 6 000 km</th><th>Au-delà de 6 000 km</th></tr></thead>
          <tbody>
            <tr><td>1 ou 2 CV</td><td>d × 0,395 €</td><td>(d × 0,099) + 891 €</td><td>d × 0,248 €</td></tr>
            <tr><td>3, 4, 5 CV</td><td>d × 0,468 €</td><td>(d × 0,082) + 1 158 €</td><td>d × 0,275 €</td></tr>
            <tr><td>Plus de 5 CV</td><td>d × 0,606 €</td><td>(d × 0,079) + 1 583 €</td><td>d × 0,343 €</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Barème kilométrique 2026 — Cyclomoteurs (&lt; 50 cm³)</h2>
        <table>
          <thead><tr><th>Type</th><th>Jusqu'à 3 000 km</th><th>De 3 001 à 6 000 km</th><th>Au-delà de 6 000 km</th></tr></thead>
          <tbody>
            <tr><td>Cyclomoteurs et scooters &lt; 50 cm³</td><td>d × 0,315 €</td><td>(d × 0,079) + 711 €</td><td>d × 0,198 €</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Exemples de calcul des indemnités kilométriques 2026</h2>
        <ul>
          <li><strong>5 CV, 10 000 km/an :</strong> (10 000 × 0,357) + 1 395 = <strong>4 965 €</strong></li>
          <li><strong>5 CV, 10 000 km/an, véhicule électrique :</strong> 4 965 × 1,20 = <strong>5 958 €</strong></li>
          <li><strong>4 CV, 3 000 km/an :</strong> 3 000 × 0,606 = <strong>1 818 €</strong></li>
          <li><strong>7 CV, 25 000 km/an :</strong> 25 000 × 0,470 = <strong>11 750 €</strong></li>
        </ul>
      </section>

      <section>
        <h2>Pourquoi les indemnités kilométriques sont indispensables pour les indépendants</h2>
        <p>Lorsqu'un travailleur indépendant — qu'il soit consultant, infirmier libéral, commercial ou artisan — utilise son véhicule personnel pour se rendre chez ses clients ou sur ses chantiers, il supporte seul l'intégralité des coûts associés à ces déplacements. Contrairement à un salarié disposant d'un véhicule de fonction, l'indépendant avance le carburant, lourdement taxé (la TICPE représente environ 60 centimes par litre d'essence), paie son assurance auto, finance les révisions et les réparations courantes (pneus, freins, vidange).</p>
        <p>Au-delà du carburant, l'indépendant subit la dépréciation naturelle de son véhicule, qui perd en moyenne 15 à 20% de sa valeur dès la première année. Le barème des indemnités kilométriques 2026 existe précisément pour compenser forfaitairement l'ensemble de ces frais réels : usure mécanique, consommation de carburant, entretien régulier et perte de valeur du véhicule.</p>
      </section>

      <section>
        <h2>Données de la communauté IKtracker</h2>
        <p>IKtracker accompagne aujourd'hui plus de <strong>160 utilisateurs actifs</strong> dans le suivi quotidien de leurs déplacements professionnels. Les utilisateurs les plus mobiles enregistrent jusqu'à <strong>5 900 km par mois</strong>. En moyenne, chaque utilisateur cumule environ <strong>4 886 km</strong> de trajets professionnels. Le montant maximum d'indemnités kilométriques comptabilisé par un seul utilisateur dépasse <strong>58 000 €</strong>, avec une moyenne de <strong>2 730 €</strong> par utilisateur. Au total, plus de <strong>4 600 trajets professionnels</strong> ont été documentés sur la plateforme.</p>
      </section>

      <section>
        <h2>Optimiser ses IK : l'importance d'un suivi rigoureux</h2>
        <p>L'un des pièges les plus fréquents est l'oubli de trajets. Un déplacement non noté, c'est une déduction fiscale perdue. L'administration fiscale (URSSAF) exige un relevé détaillé de chaque trajet : date, lieu de départ, destination, distance et motif professionnel. En cas de contrôle, l'absence de justificatifs peut entraîner un redressement fiscal portant sur l'ensemble des frais déclarés.</p>
        <p>Un outil de suivi automatisé permet de constituer un dossier fiscal solide et conforme aux exigences de l'URSSAF et du fisc, plutôt que de reconstituer ses trajets en fin d'année à partir de souvenirs approximatifs.</p>
      </section>

      <section>
        <h2>Questions fréquentes sur le barème IK 2026</h2>
        <dl>
          <dt>Quel est le barème kilométrique 2026 ?</dt>
          <dd>Le barème kilométrique 2026 est identique au barème 2024, inchangé pour 2025 et 2026. Il prévoit des taux allant de 0,529 €/km pour un véhicule de 3 CV jusqu'à 5000 km, à 0,470 €/km pour un véhicule de 7 CV et plus au-delà de 20 000 km.</dd>
          <dt>Comment calculer ses indemnités kilométriques ?</dt>
          <dd>Multipliez le nombre de kilomètres professionnels parcourus par le taux correspondant à la puissance fiscale de votre véhicule et à votre tranche kilométrique.</dd>
          <dt>Les véhicules électriques bénéficient-ils d'un avantage ?</dt>
          <dd>Oui, les véhicules 100% électriques bénéficient d'une majoration de 20% sur le barème kilométrique.</dd>
          <dt>Quelle différence entre frais réels et indemnités kilométriques ?</dt>
          <dd>Les IK sont forfaitaires (barème fiscal) et couvrent tous les frais. Les frais réels nécessitent de justifier chaque dépense individuellement.</dd>
          <dt>Dois-je tenir un carnet de bord ?</dt>
          <dd>Oui. En cas de contrôle fiscal, un relevé précis (date, motif, destination, distance) est exigé par l'administration.</dd>
          <dt>Pourquoi les IK sont-elles importantes pour les indépendants ?</dt>
          <dd>Les indépendants supportent seuls carburant taxé, assurance, entretien et dépréciation. Le barème IK compense forfaitairement l'ensemble de ces coûts.</dd>
          <dt>Combien de kilomètres les utilisateurs d'IKtracker enregistrent-ils ?</dt>
          <dd>Jusqu'à 5 900 km/mois pour les plus mobiles, 4 886 km en moyenne. Le montant max d'IK dépasse 58 000 €, moyenne de 2 730 € par utilisateur.</dd>
          <dt>Que risque-t-on sans suivi rigoureux ?</dt>
          <dd>L'absence de justificatifs peut entraîner un redressement fiscal portant sur l'ensemble des frais déclarés.</dd>
        </dl>
      </section>`,
  },

  '/frais-reels': {
    title: 'Frais Réels vs Abattement 10% : Calculateur Gratuit 2026 | IKtracker',
    description: 'Comparez gratuitement l\'abattement forfaitaire de 10% et les frais réels kilométriques. Calculateur barème 2026 pour optimiser votre déclaration d\'impôts.',
    canonical: `${BASE_URL}/frais-reels`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "Frais réels ou abattement de 10% : que choisir ?", "acceptedAnswer": { "@type": "Answer", "text": "Si vos frais professionnels réels (principalement les indemnités kilométriques) dépassent 10% de votre revenu brut, l'option frais réels est plus avantageuse. Par exemple, avec un salaire brut de 30 000 € et 15 000 km parcourus en voiture 5 CV, les frais réels s'élèvent à 6 750 € contre 3 000 € d'abattement forfaitaire." } },
        { "@type": "Question", "name": "Comment déclarer les frais réels ?", "acceptedAnswer": { "@type": "Answer", "text": "Cochez la case 'frais réels' dans votre déclaration d'impôts (case 1AK) et indiquez le montant total. Conservez vos justificatifs (rapports IKtracker) pendant 3 ans." } },
        { "@type": "Question", "name": "Quels frais sont déductibles en plus des IK ?", "acceptedAnswer": { "@type": "Answer", "text": "En plus des indemnités kilométriques, vous pouvez déduire les frais de repas (si vous ne pouvez pas rentrer chez vous), les frais de double résidence, les frais de formation professionnelle et les cotisations syndicales." } },
      ],
    },
    content: `
      <section>
        <h2>Frais réels ou abattement forfaitaire de 10% ?</h2>
        <p>Chaque année, les salariés français peuvent choisir entre l'<strong>abattement forfaitaire de 10%</strong> (appliqué automatiquement) et la <strong>déduction des frais réels</strong>. Les frais réels incluent principalement les indemnités kilométriques pour les trajets domicile-travail et les déplacements professionnels.</p>
        <p>IKtracker vous aide à comparer les deux options pour <strong>optimiser votre déclaration d'impôts</strong>.</p>
        <h3>Quand choisir les frais réels ?</h3>
        <ul>
          <li>Vous parcourez plus de 30 km entre votre domicile et votre lieu de travail</li>
          <li>Vous effectuez des déplacements professionnels fréquents</li>
          <li>Votre véhicule a une puissance fiscale élevée (6 CV ou plus)</li>
          <li>Vous avez d'autres frais professionnels déductibles (repas, formation)</li>
        </ul>
        <h3>Exemple de comparaison</h3>
        <p>Salaire brut : 30 000 € — Distance : 15 000 km/an — Véhicule : 5 CV</p>
        <ul>
          <li><strong>Abattement 10%</strong> : 30 000 × 10% = 3 000 €</li>
          <li><strong>Frais réels (IK)</strong> : (15 000 × 0,357) + 1 395 = <strong>6 750 €</strong></li>
          <li><strong>Économie</strong> : 3 750 € de déduction supplémentaire</li>
        </ul>
        <p>Dans cet exemple, les frais réels sont <strong>2,25 fois plus avantageux</strong> que l'abattement forfaitaire.</p>
      </section>
      <section>
        <h2>Frais déductibles en complément des IK</h2>
        <p>Au-delà des indemnités kilométriques, d'autres frais professionnels peuvent être déduits :</p>
        <ul>
          <li><strong>Frais de repas</strong> : si vous ne pouvez pas rentrer déjeuner chez vous (montant plafonné)</li>
          <li><strong>Frais de double résidence</strong> : si votre emploi vous oblige à maintenir deux logements</li>
          <li><strong>Frais de formation</strong> : formations professionnelles en lien avec votre activité</li>
          <li><strong>Cotisations syndicales</strong> : adhésion à un syndicat professionnel</li>
        </ul>
      </section>`,
  },

  '/note-de-frais-kilometrique': {
    title: 'Note de frais kilométrique 2025-2026 | Modèle & calcul gratuit',
    description: 'Comment faire une note de frais kilométrique conforme URSSAF en 2025-2026 : modèle, calcul automatique selon barème officiel, export PDF & Excel. Gratuit pour salariés, libéraux et auto-entrepreneurs.',
    canonical: `${BASE_URL}/note-de-frais-kilometrique`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "Comment faire une note de frais kilométrique ?", "acceptedAnswer": { "@type": "Answer", "text": "Mentionnez la date, le motif professionnel, l'adresse de départ et d'arrivée, la distance, la puissance fiscale du véhicule (case P.6 de la carte grise) et le montant calculé selon le barème URSSAF en vigueur. IKtracker génère tout cela automatiquement." } },
        { "@type": "Question", "name": "Quel modèle de note de frais kilométrique utiliser ?", "acceptedAnswer": { "@type": "Answer", "text": "Un modèle conforme reprend les colonnes : date, trajet, motif, kilomètres, taux barème, total. IKtracker exporte directement au format PDF et Excel attendu par les employeurs et experts-comptables." } },
        { "@type": "Question", "name": "Comment justifier une note de frais kilométrique auprès de l'URSSAF ?", "acceptedAnswer": { "@type": "Answer", "text": "L'URSSAF exige un carnet de bord daté, motivé et géolocalisable. Le Mode Tournée GPS d'IKtracker conserve un historique opposable pendant 3 ans, durée légale d'archivage des justificatifs fiscaux." } },
        { "@type": "Question", "name": "Une note de frais kilométrique pour un véhicule électrique : quelle particularité ?", "acceptedAnswer": { "@type": "Answer", "text": "Le barème est majoré de 20 % pour les véhicules 100 % électriques. Les hybrides ne sont pas concernés. IKtracker applique cette majoration automatiquement." } }
      ]
    },
    content: `
      <section>
        <h2>Note de frais kilométrique : définition</h2>
        <p>Une <strong>note de frais kilométrique</strong> est le document remis à un employeur ou à un expert-comptable pour demander le remboursement des trajets professionnels effectués avec un véhicule personnel. Elle s'appuie sur le <strong>barème kilométrique URSSAF 2025-2026</strong> et reprend, pour chaque déplacement : la date, le motif, les adresses de départ et d'arrivée, la distance et le taux applicable selon la puissance fiscale.</p>
        <h3>Ce que la note doit contenir</h3>
        <ul>
          <li><strong>Date et motif</strong> du déplacement professionnel</li>
          <li><strong>Trajet</strong> (adresse de départ, adresse d'arrivée) et distance opposable</li>
          <li><strong>Puissance fiscale</strong> du véhicule (case P.6 de la carte grise)</li>
          <li>Majoration <strong>+20 %</strong> si le véhicule est 100 % électrique</li>
          <li>Montant calculé selon le <a href="${BASE_URL}/bareme-ik-2026">barème kilométrique 2025-2026</a></li>
        </ul>
        <h3>Pour qui ?</h3>
        <p>Salariés en frais réels, commerciaux itinérants, VRP, infirmières libérales, artisans, livreurs, auto-entrepreneurs, aides à domicile. <a href="${BASE_URL}/mode-tournee">Le Mode Tournée GPS</a> automatise la collecte pour les professionnels itinérants.</p>
      </section>
      <section>
        <h2>Archivage et opposabilité</h2>
        <p>Les notes de frais kilométriques doivent être conservées <strong>3 ans</strong>, durée légale d'archivage en cas de contrôle fiscal ou URSSAF. L'export PDF d'IKtracker est horodaté et reprend la structure exigée par l'administration.</p>
      </section>`,
  },

  '/indemnite-kilometrique-velo': {
    title: 'Indemnité kilométrique vélo 2025-2026 | Forfait Mobilités Durables',
    description: "Guide complet de l'indemnité kilométrique vélo et du Forfait Mobilités Durables en 2025-2026 : plafond 700 €, exonération URSSAF, conditions, justificatifs. Pour salariés, freelances et employeurs.",
    canonical: `${BASE_URL}/indemnite-kilometrique-velo`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "Qu'est-ce que l'indemnité kilométrique vélo ?", "acceptedAnswer": { "@type": "Answer", "text": "Une somme versée par l'employeur au salarié qui se rend au travail à vélo. Depuis 2020, elle est intégrée au Forfait Mobilités Durables (FMD)." } },
        { "@type": "Question", "name": "Quel est le plafond exonéré en 2025-2026 ?", "acceptedAnswer": { "@type": "Answer", "text": "700 € par an et par salarié, porté à 800 € si cumulé avec un abonnement transport public. Exonéré de cotisations URSSAF et d'impôt sur le revenu dans cette limite." } },
        { "@type": "Question", "name": "L'IK vélo est-elle obligatoire pour l'employeur ?", "acceptedAnswer": { "@type": "Answer", "text": "Non dans le secteur privé (sauf accord d'entreprise ou de branche). Oui dans la fonction publique d'État, plafonnée à 300 € par an." } },
        { "@type": "Question", "name": "Peut-on cumuler IK vélo et IK voiture ?", "acceptedAnswer": { "@type": "Answer", "text": "Oui. Le FMD vélo couvre le domicile-travail, les indemnités kilométriques voiture couvrent les déplacements professionnels. Les deux dispositifs se cumulent dans leurs plafonds respectifs." } }
      ]
    },
    content: `
      <section>
        <h2>Indemnité kilométrique vélo : définition</h2>
        <p>L'<strong>indemnité kilométrique vélo</strong> (IK vélo) désigne la prise en charge par l'employeur des frais engagés par un salarié qui se rend à son travail à vélo, qu'il soit musculaire ou à assistance électrique. Depuis la Loi d'Orientation des Mobilités (LOM, décembre 2019), elle est intégrée au <strong>Forfait Mobilités Durables</strong> (FMD).</p>
        <h3>Montant et plafond 2025-2026</h3>
        <ul>
          <li><strong>Plafond annuel</strong> : 700 € par salarié, exonérés de cotisations sociales et d'impôt sur le revenu</li>
          <li><strong>Cumul transport public</strong> : plafond porté à 800 €</li>
          <li><strong>Fonction publique d'État</strong> : 300 € par an, obligatoire depuis 2020</li>
          <li>Le montant est libre (forfaitaire ou au km selon l'accord d'entreprise)</li>
        </ul>
        <h3>Pour qui ?</h3>
        <p>Tous les salariés qui utilisent leur vélo personnel (classique ou VAE) pour le trajet domicile-travail. Le FMD couvre aussi le covoiturage, l'autopartage, la trottinette et certains transports collectifs.</p>
        <h3>Justifier ses trajets vélo</h3>
        <p>L'employeur peut exiger une <strong>déclaration sur l'honneur</strong> annuelle ou un journal de bord. <a href="${BASE_URL}/app/mestrajets">IKtracker</a> permet de consigner chaque trajet vélo daté et géolocalisé, et d'exporter un PDF récapitulatif à transmettre au service paie — gratuit, sans abonnement.</p>
      </section>
      <section>
        <h2>Différence avec l'indemnité kilométrique voiture</h2>
        <p>L'<a href="${BASE_URL}/bareme-ik-2026">indemnité kilométrique voiture</a> concerne les <strong>déplacements professionnels</strong> effectués pour le compte de l'employeur, calculés selon le <a href="${BASE_URL}/bareme-ik-2026">barème URSSAF</a>. Le Forfait Mobilités Durables vélo concerne uniquement le <strong>trajet domicile-travail</strong>. Les deux peuvent se cumuler.</p>
      </section>`,
  },

  '/mes-trajets': {
    title: 'Mes Trajets — Journal kilométrique pro gratuit | IKtracker',
    description: 'Centralisez vos déplacements professionnels : saisie, trajets récurrents, import Google Agenda / Outlook, Mode Tournée GPS, export PDF & Excel conforme URSSAF. Gratuit à vie.',
    canonical: `${BASE_URL}/mes-trajets`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "À quoi sert la page Mes Trajets d'IKtracker ?", "acceptedAnswer": { "@type": "Answer", "text": "Mes Trajets centralise tous vos déplacements professionnels : saisie manuelle, trajets récurrents, import Google Agenda / Outlook et Mode Tournée GPS. Chaque ligne affiche date, motif, distance et indemnité kilométrique calculée selon le barème en vigueur." } },
        { "@type": "Question", "name": "Comment ajouter un trajet récurrent ?", "acceptedAnswer": { "@type": "Answer", "text": "Depuis Mes Trajets, ouvrez la modale Récurrents et cliquez sur +. Renseignez départ, arrivée, jours de la semaine et période. IKtracker génère automatiquement chaque occurrence dans votre journal." } },
        { "@type": "Question", "name": "Peut-on importer ses trajets depuis son agenda ?", "acceptedAnswer": { "@type": "Answer", "text": "Oui. IKtracker se synchronise avec Google Agenda et Outlook quatre fois par jour. Chaque événement avec adresse devient un trajet pré-rempli, rattaché au véhicule par défaut." } },
        { "@type": "Question", "name": "Comment exporter sa note de frais depuis Mes Trajets ?", "acceptedAnswer": { "@type": "Answer", "text": "Cliquez sur Exporter pour générer un PDF ou Excel filtré par mois, véhicule ou catégorie. Format conforme employeur, expert-comptable et URSSAF, avec bonus +20 % automatique pour les véhicules 100 % électriques." } }
      ]
    },
    content: `
      <section>
        <h2>Mes Trajets : le journal kilométrique centralisé</h2>
        <p><strong>Mes Trajets</strong> est l'écran principal d'IKtracker. Il rassemble tous vos déplacements professionnels en un seul journal opposable URSSAF : saisie manuelle rapide, <strong>trajets récurrents</strong> (domicile-travail, tournées hebdomadaires), <strong>import depuis Google Agenda et Outlook</strong>, et trajets enregistrés via le <a href="${BASE_URL}/mode-tournee">Mode Tournée GPS</a>.</p>
        <h3>Fonctionnalités principales</h3>
        <ul>
          <li><strong>Saisie rapide</strong> avec autocomplétion d'adresses Géoplateforme</li>
          <li><strong>Trajets récurrents</strong> : déclarez une fois, IKtracker génère chaque occurrence</li>
          <li><strong>Synchronisation calendrier</strong> Google &amp; Outlook quatre fois par jour</li>
          <li><strong>Mode Tournée GPS</strong> pour la détection automatique des arrêts</li>
          <li><strong>Filtres</strong> par mois, véhicule, motif (pro, domicile-travail, mixte)</li>
          <li><strong>Multi-véhicules</strong> avec bonus <strong>+20 %</strong> automatique pour les 100 % électriques</li>
          <li><strong>Export PDF &amp; Excel</strong> conforme employeur, expert-comptable et <a href="${BASE_URL}/note-de-frais-kilometrique">URSSAF</a></li>
        </ul>
        <h3>Pour qui ?</h3>
        <p>Salariés en frais réels, commerciaux et VRP, professions libérales (BNC), artisans, infirmières libérales, livreurs, auto-entrepreneurs, aides à domicile. <a href="${BASE_URL}/bareme-ik-2026">Tous les taux du barème kilométrique 2025-2026</a> sont appliqués automatiquement selon la puissance fiscale du véhicule.</p>
      </section>
      <section>
        <h2>Archivage et conformité</h2>
        <p>L'historique de vos trajets est conservé sans limite tant que le compte est actif. L'export PDF horodaté satisfait l'obligation légale d'archivage de <strong>3 ans</strong> des justificatifs de frais professionnels. IKtracker est une PWA fonctionnant <strong>hors-ligne</strong> : aucun trajet n'est perdu en cas de coupure réseau.</p>
      </section>`,
  },

  '/lexique': {
    title: 'Lexique des indemnités kilométriques France 2026 | IKtracker',
    description: 'Dictionnaire complet des termes liés aux indemnités kilométriques en France : barème 2026, frais réels, BNC, URSSAF, professions libérales.',
    canonical: `${BASE_URL}/lexique`,
    content: `
      <section>
        <h2>Lexique des indemnités kilométriques</h2>
        <p>Retrouvez toutes les définitions essentielles liées aux indemnités kilométriques, aux frais professionnels et à la fiscalité automobile en France.</p>
        <dl>
          <dt>Indemnité kilométrique (IK)</dt><dd>Remboursement forfaitaire des frais engagés par un salarié ou un professionnel pour l'utilisation de son véhicule personnel à des fins professionnelles, calculé selon un barème fiscal officiel.</dd>
          <dt>Barème kilométrique</dt><dd>Tableau publié annuellement par l'administration fiscale fixant les taux de remboursement en fonction de la puissance fiscale du véhicule et de la distance parcourue.</dd>
          <dt>Puissance fiscale (CV)</dt><dd>Mesure administrative de la puissance d'un véhicule, indiquée sur la carte grise (rubrique P.6), utilisée pour déterminer le taux d'indemnité kilométrique applicable.</dd>
          <dt>Frais réels</dt><dd>Option fiscale permettant au contribuable de déduire ses dépenses professionnelles réelles au lieu de l'abattement forfaitaire de 10%.</dd>
          <dt>BNC (Bénéfices Non Commerciaux)</dt><dd>Catégorie de revenus applicable aux professions libérales. Les frais de déplacement sont déductibles du bénéfice imposable.</dd>
          <dt>URSSAF</dt><dd>Organisme de recouvrement des cotisations sociales. Les indemnités kilométriques versées dans les limites du barème fiscal sont exonérées de cotisations sociales.</dd>
        </dl>
      </section>`,
  },

  '/comparatif-izika': {
    title: 'Izika vs IKtracker : Le Comparatif 2026 (Alternative Gratuite)',
    description: 'Pourquoi payer un abonnement Izika ? Découvrez IKtracker, l\'alternative 100% gratuite qui synchronise votre agenda et génère vos rapports fiscaux conformes.',
    canonical: `${BASE_URL}/comparatif-izika`,
    content: `
      <section>
        <h2>IKtracker vs Izika : comparatif 2026</h2>
        <p>Izika est une application payante de suivi des indemnités kilométriques. IKtracker propose les mêmes fonctionnalités — et plus — <strong>gratuitement</strong>.</p>
        <table>
          <thead><tr><th>Fonctionnalité</th><th>IKtracker</th><th>Izika</th></tr></thead>
          <tbody>
            <tr><td>Prix</td><td><strong>Gratuit</strong></td><td>Abonnement payant</td></tr>
            <tr><td>Mode Tournée GPS</td><td>✅ Inclus</td><td>✅ Option payante</td></tr>
            <tr><td>Synchronisation calendrier</td><td>✅ Google + Outlook</td><td>❌ Non disponible</td></tr>
            <tr><td>Export PDF</td><td>✅ Illimité</td><td>✅ Limité selon forfait</td></tr>
            <tr><td>Barème 2026</td><td>✅</td><td>✅</td></tr>
            <tr><td>Application mobile</td><td>✅ PWA</td><td>✅ Native</td></tr>
            <tr><td>Comparateur frais réels</td><td>✅</td><td>❌</td></tr>
          </tbody>
        </table>
      </section>`,
  },

  '/comparatif-drivers-note': {
    title: 'Alternative Driversnote Gratuite : Comparatif iBeacon vs Agenda | IKtracker',
    description: 'Driversnote est trop cher ou trop intrusif ? Découvrez IKtracker, l\'alternative sans GPS permanent, sans boîtier à acheter et 100% gratuite.',
    canonical: `${BASE_URL}/comparatif-drivers-note`,
    content: `
      <section>
        <h2>IKtracker vs Driversnote : comparatif 2026</h2>
        <p>Driversnote utilise des boîtiers iBeacon et un GPS permanent pour suivre vos trajets. IKtracker propose une approche <strong>plus respectueuse de la vie privée</strong> et <strong>100% gratuite</strong>.</p>
        <table>
          <thead><tr><th>Fonctionnalité</th><th>IKtracker</th><th>Driversnote</th></tr></thead>
          <tbody>
            <tr><td>Prix</td><td><strong>Gratuit</strong></td><td>Abonnement + boîtier</td></tr>
            <tr><td>GPS permanent</td><td>❌ Uniquement en tournée</td><td>✅ Toujours actif</td></tr>
            <tr><td>Boîtier requis</td><td>❌ Non</td><td>✅ iBeacon (payant)</td></tr>
            <tr><td>Synchronisation calendrier</td><td>✅</td><td>❌</td></tr>
            <tr><td>Barème fiscal français</td><td>✅ 2026</td><td>⚠️ Barème générique</td></tr>
            <tr><td>Export PDF</td><td>✅ Illimité</td><td>✅ Selon forfait</td></tr>
          </tbody>
        </table>
      </section>`,
  },

  '/install': {
    title: 'Installer IKtracker | Application PWA gratuite iOS et Android',
    description: 'Installez librement IKtracker sur votre smartphone iOS ou Android en 2 minutes. Outil professionnel PWA gratuit, sans App Store.',
    canonical: `${BASE_URL}/install`,
    content: `
      <section>
        <h2>Installez IKtracker sur votre téléphone</h2>
        <p>IKtracker est une <strong>Progressive Web App (PWA)</strong> qui s'installe directement depuis votre navigateur, sans passer par l'App Store ou Google Play.</p>
        <h3>Sur iPhone (iOS)</h3>
        <ol>
          <li>Ouvrez iktracker.fr dans Safari</li>
          <li>Appuyez sur le bouton Partager (carré avec flèche)</li>
          <li>Sélectionnez "Sur l'écran d'accueil"</li>
          <li>Confirmez l'installation</li>
        </ol>
        <h3>Sur Android</h3>
        <ol>
          <li>Ouvrez iktracker.fr dans Chrome</li>
          <li>Appuyez sur "Installer" dans la bannière ou dans le menu ⋮</li>
          <li>Confirmez l'installation</li>
        </ol>
      </section>`,
  },

  '/blog': {
    title: 'Blog - IKtracker | Conseils et actualités sur les indemnités kilométriques',
    description: 'Découvrez nos articles sur les indemnités kilométriques, le barème fiscal et les bonnes pratiques pour gérer vos frais professionnels.',
    canonical: `${BASE_URL}/blog`,
    content: `<section><h2>Articles récents</h2><p>Chargement des articles depuis la base de données...</p></section>`,
  },

  '/blog/auteur/adrien-de-volontat': {
    title: 'Adrien de Volontat — Fondateur d\'IKtracker',
    description: 'Adrien de Volontat, fondateur d\'IKtracker, franchisé Avenir Rénovations et développeur. Découvrez son parcours et sa vision.',
    canonical: `${BASE_URL}/blog/auteur/adrien-de-volontat`,
    ogType: 'profile',
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "Adrien de Volontat",
      "jobTitle": "Fondateur d'IKtracker",
      "url": `${BASE_URL}/blog/auteur/adrien-de-volontat`,
      "worksFor": { "@type": "Organization", "name": "IKtracker", "url": BASE_URL },
    },
    content: `
      <section>
        <h2>À propos d'Adrien de Volontat</h2>
        <p>Adrien de Volontat est le fondateur d'IKtracker. Franchisé Avenir Rénovations et développeur, il a créé IKtracker pour simplifier le suivi des indemnités kilométriques des professionnels itinérants en France.</p>
      </section>`,
  },

  '/auth': {
    title: 'Connexion | IKtracker',
    description: 'Connectez-vous à votre espace IKtracker pour gérer vos indemnités kilométriques.',
    canonical: `${BASE_URL}/auth`,
  },

  '/privacy': {
    title: 'Politique de confidentialité | IKtracker',
    description: 'Consultez notre politique de confidentialité. IKtracker respecte le RGPD et protège vos données personnelles.',
    canonical: `${BASE_URL}/privacy`,
    content: `
      <section>
        <h2>Protection de vos données</h2>
        <p>IKtracker respecte le Règlement Général sur la Protection des Données (RGPD). Vos données de trajets et de véhicules sont chiffrées et stockées sur des serveurs européens. Vous pouvez exporter ou supprimer vos données à tout moment.</p>
      </section>`,
  },

  '/terms': {
    title: 'CGVU — Conditions Générales de Vente et d\'Utilisation | IKtracker',
    description: 'Conditions générales de vente et d\'utilisation d\'IKtracker, outil gratuit de calcul des indemnités kilométriques.',
    canonical: `${BASE_URL}/terms`,
  },

  '/mentions-legales': {
    title: 'Mentions Légales | IKtracker — Éditeur et Hébergeur',
    description: 'Mentions légales d\'IKtracker : informations sur l\'éditeur, l\'hébergeur, la propriété intellectuelle et le RGPD.',
    canonical: `${BASE_URL}/mentions-legales`,
    content: `
      <section>
        <h2>Éditeur du site</h2>
        <p>Le site iktracker.fr est édité par <strong>Adrien de Volontat</strong>, entrepreneur individuel, fondateur d'Avenir Rénovations à Saint-Rémy-de-Provence (13210), France.</p>
        <p>Contact : <a href="mailto:contact@iktracker.fr">contact@iktracker.fr</a></p>
      </section>
      <section>
        <h2>Hébergement</h2>
        <p>Front-end : Netlify, Inc. — San Francisco, USA. Base de données : Supabase, Inc. — Singapour. CDN/DNS : Cloudflare, Inc. — San Francisco, USA.</p>
        <p>Les données sont stockées sur des serveurs situés dans l'Union européenne.</p>
      </section>
      <section>
        <h2>Propriété intellectuelle</h2>
        <p>L'ensemble du contenu du site iktracker.fr est la propriété exclusive de l'éditeur et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.</p>
      </section>
      <section>
        <h2>Données personnelles & RGPD</h2>
        <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de portabilité et de suppression de vos données. Contact : contact@iktracker.fr</p>
      </section>`,
  },

  '/contact': {
    title: 'Contact | IKtracker — Nous contacter',
    description: 'Contactez l\'équipe IKtracker pour toute question, suggestion ou demande d\'assistance. Réponse rapide garantie.',
    canonical: `${BASE_URL}/contact`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "name": "Contact IKtracker",
      "url": `${BASE_URL}/contact`,
      "mainEntity": {
        "@type": "Organization",
        "name": "IKtracker",
        "url": BASE_URL,
        "email": "contact@iktracker.fr",
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "customer support",
          "email": "contact@iktracker.fr",
          "availableLanguage": "French",
        },
      },
    },
    content: `
      <section>
        <h2>Contactez-nous</h2>
        <p>Pour toute question, suggestion ou demande d'assistance, écrivez-nous à <a href="mailto:contact@iktracker.fr">contact@iktracker.fr</a>.</p>
        <p>IKtracker est développé par Adrien de Volontat, entrepreneur et fondateur d'Avenir Rénovations à Saint-Rémy-de-Provence. Chaque message est lu personnellement.</p>
      </section>`,
  },
};

// ──────────────────────────────────────────────────────
// HTML builder
// ──────────────────────────────────────────────────────

function buildFullHtml(meta: PageMeta): string {
  const ogType = meta.ogType || 'website';
  const ogImage = meta.ogImage || LOGO;

  const jsonLdBlock = meta.jsonLd
    ? (Array.isArray(meta.jsonLd)
        ? meta.jsonLd.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n  ')
        : `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`)
    : '';

  const navHtml = NAV_LINKS
    .map(l => `<li><a href="${BASE_URL}${l.href}">${escapeHtml(l.label)}</a></li>`)
    .join('\n        ');

  const bodyContent = meta.content || '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}">
  <link rel="canonical" href="${meta.canonical}">
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:url" content="${meta.canonical}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:site_name" content="IKtracker">
  <meta property="og:locale" content="fr_FR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(meta.title)}">
  <meta name="twitter:description" content="${escapeHtml(meta.description)}">
  <meta name="twitter:image" content="${ogImage}">
  <meta name="robots" content="index, follow">
  ${jsonLdBlock}
</head>
<body>
  <header>
    <nav aria-label="Navigation principale">
      <a href="${BASE_URL}"><strong>IKtracker</strong></a> — Outil gratuit de calcul des indemnités kilométriques
      <ul>
        ${navHtml}
      </ul>
    </nav>
  </header>
  <main>
    <h1>${escapeHtml(meta.title)}</h1>
    <p>${escapeHtml(meta.description)}</p>
    ${bodyContent}
  </main>
  <footer>
    <p>&copy; 2025-2026 IKtracker — <a href="${BASE_URL}/privacy">Politique de confidentialité</a> — <a href="${BASE_URL}/terms">CGVU</a> — <a href="${BASE_URL}/mentions-legales">Mentions légales</a> — <a href="${BASE_URL}/contact">Contact</a></p>
    <p><a href="${BASE_URL}/signup">Créer un compte gratuit</a></p>
    <p>Conçu par <a href="${BASE_URL}/blog/auteur/adrien-de-volontat">Adrien de Volontat</a>, entrepreneur à Saint-Rémy-de-Provence.</p>
  </footer>
</body>
</html>`;
}

// ──────────────────────────────────────────────────────
// Blog content renderer (markdown-like → HTML)
// ──────────────────────────────────────────────────────

function renderBlogContent(content: string): string {
  // If content is already HTML, strip dangerous tags and return
  if (content.includes('<p>') || content.includes('<div>') || content.includes('<h')) {
    return content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<meta[^>]*>/gi, '')
      .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '');
  }

  // Basic markdown → HTML conversion
  return content
    .split('\n')
    .map(line => {
      if (line.startsWith('### ')) return `<h3>${escapeHtml(line.slice(4))}</h3>`;
      if (line.startsWith('## ')) return `<h2>${escapeHtml(line.slice(3))}</h2>`;
      if (line.startsWith('# ')) return `<h2>${escapeHtml(line.slice(2))}</h2>`;
      if (line.startsWith('- ') || line.startsWith('* ')) return `<li>${escapeHtml(line.slice(2))}</li>`;
      if (line.trim() === '') return '';
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join('\n');
}

// ──────────────────────────────────────────────────────
// Blog schema extractors (FAQ, HowTo, Author) — mirror src/lib/blog-schema-extractors.ts
// ──────────────────────────────────────────────────────

const FAQ_HEADING_RE = /^##\s+(?:FAQ|Questions?\s+fr[ée]quentes?|Foire\s+aux\s+questions)\b.*$/im;
const HOWTO_HEADING_RE = /^##\s+(?:Phasage|[ÉE]tapes|D[ée]roul[ée]|Proc[ée]dure|Comment\s+(?:faire|proc[ée]der)|Tutoriel|Mode\s+op[ée]ratoire|Marche\s+[àa]\s+suivre)\b.*$/im;

function extractSection(content: string, headingRegex: RegExp): string | null {
  const lines = content.split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingRegex.test(lines[i])) { start = i + 1; break; }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start, end).join('\n').trim();
}

function extractFAQ(content: string): Array<{ question: string; answer: string }> {
  const section = extractSection(content, FAQ_HEADING_RE);
  if (!section) return [];
  const items: Array<{ question: string; answer: string }> = [];
  const lines = section.split('\n');
  let currentQ: string | null = null;
  let currentA: string[] = [];
  const flush = () => {
    if (currentQ && currentA.length) {
      const answer = currentA.join(' ').replace(/\s+/g, ' ').trim();
      if (answer) items.push({ question: currentQ, answer });
    }
    currentQ = null; currentA = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    const h3 = line.match(/^###\s+(.+?)\s*\??$/);
    const bold = line.match(/^\*\*(.+?)\s*\??\*\*\s*$/);
    if (h3 || bold) {
      flush();
      const q = (h3 ? h3[1] : bold![1]).trim();
      currentQ = q.endsWith('?') ? q : `${q} ?`;
    } else if (currentQ && line) {
      currentA.push(line.replace(/^[-*]\s+/, ''));
    }
  }
  flush();
  return items;
}

function extractHowToSteps(content: string): Array<{ name: string; text: string }> {
  const section = extractSection(content, HOWTO_HEADING_RE);
  if (!section) return [];
  const steps: Array<{ name: string; text: string }> = [];
  const lines = section.split('\n');
  let currentName: string | null = null;
  let currentText: string[] = [];
  const flush = () => {
    if (currentName) {
      const text = currentText.join(' ').replace(/\s+/g, ' ').trim() || currentName;
      steps.push({ name: currentName, text });
    }
    currentName = null; currentText = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    const h3 = line.match(/^###\s+(.+)$/);
    const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (h3) { flush(); currentName = h3[1].trim(); }
    else if (numbered) { flush(); currentName = numbered[2].trim(); }
    else if (bullet && !currentName) { steps.push({ name: bullet[1].trim(), text: bullet[1].trim() }); }
    else if (currentName && line) { currentText.push(line); }
  }
  flush();
  return steps.filter(s => s.name.length > 0).slice(0, 12);
}

function buildAuthorPerson(authorName: string | null | undefined) {
  const name = (authorName || '').trim();
  const isFounder = !name
    || /adrien\s+de\s+volontat/i.test(name)
    || /r[ée]daction\s+iktracker/i.test(name)
    || /iktracker/i.test(name);
  if (isFounder) {
    return {
      "@type": "Person",
      "name": "Adrien de Volontat",
      "url": `${BASE_URL}/blog/auteur/adrien-de-volontat`,
      "jobTitle": "Fondateur d'IKtracker",
      "sameAs": [
        `${BASE_URL}/blog/auteur/adrien-de-volontat`,
        "https://www.linkedin.com/in/adriendevolontat/",
      ],
      "worksFor": { "@type": "Organization", "name": "IKtracker", "url": BASE_URL },
    };
  }
  return {
    "@type": "Person",
    "name": name,
    "worksFor": { "@type": "Organization", "name": "IKtracker", "url": BASE_URL },
  };
}

// ──────────────────────────────────────────────────────
// Main handler
// ──────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '/';
    const userAgent = req.headers.get('user-agent') || '';

    // Only respond to bots
    if (!isBot(userAgent)) {
      return new Response(JSON.stringify({ redirect: true, url: `${BASE_URL}${path}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Blog listing needs DB query, handle before static fallback
    if (path === '/blog') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: posts } = await supabase
        .from('blog_posts')
        .select('title, slug, meta_description, published_at')
        .eq('status', 'published')
        .eq('is_listed', true)
        .order('published_at', { ascending: false })
        .limit(50);

      const blogPage = { ...STATIC_PAGES['/blog'] };
      if (posts && posts.length > 0) {
        blogPage.content = `<section><h2>Articles récents</h2><ul>${
          posts.map(p => `<li><a href="${BASE_URL}/blog/${p.slug}">${escapeHtml(p.title)}</a>${p.meta_description ? ` — ${escapeHtml(p.meta_description)}` : ''}</li>`).join('\n')
        }</ul></section>`;
        blogPage.jsonLd = {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Blog IKtracker",
          "url": `${BASE_URL}/blog`,
          "mainEntity": { "@type": "ItemList", "itemListElement": posts.map((p, i) => ({ "@type": "ListItem", "position": i + 1, "url": `${BASE_URL}/blog/${p.slug}`, "name": p.title })) },
        };
      }
      return new Response(buildFullHtml(blogPage), {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
      });
    }

    // Check static pages
    if (STATIC_PAGES[path]) {
      return new Response(buildFullHtml(STATIC_PAGES[path]), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      });
    }

    // Blog post: /blog/:slug
    const blogMatch = path.match(/^\/blog\/([^/]+)$/);
    if (blogMatch && blogMatch[1] !== 'auteur') {
      const slug = blogMatch[1];
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: post } = await supabase
        .from('blog_posts')
        .select('title, meta_description, featured_image_url, content, author_name, published_at')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (post) {
        const desc = post.meta_description || post.content?.replace(/[#*_\[\]()]/g, '').trim().slice(0, 160) || '';
        const renderedContent = renderBlogContent(post.content || '');
        const articleDate = post.published_at || '';

        const articleSchema = {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title,
          "description": desc,
          "image": post.featured_image_url || LOGO,
          "author": buildAuthorPerson(post.author_name),
          "publisher": { "@type": "Organization", "name": "IKtracker", "logo": { "@type": "ImageObject", "url": LOGO } },
          "datePublished": articleDate,
          "inLanguage": "fr-FR",
          "mainEntityOfPage": { "@type": "WebPage", "@id": `${BASE_URL}/blog/${slug}` },
          "url": `${BASE_URL}/blog/${slug}`,
        };
        const breadcrumbSchema = {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Accueil", "item": `${BASE_URL}/` },
            { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${BASE_URL}/blog` },
            { "@type": "ListItem", "position": 3, "name": post.title, "item": `${BASE_URL}/blog/${slug}` },
          ],
        };
        const faqItems = extractFAQ(post.content || '');
        const howToSteps = extractHowToSteps(post.content || '');
        const schemas: object[] = [articleSchema, breadcrumbSchema];
        if (faqItems.length > 0) {
          schemas.push({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqItems.map(i => ({
              "@type": "Question",
              "name": i.question,
              "acceptedAnswer": { "@type": "Answer", "text": i.answer },
            })),
          });
        }
        if (howToSteps.length >= 2) {
          schemas.push({
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": post.title,
            "step": howToSteps.map((s, idx) => ({
              "@type": "HowToStep",
              "position": idx + 1,
              "name": s.name,
              "text": s.text,
            })),
          });
        }

        const meta: PageMeta = {
          title: `${post.title} | Blog IKtracker`,
          description: desc,
          ogType: 'article',
          ogImage: post.featured_image_url || LOGO,
          canonical: `${BASE_URL}/blog/${slug}`,
          jsonLd: schemas,
          content: `
            <article>
              ${post.author_name ? `<p>Par <strong>${escapeHtml(post.author_name)}</strong>${articleDate ? ` — ${articleDate.slice(0, 10)}` : ''}</p>` : ''}
              ${post.featured_image_url ? `<img src="${post.featured_image_url}" alt="${escapeHtml(post.title)}" width="800" height="450" loading="lazy">` : ''}
              ${renderedContent}
              <nav aria-label="Passez à l'action">
                <h2>Passez à l'action</h2>
                <p><a href="${BASE_URL}/bareme-ik-2026">Calculer mes indemnités kilométriques</a> (salarié, particulier) — <a href="${BASE_URL}/signup">Créer un compte gratuit</a> (commercial, libéral, profession mobile).</p>
              </nav>
            </article>`,
        };

        return new Response(buildFullHtml(meta), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          },
        });
      }
    }

    // Fallback
    const fallback: PageMeta = {
      title: 'IKtracker — Outil Gratuit de Calcul des Indemnités Kilométriques',
      description: 'Automatisez gratuitement vos indemnités kilométriques avec IKtracker.',
      canonical: `${BASE_URL}${path}`,
    };

    return new Response(buildFullHtml(fallback), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('meta-renderer error:', error);
    return new Response('Error', { status: 500, headers: corsHeaders });
  }
});
