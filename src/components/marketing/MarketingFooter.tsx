import { Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function MarketingFooter() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const links = {
    product: [
      { label: 'Accueil', href: '/' },
      { label: 'Installation', href: '/install' },
      { label: 'Mode Tournée', href: '/mode-tournee' },
      { label: 'Calendrier', href: '/calendrier' },
    ],
    resources: [
      { label: 'Expert-Comptable', href: '/expert-comptable' },
      { label: 'Confidentialité', href: '/privacy' },
      { label: 'CGU', href: '/terms' },
    ],
  };

  return (
    <footer 
      className="py-12 md:py-16 px-4 border-t border-border bg-muted/30"
      role="contentinfo"
      aria-label="Pied de page"
    >
      <div className="container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-8 md:mb-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link 
              to="/" 
              onClick={handleLinkClick('/')} 
              className="flex items-center gap-2 mb-4 focus-visible-ring rounded-lg w-fit"
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
            <p className="text-sm md:text-base text-muted-foreground mb-4 max-w-sm">
              L'outil gratuit et français pour automatiser vos indemnités kilométriques. 
              Conçu pour les infirmiers, artisans et consultants.
            </p>
            <div className="flex flex-wrap items-center gap-2" role="list" aria-label="Caractéristiques">
              <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full" role="listitem">100% Gratuit</span>
              <span className="text-xs bg-success/10 text-success px-3 py-1 rounded-full" role="listitem">Made in France</span>
            </div>
            {!loading && user && (
              <Link 
                to="/app" 
                onClick={handleLinkClick('/app')}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors focus-visible-ring rounded-md"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Accéder au dashboard
              </Link>
            )}
          </div>

          {/* Product Links */}
          <nav aria-labelledby="footer-product-heading">
            <h2 id="footer-product-heading" className="font-semibold text-foreground mb-4">Produit</h2>
            <ul className="space-y-3" role="list">
              {links.product.map((link) => (
                <li key={link.href}>
                  <Link 
                    to={link.href}
                    onClick={handleLinkClick(link.href)}
                    className="text-muted-foreground hover:text-foreground transition-colors focus-visible-ring rounded-md"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Resources Links */}
          <nav aria-labelledby="footer-resources-heading">
            <h2 id="footer-resources-heading" className="font-semibold text-foreground mb-4">Ressources</h2>
            <ul className="space-y-3" role="list">
              {links.resources.map((link) => (
                <li key={link.href}>
                  <Link 
                    to={link.href}
                    onClick={handleLinkClick(link.href)}
                    className="text-muted-foreground hover:text-foreground transition-colors focus-visible-ring rounded-md"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © {currentYear} IKtracker. Application gratuite de gestion des indemnités kilométriques pour indépendants en France.
          </p>
          <nav aria-label="Liens légaux">
            <ul className="flex items-center gap-6 text-sm" role="list">
              <li>
                <Link 
                  to="/privacy" 
                  onClick={handleLinkClick('/privacy')}
                  className="text-muted-foreground hover:text-foreground transition-colors focus-visible-ring rounded-md"
                >
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link 
                  to="/terms" 
                  onClick={handleLinkClick('/terms')}
                  className="text-muted-foreground hover:text-foreground transition-colors focus-visible-ring rounded-md"
                >
                  CGU
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Creator Attribution */}
        <div className="mt-8 pt-4 border-t border-border/50 text-center">
          <p className="text-xs text-slate-500">
            IKtracker — Outil conçu par Adrien de Volontat, entrepreneur{' '}
            <a 
              href="https://www.avenir-renovations.fr/agence/avenir-renovations-13-saint-remy-de-provence/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-slate-700 transition-colors focus-visible-ring rounded-sm"
            >
              Avenir Rénovations
            </a>
            {' '}à Saint-Rémy-de-Provence. Partagé gratuitement avec la communauté.
          </p>
        </div>
      </div>
    </footer>
  );
}
