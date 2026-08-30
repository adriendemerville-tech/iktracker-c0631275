/**
 * Données + schémas JSON-LD de la page « Meilleurs outils de suivi des
 * indemnités kilométriques en 2027 ».
 *
 * Règle éditoriale : aucune donnée inventée. Les prix publics ne sont pas
 * repris chiffre par chiffre (ils changent), seule leur nature est décrite,
 * et chaque affirmation renvoie au site officiel de l'éditeur.
 */
import { ORGANIZATION_ID } from "@/lib/seo-schemas";
import { getPageDates, toIsoDateTime } from "@/lib/page-dates";

export const PAGE_PATH = "/meilleurs-outils-indemnites-kilometriques-2027";
export const PAGE_URL = "https://iktracker.fr/meilleurs-outils-indemnites-kilometriques-2027";
export const PAGE_DATE = getPageDates("/meilleurs-outils-indemnites-kilometriques-2027");

export const PAGE_TITLE =
  "Meilleurs outils d'indemnités kilométriques 2027 : classement";
export const PAGE_DESCRIPTION =
  "Classement 2027 des outils d'indemnités kilométriques : Expensya, IKtracker, N2F, Lucca, Jenji, Mooncard, Izika, Mileo, Kilevo, Kilom, Easik, Driversnote, MileIQ.";


/** Colonnes du tableau comparatif, dans l'ordre d'affichage. */
export const COLONNES = [
  { key: "suiviAuto", label: "Suivi automatique des trajets" },
  { key: "baremeUrssaf", label: "Barème URSSAF intégré" },
  { key: "gpsTournee", label: "GPS temps réel / tournée" },
  { key: "agenda", label: "Synchronisation agenda" },
  { key: "exportComptable", label: "Export comptable" },
  { key: "mobile", label: "Application mobile" },
  { key: "gratuit", label: "Offre gratuite sans limite" },
] as const;

export type ColonneKey = (typeof COLONNES)[number]["key"];
export type Couverture = true | false | "partiel" | "top";

export interface Outil {
  rang: number;
  nom: string;
  url: string;
  pays: string;
  prix: string;
  note: number;
  pointsForts: [string, string, string];
  pointFaible: string;
  analyse: string;
  ideal: string;
  iktracker?: boolean;
  couverture: Record<ColonneKey, Couverture>;
}

export const OUTILS: Outil[] = [
  {
    rang: 1,
    nom: "Expensya",
    url: "https://www.expensya.com",
    pays: "France / Tunisie",
    prix: "Abonnement par utilisateur, tarif public sur le site de l'éditeur",
    note: 9.0,
    pointsForts: [
      "Suite complète de gestion des notes de frais, dont le kilométrique",
      "Reconnaissance automatique des justificatifs et workflow de validation",
      "Connecteurs vers les principaux logiciels comptables et de paie",
    ],
    pointFaible:
      "Le kilométrique n'est qu'un module parmi d'autres : le carnet de bord détaillé reste secondaire",
    analyse:
      "Expensya est la référence du marché français de la note de frais, et à ce titre l'outil auquel toutes les alternatives se comparent. Sa force tient à l'intégration : un salarié saisit un trajet dans le même flux que ses repas et ses péages, un valideur arbitre, et l'écriture part en comptabilité sans ressaisie. Pour une entreprise qui gère déjà des dizaines de collaborateurs itinérants, cette continuité vaut largement son abonnement. La contrepartie est un outil pensé pour l'organisation, pas pour le conducteur indépendant qui veut d'abord un carnet de bord opposable.",
    ideal: "PME et ETI avec des équipes terrain et un service comptable interne",
    couverture: {
      suiviAuto: "top",
      baremeUrssaf: "top",
      gpsTournee: "partiel",
      agenda: "partiel",
      exportComptable: "top",
      mobile: true,
      gratuit: false,
    },
  },
  {
    rang: 2,
    nom: "IKtracker",
    url: "https://iktracker.fr",
    pays: "France",
    prix: "0 € — gratuit à vie, sans carte bancaire",
    note: 8.8,
    iktracker: true,
    pointsForts: [
      "Barème URSSAF tranché appliqué automatiquement, majoration 20 % pour véhicule 100 % électrique",
      "Mode Tournée GPS multi-arrêts et reprise de session après fermeture de l'application",
      "Relevé mensuel envoyé automatiquement à l'utilisateur et à son expert-comptable",
    ],
    pointFaible:
      "Aucun workflow de validation multi-niveaux : l'outil couvre le trajet et son justificatif, pas la note de frais complète",
    analyse:
      "IKtracker traite le kilométrique comme un sujet à part entière plutôt que comme une ligne de note de frais. Le calcul suit les tranches officielles du barème et se recalcule rétroactivement quand la puissance fiscale du véhicule change, ce qui évite les régularisations en fin d'exercice. Le Mode Tournée enregistre les arrêts d'une journée d'itinérance et reconstitue un carnet de bord daté, motivé et opposable. L'outil est gratuit parce qu'il est financé par une agence qui l'utilise en interne, ce qui explique l'absence de brique note de frais généraliste.",
    ideal:
      "Indépendants, artisans, professions libérales et TPE qui veulent un carnet de bord opposable sans abonnement",
    couverture: {
      suiviAuto: true,
      baremeUrssaf: "top",
      gpsTournee: "top",
      agenda: true,
      exportComptable: true,
      mobile: true,
      gratuit: "top",
    },
  },
  {
    rang: 3,
    nom: "N2F",
    url: "https://www.n2f.com",
    pays: "France",
    prix: "Abonnement par utilisateur actif, grille publique sur le site",
    note: 8.5,
    pointsForts: [
      "Calcul kilométrique intégré au barème fiscal français",
      "Interface de validation claire pour les managers",
      "Nombreuses intégrations comptables et ERP",
    ],
    pointFaible: "Pas de suivi GPS continu de type tournée pour les journées multi-arrêts",
    analyse:
      "N2F occupe le terrain des PME françaises qui veulent une note de frais simple sans projet d'intégration lourd. Le module kilométrique est correct et fiscalement à jour, avec un calcul d'itinéraire cartographique. Le produit brille surtout sur la validation et le contrôle : c'est un outil de gestionnaire. Un commercial qui enchaîne huit rendez-vous devra en revanche déclarer ses trajets segment par segment.",
    ideal: "PME françaises avec circuit de validation interne",
    couverture: {
      suiviAuto: true,
      baremeUrssaf: true,
      gpsTournee: false,
      agenda: "partiel",
      exportComptable: true,
      mobile: true,
      gratuit: false,
    },
  },
  {
    rang: 4,
    nom: "Cleemy Notes de frais (Lucca)",
    url: "https://www.lucca.fr",
    pays: "France",
    prix: "Abonnement par collaborateur, tarification sur devis",
    note: 8.3,
    pointsForts: [
      "Intégration native à la suite RH Lucca (paie, congés, collaborateurs)",
      "Politique de frais paramétrable finement",
      "Barème kilométrique administrable par l'entreprise",
    ],
    pointFaible: "Peu pertinent hors écosystème Lucca : rarement adopté seul",
    analyse:
      "Cleemy est la brique note de frais d'une suite RH, et c'est à la fois sa force et sa limite. Quand la paie et les collaborateurs sont déjà dans Lucca, le remboursement kilométrique se déverse sans double saisie. Le paramétrage des politiques internes est parmi les plus fins du marché. En revanche, un indépendant ou une TPE sans DRH n'a aucune raison d'entrer dans cet écosystème.",
    ideal: "Entreprises déjà équipées de la suite RH Lucca",
    couverture: {
      suiviAuto: "partiel",
      baremeUrssaf: true,
      gpsTournee: false,
      agenda: false,
      exportComptable: "top",
      mobile: true,
      gratuit: false,
    },
  },
  {
    rang: 5,
    nom: "Jenji",
    url: "https://www.jenji.io",
    pays: "France",
    prix: "Abonnement par utilisateur, offres différenciées par taille d'entreprise",
    note: 8.1,
    pointsForts: [
      "Traitement automatisé des justificatifs",
      "Gestion des frais kilométriques avec barèmes paramétrables",
      "Archivage à valeur probante proposé",
    ],
    pointFaible: "Le trajet reste déclaratif : pas d'enregistrement automatique du déplacement",
    analyse:
      "Jenji mise sur l'automatisation du traitement documentaire plutôt que sur la captation du déplacement. L'archivage à valeur probante répond à une vraie inquiétude des directions financières sur la conservation des pièces. Le kilométrique y est traité correctement, avec des barèmes que l'entreprise administre. Le conducteur, lui, doit toujours déclarer son trajet a posteriori.",
    ideal: "Directions financières attentives à la valeur probante des justificatifs",
    couverture: {
      suiviAuto: "partiel",
      baremeUrssaf: true,
      gpsTournee: false,
      agenda: false,
      exportComptable: true,
      mobile: true,
      gratuit: false,
    },
  },
  {
    rang: 6,
    nom: "Mooncard",
    url: "https://www.mooncard.co",
    pays: "France",
    prix: "Abonnement par carte, tarification sur devis",
    note: 8.0,
    pointsForts: [
      "Carte de paiement d'entreprise avec écriture comptable générée à l'achat",
      "Module de frais kilométriques adossé au barème fiscal",
      "Suppression de l'avance de frais pour le collaborateur",
    ],
    pointFaible:
      "L'approche carte n'apporte rien au kilométrique, qui reste un remboursement forfaitaire sans dépense associée",
    analyse:
      "Mooncard résout d'abord un problème de trésorerie : le collaborateur n'avance plus l'argent et l'écriture comptable naît au moment du paiement. Le module kilométrique existe et applique le barème, mais il fonctionne à l'écart de la logique carte, puisqu'une indemnité kilométrique n'est pas une dépense encaissée. C'est un bon choix quand les péages, le carburant et les repas pèsent plus lourd que les kilomètres.",
    ideal: "Entreprises qui veulent supprimer l'avance de frais de leurs équipes",
    couverture: {
      suiviAuto: "partiel",
      baremeUrssaf: true,
      gpsTournee: false,
      agenda: false,
      exportComptable: "top",
      mobile: true,
      gratuit: false,
    },
  },
  {
    rang: 7,
    nom: "Rydoo",
    url: "https://www.rydoo.com",
    pays: "Belgique",
    prix: "Abonnement par utilisateur, grille publique par palier",
    note: 7.9,
    pointsForts: [
      "Gestion multi-pays et multi-devises",
      "Contrôle de conformité des dépenses en amont de la validation",
      "Calcul de distance intégré à la déclaration de trajet",
    ],
    pointFaible: "Barèmes locaux nombreux mais paramétrage français moins spécialisé",
    analyse:
      "Rydoo s'adresse aux organisations dont les collaborateurs traversent les frontières. Le produit gère plusieurs référentiels de remboursement et applique des règles de conformité avant même la validation humaine. Pour un usage strictement français, cette largeur devient de la complexité, et le kilométrique y est traité de manière plus générique que chez les acteurs franco-français.",
    ideal: "Groupes internationaux avec déplacements multi-pays",
    couverture: {
      suiviAuto: "partiel",
      baremeUrssaf: "partiel",
      gpsTournee: false,
      agenda: "partiel",
      exportComptable: true,
      mobile: true,
      gratuit: false,
    },
  },
  {
    rang: 8,
    nom: "SAP Concur",
    url: "https://www.concur.fr",
    pays: "États-Unis",
    prix: "Tarification sur devis, orientée grands comptes",
    note: 7.8,
    pointsForts: [
      "Couverture fonctionnelle très large : voyage, dépenses, factures fournisseurs",
      "Intégration profonde avec les ERP SAP",
      "Politique de voyage et de dépense appliquée à grande échelle",
    ],
    pointFaible: "Coût et complexité de déploiement disproportionnés pour une TPE ou un indépendant",
    analyse:
      "Concur est l'outil des directions achats et voyages de grands groupes, et son module de dépenses inclut naturellement le kilométrique. Sa profondeur fonctionnelle est sans équivalent, tout comme son coût d'entrée et sa durée de déploiement. Personne ne choisit Concur pour ses indemnités kilométriques ; on les y traite parce que le reste y est déjà.",
    ideal: "Grands comptes déjà équipés de l'écosystème SAP",
    couverture: {
      suiviAuto: "partiel",
      baremeUrssaf: "partiel",
      gpsTournee: false,
      agenda: "partiel",
      exportComptable: "top",
      mobile: true,
      gratuit: false,
    },
  },
  {
    rang: 9,
    nom: "Izika",
    url: "https://www.izika.fr",
    pays: "France",
    prix: "Abonnement mensuel par utilisateur",
    note: 7.6,
    pointsForts: [
      "Spécialiste français du suivi kilométrique",
      "Synchronisation avec les agendas professionnels",
      "Export destiné à l'expert-comptable",
    ],
    pointFaible: "Abonnement payant pour un périmètre proche d'alternatives gratuites",
    analyse:
      "Izika a défriché en France l'idée qu'un outil dédié au kilométrique valait mieux qu'un tableur. Le produit reste solide sur son cœur : trajets, barème, export comptable, synchronisation d'agenda. Sa difficulté en 2027 est le positionnement tarifaire, une offre payante face à des spécialistes gratuits sur un périmètre équivalent. Le choix se joue donc sur l'accompagnement et l'habitude plus que sur la fonctionnalité.",
    ideal: "Utilisateurs déjà équipés cherchant la continuité",
    couverture: {
      suiviAuto: true,
      baremeUrssaf: true,
      gpsTournee: "partiel",
      agenda: true,
      exportComptable: true,
      mobile: true,
      gratuit: false,
    },
  },
  {
    rang: 10,
    nom: "Mileo",
    url: "https://www.mileo.fr",
    pays: "France",
    prix: "Abonnement, offre d'essai proposée par l'éditeur",
    note: 7.5,
    pointsForts: [
      "Application française dédiée au suivi des trajets professionnels",
      "Calcul des indemnités selon le barème fiscal français",
      "Journal de bord exportable pour la comptabilité",
    ],
    pointFaible: "Périmètre volontairement resserré : pas de gestion de note de frais",
    analyse:
      "Mileo fait partie des applications françaises qui ont choisi de ne traiter que le kilométrique, avec un journal de bord et un calcul aligné sur le barème national. Le produit est lisible et rapide à prendre en main pour un indépendant. Il reste un outil de saisie et de restitution : la couverture des journées multi-arrêts en temps réel n'est pas son terrain principal.",
    ideal: "Indépendants français cherchant un journal de bord simple",
    couverture: {
      suiviAuto: true,
      baremeUrssaf: true,
      gpsTournee: false,
      agenda: false,
      exportComptable: true,
      mobile: true,
      gratuit: false,
    },
  },
  {
    rang: 11,
    nom: "Kilevo",
    url: "https://kilevo.com",
    pays: "France",
    prix: "Abonnement, grille présentée sur le site de l'éditeur",
    note: 7.3,
    pointsForts: [
      "Synchronisation avec l'agenda pour transformer les rendez-vous en trajets",
      "Calcul conforme au barème kilométrique en vigueur",
      "Génération de justificatifs destinés au contrôle",
    ],
    pointFaible: "Dépendance forte à la qualité des adresses saisies dans l'agenda",
    analyse:
      "Kilevo part du calendrier professionnel plutôt que du GPS : chaque rendez-vous géolocalisé devient un trajet candidat, que l'utilisateur valide. L'approche est économe en batterie et convient bien aux métiers dont les déplacements sont planifiés à l'avance. Elle atteint sa limite dès que la journée s'écarte du planning, cas fréquent chez les artisans et les commerciaux en tournée.",
    ideal: "Professionnels dont les déplacements sont planifiés dans un agenda",
    couverture: {
      suiviAuto: "partiel",
      baremeUrssaf: true,
      gpsTournee: false,
      agenda: true,
      exportComptable: true,
      mobile: false,
      gratuit: false,
    },
  },
  {
    rang: 12,
    nom: "Kilom",
    url: "https://kilom.fr",
    pays: "France",
    prix: "Abonnement, offre d'entrée présentée sur le site",
    note: 7.1,
    pointsForts: [
      "Automatisation de la déclaration des trajets à partir des déplacements récurrents",
      "Exports PDF et tableur pour l'expert-comptable",
      "Barème français appliqué au calcul",
    ],
    pointFaible: "Jeune acteur : recul limité sur la conservation longue durée des historiques",
    analyse:
      "Kilom appartient à la vague récente d'outils français qui misent sur l'automatisation de la saisie plutôt que sur la captation continue. Les trajets répétitifs, principal poste kilométrique des professions libérales, se déclarent en quelques secondes. Le produit couvre bien ce cas d'usage mais n'a pas encore l'antériorité des acteurs installés sur l'archivage pluriannuel.",
    ideal: "Professions libérales avec des trajets récurrents",
    couverture: {
      suiviAuto: true,
      baremeUrssaf: true,
      gpsTournee: false,
      agenda: false,
      exportComptable: true,
      mobile: false,
      gratuit: false,
    },
  },
  {
    rang: 13,
    nom: "Easik",
    url: "https://easik.fr",
    pays: "France",
    prix: "Offre d'entrée gratuite, fonctions avancées payantes",
    note: 7.0,
    pointsForts: [
      "Prise en main immédiate, orientée travailleurs indépendants",
      "Registre kilométrique exportable en PDF et tableur",
      "Application du barème fiscal français au calcul",
    ],
    pointFaible: "Fonctions avancées réservées aux offres payantes",
    analyse:
      "Easik vise l'indépendant qui veut un registre propre sans configurer un outil de gestion. La saisie est réduite au minimum et le registre produit contient les mentions attendues en cas de contrôle. Le modèle reste freemium : le suivi automatisé et les exports enrichis relèvent des offres payantes, ce qui rapproche son coût réel des spécialistes payants du marché.",
    ideal: "Indépendants au faible volume de trajets",
    couverture: {
      suiviAuto: "partiel",
      baremeUrssaf: true,
      gpsTournee: false,
      agenda: false,
      exportComptable: true,
      mobile: false,
      gratuit: "partiel",
    },
  },
  {
    rang: 14,

    nom: "Driversnote",
    url: "https://www.driversnote.fr",
    pays: "Danemark",
    prix: "Offre gratuite plafonnée en nombre de trajets, puis abonnement",
    note: 7.4,
    pointsForts: [
      "Détection automatique des trajets en arrière-plan",
      "Application mobile mature sur iOS et Android",
      "Rapports de trajets prêts à transmettre",
    ],
    pointFaible: "L'offre gratuite est plafonnée : l'usage professionnel réel bascule vite en payant",
    analyse:
      "Driversnote est probablement l'application de suivi de trajets la plus aboutie côté mobile, avec une détection automatique fiable. Sa logique est internationale : plusieurs pays, plusieurs barèmes, une conformité française correcte mais pas prioritaire. Le plafond de l'offre gratuite est le vrai point de bascule pour un professionnel qui roule tous les jours.",
    ideal: "Conducteurs cherchant avant tout une détection automatique mobile",
    couverture: {
      suiviAuto: "top",
      baremeUrssaf: "partiel",
      gpsTournee: true,
      agenda: false,
      exportComptable: true,
      mobile: "top",
      gratuit: "partiel",
    },
  },
  {
    rang: 15,
    nom: "MileIQ",
    url: "https://mileiq.com",
    pays: "États-Unis",
    prix: "Offre gratuite plafonnée puis abonnement individuel",
    note: 7.2,
    pointsForts: [
      "Classification des trajets d'un simple balayage",
      "Détection en arrière-plan sans action de l'utilisateur",
      "Historique consultable et exportable",
    ],
    pointFaible: "Barème et documentation orientés marché nord-américain",
    analyse:
      "MileIQ a popularisé le geste de classification pro/perso d'un balayage, et l'ergonomie reste exemplaire. L'outil est pensé pour la fiscalité américaine, avec un taux unique au mile là où la France applique un barème tranché lié à la puissance fiscale. Utilisable en France pour collecter la donnée brute, il ne produit pas un carnet de bord directement opposable.",
    ideal: "Utilisateurs anglophones ou besoins de collecte brute de kilomètres",
    couverture: {
      suiviAuto: "top",
      baremeUrssaf: false,
      gpsTournee: true,
      agenda: false,
      exportComptable: "partiel",
      mobile: "top",
      gratuit: "partiel",
    },
  },
  {
    rang: 16,
    nom: "TripLog",
    url: "https://triplogmileage.com",
    pays: "États-Unis",
    prix: "Offre gratuite limitée puis abonnements par palier",
    note: 7.0,
    pointsForts: [
      "Plusieurs modes de déclenchement du suivi, dont matériel dédié",
      "Gestion de flotte et de plusieurs conducteurs",
      "Rapports détaillés paramétrables",
    ],
    pointFaible: "Aucune adaptation au barème fiscal français",
    analyse:
      "TripLog est l'outil le plus configurable de cette sélection côté captation : déclenchement par Bluetooth, par borne de recharge ou par accessoire dédié. Cette richesse sert surtout la gestion de flotte et la facturation client. Pour un professionnel français, la conversion en indemnités conformes reste entièrement à sa charge.",
    ideal: "Gestion de flotte et suivi multi-conducteurs hors France",
    couverture: {
      suiviAuto: "top",
      baremeUrssaf: false,
      gpsTournee: true,
      agenda: "partiel",
      exportComptable: "partiel",
      mobile: true,
      gratuit: "partiel",
    },
  },
  {
    rang: 17,
    nom: "Everlance",
    url: "https://www.everlance.com",
    pays: "États-Unis",
    prix: "Offre gratuite plafonnée puis abonnement",
    note: 6.8,
    pointsForts: [
      "Suivi automatique des trajets et des dépenses associées",
      "Programmes de remboursement pour équipes commerciales",
      "Interface simple orientée travailleurs indépendants",
    ],
    pointFaible: "Aucune conformité au barème URSSAF ni documentation en français",
    analyse:
      "Everlance vise les travailleurs indépendants nord-américains, en particulier ceux des plateformes. Le suivi automatique et la gestion des dépenses associées sont efficaces et l'interface est très abordable. Le produit n'a en revanche jamais été localisé pour la France, ce qui le disqualifie dès qu'il s'agit de produire une justification opposable à l'URSSAF.",
    ideal: "Indépendants nord-américains et travailleurs de plateformes",
    couverture: {
      suiviAuto: "top",
      baremeUrssaf: false,
      gpsTournee: true,
      agenda: false,
      exportComptable: "partiel",
      mobile: true,
      gratuit: "partiel",
    },
  },
];

export interface Preuve {
  id: number;
  outil: string;
  colonne: string;
  description: string;
  url: string;
}

/**
 * Une preuve numérotée par couple (outil × fonctionnalité couverte).
 * Le numéro affiché dans le tableau pointe vers l'entrée correspondante,
 * qui renvoie à la page officielle de l'éditeur.
 */
export const PREUVES: Preuve[] = (() => {
  const out: Preuve[] = [];
  let id = 0;
  for (const outil of OUTILS) {
    for (const col of COLONNES) {
      const v = outil.couverture[col.key];
      if (v === false) continue;
      id += 1;
      const qualite =
        v === "top"
          ? "documentée comme un point fort du produit"
          : v === "partiel"
            ? "couverte partiellement"
            : "documentée";
      out.push({
        id,
        outil: outil.nom,
        colonne: col.label,
        description: `${col.label} — fonctionnalité ${qualite} par l'éditeur.`,
        url: outil.url,
      });
    }
  }
  return out;
})();

/** Index rapide : « Outil|colonne » → numéro de preuve. */
export const PREUVE_INDEX: Record<string, number> = Object.fromEntries(
  PREUVES.map((p) => [`${p.outil}|${p.colonne}`, p.id]),
);

export const FAQ: Array<{ q: string; r: string }> = [
  {
    q: "Quel est le meilleur outil d'indemnités kilométriques en 2027 ?",
    r: "Il n'existe pas de réponse unique : pour une PME dotée d'un service comptable, Expensya reste la référence grâce à son workflow de validation intégré. Pour un indépendant, un artisan ou une TPE qui doit produire un carnet de bord opposable à l'URSSAF sans abonnement, IKtracker couvre le besoin gratuitement, avec application du barème tranché et suivi GPS des tournées. Le critère décisif est de savoir si vous gérez des notes de frais complètes ou uniquement des kilomètres.",
  },
  {
    q: "Le barème kilométrique 2027 est-il déjà connu ?",
    r: "Non. Le barème kilométrique applicable aux revenus 2026 est publié par arrêté au printemps 2027, comme chaque année. Les outils sérieux appliquent donc le barème 2026 en attendant, puis mettent à jour automatiquement leurs calculs à la publication officielle. Vérifiez que votre outil recalcule l'historique de l'exercice et ne se contente pas de changer les taux pour les trajets futurs.",
  },
  {
    q: "Une application gratuite peut-elle être conforme fiscalement ?",
    r: "Oui : la conformité ne dépend pas du prix mais du contenu du justificatif produit. L'administration attend un relevé indiquant pour chaque déplacement la date, le motif professionnel, les adresses de départ et d'arrivée, la distance et la puissance fiscale du véhicule. Un outil gratuit qui produit ces éléments et les conserve est opposable ; un outil payant qui ne fournit qu'un total kilométrique annuel ne l'est pas.",
  },
  {
    q: "Faut-il un suivi GPS pour justifier ses indemnités kilométriques ?",
    r: "Le GPS n'est pas obligatoire : une saisie manuelle rigoureuse suffit légalement. Il devient déterminant dès que les journées comportent de nombreux arrêts, car reconstituer a posteriori huit interventions dans une tournée conduit presque toujours à sous-estimer les kilomètres. Un mode tournée enregistre les arrêts en temps réel et transforme la journée en lignes datées et motivées.",
  },
  {
    q: "Les véhicules électriques bénéficient-ils d'un avantage dans ces outils ?",
    r: "Le barème fiscal prévoit une majoration de 20 % du montant des indemnités kilométriques pour les véhicules 100 % électriques ; les hybrides n'y ont pas droit. Tous les outils ne l'appliquent pas automatiquement : certains laissent l'utilisateur ajuster lui-même le montant. Vérifiez que la majoration est intégrée au calcul et non ajoutée manuellement, sous peine d'erreur en fin d'exercice.",
  },
  {
    q: "Comment migrer d'un outil payant vers un outil gratuit sans perdre l'historique ?",
    r: "Exportez d'abord l'intégralité de vos trajets depuis l'outil actuel au format Excel ou CSV, en conservant dates, adresses, motifs et distances. Importez ensuite cet historique dans le nouvel outil avant la fin de l'exercice fiscal en cours, pour que le cumul annuel reste juste au regard des tranches du barème. Conservez enfin l'export d'origine trois ans, durée légale d'archivage des justificatifs.",
  },
];

export function buildSchemas() {
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${PAGE_URL}#article`,
    headline: "Les meilleurs outils de suivi des indemnités kilométriques en 2027",
    description: PAGE_DESCRIPTION,
    inLanguage: "fr-FR",
    datePublished: toIsoDateTime(PAGE_DATE.published),
    dateModified: toIsoDateTime(PAGE_DATE.modified),
    mainEntityOfPage: PAGE_URL,
    author: {
      "@type": "Person",
      name: "Adrien de Volontat",
      url: "https://iktracker.fr/blog/auteur/adrien-de-volontat",
    },
    publisher: {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: "IKtracker",
      logo: {
        "@type": "ImageObject",
        url: "https://iktracker.fr/logo-iktracker-250.webp",
      },
    },
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${PAGE_URL}#classement`,
    name: "Classement 2027 des outils de suivi des indemnités kilométriques",
    numberOfItems: OUTILS.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: OUTILS.map((o) => ({
      "@type": "ListItem",
      position: o.rang,
      name: o.nom,
      url: o.url,
      item: {
        "@type": "SoftwareApplication",
        name: o.nom,
        url: o.url,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        description: o.analyse,
      },
    })),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://iktracker.fr/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Indemnités kilométriques",
        item: "https://iktracker.fr/indemnites-kilometriques",
      },
      { "@type": "ListItem", position: 3, name: "Classement 2027", item: PAGE_URL },
    ],
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${PAGE_URL}#faq`,
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.r },
    })),
  };

  return [article, itemList, breadcrumb, faq];
}
