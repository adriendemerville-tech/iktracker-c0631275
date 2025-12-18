import { Link, useNavigate } from 'react-router-dom';

export function MarketingFooter() {
  const navigate = useNavigate();
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
    <footer className="py-16 px-4 border-t border-border bg-muted/30">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" onClick={handleLinkClick('/')} className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="IKtracker" className="h-10 w-10" loading="lazy" />
              <span className="text-xl font-bold text-foreground">IKtracker</span>
            </Link>
            <p className="text-muted-foreground mb-4 max-w-sm">
              L'outil gratuit et français pour automatiser vos indemnités kilométriques. 
              Conçu pour les infirmiers, artisans et consultants.
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">100% Gratuit</span>
              <span className="text-xs bg-success/10 text-success px-3 py-1 rounded-full">Made in France</span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Produit</h4>
            <ul className="space-y-3">
              {links.product.map((link) => (
                <li key={link.href}>
                  <Link 
                    to={link.href}
                    onClick={handleLinkClick(link.href)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Ressources</h4>
            <ul className="space-y-3">
              {links.resources.map((link) => (
                <li key={link.href}>
                  <Link 
                    to={link.href}
                    onClick={handleLinkClick(link.href)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © {currentYear} IKtracker. Application gratuite de gestion des indemnités kilométriques pour indépendants en France.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <Link 
              to="/privacy" 
              onClick={handleLinkClick('/privacy')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Confidentialité
            </Link>
            <Link 
              to="/terms" 
              onClick={handleLinkClick('/terms')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              CGU
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
