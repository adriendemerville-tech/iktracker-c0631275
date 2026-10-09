import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "@/lib/router-compat";
import { useHydrated } from "@tanstack/react-router";
import Auth from "@/pages/Auth";
import { isRecoveryFlow } from "@/lib/recovery-flag";

// Rend la page /auth en SSR ; redirige les utilisateurs déjà connectés
// uniquement après hydratation.
export const SmartAuth = () => {
  const { user, loading } = useAuth();
  const hydrated = useHydrated();

  // Ne pas rediriger pendant un flux de réinitialisation de mot de passe :
  // le lien crée une session temporaire, mais l'utilisateur doit d'abord
  // voir le formulaire de nouveau mot de passe.
  const isRecovery = hydrated && isRecoveryFlow();

  if (hydrated && !loading && user && !isRecovery) {
    return <Navigate to="/app" replace />;
  }

  return <Auth />;
};

export default SmartAuth;
