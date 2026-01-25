import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Search, Share2, Download, FileText, Link2, Star } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { toast } from 'sonner';
import { htmlToPdfBlob } from '@/lib/pdf-utils';
import { supabase } from '@/integrations/supabase/client';

interface Term {
  term: string;
  definition: string;
  category: 'acronyme' | 'fiscalité' | 'acteur' | 'norme' | 'concept';
}

// Generate URL-friendly slug from term name
function termToSlug(term: string): string {
  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const lexiqueTerms: Term[] = [
  // Acronymes
  {
    term: "IK",
    definition: "Indemnités Kilométriques. Compensation financière versée pour l'utilisation d'un véhicule personnel à des fins professionnelles. Le montant est calculé selon un barème officiel publié chaque année par l'administration fiscale.",
    category: "acronyme"
  },
  {
    term: "URSSAF",
    definition: "Union de Recouvrement des cotisations de Sécurité Sociale et d'Allocations Familiales. Organisme chargé de collecter les cotisations sociales des travailleurs indépendants et des employeurs en France.",
    category: "acronyme"
  },
  {
    term: "BNC",
    definition: "Bénéfices Non Commerciaux. Catégorie fiscale des revenus tirés d'activités libérales (médecins, avocats, consultants). Les frais kilométriques peuvent être déduits des BNC.",
    category: "acronyme"
  },
  {
    term: "BIC",
    definition: "Bénéfices Industriels et Commerciaux. Catégorie fiscale des revenus des artisans, commerçants et certains prestataires de services. Les déplacements professionnels sont déductibles.",
    category: "acronyme"
  },
  {
    term: "TVA",
    definition: "Taxe sur la Valeur Ajoutée. Impôt indirect sur la consommation. Les indemnités kilométriques ne sont pas soumises à la TVA car elles constituent un remboursement de frais.",
    category: "acronyme"
  },
  {
    term: "CFE",
    definition: "Cotisation Foncière des Entreprises. Impôt local dû par les indépendants et professions libérales, basé sur la valeur locative des biens utilisés pour l'activité.",
    category: "acronyme"
  },
  {
    term: "CPAM",
    definition: "Caisse Primaire d'Assurance Maladie. Organisme de sécurité sociale qui rembourse les soins de santé. Les infirmiers libéraux effectuent des déplacements remboursés par la CPAM.",
    category: "acronyme"
  },
  {
    term: "IDEL",
    definition: "Infirmier Diplômé d'État Libéral. Professionnel de santé exerçant en libéral, effectuant des visites à domicile et pouvant déduire ses frais kilométriques.",
    category: "acronyme"
  },
  {
    term: "AGA",
    definition: "Association de Gestion Agréée. Organisme qui accompagne les indépendants dans leur comptabilité et offre des avantages fiscaux en contrepartie d'une adhésion.",
    category: "acronyme"
  },
  {
    term: "CV fiscal",
    definition: "Chevaux fiscaux. Unité de mesure de la puissance administrative d'un véhicule, utilisée pour calculer le barème kilométrique applicable. Plus le CV fiscal est élevé, plus l'indemnité par kilomètre est importante.",
    category: "acronyme"
  },
  
  // Fiscalité
  {
    term: "Barème kilométrique",
    definition: "Grille officielle publiée annuellement par l'administration fiscale française définissant le montant des indemnités kilométriques selon la puissance fiscale du véhicule et le nombre de kilomètres parcourus. Le barème 2026 reprend les valeurs de 2025.",
    category: "fiscalité"
  },
  {
    term: "Frais réels",
    definition: "Méthode de déduction fiscale permettant de déclarer les dépenses professionnelles effectives (carburant, entretien, assurance, péages) au lieu de l'abattement forfaitaire de 10%. Recommandée pour les professionnels parcourant plus de 5 000 km/an.",
    category: "fiscalité"
  },
  {
    term: "Abattement forfaitaire 10%",
    definition: "Déduction automatique de 10% appliquée sur les revenus pour couvrir les frais professionnels. Alternative aux frais réels, avantageuse pour ceux ayant peu de déplacements professionnels.",
    category: "fiscalité"
  },
  {
    term: "Déduction fiscale",
    definition: "Montant soustrait du revenu imposable pour réduire l'impôt à payer. Les indemnités kilométriques constituent une déduction fiscale légitime pour les travailleurs indépendants.",
    category: "fiscalité"
  },
  {
    term: "Justificatif fiscal",
    definition: "Document prouvant la réalité d'une dépense professionnelle. Pour les IK : carnet de bord, agenda de rendez-vous, factures de carburant. Conservation obligatoire pendant 6 ans.",
    category: "fiscalité"
  },
  {
    term: "Déclaration 2035",
    definition: "Formulaire fiscal utilisé par les professions libérales en BNC pour déclarer leurs revenus et charges, incluant les frais kilométriques professionnels.",
    category: "fiscalité"
  },
  {
    term: "Liasse fiscale",
    definition: "Ensemble des documents comptables et fiscaux à transmettre à l'administration. Inclut le détail des frais de déplacement pour les indépendants.",
    category: "fiscalité"
  },
  {
    term: "Micro-BNC",
    definition: "Régime fiscal simplifié pour les professions libérales avec un chiffre d'affaires inférieur à 77 700€. Abattement forfaitaire de 34% incluant tous les frais, y compris les déplacements.",
    category: "fiscalité"
  },
  {
    term: "Régime réel",
    definition: "Régime fiscal permettant de déduire les charges réelles de l'activité, dont les frais kilométriques calculés selon le barème officiel.",
    category: "fiscalité"
  },
  {
    term: "Majoration véhicule électrique",
    definition: "Bonus de 20% appliqué au barème kilométrique pour les véhicules 100% électriques, encourageant la transition écologique des professionnels.",
    category: "fiscalité"
  },
  
  // Acteurs
  {
    term: "Expert-comptable",
    definition: "Professionnel du chiffre habilité à tenir la comptabilité des indépendants et à établir leurs déclarations fiscales, incluant le calcul des indemnités kilométriques.",
    category: "acteur"
  },
  {
    term: "Administration fiscale",
    definition: "Direction Générale des Finances Publiques (DGFiP). Organisme étatique qui publie le barème kilométrique officiel et contrôle les déclarations des contribuables.",
    category: "acteur"
  },
  {
    term: "Ordre professionnel",
    definition: "Instance réglementant une profession libérale (Ordre des médecins, des infirmiers, des avocats). Peut émettre des recommandations sur la facturation des déplacements.",
    category: "acteur"
  },
  {
    term: "Profession libérale",
    definition: "Activité exercée de manière indépendante, requérant une qualification professionnelle (médecin, avocat, architecte, infirmier). Les frais de déplacement sont une charge importante.",
    category: "acteur"
  },
  {
    term: "Travailleur indépendant",
    definition: "Personne exerçant une activité professionnelle à son compte, sans lien de subordination. Inclut les artisans, commerçants, consultants et professions libérales.",
    category: "acteur"
  },
  {
    term: "Auto-entrepreneur",
    definition: "Statut simplifié de micro-entreprise avec un régime fiscal et social allégé. Les frais kilométriques sont inclus dans l'abattement forfaitaire et ne peuvent pas être déduits séparément.",
    category: "acteur"
  },
  {
    term: "Artisan",
    definition: "Professionnel exerçant un métier manuel de manière indépendante (plombier, électricien, maçon). Les déplacements sur chantiers génèrent d'importants frais kilométriques déductibles.",
    category: "acteur"
  },
  {
    term: "Consultant",
    definition: "Expert indépendant intervenant en mission chez des clients. Les déplacements professionnels représentent souvent une part significative des charges déductibles.",
    category: "acteur"
  },
  
  // Normes et concepts
  {
    term: "Trajet domicile-travail",
    definition: "Déplacement entre le lieu de résidence et le lieu d'exercice professionnel. Déductible sous conditions pour les indépendants, limité à 80 km aller-retour pour les salariés.",
    category: "norme"
  },
  {
    term: "Déplacement professionnel",
    definition: "Tout trajet effectué dans le cadre de l'activité professionnelle : visites clients, interventions, réunions. Intégralement déductible selon le barème kilométrique.",
    category: "norme"
  },
  {
    term: "Carnet de bord",
    definition: "Document de suivi des déplacements professionnels mentionnant date, motif, destination et kilométrage. Preuve essentielle en cas de contrôle fiscal.",
    category: "norme"
  },
  {
    term: "Aller-retour",
    definition: "Trajet comprenant le déplacement vers une destination et le retour au point de départ. Le kilométrage total (aller + retour) est pris en compte pour le calcul des IK.",
    category: "norme"
  },
  {
    term: "Tournée",
    definition: "Série de visites ou interventions enchaînées sur une journée (infirmiers, commerciaux, artisans). Le kilométrage total de la tournée est déductible.",
    category: "norme"
  },
  {
    term: "Véhicule de service",
    definition: "Véhicule appartenant à l'entreprise et mis à disposition du professionnel. Les frais sont directement pris en charge, sans application du barème kilométrique.",
    category: "norme"
  },
  {
    term: "Véhicule personnel",
    definition: "Véhicule appartenant au professionnel et utilisé pour son activité. L'utilisation professionnelle donne droit aux indemnités kilométriques selon le barème.",
    category: "norme"
  },
  {
    term: "Puissance fiscale",
    definition: "Mesure administrative de la puissance d'un véhicule exprimée en chevaux fiscaux (CV). Détermine la tranche du barème kilométrique applicable. Indiquée sur la carte grise.",
    category: "norme"
  },
  {
    term: "Carte grise",
    definition: "Certificat d'immatriculation du véhicule mentionnant sa puissance fiscale (rubrique P.6). Document indispensable pour justifier le barème kilométrique appliqué.",
    category: "norme"
  },
  {
    term: "Amortissement véhicule",
    definition: "Dépréciation comptable du véhicule étalée sur plusieurs années. Le barème kilométrique inclut l'amortissement, évitant une double déduction.",
    category: "concept"
  },
  {
    term: "Frais de carburant",
    definition: "Dépenses d'essence ou diesel pour les déplacements. Inclus dans le barème kilométrique. Ne peuvent pas être déduits en plus des IK.",
    category: "concept"
  },
  {
    term: "Assurance auto",
    definition: "Couverture obligatoire du véhicule. La part professionnelle est incluse dans le barème kilométrique. Certains contrats proposent des garanties spécifiques pour l'usage professionnel.",
    category: "concept"
  },
  {
    term: "Entretien véhicule",
    definition: "Réparations, révisions et maintenance du véhicule. Coûts inclus dans le barème kilométrique officiel, ne peuvent pas être déduits séparément.",
    category: "concept"
  },
  {
    term: "Péages autoroutiers",
    definition: "Frais de passage sur les autoroutes à péage. Déductibles EN PLUS du barème kilométrique car non inclus dans celui-ci. Conserver les justificatifs.",
    category: "concept"
  },
  {
    term: "Stationnement",
    definition: "Frais de parking liés à l'activité professionnelle. Déductibles en supplément du barème kilométrique. Justificatifs à conserver.",
    category: "concept"
  }
];

const categoryLabels: Record<Term['category'], string> = {
  acronyme: "Acronyme",
  fiscalité: "Fiscalité",
  acteur: "Acteur",
  norme: "Norme",
  concept: "Concept"
};

const categoryColors: Record<Term['category'], string> = {
  acronyme: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  fiscalité: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  acteur: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  norme: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  concept: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300"
};

export default function Lexique() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Term['category'] | 'all'>('all');
  const [isDownloading, setIsDownloading] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const location = useLocation();

  // Get current user and load their favorites
  useEffect(() => {
    const loadUserAndFavorites = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Load favorites from localStorage with user-specific key
        const storageKey = `lexique_favorites_${user.id}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try {
            setFavorites(new Set(JSON.parse(saved)));
          } catch {
            // Invalid JSON, reset
            localStorage.removeItem(storageKey);
          }
        }
      } else {
        setUserId(null);
        setFavorites(new Set());
      }
    };

    loadUserAndFavorites();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        const storageKey = `lexique_favorites_${session.user.id}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try {
            setFavorites(new Set(JSON.parse(saved)));
          } catch {
            localStorage.removeItem(storageKey);
          }
        }
      } else {
        setUserId(null);
        setFavorites(new Set());
        setShowFavoritesOnly(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback((termSlug: string) => {
    if (!userId) {
      toast.error('Connectez-vous pour sauvegarder des favoris');
      return;
    }

    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(termSlug)) {
        newFavorites.delete(termSlug);
        toast.success('Retiré des favoris');
      } else {
        newFavorites.add(termSlug);
        toast.success('Ajouté aux favoris');
      }
      
      // Save to localStorage
      const storageKey = `lexique_favorites_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify([...newFavorites]));
      
      return newFavorites;
    });
  }, [userId]);

  // Scroll to anchor on page load or hash change
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight effect
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 2000);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.hash]);

  // Copy term link to clipboard
  const handleCopyTermLink = useCallback(async (term: string) => {
    const slug = termToSlug(term);
    const url = `https://iktracker.fr/lexique#${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Lien copié : ${term}`);
    } catch {
      toast.error('Impossible de copier le lien');
    }
  }, []);

  // Build a map of term names to their slugs for linking
  const termLinkMap = useMemo(() => {
    const map = new Map<string, string>();
    lexiqueTerms.forEach(t => {
      map.set(t.term.toLowerCase(), termToSlug(t.term));
      // Also add common variations
      if (t.term === "IK") {
        map.set("indemnités kilométriques", termToSlug(t.term));
        map.set("indemnité kilométrique", termToSlug(t.term));
      }
      if (t.term === "CV fiscal") {
        map.set("chevaux fiscaux", termToSlug(t.term));
        map.set("puissance fiscale", termToSlug("Puissance fiscale"));
      }
    });
    return map;
  }, []);

  // Render definition with internal links to other terms
  const renderDefinitionWithLinks = useCallback((definition: string, currentTerm: string) => {
    // Sort terms by length (longest first) to avoid partial matches
    const sortedTerms = Array.from(termLinkMap.keys()).sort((a, b) => b.length - a.length);
    
    // Create regex pattern for all terms (case insensitive)
    const pattern = new RegExp(
      `\\b(${sortedTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
      'gi'
    );

    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    // Reset regex
    pattern.lastIndex = 0;

    while ((match = pattern.exec(definition)) !== null) {
      const matchedText = match[0];
      const matchedLower = matchedText.toLowerCase();
      const slug = termLinkMap.get(matchedLower);
      
      // Don't link to self
      if (slug === termToSlug(currentTerm)) {
        continue;
      }

      // Add text before match
      if (match.index > lastIndex) {
        parts.push(definition.slice(lastIndex, match.index));
      }

      // Add linked term
      if (slug) {
        parts.push(
          <a
            key={`${match.index}-${slug}`}
            href={`#${slug}`}
            className="text-primary hover:underline font-medium"
            onClick={(e) => {
              e.preventDefault();
              const element = document.getElementById(slug);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                setTimeout(() => {
                  element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
                }, 2000);
                // Update URL hash without scrolling
                window.history.pushState(null, '', `#${slug}`);
              }
            }}
          >
            {matchedText}
          </a>
        );
      } else {
        parts.push(matchedText);
      }

      lastIndex = match.index + matchedText.length;
    }

    // Add remaining text
    if (lastIndex < definition.length) {
      parts.push(definition.slice(lastIndex));
    }

    return parts.length > 0 ? parts : definition;
  }, [termLinkMap]);

  // Generate PDF with IKtracker branding
  const handleDownloadPdf = useCallback(async () => {
    setIsDownloading(true);
    toast.loading('Génération du PDF...', { id: 'pdf-download' });

    try {
      const groupedTerms = {
        acronyme: lexiqueTerms.filter(t => t.category === 'acronyme'),
        fiscalité: lexiqueTerms.filter(t => t.category === 'fiscalité'),
        acteur: lexiqueTerms.filter(t => t.category === 'acteur'),
        norme: lexiqueTerms.filter(t => t.category === 'norme'),
        concept: lexiqueTerms.filter(t => t.category === 'concept'),
      };

      const categoryTitles: Record<string, string> = {
        acronyme: 'Acronymes',
        fiscalité: 'Fiscalité',
        acteur: 'Acteurs',
        norme: 'Normes',
        concept: 'Concepts',
      };

      const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Lexique des Indemnités Kilométriques - IKtracker</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #1a1a1a;
      background: #ffffff;
    }
    
    .page {
      padding: 30px 40px;
      background: #fff;
      max-width: 1100px;
      margin: 0 auto;
    }
    
    /* Header with branding */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #5666D8;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .brand-logo {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #7485ED 0%, #5666D8 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 18px;
    }
    
    .brand-info h1 {
      font-size: 22px;
      font-weight: 700;
      color: #5666D8;
      margin-bottom: 2px;
    }
    
    .brand-info p {
      font-size: 11px;
      color: #666;
    }
    
    .header-meta {
      text-align: right;
      font-size: 10px;
      color: #888;
    }
    
    .header-meta strong {
      color: #5666D8;
    }
    
    /* Mission section */
    .mission {
      background: linear-gradient(135deg, #f8f9ff 0%, #f0f3ff 100%);
      border-radius: 10px;
      padding: 18px 22px;
      margin-bottom: 25px;
      border-left: 4px solid #5666D8;
    }
    
    .mission h2 {
      font-size: 14px;
      font-weight: 600;
      color: #5666D8;
      margin-bottom: 8px;
    }
    
    .mission p {
      font-size: 11px;
      color: #444;
      margin-bottom: 10px;
    }
    
    .features {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    
    .feature {
      background: white;
      border: 1px solid #e0e4f8;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 10px;
      color: #5666D8;
      font-weight: 500;
    }
    
    /* Title */
    .doc-title {
      text-align: center;
      margin-bottom: 25px;
    }
    
    .doc-title h2 {
      font-size: 20px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 6px;
    }
    
    .doc-title .subtitle {
      font-size: 14px;
      font-weight: 600;
      color: #5666D8;
      margin-bottom: 8px;
    }
    
    .doc-title p {
      font-size: 11px;
      color: #666;
    }
    
    /* Category sections */
    .category {
      margin-bottom: 22px;
      page-break-inside: avoid;
    }
    
    .category-title {
      font-size: 14px;
      font-weight: 700;
      color: #5666D8;
      padding: 8px 14px;
      background: #f0f3ff;
      border-radius: 6px;
      margin-bottom: 12px;
      display: inline-block;
    }
    
    .terms-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    
    .term {
      background: #fafbfc;
      border: 1px solid #e8eaed;
      border-radius: 8px;
      padding: 12px 14px;
      page-break-inside: avoid;
    }
    
    .term h4 {
      font-size: 12px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    
    .term p {
      font-size: 10px;
      color: #555;
      line-height: 1.45;
    }
    
    /* Footer */
    .footer {
      margin-top: 30px;
      padding-top: 18px;
      border-top: 2px solid #e8eaed;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .footer-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .footer-logo {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #7485ED 0%, #5666D8 100%);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      font-size: 10px;
    }
    
    .footer-text {
      font-size: 10px;
      color: #666;
    }
    
    .footer-text a {
      color: #5666D8;
      font-weight: 600;
      text-decoration: none;
    }
    
    .footer-legal {
      font-size: 9px;
      color: #999;
      text-align: right;
    }
    
    @media print {
      .page {
        padding: 20px;
      }
      
      .category {
        page-break-inside: avoid;
      }
      
      .term {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header with IKtracker branding -->
    <div class="header">
      <div class="brand">
        <div class="brand-logo">IK</div>
        <div class="brand-info">
          <h1>IKtracker</h1>
          <p>Outil professionnel de suivi des indemnités kilométriques</p>
        </div>
      </div>
      <div class="header-meta">
        <div><strong>iktracker.fr</strong></div>
        <div>Barème ${new Date().getFullYear()}</div>
        <div>Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
      </div>
    </div>
    
    <!-- Mission & Features -->
    <div class="mission">
      <h2>🎯 Notre mission</h2>
      <p>IKtracker simplifie la gestion des indemnités kilométriques pour les indépendants, professions libérales et artisans en France. Notre outil gratuit automatise le calcul des frais kilométriques selon le barème fiscal officiel.</p>
      <div class="features">
        <span class="feature">📍 Calcul automatique des distances</span>
        <span class="feature">📊 Barème fiscal 2026 intégré</span>
        <span class="feature">🗺️ Mode tournée GPS</span>
        <span class="feature">📄 Génération de relevés</span>
        <span class="feature">🔌 Synchronisation calendrier</span>
        <span class="feature">⚡ Majoration véhicule électrique +20%</span>
      </div>
    </div>
    
    <!-- Document title -->
    <div class="doc-title">
      <h2>Lexique des Indemnités Kilométriques</h2>
      <div class="subtitle">France • Indemnités kilométriques • 2026</div>
      <p>${lexiqueTerms.length} termes essentiels pour comprendre les IK et la fiscalité des indépendants</p>
    </div>
    
    <!-- Terms by category -->
    ${Object.entries(groupedTerms).map(([cat, terms]) => `
      <div class="category">
        <div class="category-title">${categoryTitles[cat]} (${terms.length})</div>
        <div class="terms-grid">
          ${terms.map(term => `
            <div class="term">
              <h4>${term.term}</h4>
              <p>${term.definition}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-brand">
        <div class="footer-logo">IK</div>
        <div class="footer-text">
          Document généré via <a href="https://iktracker.fr">IKtracker</a><br>
          L'outil gratuit de suivi des indemnités kilométriques
        </div>
      </div>
      <div class="footer-legal">
        © ${new Date().getFullYear()} IKtracker<br>
        Données fiscales conformes au barème officiel
      </div>
    </div>
  </div>
</body>
</html>`;

      const pdfBlob = await htmlToPdfBlob(htmlContent);
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lexique-ik-iktracker-2026.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Lexique PDF téléchargé !', { id: 'pdf-download' });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Erreur lors de la génération du PDF', { id: 'pdf-download' });
    } finally {
      setIsDownloading(false);
    }
  }, []);

  const filteredTerms = useMemo(() => {
    return lexiqueTerms
      .filter(term => {
        const termSlug = termToSlug(term.term);
        const matchesSearch = term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             term.definition.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || term.category === selectedCategory;
        const matchesFavorites = !showFavoritesOnly || favorites.has(termSlug);
        return matchesSearch && matchesCategory && matchesFavorites;
      })
      .sort((a, b) => a.term.localeCompare(b.term, 'fr'));
  }, [searchQuery, selectedCategory, showFavoritesOnly, favorites]);

  // JSON-LD structured data for SGE and LLMs
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "name": "Lexique des indemnités kilométriques en France 2026",
    "description": "Dictionnaire complet des termes, acronymes et concepts liés aux indemnités kilométriques pour les indépendants et professions libérales en France.",
    "inLanguage": "fr",
    "license": "https://creativecommons.org/licenses/by/4.0/",
    "publisher": {
      "@type": "Organization",
      "name": "IKtracker",
      "url": "https://iktracker.fr"
    },
    "hasDefinedTerm": lexiqueTerms.map(term => ({
      "@type": "DefinedTerm",
      "name": term.term,
      "description": term.definition,
      "inDefinedTermSet": "https://iktracker.fr/lexique"
    }))
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Qu'est-ce que le barème kilométrique en France ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Le barème kilométrique est une grille officielle publiée annuellement par l'administration fiscale française définissant le montant des indemnités kilométriques selon la puissance fiscale du véhicule et le nombre de kilomètres parcourus."
        }
      },
      {
        "@type": "Question",
        "name": "Comment calculer ses indemnités kilométriques en 2026 ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Pour calculer vos IK en 2026, multipliez le nombre de kilomètres professionnels par le taux correspondant à la puissance fiscale de votre véhicule selon le barème officiel. Les véhicules électriques bénéficient d'une majoration de 20%."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Lexique des indemnités kilométriques France 2026 | IKtracker</title>
        <meta 
          name="description" 
          content="Dictionnaire complet des termes liés aux indemnités kilométriques en France : barème 2026, frais réels, BNC, URSSAF, professions libérales. Définitions claires pour indépendants." 
        />
        <meta name="keywords" content="lexique indemnités kilométriques, barème kilométrique 2026, frais réels définition, BNC, URSSAF, profession libérale, indépendant France" />
        <link rel="canonical" href="https://iktracker.fr/lexique" />
        <meta property="og:title" content="Lexique des indemnités kilométriques France 2026" />
        <meta property="og:description" content="Tous les termes, acronymes et concepts des IK expliqués simplement pour les indépendants et professions libérales." />
        <meta property="og:url" content="https://iktracker.fr/lexique" />
        <meta property="og:type" content="article" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header simple */}
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src="/logo-iktracker-250.webp" 
                  alt="IKtracker" 
                  className="h-8 w-8"
                  width={32}
                  height={32}
                />
                <span className="font-bold text-xl text-foreground">IKtracker</span>
              </Link>
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12">
          {/* Hero */}
          <section className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <BookOpen className="h-4 w-4" />
              Ressource éducative
            </div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Lexique des indemnités kilométriques
            </h1>
            
            <h2 className="text-xl md:text-2xl text-primary font-semibold mb-6">
              France • Indemnités kilométriques • 2026
            </h2>
            
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-6">
              Tous les termes, acronymes, acteurs et concepts liés aux frais kilométriques 
              pour les <strong>indépendants</strong>, <strong>professions libérales</strong> et <strong>artisans</strong> en France, 
              expliqués simplement.
            </p>

            {/* Social share buttons */}
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const url = 'https://iktracker.fr/lexique';
                  const text = 'Lexique complet des indemnités kilométriques en France 2026 : tous les termes expliqués simplement pour les indépendants et professions libérales.';
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'width=550,height=420');
                }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Partager sur X
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const url = 'https://iktracker.fr/lexique';
                  const title = 'Lexique des indemnités kilométriques France 2026';
                  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=550,height=420');
                }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                Partager sur LinkedIn
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={async () => {
                  const url = 'https://iktracker.fr/lexique';
                  const text = 'Lexique complet des indemnités kilométriques en France 2026';
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: text, url });
                    } catch (e) {
                      // User cancelled or error
                    }
                  } else {
                    await navigator.clipboard.writeText(url);
                    toast.success('Lien copié dans le presse-papier');
                  }
                }}
              >
                <Share2 className="h-4 w-4" />
                Copier le lien
              </Button>
              
              {/* PDF Download button */}
              <Button
                variant="gradient"
                size="sm"
                className="gap-2"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <FileText className="h-4 w-4 animate-pulse" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Télécharger le PDF
              </Button>
            </div>
          </section>

          {/* Search and filters */}
          <section className="mb-8">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Rechercher un terme..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant={selectedCategory === 'all' && !showFavoritesOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setSelectedCategory('all'); setShowFavoritesOnly(false); }}
                >
                  Tous ({lexiqueTerms.length})
                </Button>
                {userId && (
                  <Button
                    variant={showFavoritesOnly ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={showFavoritesOnly ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
                  >
                    <Star className={`h-4 w-4 mr-1 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                    Favoris ({favorites.size})
                  </Button>
                )}
                {(Object.keys(categoryLabels) as Term['category'][]).map(cat => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat && !showFavoritesOnly ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { setSelectedCategory(cat); setShowFavoritesOnly(false); }}
                  >
                    {categoryLabels[cat]} ({lexiqueTerms.filter(t => t.category === cat).length})
                  </Button>
                ))}
              </div>
            </div>
          </section>

          {/* Terms list */}
          <section className="max-w-4xl mx-auto">
            <div className="text-sm text-muted-foreground mb-4">
              {filteredTerms.length} terme{filteredTerms.length > 1 ? 's' : ''} trouvé{filteredTerms.length > 1 ? 's' : ''}
            </div>
            
            <div className="space-y-4">
              {filteredTerms.map((term, index) => {
                const termSlug = termToSlug(term.term);
                return (
                  <article 
                    key={term.term}
                    id={termSlug}
                    className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all scroll-mt-24"
                    itemScope
                    itemType="https://schema.org/DefinedTerm"
                  >
                    <div className="flex flex-wrap items-start gap-3 mb-3">
                      <h3 
                        className="text-xl font-bold text-foreground"
                        itemProp="name"
                      >
                        {term.term}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${categoryColors[term.category]}`}>
                        {categoryLabels[term.category]}
                      </span>
                      {/* Favorite button */}
                      <button
                        onClick={() => toggleFavorite(termSlug)}
                        className={`p-1.5 rounded-md transition-colors ${
                          favorites.has(termSlug) 
                            ? 'text-amber-500 hover:text-amber-600' 
                            : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                        }`}
                        title={favorites.has(termSlug) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        aria-label={favorites.has(termSlug) ? `Retirer ${term.term} des favoris` : `Ajouter ${term.term} aux favoris`}
                      >
                        <Star className={`h-4 w-4 ${favorites.has(termSlug) ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleCopyTermLink(term.term)}
                        className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title={`Copier le lien vers "${term.term}"`}
                        aria-label={`Copier le lien vers ${term.term}`}
                      >
                        <Link2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p 
                      className="text-muted-foreground leading-relaxed"
                      itemProp="description"
                    >
                      {renderDefinitionWithLinks(term.definition, term.term)}
                    </p>
                  </article>
                );
              })}
            </div>

            {filteredTerms.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Aucun terme ne correspond à votre recherche.</p>
                <Button 
                  variant="link" 
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                >
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
          </section>

          {/* CTA Section */}
          <section className="mt-16 text-center bg-primary/5 rounded-2xl p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Calculez vos indemnités kilométriques
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Utilisez IKtracker pour automatiser le calcul de vos IK selon le barème 2026, 
              générer des justificatifs fiscaux et optimiser vos frais réels.
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Accéder à l'outil
              </Button>
            </Link>
          </section>
        </main>

        <MarketingFooter />
      </div>
    </>
  );
}
