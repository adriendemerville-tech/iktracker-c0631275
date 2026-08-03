## Plan — Désambiguïsation du blog : consolidation, pruning et réorientation

81 articles publiés, ~30 redondants. Google alterne les URLs candidates sur les mêmes intentions et n'en consolide aucune : c'est la cause la plus probable des faibles impressions. Trois traitements, appliqués article par article.

### Les trois traitements

| Traitement | Quand | Effet |
|---|---|---|
| Consolidation | Deux articles couvrent la même intention et les deux ont du contenu utile | Le meilleur devient le pilier, l'autre est fusionné dedans puis archivé + 301 |
| Pruning | Article redondant, court, sans trafic ni backlink, rien à récupérer | Archivé (statut `archived`) + 301 vers le pilier du cluster |
| Réorientation | Article redondant mais qui peut servir une intention voisine non couverte | Réécrit sur un nouvel angle, nouveau slug, 301 depuis l'ancien |

Règle de choix du pilier par cluster : impressions GSC d'abord, puis profondeur du contenu, puis ancienneté de l'URL.

---

### Lot 1 — Cluster « frais réels vs forfait » (10 articles → 1 pilier + 2 satellites)

Le cluster le plus dommageable.

- Pilier : l'URL avec le plus d'impressions GSC sur « frais réels ou forfait ».
- Consolidation : récupérer dans le pilier les tableaux comparatifs et exemples chiffrés des 2 meilleurs doublons.
- Pruning : archiver + 301 les 5 à 6 variantes de slug quasi identiques (`...-guide-complet`, `...-guide-optimisation-impots`, `...-independants-impots-2026`, etc.).
- Réorientation : 2 articles conservés mais réécrits sur des intentions distinctes réellement demandées — « seuil de rentabilité des frais réels selon le kilométrage annuel » et « frais réels quand on a plusieurs véhicules ».

### Lot 2 — Cluster « URSSAF / anti-redressement » (7 articles d'août 2026)

Articles produits en série, très proches, ~7 000 signes chacun.

- Pilier : `controle-urssaf-frais-kilometriques-2026` (le plus ancien, le plus structuré).
- Consolidation : fusionner les checklists et les 7 règles d'or dans le pilier.
- Pruning : archiver + 301 les 4 titres « comment optimiser ses frais pro auto… » qui ne se distinguent que par la formulation.
- Réorientation : 1 article vers « que demande exactement un contrôleur URSSAF : liste des pièces », intention procédurale non couverte.

### Lot 3 — Cluster « calcul / étapes / méthode IK »

`7-etapes-du-calcul...`, `calculer-indemnites-kilometriques-2026-guide`, `comment-calculer-frais-kilometriques-remboursement`, `etapes-rapport-kilometrique`, `etapes-declaration-fiscale-kilometrage-guide`.

- Pilier : le guide de calcul 2026.
- Pruning : 2 articles.
- Réorientation : `etapes-declaration-fiscale-kilometrage-guide` vers l'intention « déclaration 2042 : où reporter ses IK », qui est une étape aval distincte du calcul.

### Lot 4 — Cluster « barème 2026 » et protection de la page pilier

`bareme-ik-2026-changements` (3 160 signes) et `bareme-indemnites-kilometriques-2026-iktracker` concurrencent la page `/bareme-ik-2026`, qui est en position 3 et porte le trafic du domaine.

- Aucun article de blog ne doit viser « barème kilométrique 2026 » : la page pilier est `/bareme-ik-2026`.
- Pruning : archiver `bareme-ik-2026-changements` + 301 vers `/bareme-ik-2026`.
- Réorientation : l'article « guide complet » est réécrit en cas d'usage produit et son titre/H1 retiré du champ « barème 2026 ».

### Lot 5 — Maillage et vérification

- Chaque pilier reçoit des liens depuis les articles conservés du cluster (ancre exacte de l'intention).
- Chaque pilier lie vers la page marketing correspondante (`/bareme-ik-2026`, `/frais-reels`, `/artisans`, `/independants`).
- Regénération du sitemap : les archivés disparaissent, les 301 sont testés un par un.
- Nouvelle passe de cannibalisation sur les clusters restants (véhicules éligibles, professions) après stabilisation.

---

### Détails techniques

- Le pruning utilise le statut `archived` existant de `blog_posts` : l'article sort des listes et du sitemap, reste accessible par URL directe. Pas de suppression physique.
- Les 301 sont ajoutés côté Cloudflare Worker `iktracker-bot-router` (redirections permanentes, servies avant le cache) — pas de redirection côté React.
- Les slugs archivés doivent être remontés à Crawlers : le code `409 slug_in_trash` empêche déjà la republication automatique, mais la liste des slugs morts doit être transmise.
- Aucune modification de schéma de base de données.
- `docs/BACKEND.md` mis à jour (nouvelles règles de redirection Worker).

### Ce dont j'ai besoin avant de lancer

Les impressions GSC par URL sur 90 jours, pour choisir les piliers sur des données plutôt qu'au jugé. Je peux les récupérer via la connexion Search Console déjà en place.

### Ordre recommandé

Lot 1 (impact maximal) → Lot 2 → Lot 4 (protège le trafic existant) → Lot 3 → Lot 5. Chaque lot est livrable indépendamment.
