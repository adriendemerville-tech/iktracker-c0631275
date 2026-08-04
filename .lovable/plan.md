# Audit des dernières 24h — bugs, faiblesses, imprécisions

Périmètre audité : migration TanStack Start (SSR + `head()`), sitemap dynamique, génération des couvertures blog, consolidation éditoriale du blog (19 articles archivés, 23 redirections 301), Worker Cloudflare.

## Ce qui est vérifié bon

- Typecheck sans erreur, aucune erreur runtime en preview.
- SSR propre : 1 seul `<title>`, 1 canonical, 1 og:title, 1 description par page (pas de doublon Helmet/head).
- `/blog/frais-reels-vs-forfait` renvoie bien un **301** vers le pilier.
- Les 9 cibles de redirection existent et sont `published` ; 19 articles bien `archived`.
- Listes de pages statiques du sitemap SSR et de l'Edge Function `sitemap` strictement identiques.

## Problèmes relevés

### P1 — Impact SEO direct

1. **Bots pré-rendus : soft 404 sur les 19 slugs archivés.** L'Edge Function `meta-renderer` ne connaît pas la table de redirection : elle ne trouve pas l'article (`status = 'published'`) et renvoie une page générique en 200. Google voit 19 soft 404 au lieu de 19 x 301.
2. **4 articles publiés pointent encore vers des slugs archivés** dans leur contenu (`suivi-kilometrique-infirmiere-optimisation`, `frais-reels-ou-abattement-forfaitaire-independant-2026`, `indemnites-kilometriques-2026-guide-complet`, `meilleur-outil-indemnite-kilometrique-france-reddit`). Liens internes qui partent en chaîne de redirection au lieu de pointer sur le pilier.
3. **Le Worker Cloudflare n'intercepte toujours pas `iktracker.fr`** (bypass Orange-to-Orange). Les 301 du Worker sont inertes ; seules les 301 SSR fonctionnent. Tant que ce point n'est pas tranché, les règles Worker (logpush, cache, pré-rendu bots) ne s'appliquent pas.

### P2 — Cohérence / dette

4. **Triple source de vérité pour les redirections** : `src/lib/blog-redirects.ts`, `LEGACY_REDIRECTS` du Worker, et rien côté `meta-renderer`. Toute évolution future va dériver.
5. **Double source de vérité pour le sitemap** : route SSR `sitemap[.]xml.ts` et Edge Function `sitemap`. Aujourd'hui identiques, demain non.
6. **`robots.txt` obsolète** : la liste des pages clés en commentaire ne contient ni `/artisans`, ni `/independants`, ni `/fonctionnalites`, ni `/frais-reels`… ajoutées depuis.
7. **`/admin` redirige en 307** (pas de `statusCode: 301`) alors que toutes les autres alias routes sont en 301.
8. **1 article publié sans image de couverture** après le backfill Wavespeed.
9. **47 fichiers utilisent encore `Helmet`** en parallèle des `head()` TanStack. Pas de doublon observé aujourd'hui, mais deux systèmes de métadonnées coexistent — source de régression silencieuse.

## Plan de tâches proposé

### Lot 1 — Corriger les soft 404 pour les bots (P1)
- Ajouter dans `meta-renderer` la même table de redirection et renvoyer un vrai `301` (ou, à défaut, la balise canonical du pilier) pour tout slug archivé.
- Faire lire la table depuis une source unique partagée (`supabase/functions/_shared/blog-redirects.ts`) importée aussi côté app.

### Lot 2 — Nettoyage des liens internes (P1)
- Réécrire dans les 4 articles concernés les liens vers slugs archivés pour pointer directement sur le pilier de destination.
- Contrôle SQL de non-régression après mise à jour.

### Lot 3 — Unification des sources de vérité (P2)
- Redirections : un seul module partagé, le Worker et le `meta-renderer` le consomment.
- Sitemap : garder la route SSR comme unique génération, l'Edge Function `sitemap` devient un simple proxy (ou est supprimée après bascule du Worker).

### Lot 4 — Finitions SEO (P2)
- Mettre `robots.txt` à jour (pages clés + disclaimers alignés sur `llms.txt`).
- Passer `/admin` en 301.
- Générer la couverture manquante du dernier article publié sans image.

### Lot 5 — Décision infrastructure (P1, dépend de toi)
- Trancher la bascule Worker Custom Domain sur `iktracker.fr` (ou abandonner le Worker et tout porter en SSR).
- Selon la décision : soit finaliser le DNS/publication, soit supprimer la duplication Worker et documenter.

### Lot 6 — Dette Helmet (P2, optionnel)
- Retirer progressivement `Helmet` des pages dont la route porte déjà un `head()`, en commençant par les pages publiques indexables.

Documentation : `docs/BACKEND.md` et `docs/FRONTEND.md` seront mis à jour à la fin des lots 1 à 4.
