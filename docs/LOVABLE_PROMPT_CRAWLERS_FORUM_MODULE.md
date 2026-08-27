# Prompt Lovable — Module Forum complet (Crawlers)

> À coller tel quel dans le chat Lovable du projet **Crawlers**.
> Réplique l'architecture forum déjà en production sur IKtracker (SSR TanStack Start + Lovable Cloud).

---

## Prompt à copier-coller

```
Implémente un module forum communautaire complet, type Reddit, SSR et indexable.

STACK IMPOSÉE
-------------
TanStack Start (routes fichiers dans src/routes), Lovable Cloud (Postgres + RLS),
TanStack Query, shadcn/ui, Tailwind. Aucune lib de routing tierce.
Respecte le design system Crawlers (violet / or / noir / blanc, pas d'emoji,
pas de bleu "IA", boutons bordure + texte sans fond).

1. BASE DE DONNÉES (une seule migration)
----------------------------------------
Tables dans public, chacune suivie de ses GRANT puis RLS puis policies :
- forum_categories(id, slug unique, name, description, sort_order, icon)
- forum_profiles(user_id PK -> auth.users, nickname unique, profession,
  avatar_path, bio, points int default 0, level text default 'Nouveau',
  created_at, updated_at)
- forum_discussions(id, slug unique, category_id, author_id, title, body,
  status text default 'published', seo_indexable bool default true,
  view_count int, vote_score int, reply_count int,
  last_activity_at, created_at, updated_at)
- forum_replies(id, discussion_id, author_id, parent_id nullable, body,
  vote_score int, is_accepted bool, created_at, updated_at)
- forum_votes(id, user_id, target_type check ('discussion','reply'),
  target_id, value smallint check (value in (-1,1)), unique(user_id,target_type,target_id))
- forum_attachments(id, discussion_id nullable, reply_id nullable, storage_path,
  mime_type, size_bytes, uploaded_by)
- forum_saves(user_id, target_type, target_id, created_at, PK composite)
- forum_reports(id, target_type, target_id, reporter_id, reason, status)
- forum_level_events(id, user_id, from_level, to_level, created_at)  -- pour l'animation

Règles RLS :
- lecture anon + authenticated sur categories / discussions publiées et
  seo_indexable / replies des discussions publiées / profils publics.
- écriture uniquement auth.uid() = author_id.
- modération via table user_roles + fonction security definer has_role(uuid, app_role).
  NE JAMAIS stocker le rôle sur le profil.
- GRANT explicites (select anon sur le public, select/insert/update/delete
  authenticated, all service_role) : sans GRANT, PostgREST renvoie 403.

Gamification : trigger sur insert de discussion/réponse/vote reçu qui incrémente
forum_profiles.points, recalcule level (Nouveau 0, Contributeur 50, Habitué 200,
Référent 600, Expert 1500) et insère une ligne dans forum_level_events au passage
de palier.

Storage : bucket privé `forum-attachments` et bucket privé `forum-avatars`,
accès par signed URL uniquement (les buckets publics sont bloqués).

2. LOGIQUE (src/lib/forum/)
---------------------------
- constants.ts : LEVELS, CATEGORIES seed, slugify FR (sans accents, kebab),
  buildDiscussionSlug(title) avec suffixe court anti-collision,
  buildMetaDescription(body, 155 chars).
- queries.ts : lectures SSR-safe (fetchCategories, fetchDiscussions({sort:
  'recent'|'popular'|'unanswered', category, limit}), fetchDiscussionBySlug,
  fetchForumStats, fetchProfile). Pas de secret, client publishable côté serveur.
- forum.functions.ts : createServerFn pour toutes les mutations
  (createDiscussion, createReply, vote, toggleSave, upsertProfile, reportContent,
  uploadAttachment) avec .middleware([requireSupabaseAuth]) et validation zod.
- schemas.ts : JSON-LD DiscussionForumPosting, CollectionPage, BreadcrumbList.

3. UI (src/components/forum/ + src/pages/forum/)
------------------------------------------------
Composants : ForumAvatar, ForumLevelBadge, ForumVote (up/down optimiste),
ForumActions (save / share / signaler), DiscussionCard, ForumComposer,
LevelUpDialog (animation de passage de niveau).
Pages : ForumHome (catégories + onglets Récent/Populaire/Sans réponse + stats),
ForumDiscussionPage (thread, réponses imbriquées 2 niveaux, réponse acceptée),
ForumProfilePage (surnom, métier, photo, bio, niveau, historique).

Brouillon sans compte : le composer persiste le brouillon en localStorage et
propose la connexion au moment de publier, puis republie automatiquement.

4. ROUTES SSR
-------------
- src/routes/forum/index.tsx
- src/routes/forum/$slug.tsx
- src/routes/forum/categorie/$category.tsx
- src/routes/app/forum/profil.tsx (protégée, sous _authenticated)
Chaque route publique : loader qui précharge les données, head() unique
(title < 60, description < 160, og:*, twitter:card, canonical) et scripts JSON-LD.
Le contenu textuel doit être présent dans le HTML initial (vérifiable par curl).

5. SEO
------
- Sitemap dédié : route SSR `src/routes/sitemap-forum[.]xml.ts` listant /forum,
  /forum/categorie/:slug et les discussions `status = 'published'` et
  `seo_indexable = true` (lastmod = last_activity_at, priorité 0.6-0.8,
  changefreq daily/weekly, pagination au-delà de 5 000 URL).
  Le sitemap principal ne référence le forum que par une entrée statique,
  dans un try/catch isolé : le forum ne doit jamais casser le sitemap global.
- robots.txt : directive `Sitemap: https://<domaine>/sitemap-forum.xml`,
  `Allow: /forum` et `/forum/`, `Disallow: /app/forum/`, `/forum/nouveau`
  et les paramètres de brouillon/prévisualisation (`/*?*draft=`, `/*?*preview=`).
- Lien "Forum" dans la navigation publique et dans la nav applicative.
- noindex sur les discussions status != 'published' ou seo_indexable = false.
- Les profils restent privés (sous /app), donc hors sitemap.

6. BOTS IA (optionnel mais prévoir les hooks)
---------------------------------------------
Prévoir deux server functions stubs : moderateContent (classification
spam/abus avant publication) et answerSupport (réponse SAV auto sur les
discussions de la catégorie support), branchées sur Lovable AI Gateway.

7. TESTS
--------
Vitest : slugification, calcul de niveau, présence des JSON-LD et du contenu
dans le HTML SSR des 3 routes publiques.

Ne pose pas de questions, implémente directement. Ordre : migration, lib,
composants, pages, routes SSR, sitemap, navigation, tests.
```

---

## Points de vigilance (issus de l'implémentation IKtracker)

- **GRANT obligatoires** après chaque `CREATE TABLE` : sans eux, l'API renvoie une erreur de permission même avec des policies correctes.
- **Buckets publics interdits** : avatars et pièces jointes en bucket privé + signed URL.
- **Rôles de modération** dans une table dédiée + fonction `security definer`, jamais sur le profil.
- **Sitemap** : entrées forum encapsulées dans un `try/catch` pour ne pas casser le sitemap global.
- **SSR** : vérifier avec `curl` que le texte des discussions est bien dans le HTML initial, pas seulement après hydratation.
