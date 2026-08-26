// Diagnostic détaillé des échecs OAuth (Google / Apple).
// Objectif : quand une connexion échoue, l'utilisateur (et l'admin) sait
// exactement quoi corriger — code d'erreur, URI envoyée, URI à autoriser.

export interface OAuthDiagnostic {
  provider: string;
  /** Code technique brut (redirect_uri_mismatch, access_denied, …). */
  code: string;
  /** Description brute renvoyée par le fournisseur. */
  description: string;
  /** Titre lisible. */
  title: string;
  /** Explication en langage clair. */
  explanation: string;
  /** Étapes de correction, dans l'ordre. */
  steps: string[];
  /** Valeurs techniques à copier dans la console du fournisseur. */
  technical: { label: string; value: string }[];
}

/** Lit error / error_code / error_description dans la query et le hash. */
export function readOAuthErrorFromUrl(): { code: string; description: string } | null {
  if (typeof window === "undefined") return null;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = query.get("error") ?? hash.get("error") ?? query.get("error_code") ?? hash.get("error_code");
  if (!code) return null;
  const description =
    query.get("error_description") ?? hash.get("error_description") ?? "";
  return { code, description: decodeURIComponent(description.replace(/\+/g, " ")) };
}

/**
 * Où trouver l'URI de callback à autoriser côté Google.
 * L'URL brute du backend n'est jamais affichée aux utilisateurs.
 */
export function backendCallbackLocation(): string {
  return "Affichée dans les réglages d'authentification du backend (Sign In Methods → Google)";
}

/** URI de redirection envoyée par l'app au broker OAuth. */
export function appRedirectUri(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}

export function buildOAuthDiagnostic(
  provider: string,
  code: string,
  description: string,
): OAuthDiagnostic {
  const normalized = `${code} ${description}`.toLowerCase();
  const technical = [
    { label: "Code d'erreur", value: code || "inconnu" },
    { label: "Message du fournisseur", value: description || "(aucun)" },
    { label: "URI de redirection envoyée par l'app", value: appRedirectUri() },
    { label: "URI de callback à autoriser dans Google Cloud Console", value: backendCallbackLocation() },
    {
      label: "Client OAuth utilisé",
      value:
        "Identifiants gérés par la plateforme (par défaut) ou client Google personnalisé — voir Réglages → Authentification → Fournisseurs → Google du backend",
    },
  ];

  if (normalized.includes("redirect_uri_mismatch")) {
    return {
      provider,
      code,
      description,
      title: "URI de redirection non autorisée (redirect_uri_mismatch)",
      explanation:
        "Le client Google OAuth utilisé n'autorise pas l'URI de callback de l'application. Google refuse la redirection avant même l'écran de consentement.",
      steps: [
        "Ouvrir les réglages d'authentification du backend (Sign In Methods → Google) et copier l'URI de callback affichée.",
        "Dans Google Cloud Console → APIs & Services → Credentials, sélectionner le client OAuth 2.0 utilisé par l'application.",
        "Dans « Authorized redirect URIs », coller exactement cette URI de callback (copie exacte, sans espace ni slash final).",
        "Enregistrer, attendre quelques minutes de propagation, puis réessayer.",
        "Alternative : repasser en identifiants gérés par la plateforme dans les réglages d'authentification du backend (aucune configuration Google requise).",
      ],
      technical,
    };
  }

  if (normalized.includes("invalid_client")) {
    return {
      provider,
      code,
      description,
      title: "Client OAuth invalide (invalid_client)",
      explanation:
        "Le couple Client ID / Secret configuré est incorrect, supprimé ou désactivé côté Google.",
      steps: [
        "Vérifier dans Google Cloud Console que le client OAuth existe encore et est actif.",
        "Contrôler que le Client ID et le Secret collés dans les réglages d'authentification du backend sont complets (aucun caractère tronqué).",
        "En cas de doute, régénérer un secret et le mettre à jour, ou repasser en identifiants gérés par la plateforme.",
      ],
      technical,
    };
  }

  if (/access_denied|consent_required|user_cancelled|interaction_required/.test(normalized)) {
    return {
      provider,
      code,
      description,
      title: "Connexion annulée",
      explanation:
        "La connexion a été interrompue sur l'écran de consentement Google (annulation, fermeture de la fenêtre ou refus des autorisations).",
      steps: [
        "Réessayer en acceptant les autorisations demandées.",
        "Si la fenêtre s'est fermée toute seule, désactiver le bloqueur de popups pour ce site.",
      ],
      technical,
    };
  }

  if (/unsupported_provider|provider.*disabled|provider.*not.*enabled/.test(normalized)) {
    return {
      provider,
      code,
      description,
      title: "Fournisseur non activé",
      explanation:
        "Le fournisseur Google n'est pas activé dans la configuration d'authentification du backend.",
      steps: [
        "Activer le fournisseur Google dans Réglages → Authentification → Fournisseurs du backend.",
        "Vérifier qu'un client OAuth valide est associé (géré par la plateforme ou personnalisé).",
      ],
      technical,
    };
  }

  if (/popup|blocked|closed/.test(normalized)) {
    return {
      provider,
      code,
      description,
      title: "Fenêtre de connexion bloquée",
      explanation:
        "Le navigateur a bloqué ou fermé la fenêtre de connexion Google avant la fin du processus.",
      steps: [
        "Autoriser les popups pour ce site puis réessayer.",
        "Sur mobile, utiliser le navigateur système (Safari/Chrome) plutôt qu'un navigateur intégré à une app.",
      ],
      technical,
    };
  }

  return {
    provider,
    code,
    description,
    title: "Échec de la connexion Google",
    explanation:
      "La connexion a échoué. Les détails techniques ci-dessous indiquent la cause renvoyée par le fournisseur.",
    steps: [
      "Réessayer dans quelques instants.",
      "Si l'erreur persiste, vérifier la configuration du fournisseur Google dans les réglages d'authentification du backend (client, secret, URI autorisée).",
    ],
    technical,
  };
}
