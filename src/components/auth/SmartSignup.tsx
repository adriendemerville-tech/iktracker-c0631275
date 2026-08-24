import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "@/lib/router-compat";
import { useHydrated } from "@tanstack/react-router";
import Signup from "@/pages/Signup";

// Rend la page /signup en SSR ; redirige les utilisateurs déjà connectés
// uniquement après hydratation.
export const SmartSignup = () => {
  const { user, loading } = useAuth();
  const hydrated = useHydrated();

  if (hydrated && !loading && user) {
    return <Navigate to="/app" replace />;
  }

  return <Signup />;
};

export default SmartSignup;
