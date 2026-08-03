## Plan — Correction SEO/GEO de la page /artisans

Objectif : faire passer `/artisans` de 0 mot-clé positionné à une page captant le champ « frais kilométriques + chantier/artisan », et renforcer sa citabilité par les IA (canal n°1 : 44,6 % via ChatGPT).

---

### Lot 1 — Ciblage sémantique (impact SEO le plus direct)

Fichier : `src/pages/Artisans.tsx`

- Réécrire le `<title>` autour du champ à volume : « Frais kilométriques artisan : suivi des trajets de chantier » (< 60 caractères).
- Réécrire le H1 pour contenir le mot-clé principal, tout en gardant l'accroche métier : « Frais kilométriques artisan : vos trajets de chantier comptés ».
- Ajuster la `meta description` pour y inclure « frais kilométriques » et « barème 2026 ».
- Supprimer la balise `<meta name="keywords">` (ignorée par Google, bruit inutile).
- Reformuler 2 sous-titres H2 en formulations interrogatives à intention de recherche (« Comment calculer les frais kilométriques d'un artisan ? »).

### Lot 2 — Maillage interne depuis les pages qui ont de l'autorité

Le trafic du domaine est concentré sur `/bareme-ik-2026` (position 3 sur « ik 2026 », 27 100 rech./mois sur « barème kilométrique 2026 »). Aucune de ces pages ne pointe vers `/artisans`.

- Ajouter un lien contextuel depuis `src/pages/BaremeIK2026.tsx` vers `/artisans` (ancre : « frais kilométriques d'un artisan du bâtiment »).
- Ajouter un lien depuis `src/pages/FraisReels.tsx` (position 11-13 sur « simulation des frais réels »).
- Ajouter `/artisans` dans le bloc de liens métier de `src/pages/Fonctionnalites.tsx` et `src/pages/ExpertComptable.tsx`.
- Vérifier la réciprocité : `/artisans` doit lier vers `/bareme-ik-2026` (déjà fait) et vers `/frais-reels` (manquant).

### Lot 3 — Contenu GEO (citabilité par les IA)

- Remplacer/compléter la FAQ par des questions à volume réel mesuré :
  - « Comment calculer les frais kilométriques d'un artisan ? » (1 000 rech./mois)
  - « Comment justifier ses frais kilométriques aux impôts ? » (1 900 rech./mois)
  - Conserver les questions de désambiguïsation (Suivi IK, gratuité, PWA).
- Ajouter un tableau HTML brut du barème 2026 pour véhicule utilitaire (par puissance fiscale et tranche kilométrique) — les LLM citent en priorité les tables factuelles sans JS.
- Mettre à jour le `FAQPage` JSON-LD en conséquence.

### Lot 4 — Données structurées et pré-rendu

- Ajouter un JSON-LD `HowTo` sur la section « journée type » (le contenu existe déjà, il n'est pas structuré).
- Ajouter `datePublished` / `dateModified` au schema `Article`.
- Répercuter les nouveaux titres, FAQ et tableau dans le pré-rendu bots : `supabase/functions/meta-renderer/index.ts` (bloc `/artisans`), puis redéployer la fonction.
- Vérifier le rendu bot en production sur `https://iktracker.fr/artisans`.
- Mettre à jour `docs/BACKEND.md` (modification du meta-renderer).

---

### Détails techniques

- Aucune modification de logique métier ni de base de données.
- Le tableau du barème utilitaire doit réutiliser la source de vérité existante du barème (mémoire « IK Tiered Scale ») et non des valeurs recopiées à la main.
- Le pré-rendu `meta-renderer` doit rester synchronisé avec le contenu React : toute FAQ ajoutée côté page doit l'être aussi côté fonction, sinon les IA lisent une version différente de celle des utilisateurs.
- Pas de nouvelle route, donc pas de mise à jour du sitemap nécessaire.

### Mesure du résultat

Re-lancer `page_analysis` Semrush sur `/artisans` dans 4 à 6 semaines : l'objectif réaliste est une première apparition sur des requêtes longue traîne « frais kilométriques + chantier/artisan », pas un positionnement sur « barème kilométrique 2026 » (déjà couvert par `/bareme-ik-2026`, qu'il ne faut pas cannibaliser).

### Ordre recommandé

Lot 1 → Lot 2 → Lot 3 → Lot 4. Les lots 1 et 2 sont les plus rentables et peuvent être livrés ensemble.
