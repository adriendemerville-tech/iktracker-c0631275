import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "@/lib/router-compat";
import { useHydrated } from "@tanstack/react-router";
import Landing from "@/pages/Landing";
import type { PublicReviewItem } from "@/components/marketing/TestimonialsCarousel";

interface SmartLandingProps {
  initialUserCount?: number;
  initialTripCount?: number;
  initialTotalKm?: number;
  reviews?: PublicReviewItem[];
}

// Les points d'entrée publics ("/", "/auth", "/signup") doivent rendre du vrai HTML
// en SSR : les crawlers n'exécutent pas de JS. On rend donc toujours la page
// publique côté serveur, la redirection des utilisateurs connectés a lieu après
// hydratation. Chaque page a son propre module pour ne pas mutualiser les chunks.
export const SmartLanding = ({
  initialUserCount,
  initialTripCount,
  initialTotalKm,
  reviews,
}: SmartLandingProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const hydrated = useHydrated();
  const fromApp = new URLSearchParams(location.search).get("from") === "app";

  if (hydrated && !loading && user && !fromApp) {
    return <Navigate to="/app" replace />;
  }

  return (
    <Landing
      initialUserCount={initialUserCount}
      initialTripCount={initialTripCount}
      initialTotalKm={initialTotalKm}
      reviews={reviews}
    />
  );
};

export default SmartLanding;
