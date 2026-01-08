import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, LayoutDashboard, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMarketingTracker } from '@/hooks/useMarketingTracker';

interface MarketingNavProps {
  user?: { email?: string } | null;
  loading?: boolean;
}

export function MarketingNav({ user, loading }: MarketingNavProps) {
  const { trackSignupClick } = useMarketingTracker('nav');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const links = [
    { label: 'Mode Tournée', href: '/mode-tournee' },
    { label: 'Calendrier', href: '/calendrier' },
    { label: 'Barème des indemnités', href: '/bareme-ik-2026', isNew: true },
    { label: 'Blog', href: '/blog' },
    { label: 'Installation', href: '/install' },
    { label: 'Expert-Comptable', href: '/expert-comptable' },
  ];

  const isActive = (href: string) => location.pathname === href;

  // Close mobile menu on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Skip to main content link */}
      <a 
        href="#main-content" 
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById('main-content');
          if (main) {
            main.focus();
            main.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      >
        Aller au contenu principal
      </a>

      <header 
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border"
        role="banner"
      >
        <nav 
          className="container mx-auto px-4 py-3 md:py-4"
          aria-label="Navigation principale"
        >
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2 cursor-pointer select-none focus-visible-ring rounded-lg"
              aria-label="IKtracker - Retour à l'accueil"
            >
              <img 
                src="/logo-iktracker-250.webp" 
                alt="" 
                aria-hidden="true"
                width={36}
                height={36}
                className="h-8 w-8 md:h-9 md:w-9 transition-transform duration-300 hover:scale-110" 
                loading="eager"
                decoding="async"
                fetchPriority="high"
                draggable={false}
              />
              <span className="text-lg md:text-xl font-bold text-foreground select-none">IKtracker</span>
            </Link>

            {/* Desktop Navigation */}
            <ul 
              className="hidden lg:flex items-center gap-6"
              role="menubar"
              aria-label="Menu principal"
            >
              {links.map((link) => (
                <li key={link.href} role="none">
                  <Link
                    to={link.href}
                    role="menuitem"
                    aria-current={isActive(link.href) ? 'page' : undefined}
                    className={cn(
                      "text-sm transition-colors relative flex items-center gap-1.5 focus-visible-ring rounded-md px-2 py-1",
                      isActive(link.href) 
                        ? "text-primary font-medium" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {link.label}
                    {link.isNew && (
                      <span 
                        className="px-1.5 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded-full animate-pulse"
                        aria-label="Nouveau"
                      >
                        2026
                      </span>
                    )}
                    {isActive(link.href) && (
                      <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" aria-hidden="true" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>

            {/* CTA Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden focus-visible-ring"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Fermer le menu de navigation" : "Ouvrir le menu de navigation"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              </Button>

              {!loading && (
                user ? (
                  <Link to="/app" className="focus-visible-ring rounded-lg">
                    <Button variant="gradient" size="sm" className="group">
                      <LayoutDashboard className="h-4 w-4 mr-2" aria-hidden="true" />
                      <span className="hidden sm:inline">Dashboard</span>
                      <span className="sm:hidden sr-only">Dashboard</span>
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                      <Link to="/auth" className="focus-visible-ring">
                        <LogIn className="h-4 w-4 mr-2" aria-hidden="true" />
                        Connexion
                      </Link>
                    </Button>
                    <Link to="/signup" className="focus-visible-ring rounded-lg" onClick={trackSignupClick}>
                      <Button variant="gradient" size="sm">
                        S'inscrire
                      </Button>
                    </Link>
                  </>
                )
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav 
              id="mobile-menu"
              className="lg:hidden mt-4 pb-4 border-t border-border pt-4 animate-fade-in"
              aria-label="Menu mobile"
            >
              <ul className="flex flex-col gap-1" role="menu">
                {links.map((link) => (
                  <li key={link.href} role="none">
                    <Link
                      to={link.href}
                      role="menuitem"
                      aria-current={isActive(link.href) ? 'page' : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "px-4 py-3 rounded-lg transition-colors flex items-center justify-between active:scale-[0.98] focus-visible-ring",
                        isActive(link.href)
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span className="text-base">{link.label}</span>
                      {link.isNew && (
                        <span 
                          className="px-1.5 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded-full"
                          aria-label="Nouveau"
                        >
                          2026
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
                
                {/* Mobile login link for non-authenticated users */}
                {!loading && !user && (
                  <li role="none">
                    <Link
                      to="/auth"
                      role="menuitem"
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-4 py-3 rounded-lg transition-colors flex items-center gap-2 text-primary font-medium hover:bg-primary/10 active:scale-[0.98] focus-visible-ring"
                    >
                      <LogIn className="h-4 w-4" aria-hidden="true" />
                      <span className="text-base">Connexion</span>
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          )}
        </nav>
      </header>
    </>
  );
}
