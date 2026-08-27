# Forum communautaire IKtracker — plan consolidé (v2)

Oui, la vision profils + niveaux + SEO par post s'intègre parfaitement. Elle renforce
les deux objectifs du forum : engagement (identité, gamification) et couverture
sémantique (une URL propre et indexable par question réelle d'utilisateur).

Deux réserves à cadrer dès le départ :
- Confidentialité : email et plaque d'immatriculation ne doivent jamais quitter le
  serveur pour un autre utilisateur. Le profil public n'expose que pseudo, avatar,
  niveau, ancienneté, catégorie d'activité.
- Qualité d'index : n'indexer une discussion qu'une fois qu'elle a une réponse
  utile (bot SAV validé ou réponse humaine votée), sinon Google voit des pages
  vides et cela pénalise le domaine.

## 1. Identité utilisateur (nouveau)

Table `forum_profiles`, une ligne par utilisateur, pré-remplie à la première visite
à partir du compte :
- pseudo (par défaut dérivé du prénom/email, modifiable, unique)
- avatar (upload dans un bucket public `forum-avatars`, redimensionné)
- bio courte, profession/persona (repris de `user_preferences`)
- ancienneté = date de création du compte
- compteurs : discussions créées, réponses, votes positifs reçus

Champs privés jamais exposés publiquement : email, plaque, nom réel.
Vue publique `forum_public_profiles` exposant uniquement les champs sûrs.

## 2. Niveaux

Calcul serveur, déterministe, à partir de (ancienneté en mois) + (participations)
+ (votes positifs reçus) :

```text
Nouveau      0-4 pts
Contributeur 5-19
Habitué      20-59
Référent     60-149
Expert       150+
```

Badge affiché à côté du pseudo, recalculé par trigger après chaque post/vote.

## 3. Discussions et SEO

Chaque discussion porte :
- titre (obligatoire, 10-120 caractères)
- catégorie auto-classée par IA parmi : finances, urssaf, salarié, retraite,
  complémentaire santé, mutuelle, véhicules, imposition, facturation électronique
- slug `/forum/<1-4 mots-clés séparés par des tirets>`, généré depuis le titre,
  dédoublonné, figé après publication
- date de création + date de dernière activité
- meta description générée par IA (150-160 caractères) résumant la question
- JSON-LD `DiscussionForumPosting` (auteur = pseudo, réponses = `Comment`,
  votes = `InteractionCounter`) + `BreadcrumbList`
- ajout automatique au sitemap une fois indexable

## 4. Bots

- Classement automatique en catégorie + génération slug/meta.
- Détection de doublons : recherche de similarité avant publication, suggestion
  « cette discussion existe déjà » avec lien.
- Bot SAV IKtracker : première réponse experte, signalée comme réponse IA.
- Bot modérateur : suppression des insultes, masquage des propos racistes,
  homophobes, xénophobes, antisémites ; journalisation dans une table de modération.

## 5. Surfaces

- `/forum` et `/forum/<slug>` : public, SSR, indexable, lecture seule pour les
  visiteurs, CTA de connexion pour participer.
- `/app/forum` : espace connecté — création, réponses, votes, profil.
- `/app/profile` : édition du profil forum (pseudo, avatar, bio).
- Admin : file de modération, discussions signalées, contrôle de l'indexation.

## 6. Ordre de livraison

1. Migration DB : profils, niveaux, discussions, réponses, votes, modération,
   RLS + GRANT, bucket avatars.
2. Server functions : CRUD, similarité, votes, profil.
3. Agents IA (classement, SAV, modération) via la passerelle Lovable AI.
4. UI `/app/forum` + fiche profil.
5. Surface publique SSR `/forum` + JSON-LD + sitemap.
6. Admin modération + mise à jour `docs/BACKEND.md`.

## Détails techniques

- Bots : `openai/gpt-5.6-sol` via `createServerFn`, jamais côté client.
- Slug : normalisation sans accents, stop-words français retirés, max 4 segments,
  suffixe numérique en cas de collision.
- Indexation : `seo_indexable` passe à vrai quand la discussion a au moins une
  réponse et n'est pas en file de modération ; le sitemap SSR lit ce drapeau.
- Avatars : bucket public, politique d'écriture limitée au propriétaire.
