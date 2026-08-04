UPDATE public.blog_posts p
SET content = c.new_content,
    updated_at = now()
FROM (
  SELECT id,
    replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
      content,
      '/blog/frais-reels-vs-forfait-guide-complet', '/blog/frais-reels-ou-forfait-optimisation-impots-2026'),
      '/blog/frais-reels-ou-forfait-guide-independants-2026', '/blog/frais-reels-ou-forfait-optimisation-impots-2026'),
      '/blog/frais-reels-ou-forfait-independants-impots-2026', '/blog/frais-reels-ou-forfait-optimisation-impots-2026'),
      '/blog/frais-reels-vs-forfait-guide-optimisation-impots', '/blog/seuil-rentabilite-frais-reels-kilometrage-annuel'),
      '/blog/frais-reels-ou-abattement-forfaitaire-simulation-2026', '/blog/frais-reels-ou-abattement-choisir'),
      '/blog/frais-reels-vs-forfait', '/blog/frais-reels-ou-forfait-optimisation-impots-2026'),
      '/blog/regles-suivi-kilometrique-conforme-urssaf', '/blog/controle-urssaf-frais-kilometriques-2026'),
      '/blog/calculer-indemnites-kilometriques-2026-guide', '/blog/7-etapes-du-calcul-indemnite-frais-kilometriques'),
      '/blog/comment-calculer-frais-kilometriques-remboursement', '/blog/7-etapes-du-calcul-indemnite-frais-kilometriques'),
      '/blog/etapes-rapport-kilometrique', '/blog/7-etapes-du-calcul-indemnite-frais-kilometriques'),
      '/blog/precision-calcul-frais-kilometriques-2026', '/blog/7-etapes-du-calcul-indemnite-frais-kilometriques'),
      '/blog/etapes-declaration-fiscale-kilometrage-guide', '/blog/declaration-2042-ou-reporter-ses-indemnites-kilometriques'),
      '/blog/bareme-indemnites-kilometriques-2026-iktracker', '/bareme-ik-2026'),
      '/blog/iktracker-nouveautes-2026', '/blog/iktracker-2026-nouveautes-tendances'),
      '/blog/liste-des-erreurs-frequentes-allocation-kilometrique', '/blog/7-erreurs-courantes-indemnite-kilometrique-a-eviter'
    ) AS new_content
  FROM public.blog_posts
  WHERE status = 'published'
) c
WHERE p.id = c.id AND p.content IS DISTINCT FROM c.new_content;