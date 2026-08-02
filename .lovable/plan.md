Suite au constat que les IA confondent IKtracker avec l'app Android payante « Suivi IK » et ignorent la moitié des fonctionnalités récentes, voici les tâches restantes. Les fichiers `llms.txt`, `knowledge.json` et `seo-schemas.ts` sont déjà corrigés — il reste à propager l'information là où les IA et Google la lisent réellement.

## Lot 1 — Rendu pour les bots et les IA (priorité haute)

Les LLM lisent surtout le HTML pré-rendu, pas les fichiers JSON annexes.

1. Injecter le bloc de désambiguïsation dans `meta-renderer` (Edge Function) : une section factuelle en texte brut sur chaque page pré-rendue, du type « IKtracker est une PWA gratuite disponible uniquement sur iktracker.fr — aucun store, aucune version payante ».
2. Ajouter le JSON-LD `disambiguatingDescription` + `installUrl` dans le pré-rendu, aujourd'hui présent uniquement côté React.
3. Vérifier que `knowledge.json` et `llms.txt` sont bien servis par le Worker Cloudflare avec le bon `Content-Type` et sans mise en cache trop longue, pour que la mise à jour soit visible rapidement.

## Lot 2 — Pages publiques visibles

4. Page `/tarifs` : ajouter un bloc explicite « Pas de version payante — attention aux applications tierces au nom proche », c'est la page que les IA citent pour les questions de prix.
5. Page `/installer` : clarifier « aucun téléchargement sur Google Play ni App Store, installation depuis le navigateur ».
6. Créer une FAQ publique de désambiguïsation (soit sur `/tarifs`, soit une page dédiée) avec le schéma FAQPage correspondant — c'est le format que les IA reprennent le plus volontiers.

## Lot 3 — Fonctionnalités absentes des pages publiques

Certaines fonctionnalités désormais déclarées dans les données structurées n'ont aucune page publique associée, ce qui affaiblit leur crédibilité aux yeux des moteurs :

7. Relevés mensuels/annuels envoyés automatiquement par email et archive des PDF : les mentionner sur `/expert-comptable`.
8. Saisie en langage naturel et dictée vocale : les mentionner sur `/mode-tournee` ou la page d'accueil.
9. Vérifier que `sitemap.xml` reste synchronisé (script `validate-sitemap-sync.cjs`) si une page est créée.

## Lot 4 — Documentation et contrôle

10. Mettre à jour `docs/BACKEND.md` et `docs/FRONTEND.md` avec la stratégie de désambiguïsation et régénérer le PDF backend.
11. Contrôle final : vérifier via le testeur de rendu bot que la page d'accueil pré-rendue contient bien la désambiguïsation et la liste de fonctionnalités à jour.
12. Publier, puis demander une réindexation dans Search Console pour les pages clés (accueil, tarifs, installer).

## Détails techniques

- `supabase/functions/meta-renderer/index.ts` importe déjà des constantes SEO ; le plus propre est d'y réutiliser `IKTRACKER_DISAMBIGUATION` en le dupliquant côté Deno (pas d'import cross-bundle possible), avec un commentaire de synchronisation.
- Les FAQ de désambiguïsation existent déjà dans `public/knowledge.json` : elles serviront de source unique pour le contenu des pages.
- Aucun changement de base de données ni de RLS n'est nécessaire.

## Ce que je ne ferai pas sans ton accord

- Ouvrir un signalement auprès de Google/de l'éditeur tiers sur la similarité de nom (hors périmètre technique).
- Créer une nouvelle page publique si tu préfères tout regrouper sur `/tarifs`.

Ordre recommandé : Lot 1 d'abord (impact immédiat sur ce que lisent les IA), puis 2, 3, 4.
