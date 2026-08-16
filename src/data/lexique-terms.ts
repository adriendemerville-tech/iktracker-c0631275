export interface Term {
  term: string;
  definition: string;
  category: "acronyme" | "fiscalité" | "acteur" | "norme" | "concept";
}

// Generate URL-friendly slug from term name
export function termToSlug(term: string): string {
  return term
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const lexiqueTerms: Term[] = [
  // Acronymes
  {
    term: "IK",
    definition:
      "Indemnités Kilométriques. Compensation financière versée pour l'utilisation d'un véhicule personnel à des fins professionnelles. Le montant est calculé selon un barème officiel publié chaque année par l'administration fiscale.",
    category: "acronyme",
  },
  {
    term: "URSSAF",
    definition:
      "Union de Recouvrement des cotisations de Sécurité Sociale et d'Allocations Familiales. Organisme chargé de collecter les cotisations sociales des travailleurs indépendants et des employeurs en France.",
    category: "acronyme",
  },
  {
    term: "BNC",
    definition:
      "Bénéfices Non Commerciaux. Catégorie fiscale des revenus tirés d'activités libérales (médecins, avocats, consultants). Les frais kilométriques peuvent être déduits des BNC.",
    category: "acronyme",
  },
  {
    term: "BIC",
    definition:
      "Bénéfices Industriels et Commerciaux. Catégorie fiscale des revenus des artisans, commerçants et certains prestataires de services. Les déplacements professionnels sont déductibles.",
    category: "acronyme",
  },
  {
    term: "TVA",
    definition:
      "Taxe sur la Valeur Ajoutée. Impôt indirect sur la consommation. Les indemnités kilométriques ne sont pas soumises à la TVA car elles constituent un remboursement de frais.",
    category: "acronyme",
  },
  {
    term: "CFE",
    definition:
      "Cotisation Foncière des Entreprises. Impôt local dû par les indépendants et professions libérales, basé sur la valeur locative des biens utilisés pour l'activité.",
    category: "acronyme",
  },
  {
    term: "CPAM",
    definition:
      "Caisse Primaire d'Assurance Maladie. Organisme de sécurité sociale qui rembourse les soins de santé. Les infirmiers libéraux effectuent des déplacements remboursés par la CPAM.",
    category: "acronyme",
  },
  {
    term: "IDEL",
    definition:
      "Infirmier Diplômé d'État Libéral. Professionnel de santé exerçant en libéral, effectuant des visites à domicile et pouvant déduire ses frais kilométriques.",
    category: "acronyme",
  },
  {
    term: "AGA",
    definition:
      "Association de Gestion Agréée. Organisme qui accompagne les indépendants dans leur comptabilité et offre des avantages fiscaux en contrepartie d'une adhésion.",
    category: "acronyme",
  },
  {
    term: "CV fiscal",
    definition:
      "Chevaux fiscaux. Unité de mesure de la puissance administrative d'un véhicule, utilisée pour calculer le barème kilométrique applicable. Plus le CV fiscal est élevé, plus l'indemnité par kilomètre est importante.",
    category: "acronyme",
  },

  // Fiscalité
  {
    term: "Barème kilométrique",
    definition:
      "Grille officielle publiée annuellement par l'administration fiscale française définissant le montant des indemnités kilométriques selon la puissance fiscale du véhicule et le nombre de kilomètres parcourus. Le barème 2026 reprend les valeurs de 2025.",
    category: "fiscalité",
  },
  {
    term: "Frais réels",
    definition:
      "Méthode de déduction fiscale permettant de déclarer les dépenses professionnelles effectives (carburant, entretien, assurance, péages) au lieu de l'abattement forfaitaire de 10%. Recommandée pour les professionnels parcourant plus de 5 000 km/an.",
    category: "fiscalité",
  },
  {
    term: "Abattement forfaitaire 10%",
    definition:
      "Déduction automatique de 10% appliquée sur les revenus pour couvrir les frais professionnels. Alternative aux frais réels, avantageuse pour ceux ayant peu de déplacements professionnels.",
    category: "fiscalité",
  },
  {
    term: "Déduction fiscale",
    definition:
      "Montant soustrait du revenu imposable pour réduire l'impôt à payer. Les indemnités kilométriques constituent une déduction fiscale légitime pour les travailleurs indépendants.",
    category: "fiscalité",
  },
  {
    term: "Justificatif fiscal",
    definition:
      "Document prouvant la réalité d'une dépense professionnelle. Pour les IK : carnet de bord, agenda de rendez-vous, factures de carburant. Conservation obligatoire pendant 6 ans.",
    category: "fiscalité",
  },
  {
    term: "Déclaration 2035",
    definition:
      "Formulaire fiscal utilisé par les professions libérales en BNC pour déclarer leurs revenus et charges, incluant les frais kilométriques professionnels.",
    category: "fiscalité",
  },
  {
    term: "Liasse fiscale",
    definition:
      "Ensemble des documents comptables et fiscaux à transmettre à l'administration. Inclut le détail des frais de déplacement pour les indépendants.",
    category: "fiscalité",
  },
  {
    term: "Micro-BNC",
    definition:
      "Régime fiscal simplifié pour les professions libérales avec un chiffre d'affaires inférieur à 77 700€. Abattement forfaitaire de 34% incluant tous les frais, y compris les déplacements.",
    category: "fiscalité",
  },
  {
    term: "Régime réel",
    definition:
      "Régime fiscal permettant de déduire les charges réelles de l'activité, dont les frais kilométriques calculés selon le barème officiel.",
    category: "fiscalité",
  },
  {
    term: "Majoration véhicule électrique",
    definition:
      "Bonus de 20% appliqué au barème kilométrique pour les véhicules 100% électriques, encourageant la transition écologique des professionnels.",
    category: "fiscalité",
  },

  // Acteurs
  {
    term: "Expert-comptable",
    definition:
      "Professionnel du chiffre habilité à tenir la comptabilité des indépendants et à établir leurs déclarations fiscales, incluant le calcul des indemnités kilométriques.",
    category: "acteur",
  },
  {
    term: "Administration fiscale",
    definition:
      "Direction Générale des Finances Publiques (DGFiP). Organisme étatique qui publie le barème kilométrique officiel et contrôle les déclarations des contribuables.",
    category: "acteur",
  },
  {
    term: "Ordre professionnel",
    definition:
      "Instance réglementant une profession libérale (Ordre des médecins, des infirmiers, des avocats). Peut émettre des recommandations sur la facturation des déplacements.",
    category: "acteur",
  },
  {
    term: "Profession libérale",
    definition:
      "Activité exercée de manière indépendante, requérant une qualification professionnelle (médecin, avocat, architecte, infirmier). Les frais de déplacement sont une charge importante.",
    category: "acteur",
  },
  {
    term: "Travailleur indépendant",
    definition:
      "Personne exerçant une activité professionnelle à son compte, sans lien de subordination. Inclut les artisans, commerçants, consultants et professions libérales.",
    category: "acteur",
  },
  {
    term: "Auto-entrepreneur",
    definition:
      "Statut simplifié de micro-entreprise avec un régime fiscal et social allégé. Les frais kilométriques sont inclus dans l'abattement forfaitaire et ne peuvent pas être déduits séparément.",
    category: "acteur",
  },
  {
    term: "Artisan",
    definition:
      "Professionnel exerçant un métier manuel de manière indépendante (plombier, électricien, maçon). Les déplacements sur chantiers génèrent d'importants frais kilométriques déductibles.",
    category: "acteur",
  },
  {
    term: "Consultant",
    definition:
      "Expert indépendant intervenant en mission chez des clients. Les déplacements professionnels représentent souvent une part significative des charges déductibles.",
    category: "acteur",
  },

  // Normes et concepts
  {
    term: "Trajet domicile-travail",
    definition:
      "Déplacement entre le lieu de résidence et le lieu d'exercice professionnel. Déductible sous conditions pour les indépendants, limité à 80 km aller-retour pour les salariés.",
    category: "norme",
  },
  {
    term: "Déplacement professionnel",
    definition:
      "Tout trajet effectué dans le cadre de l'activité professionnelle : visites clients, interventions, réunions. Intégralement déductible selon le barème kilométrique.",
    category: "norme",
  },
  {
    term: "Carnet de bord",
    definition:
      "Document de suivi des déplacements professionnels mentionnant date, motif, destination et kilométrage. Preuve essentielle en cas de contrôle fiscal.",
    category: "norme",
  },
  {
    term: "Aller-retour",
    definition:
      "Trajet comprenant le déplacement vers une destination et le retour au point de départ. Le kilométrage total (aller + retour) est pris en compte pour le calcul des IK.",
    category: "norme",
  },
  {
    term: "Tournée",
    definition:
      "Série de visites ou interventions enchaînées sur une journée (infirmiers, commerciaux, artisans). Le kilométrage total de la tournée est déductible.",
    category: "norme",
  },
  {
    term: "Véhicule de service",
    definition:
      "Véhicule appartenant à l'entreprise et mis à disposition du professionnel. Les frais sont directement pris en charge, sans application du barème kilométrique.",
    category: "norme",
  },
  {
    term: "Véhicule personnel",
    definition:
      "Véhicule appartenant au professionnel et utilisé pour son activité. L'utilisation professionnelle donne droit aux indemnités kilométriques selon le barème.",
    category: "norme",
  },
  {
    term: "Puissance fiscale",
    definition:
      "Mesure administrative de la puissance d'un véhicule exprimée en chevaux fiscaux (CV). Détermine la tranche du barème kilométrique applicable. Indiquée sur la carte grise.",
    category: "norme",
  },
  {
    term: "Carte grise",
    definition:
      "Certificat d'immatriculation du véhicule mentionnant sa puissance fiscale (rubrique P.6). Document indispensable pour justifier le barème kilométrique appliqué.",
    category: "norme",
  },
  {
    term: "Amortissement véhicule",
    definition:
      "Dépréciation comptable du véhicule étalée sur plusieurs années. Le barème kilométrique inclut l'amortissement, évitant une double déduction.",
    category: "concept",
  },
  {
    term: "Frais de carburant",
    definition:
      "Dépenses d'essence ou diesel pour les déplacements. Inclus dans le barème kilométrique. Ne peuvent pas être déduits en plus des IK.",
    category: "concept",
  },
  {
    term: "Assurance auto",
    definition:
      "Couverture obligatoire du véhicule. La part professionnelle est incluse dans le barème kilométrique. Certains contrats proposent des garanties spécifiques pour l'usage professionnel.",
    category: "concept",
  },
  {
    term: "Entretien véhicule",
    definition:
      "Réparations, révisions et maintenance du véhicule. Coûts inclus dans le barème kilométrique officiel, ne peuvent pas être déduits séparément.",
    category: "concept",
  },
  {
    term: "Péages autoroutiers",
    definition:
      "Frais de passage sur les autoroutes à péage. Déductibles EN PLUS du barème kilométrique car non inclus dans celui-ci. Conserver les justificatifs.",
    category: "concept",
  },
  {
    term: "Stationnement",
    definition:
      "Frais de parking liés à l'activité professionnelle. Déductibles en supplément du barème kilométrique. Justificatifs à conserver.",
    category: "concept",
  },
];

export const categoryLabels: Record<Term["category"], string> = {
  acronyme: "Acronyme",
  fiscalité: "Fiscalité",
  acteur: "Acteur",
  norme: "Norme",
  concept: "Concept",
};

export const categoryColors: Record<Term["category"], string> = {
  acronyme: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  fiscalité: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  acteur: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  norme: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  concept: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
};
