UPDATE public.blog_posts
SET status = 'archived', updated_at = now()
WHERE slug IN (
  'frais-reels-vs-forfait',
  'frais-reels-vs-forfait-guide-complet',
  'frais-reels-ou-forfait-guide-independants-2026',
  'frais-reels-ou-forfait-independants-impots-2026',
  'frais-reels-ou-abattement-forfaitaire-simulation-2026',
  'comment-optimiser-ses-frais-auto-sans-risque-guide-de-conformite-urssaf-et-autom',
  'comment-optimiser-ses-frais-pro-auto-en-respectant-le-bareme-urssaf-sans-perdre-',
  'comment-optimiser-ses-frais-pro-auto-en-s-alignant-sur-le-bareme-urssaf',
  'frais-auto-et-urssaf-optimiser-ses-remboursements-sans-risquer-le-redressement-f',
  'comment-transformer-votre-suivi-kilometrique-2026-en-bouclier-anti-redressement-',
  'dossier-ik-2026-l-art-de-blinder-son-suivi-kilometrique-contre-les-controles-urs',
  'regles-suivi-kilometrique-conforme-urssaf',
  'calculer-indemnites-kilometriques-2026-guide',
  'comment-calculer-frais-kilometriques-remboursement',
  'etapes-rapport-kilometrique',
  'precision-calcul-frais-kilometriques-2026',
  'bareme-indemnites-kilometriques-2026-iktracker',
  'iktracker-nouveautes-2026',
  'liste-des-erreurs-frequentes-allocation-kilometrique'
);