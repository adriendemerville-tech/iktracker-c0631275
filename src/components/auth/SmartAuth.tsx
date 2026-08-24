import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "@/lib/router-compat";
import { useHydrated } from "@tanstack/react-router";
import Auth from "@/pages/Auth";

// Rend la page /auth en SSR ; redirige les utilisateurs déjà connectés
// uniquement après hydratation.
export const SmartAuth = () => {
  const { user, loading } = useAuth();
  const hydrated = useHydrated();

  if (hydrated && !loading && user) {
    return <Navigate to="/app" replace />;
  }

  return <Auth />;
};

export default SmartAuth;
