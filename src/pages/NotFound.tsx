import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // SEO: Set noindex for 404 pages
    document.title = "Page non trouvée | IKtracker";
    
    // Add noindex meta tag
    let metaRobots = document.querySelector('meta[name="robots"]');
    const originalRobots = metaRobots?.getAttribute('content');
    if (metaRobots) {
      metaRobots.setAttribute('content', 'noindex, nofollow');
    }

    const metaDescription = document.querySelector('meta[name="description"]');
    const originalDescription = metaDescription?.getAttribute('content');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Cette page n\'existe pas sur IKtracker.');
    }

    console.error("404 Error: User attempted to access non-existent route:", location.pathname);

    return () => {
      document.title = 'IKtracker - Calcul automatique des indemnités kilométriques';
      if (metaRobots && originalRobots) {
        metaRobots.setAttribute('content', originalRobots);
      }
      if (metaDescription && originalDescription) {
        metaDescription.setAttribute('content', originalDescription);
      }
    };
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-primary mb-4">404</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Page non trouvée</h1>
        <p className="text-muted-foreground mb-8">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <Link to="/">
            <Button variant="gradient">
              <Home className="h-4 w-4 mr-2" />
              Accueil
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;