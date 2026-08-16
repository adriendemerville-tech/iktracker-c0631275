import Constants from "expo-constants";

export type StartupIssueCode =
  "backend-missing" | "backend-invalid" | "gps-denied" | "gps-background-denied" | "runtime-crash";

export interface StartupIssue {
  code: StartupIssueCode;
  title: string;
  detail: string;
  hint: string;
  blocking: boolean;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export function getSupabaseConfig() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? "";
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? "";
  return { url, anonKey };
}

// Diagnostic synchrone exécuté avant tout rendu : évite le flash blanc + crash.
export function checkBackendConfig(): StartupIssue | null {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) {
    return {
      code: "backend-missing",
      title: "Configuration backend manquante",
      detail:
        "L'application n'a pas trouvé l'adresse du backend ou la clé publique nécessaires pour se connecter.",
      hint: "Vérifie les variables EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY (fichier .env en local, ou app.json > extra pour un build EAS), puis reconstruis l'application.",
      blocking: true,
    };
  }

  if (!/^https?:\/\//.test(url)) {
    return {
      code: "backend-invalid",
      title: "Adresse backend invalide",
      detail: `L'adresse configurée (« ${url} ») n'est pas une URL valide.`,
      hint: "L'adresse doit commencer par https:// . Corrige la configuration puis reconstruis l'application.",
      blocking: true,
    };
  }

  return null;
}

export function describeRuntimeError(error: unknown): StartupIssue {
  const message = error instanceof Error ? error.message : String(error);
  return {
    code: "runtime-crash",
    title: "Erreur au démarrage",
    detail: message || "Une erreur inattendue est survenue pendant le chargement.",
    hint: "Réessaie. Si le problème persiste, réinstalle la dernière version de l'application.",
    blocking: true,
  };
}

export function describeLocationIssue(background: boolean): StartupIssue {
  return background
    ? {
        code: "gps-background-denied",
        title: "Localisation en arrière-plan refusée",
        detail:
          "Le Mode Tournée a besoin de la localisation « Toujours » pour enregistrer les kilomètres quand l'écran est éteint.",
        hint: "Réglages > IKtracker > Position > Toujours.",
        blocking: false,
      }
    : {
        code: "gps-denied",
        title: "Localisation refusée",
        detail: "L'accès au GPS a été refusé : le suivi des trajets ne peut pas démarrer.",
        hint: "Réglages > IKtracker > Position > Lorsque l'app est active (ou Toujours).",
        blocking: false,
      };
}
