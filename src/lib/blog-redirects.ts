/**
 * Redirections 301 des slugs de blog consolidés (août 2026).
 * Source de vérité côté application, dupliquée dans le Worker Cloudflare
 * (cloudflare-worker/iktracker-bot-router.js, map LEGACY_REDIRECTS).
 */
export const BLOG_SLUG_REDIRECTS: Record<string, string> = {
  // Cluster « frais réels vs forfait »
  "frais-reels-vs-forfait": "/blog/frais-reels-ou-forfait-optimisation-impots-2026",
  "frais-reels-vs-forfait-guide-complet": "/blog/frais-reels-ou-forfait-optimisation-impots-2026",
  "frais-reels-ou-forfait-guide-independants-2026": "/blog/frais-reels-ou-forfait-optimisation-impots-2026",
  "frais-reels-ou-forfait-independants-impots-2026": "/blog/frais-reels-ou-forfait-optimisation-impots-2026",
  "frais-reels-ou-abattement-forfaitaire-simulation-2026": "/blog/frais-reels-ou-abattement-choisir",
  "frais-reels-vs-forfait-guide-optimisation-impots": "/blog/seuil-rentabilite-frais-reels-kilometrage-annuel",

  // Cluster « URSSAF / anti-redressement »
  "comment-optimiser-ses-frais-auto-sans-risque-guide-de-conformite-urssaf-et-autom":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "comment-optimiser-ses-frais-pro-auto-en-respectant-le-bareme-urssaf-sans-perdre-":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "comment-optimiser-ses-frais-pro-auto-en-s-alignant-sur-le-bareme-urssaf":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "frais-auto-et-urssaf-optimiser-ses-remboursements-sans-risquer-le-redressement-f":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "comment-transformer-votre-suivi-kilometrique-2026-en-bouclier-anti-redressement-":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "dossier-ik-2026-l-art-de-blinder-son-suivi-kilometrique-contre-les-controles-urs":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "regles-suivi-kilometrique-conforme-urssaf": "/blog/controle-urssaf-frais-kilometriques-2026",
  "dossier-ik-2026-les-7-regles-d-or-d-un-suivi-kilometrique-conforme-anti-redresse":
    "/blog/controle-urssaf-liste-des-pieces-a-fournir",

  // Cluster « calcul / étapes »
  "calculer-indemnites-kilometriques-2026-guide": "/blog/7-etapes-du-calcul-indemnite-frais-kilometriques",
  "comment-calculer-frais-kilometriques-remboursement": "/blog/7-etapes-du-calcul-indemnite-frais-kilometriques",
  "etapes-rapport-kilometrique": "/blog/7-etapes-du-calcul-indemnite-frais-kilometriques",
  "precision-calcul-frais-kilometriques-2026": "/blog/7-etapes-du-calcul-indemnite-frais-kilometriques",
  "etapes-declaration-fiscale-kilometrage-guide": "/blog/declaration-2042-ou-reporter-ses-indemnites-kilometriques",

  // Barème : renvoi vers la page pilier marketing
  "bareme-indemnites-kilometriques-2026-iktracker": "/bareme-ik-2026",

  // Doublons marque et erreurs
  "iktracker-nouveautes-2026": "/blog/iktracker-2026-nouveautes-tendances",
  "liste-des-erreurs-frequentes-allocation-kilometrique":
    "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
};
