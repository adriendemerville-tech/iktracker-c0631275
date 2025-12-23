import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, LayoutDashboard, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketingNavProps {
  user?: { email?: string } | null;
  loading?: boolean;
}

export function MarketingNav({ user, loading }: MarketingNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const links = [
    { label: 'Mode Tournée', href: '/mode-tournee' },
    { label: 'Calendrier', href: '/calendrier' },
    { label: 'Barème des indemnités', href: '/bareme-ik-2026', isNew: true },
    { label: 'Installation', href: '/install' },
    { label: 'Expert-Comptable', href: '/expert-comptable' },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <nav className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/logo-iktracker-250.webp" 
              alt="IKtracker - Suivi des indemnités kilométriques" 
              width={36}
              height={36}
              className="h-8 w-8 md:h-9 md:w-9 transition-transform duration-300 hover:scale-110" 
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
            <span className="text-lg md:text-xl font-bold text-foreground">IKtracker</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "text-sm transition-colors relative flex items-center gap-1.5",
                  isActive(link.href) 
                    ? "text-primary font-medium" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
                {link.isNew && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded-full animate-pulse">
                    2026
                  </span>
                )}
                {isActive(link.href) && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {!loading && (
              user ? (
                <Link to="/app">
                  <Button variant="gradient" size="sm" className="group">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth" className="hidden sm:block">
                    <Button variant="outline" size="sm">
                      <LogIn className="h-4 w-4 mr-2" />
                      Connexion
                    </Button>
                  </Link>
                  <a href="/#auth-section">
                    <Button variant="gradient" size="sm">
                      S'inscrire
                    </Button>
                  </a>
                </>
              )
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-border pt-4 animate-fade-in">
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg transition-colors flex items-center justify-between active:scale-[0.98]",
                    isActive(link.href)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span className="text-base">{link.label}</span>
                  {link.isNew && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded-full">
                      2026
                    </span>
                  )}
                </Link>
              ))}
              
              {/* Mobile login link for non-authenticated users */}
              {!loading && !user && (
                <Link
                  to="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 rounded-lg transition-colors flex items-center gap-2 text-primary font-medium hover:bg-primary/10 active:scale-[0.98]"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="text-base">Connexion</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
