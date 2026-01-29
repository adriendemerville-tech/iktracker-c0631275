import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MapPin, Phone, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';

const faqItems = [
  {
    question: "IKtracker est-il vraiment gratuit ?",
    answer: "Oui, IKtracker est 100% gratuit et le restera. Aucune carte bancaire n'est requise, aucun abonnement caché. Toutes les fonctionnalités sont accessibles : enregistrement illimité des trajets, calcul automatique des IK, export PDF et CSV."
  },
  {
    question: "Comment fonctionne le calcul des indemnités kilométriques ?",
    answer: "IKtracker applique automatiquement le barème fiscal officiel 2026 selon la puissance fiscale de votre véhicule et les kilomètres parcourus. Le calcul intègre les 3 tranches (jusqu'à 5000 km, 5001-20000 km, au-delà) et la majoration de 20% pour les véhicules électriques."
  },
  {
    question: "Puis-je utiliser IKtracker sur iPhone ou Android ?",
    answer: "Oui, IKtracker est une Progressive Web App (PWA) installable sur tous les smartphones. Elle fonctionne hors-ligne et utilise le GPS pour enregistrer vos trajets automatiquement, même sans connexion internet."
  },
  {
    question: "Comment synchroniser mon calendrier Google ou Outlook ?",
    answer: "Connectez votre agenda en quelques clics depuis les paramètres. IKtracker importe automatiquement vos rendez-vous professionnels et crée les trajets correspondants avec calcul des distances et indemnités."
  },
  {
    question: "Mes données sont-elles sécurisées et conformes RGPD ?",
    answer: "Absolument. Vos données sont chiffrées et hébergées en Europe. IKtracker est 100% conforme au RGPD. Vos informations ne sont jamais partagées ni vendues. Vous pouvez exporter ou supprimer vos données à tout moment."
  },
  {
    question: "L'outil est-il adapté aux infirmiers libéraux ?",
    answer: "Oui, IKtracker est idéal pour les IDEL et professionnels de santé à domicile. Le mode tournée permet d'enregistrer plusieurs patients en une seule session avec calcul optimisé des distances."
  },
  {
    question: "Comment exporter mes trajets pour ma comptabilité ?",
    answer: "Générez un relevé PDF ou CSV en quelques clics depuis l'onglet 'Mes trajets'. Le document inclut toutes les informations requises par l'administration fiscale : dates, distances, montants IK, véhicule utilisé."
  },
  {
    question: "Quelle est la différence avec un carnet de bord papier ?",
    answer: "IKtracker automatise le calcul des distances via GPS, applique le barème fiscal correct, et génère des exports professionnels. Fini les erreurs de calcul, les oublis de trajets et les heures perdues en saisie manuelle."
  }
];

// Regions list removed - now inline text

export function EnhancedMarketingFooter() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const productLinks = [
    { label: 'Accueil', href: '/' },
    { label: 'Installation PWA', href: '/install' },
    { label: 'Mode Tournée', href: '/mode-tournee' },
    { label: 'Synchronisation Calendrier', href: '/calendrier' },
    { label: 'Barème IK 2026', href: '/bareme-ik-2026' },
  ];

  const resourceLinks = [
    { label: 'Expert-Comptable', href: '/expert-comptable' },
    { label: 'Lexique IK', href: '/lexique' },
    { label: 'Blog', href: '/blog' },
    { label: 'Créer un compte', href: '/signup' },
    { label: 'Se connecter', href: '/auth' },
  ];

  const legalLinks = [
    { label: 'Politique de Confidentialité', href: '/privacy' },
    { label: 'Conditions Générales d\'Utilisation', href: '/terms' },
  ];

  const professionLinks = [
    { label: 'Infirmier libéral (IDEL)', href: '/blog/indemnites-kilometriques-infirmier-liberal' },
    { label: 'Kinésithérapeute', href: '/blog/indemnites-kilometriques-kinesitherapeute' },
    { label: 'Artisan du bâtiment', href: '/blog/indemnites-kilometriques-artisan-batiment' },
    { label: 'Commercial itinérant', href: '/blog/indemnites-kilometriques-commercial-itinerant' },
    { label: 'Consultant indépendant', href: '/blog/indemnites-kilometriques-consultant-independant' },
    { label: 'Agent immobilier', href: '/blog/indemnites-kilometriques-agent-immobilier' },
  ];

  return (
    <footer 
      className="bg-muted/50 border-t border-border"
      role="contentinfo"
      aria-label="Pied de page"
    >
      {/* FAQ Section */}
      <section className="py-12 md:py-16 px-4 border-b border-border" aria-labelledby="faq-heading">
        <div className="container mx-auto max-w-4xl">
          <h2 id="faq-heading" className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">
            Questions fréquentes sur les indemnités kilométriques
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`faq-${index}`} className="border-border">
                <AccordionTrigger className="text-left hover:no-underline py-4 text-base md:text-lg font-medium">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm md:text-base leading-relaxed pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Main Footer Links */}
      <div className="py-12 md:py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 md:gap-12">
            
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-4 lg:col-span-1">
              <Link 
                to="/" 
                onClick={handleLinkClick('/')} 
                className="flex items-center gap-2 mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg w-fit"
                aria-label="IKtracker - Retour à l'accueil"
              >
                <img 
                  src="/logo-iktracker-250.webp" 
                  alt="" 
                  aria-hidden="true"
                  width={40}
                  height={40}
                  className="h-8 w-8 md:h-10 md:w-10" 
                  loading="lazy"
                  decoding="async"
                />
                <span className="text-lg md:text-xl font-bold text-foreground">IKtracker</span>
              </Link>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                Outil professionnel gratuit pour automatiser le calcul de vos indemnités kilométriques. 
                Conforme au barème fiscal 2026.
              </p>
              <div className="flex flex-wrap items-center gap-2 mb-4" role="list" aria-label="Caractéristiques">
                <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full" role="listitem">100% Gratuit</span>
                <span className="text-xs bg-success/10 text-success px-3 py-1 rounded-full" role="listitem">Made in France</span>
                <span className="text-xs bg-accent/10 text-accent-foreground px-3 py-1 rounded-full" role="listitem">RGPD</span>
              </div>
              {!loading && user && (
                <Link 
                  to="/app" 
                  onClick={handleLinkClick('/app')}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  Accéder au dashboard
                </Link>
              )}
            </div>

            {/* Product Links */}
            <nav aria-labelledby="footer-product-heading">
              <h3 id="footer-product-heading" className="font-semibold text-foreground mb-4">Produit</h3>
              <ul className="space-y-3" role="list">
                {productLinks.map((link) => (
                  <li key={link.href}>
                    <Link 
                      to={link.href}
                      onClick={handleLinkClick(link.href)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Resources Links */}
            <nav aria-labelledby="footer-resources-heading">
              <h3 id="footer-resources-heading" className="font-semibold text-foreground mb-4">Ressources</h3>
              <ul className="space-y-3" role="list">
                {resourceLinks.map((link) => (
                  <li key={link.href}>
                    <Link 
                      to={link.href}
                      onClick={handleLinkClick(link.href)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Professions - GEO/SEO */}
            <nav aria-labelledby="footer-professions-heading">
              <h3 id="footer-professions-heading" className="font-semibold text-foreground mb-4">Métiers</h3>
              <ul className="space-y-3" role="list">
                {professionLinks.map((item) => (
                  <li key={item.href}>
                    <Link 
                      to={item.href}
                      onClick={handleLinkClick(item.href)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Legal & Contact */}
            <nav aria-labelledby="footer-legal-heading">
              <h3 id="footer-legal-heading" className="font-semibold text-foreground mb-4">Légal</h3>
              <ul className="space-y-3" role="list">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link 
                      to={link.href}
                      onClick={handleLinkClick(link.href)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              
              {/* Contact info for Local SEO */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <h4 className="text-sm font-medium text-foreground mb-3">Contact</h4>
                <address className="not-italic text-sm text-muted-foreground space-y-2">
                  <p className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                    <span>Saint-Rémy-de-Provence, France</span>
                  </p>
                </address>
              </div>
            </nav>
          </div>

          {/* Regions - GEO SEO */}
          <div className="mt-10 pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              Paris, Lille, Nantes, Lyon, Bordeaux, Toulouse, Marseille, Strasbourg... 
              <span className="font-medium text-foreground"> IKtracker est disponible partout en France, gratuitement.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="py-6 px-4 border-t border-border bg-background/50">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © {currentYear} IKtracker. Outil professionnel gratuit de calcul des indemnités kilométriques – Barème fiscal {currentYear}.
            </p>
            <nav aria-label="Liens légaux rapides">
              <ul className="flex items-center gap-4 md:gap-6 text-sm" role="list">
                <li>
                  <Link 
                    to="/privacy" 
                    onClick={handleLinkClick('/privacy')}
                    className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                  >
                    Confidentialité
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/terms" 
                    onClick={handleLinkClick('/terms')}
                    className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                  >
                    CGU
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Creator Attribution */}
          <div className="mt-6 pt-4 border-t border-border/30 text-center">
            <p className="text-xs text-muted-foreground/70">
              IKtracker — Outil conçu par Adrien de Volontat, entrepreneur{' '}
              <a 
                href="https://www.avenir-renovations.fr/agence/avenir-renovations-13-saint-remy-de-provence/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                Avenir Rénovations
              </a>
              {' '}à Saint-Rémy-de-Provence. Partagé gratuitement avec la communauté.
            </p>
            <p className="text-xs text-muted-foreground/50 mt-2">
              <a 
                href="https://mossai.org" 
                title="MossAI Tools"
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-muted-foreground transition-colors"
              >
                MossAI Tools
              </a>
              {' '}·{' '}
              <a 
                href="https://crawlers.fr" 
                title="Crawlers.fr"
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-muted-foreground transition-colors"
              >
                Crawlers.fr
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
