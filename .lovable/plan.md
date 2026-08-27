# Forum communautaire IKtracker

## Mon avis

L'idée est bonne : un forum modéré et enrichi par l'IA crée du contenu long-tail réel (questions d'artisans, URSSAF, véhicules...) que le blog ne couvre pas. Deux points d'attention :

1. **Indexation vs `/app`** : `/app/*` est en `noindex` strict (règle du projet). Un forum entièrement dans `/app` ne sera jamais indexé. Solution retenue : **double surface**
   - `/communaute` et `/communaute/{categorie}/{slug}` : **public, SSR, indexable** (lecture seule pour les visiteurs, CTA connexion pour répondre).
   - `/app/forum` : même contenu, mais avec composition, réponses, votes, notifications pour les utilisateurs connectés.
   Une discussion n'est publiée publiquement qu'après passage du bot modérateur (statut `published`), ce qui protège le domaine.

2. **Qualité SEO** : Google déclasse les forums vides ou spammés. On n'indexe donc que les discussions ayant au moins 1 réponse (bot SAV inclus) et pas de flag de modération. Les autres restent `noindex` jusqu'à maturité.

## Fonctionnement

**Créer une discussion** (utilisateur connecté)
- Champ titre + contenu. À la frappe, recherche de similarité sur les discussions récentes → panneau « Ces discussions existent déjà » avec liens ; l'utilisateur peut continuer ou rejoindre l'existante.
- À la publication, l'IA classe automatiquement dans une des 9 catégories : finances, urssaf, salarié, retraite, complémentaire santé, mutuelle, véhicules, imposition, facturation électronique.

**Bot SAV IKtracker**
- Répond automatiquement à chaque nouvelle discussion : réponse factuelle (barème, règles URSSAF/DGFiP, usage de l'app), ton pragmatique, avec lien vers la page pilier pertinente quand utile. Réponse marquée « Assistant IKtracker » et non votable en négatif de façon anonyme (les votes restent ouverts, mais la réponse est identifiée comme IA).

**Réponses & votes**
- Tout utilisateur connecté peut répondre (fil à 1 niveau d'imbrication pour rester lisible).
- Boutons pouce haut / pouce bas sous chaque réponse, 1 vote par utilisateur, score affiché, tri des réponses par score.

**Bot modérateur**
- À chaque création de discussion ou réponse : filtre lexical immédiat (liste de termes insultants / racistes / homophobes / xénophobes / antisémites) → masquage des mots par `***`, puis analyse IA de contexte.
- Verdicts : `ok` (publié), `masked` (publié avec mots masqués), `blocked` (contenu non publié, l'auteur voit son message avec le motif), `review` (visible seulement de l'auteur, en attente admin).
- File de modération dans l'admin : voir, valider, supprimer, bannir un auteur.

## Détails techniques

**Base de données** (migration unique, RLS + GRANT)
- `forum_categories` (slug, nom, description, ordre) — les 9 catégories seedées.
- `forum_threads` : `id, user_id, category_id, title, slug, body, status(published|pending|blocked), is_bot_answered, reply_count, score, views, indexable, created_at, updated_at, last_activity_at, deleted_at`.
- `forum_replies` : `id, thread_id, user_id (null si bot), parent_id, body, is_bot, status, score, created_at, deleted_at`.
- `forum_votes` : `id, reply_id, user_id, value(1|-1)`, unique (reply_id, user_id) ; triggers de recalcul du score.
- `forum_moderation_events` : contenu original, verdict, motif, modèle utilisé.
- Politiques : lecture `anon` limitée aux lignes `status='published' AND deleted_at IS NULL` ; écriture `authenticated` sur ses propres lignes ; admin via `has_role`.
- Index : `(category_id, last_activity_at)`, `(thread_id, score)`, trigram sur `title` pour la détection de doublons.

**Serveur** (`createServerFn`, pas d'Edge Function)
- `src/lib/forum.functions.ts` : `listThreads`, `getThread` (publics, client publishable) ; `createThread`, `createReply`, `voteReply` (protégés par `requireSupabaseAuth`).
- `src/lib/forum-ai.server.ts` : classification catégorie, réponse bot SAV, modération — Lovable AI Gateway, modèle `openai/gpt-5.6-sol` via l'API Responses en streaming, consommé côté serveur.
- Détection de similarité : recherche plein texte/trigram sur les 90 derniers jours, top 5 au-dessus d'un seuil.

**Routes**
- Public : `src/routes/communaute/index.tsx`, `src/routes/communaute/$category/$slug.tsx` — SSR, `head()` avec title/description propres, JSON-LD `DiscussionForumPosting` + `BreadcrumbList`, canonical, `noindex` tant que la discussion n'est pas mûre.
- App : `src/routes/app/forum/index.tsx` et `.../$slug.tsx` — composition, votes, mes discussions.
- Admin : onglet Forum dans `/app/admin` (file de modération, stats).
- Sitemap : ajout dynamique des discussions indexables dans `src/routes/sitemap[.]xml.ts` (et validateur de sync).

**Tests & docs**
- Tests SSR : présence du JSON-LD `DiscussionForumPosting` et du texte de la discussion dans le HTML initial.
- Test unitaire du filtre lexical de modération.
- Mise à jour de `docs/BACKEND.md` (tables, RLS, fonctions IA) + régénération du PDF.

## Découpage de livraison

1. Migration DB + RLS + catégories seedées.
2. Serveur : CRUD forum, votes, similarité.
3. IA : classification, bot SAV, bot modérateur.
4. UI `/app/forum` (liste, création, fil, votes).
5. Surface publique `/communaute` SSR + SEO + sitemap.
6. Modération admin, tests, docs.
