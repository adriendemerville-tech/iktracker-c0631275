/**
 * Source de vérité UNIQUE des redirections 301 des slugs de blog consolidés
 * (août 2026).
 *
 * Consommée par :
 *  - supabase/functions/meta-renderer (pré-rendu bots)
 *  - src/lib/blog-redirects.ts (SSR TanStack) — miroir vérifié par
 *    scripts/validate-blog-redirects-sync.cjs
 *  - cloudflare-worker/iktracker-bot-router.js (map LEGACY_REDIRECTS) — miroir
 *    vérifié par le même script
 *
 * Clé = slug legacy (sans /blog/), valeur = chemin absolu de destination.
 */
export const BLOG_SLUG_REDIRECTS: Record<string, string> = {
  // Cluster « frais réels vs forfait »
  "frais-reels-vs-forfait": "/blog/frais-reels-ou-forfait-optimisation-impots-2026",
  "frais-reels-vs-forfait-guide-complet": "/blog/frais-reels-ou-forfait-optimisation-impots-2026",
  "frais-reels-ou-forfait-guide-independants-2026":
    "/blog/frais-reels-ou-forfait-optimisation-impots-2026",
  "frais-reels-ou-forfait-independants-impots-2026":
    "/blog/frais-reels-ou-forfait-optimisation-impots-2026",
  "frais-reels-ou-abattement-forfaitaire-simulation-2026":
    "/blog/frais-reels-ou-abattement-choisir",
  "frais-reels-vs-forfait-guide-optimisation-impots":
    "/blog/seuil-rentabilite-frais-reels-kilometrage-annuel",

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

  // Cluster « calcul / étapes » → page pilier produit « indemnités kilométriques »
  "7-etapes-du-calcul-indemnite-frais-kilometriques": "/indemnites-kilometriques",
  "calculer-indemnites-kilometriques-2026-guide": "/indemnites-kilometriques",
  "comment-calculer-frais-kilometriques-remboursement": "/indemnites-kilometriques",
  "etapes-rapport-kilometrique": "/indemnites-kilometriques",
  "precision-calcul-frais-kilometriques-2026": "/indemnites-kilometriques",
  "etapes-declaration-fiscale-kilometrage-guide":
    "/blog/declaration-2042-ou-reporter-ses-indemnites-kilometriques",

  // Barème : renvoi vers la page pilier marketing
  "bareme-indemnites-kilometriques-2026-iktracker": "/bareme-ik-2026",
  "bareme-ik-2026-changements": "/bareme-ik-2026",

  // Doublons marque et erreurs
  "iktracker-nouveautes-2026": "/blog/iktracker-2026-nouveautes-tendances",
  "liste-des-erreurs-frequentes-allocation-kilometrique":
    "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",

  // Consolidation cannibalisation clusters 1-4 (28 août 2026)
  "anticiper-2026-securiser-et-maximiser-ses-indemnites-kilometriques-face-au-durci":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "indemnites-kilometriques-en-2026-comment-securiser-vos-remboursements-face-a-l-u":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "maximiser-ses-indemnites-kilometriques-le-guide-pour-une-conformite-sans-faille":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-et-maximiser-ses-indemnites-kilometriques-guide-complet-de-conformite-":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-ik-2026-le-guide-de-conformite-absolue-pour-dejouer-les-controles-":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-ik-en-2026-le-guide-ultime-anti-redressement-urssaf-pour-les-profe":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-ik-face-a-l-urssaf-en-2026-guide-de-conformite-absolue-pour-eviter":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-indemnites-2026-le-guide-ultime-du-suivi-kilometrique-conforme-ant":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-indemnites-kilometriques-2026-conformite-urssaf-et-automatisation-":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-indemnites-kilometriques-2026-le-guide-anti-redressement-urssaf-qu":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-indemnites-kilometriques-en-2026-grace-a-une-methode-anti-redresse":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-indemnites-kilometriques-en-2026-guide-de-conformite-anti-redresse":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-indemnites-kilometriques-en-2026-guide-de-survie-anti-redressement":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-indemnites-kilometriques-en-2026-l-arsenal-anti-redressement-urssa":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-indemnites-kilometriques-en-2026-le-guide-de-conformite-ultime-pou":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-indemnites-kilometriques-en-2026-le-guide-ultime-anti-redressement":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-indemnites-kilometriques-en-eliminant-les-erreurs-de-saisie-manuel":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-indemnites-kilometriques-face-a-l-urssaf-en-2026-la-methodologie-z":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-indemnites-kilometriques-face-a-l-urssaf-en-eliminant-les-erreurs-":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-indemnites-kilometriques-face-a-l-urssaf-guide-de-conformite-2026":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-remboursements-en-evitant-les-pieges-de-conformite-urssaf-un-audit":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-remboursements-en-evitant-les-pieges-de-l-urssaf-grace-a-un-audit-":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "securiser-ses-remboursements-kilometriques-en-2026-avec-l-automatisation-conform":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "indemnite-kilometrique-2026-les-7-regles-d-or-d-un-suivi-conforme-face-aux-contr":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "indemnite-kilometrique-evitez-le-redressement-urssaf-en-maitrisant-les-7-regles-":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "suivi-kilometrique-2026-les-7-regles-d-or-pour-un-dossier-ik-conforme-et-anti-re":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "suivi-kilometrique-conforme-2026-le-dossier-ik-qui-elimine-tout-risque-de-redres":
    "/blog/controle-urssaf-frais-kilometriques-2026",
  "calcul-des-indemnites-kilometriques-2026-le-guide-complet-pour-un-suivi-conforme":
    "/indemnites-kilometriques",
  "calcul-des-indemnites-kilometriques-2026-optimisez-vos-deplacements-professionne":
    "/indemnites-kilometriques",
  "calcul-des-indemnites-kilometriques-le-guide-complet-pour-les-professionnels-mob":
    "/indemnites-kilometriques",
  "calcul-des-indemnites-kilometriques-optimisez-vos-deplacements-pro-sans-risque-d":
    "/indemnites-kilometriques",
  "calcul-des-indemnites-kilometriques-optimisez-vos-deplacements-professionnels":
    "/indemnites-kilometriques",
  "calcul-des-indemnites-optimisez-vos-deplacements-pro-avec-un-suivi-kilometrique-":
    "/indemnites-kilometriques",
  "calcul-des-indemnites-optimisez-vos-deplacements-pro-et-securisez-vos-remboursem":
    "/indemnites-kilometriques",
  "calcul-des-indemnites-optimisez-vos-deplacements-pro-grace-aux-secrets-des-exper":
    "/indemnites-kilometriques",
  "optimisez-vos-deplacements-professionnels-le-guide-complet-pour-vos-indemnites-k":
    "/indemnites-kilometriques",
  "7-erreurs-courantes-d-indemnite-kilometrique-a-eviter-absolument-pour-neutralise":
    "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
  "indemnite-kilometrique-comment-eviter-le-redressement-urssaf-lors-d-un-controle":
    "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
  "indemnite-kilometrique-comment-eviter-un-redressement-urssaf-en-2026":
    "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
  "indemnite-kilometrique-comment-securiser-votre-suivi-et-eviter-un-redressement-u":
    "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
  "indemnite-kilometrique-desamorcez-les-7-erreurs-qui-declenchent-un-redressement-":
    "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
  "indemnite-kilometrique-eviter-le-controle-urssaf-en-securisant-vos-declarations":
    "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
  "meilleures-pratiques-suivi-kilometrique-professionnels":
    "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
  "suivi-kilometrique-les-7-astuces-des-professionnels-pour-eviter-un-redressement-":
    "/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter",
};
