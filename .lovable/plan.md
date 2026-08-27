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

## 0. Ce qui manquait (revue v3)

Le plan v2 couvrait l'essentiel mais restait sous les standards d'un forum
moderne. Ajouts retenus, inspirés de Reddit et de jeuxvideo.com :

- Reddit : vote haut/bas avec score visible, tri Récent/Actif/Populaire,
  enregistrement personnel d'une discussion, partage en un clic, réponse
  « meilleure réponse » épinglée par l'auteur, réponses imbriquées sur
  2 niveaux, aperçu de lien, signalement communautaire, karma (nos niveaux).
- jeuxvideo.com : catégories fortes en page d'accueil, fil « dernières
  réponses », pastille « nouveau depuis votre dernière visite », pagination
  claire et lisible sans JS, profil public simple avec ancienneté et compteur
  de messages.
- Ajouts propres à IKtracker : pièces jointes (photo/PDF de relevé), liens
  SAV et tutoriel en évidence, recommandations de discussions.

Volontairement exclus pour l'instant : messagerie privée, notifications push,
flux personnalisé algorithmique, récompenses payantes.

## 1. Identité utilisateur

Table `forum_profiles`, une ligne par utilisateur, pré-remplie à la première visite
à partir du compte :
- pseudo (par défaut dérivé du prénom/email, modifiable, unique)
- avatar (upload dans un bucket public `forum-avatars`, redimensionné)
- bio courte
- métier / persona : repris de `user_preferences.persona` renseigné à
  l'inscription, affiché publiquement sous le pseudo (ex. « Artisan »,
  « Infirmier libéral »), modifiable depuis le profil forum
- ancienneté = date de création du compte
- compteurs : discussions créées, réponses, votes positifs reçus

Champs privés jamais exposés publiquement : email, plaque, nom réel.
Vue publique `forum_public_profiles` exposant uniquement les champs sûrs
(pseudo, avatar, persona, niveau, ancienneté, compteurs).


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

### 2.1 Célébration de passage de niveau (nouveau)

Objectif : marquer le moment sans bloquer l'usage, renforcer la rétention.

- Détection : le trigger de recalcul compare ancien/nouveau niveau ; si
  progression, il insère une ligne `forum_level_events` (user_id, niveau,
  created_at, seen_at NULL).
- Déclencheur UI : au chargement de `/app/forum` (et après chaque action
  post/vote via invalidation TanStack Query), une requête récupère les
  événements non vus ; la modale s'affiche pour chacun puis marque `seen_at`.
- Modale animée (composant `LevelUpDialog`, Motion for React) :
  1. Ouverture : fondu + scale 0.9 → 1 (spring, `stiffness 260, damping 20`).
  2. Badge du nouveau niveau : entrée en rotation légère + rebond, halo
     lumineux pulsé (`box-shadow` animé sur la couleur du niveau).
  3. Confettis discrets en canvas (couleurs de la charte, ~120 particules,
     1,8 s max, désactivés si `prefers-reduced-motion`).
  4. Texte : « Vous êtes désormais Habitué » + récapitulatif (X réponses,
     Y votes utiles) + CTA « Continuer ».
- Couleur par niveau (tokens sémantiques dans `src/styles.css`) :
  Contributeur = secondary, Habitué = accent, Référent = primary, Expert =
  dégradé primary → accent avec badge doré.
- Son : aucun. Accessibilité : `role="dialog"`, focus piégé, fermeture Échap,
  version statique sans animation si `prefers-reduced-motion`.
- Une seule modale à la fois : les événements multiples s'affichent en file,
  du plus ancien au plus récent.
- L'événement Expert déclenche aussi une notification email récapitulative
  (réutilisable plus tard pour d'autres jalons).

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

### 3.1 Sitemap dynamique (nouveau)

Oui, il en faut un dédié. Le sitemap actuel liste pages statiques + blog ;
le forum grossira vite et changera tous les jours.

- Nouvelle route SSR `src/routes/forum-sitemap[.]xml.ts` listant les
  discussions `seo_indexable = true`, avec `lastmod` = dernière activité.
- `sitemap.xml` devient un index de sitemaps référençant le sitemap principal
  et le sitemap forum (proxy Worker Cloudflare inchangé).
- Pagination du sitemap forum par tranches de 5 000 URL au-delà du seuil.
- Publication d'une discussion indexable → soumission automatique via la
  file `indexing_submissions` (IndexNow + Google Indexing API déjà en place).

### 3.2 Pièces jointes (nouveau)

Photos et PDF autorisés dans une discussion comme dans une réponse.

- Bucket `forum-attachments`, écriture réservée au propriétaire authentifié,
  lecture publique.
- Types acceptés : jpg, png, webp, heic, pdf. 5 Mo max par fichier,
  4 fichiers max par message ; validation MIME + extension côté serveur.
- Images : miniature générée et affichage en lightbox ; PDF : carte avec nom,
  taille et lien de téléchargement.
- Suppression du fichier si le message est supprimé ou modéré.
- Anti-abus : les pièces jointes ne sont visibles publiquement qu'après le
  passage du bot modérateur ; jamais d'exécution, `Content-Disposition`
  approprié.

### 3.3 Actions au survol : enregistrer et partager (nouveau)

Sous chaque discussion (liste et page détail), barre d'actions révélée au
survol (toujours visible au tactile) :
- Voter (haut/bas) avec score.
- Enregistrer : table `forum_saved_posts` (user_id, discussion_id) ;
  retrouvable dans `/app/forum/enregistrees`. Sans session, le clic propose
  la connexion.
- Partager : `navigator.share` sur mobile, sinon copie du lien avec toast,
  plus liens LinkedIn / X / e-mail.
- Signaler : envoi en file de modération.


## 4. Bots

- Classement automatique en catégorie + génération slug/meta.
- Détection de doublons : recherche de similarité avant publication, suggestion
  « cette discussion existe déjà » avec lien.
- Bot SAV IKtracker : première réponse experte, signalée comme réponse IA.
- Bot modérateur : suppression des insultes, masquage des propos racistes,
  homophobes, xénophobes, antisémites ; journalisation dans une table de modération.

## 5. Surfaces

- `/forum` : home du forum, public, SSR, indexable.
- `/forum/<slug>` : discussion, public, SSR, indexable.
- `/app/forum` : espace connecté — création, réponses, votes, profil.
- `/app/profile` : édition du profil forum (pseudo, avatar, bio).
- Admin : file de modération, discussions signalées, contrôle de l'indexation.

### 5.1 Entrée depuis la home (nouveau)

Lien « Forum » ajouté dans le header public (desktop : à côté des liens
existants ; mobile : dans le menu plein écran), pointant vers `/forum`.
Pour un utilisateur connecté, le header de `/app` pointe vers `/app/forum`.
Ajout au footer et au maillage interne (page pilier, blog) pour l'autorité SEO.

### 5.2 Home du forum `/forum` (nouveau)

Rendue en SSR, entièrement lisible sans compte :
- En-tête : titre H1 « Forum IKtracker », phrase de positionnement, compteurs
  (discussions, réponses, membres) et CTA « Poser une question ».
- Filtres par catégorie (finances, urssaf, salarié, retraite, mutuelle,
  véhicules, imposition, facturation électronique) sous forme de liens
  `/forum?categorie=...` (SSR, pas de state client obligatoire).
- Tri : Récentes / Actives / Populaires (votes), par paramètre d'URL.
- Liste de discussions : titre (lien vers le slug), extrait, catégorie, pseudo
  + métier + badge de niveau de l'auteur, date, réponses, votes, indicateur de
  pièce jointe, et actions au survol (§3.3).
- Bloc « Besoin d'aide tout de suite ? » avec liens vers la page SAV et la
  page Tutoriel, placé haut de page et répété en bas.
- Bloc « Discussions recommandées » : sélection mêlant les plus utiles
  (votes + réponse validée), les récentes sans réponse, et les discussions
  proches du métier du visiteur quand il est connecté.
- Colonne latérale : dernières réponses, membres les plus actifs, règles de
  la communauté.
- Pagination SSR indexable (`/forum?page=2`), `rel=canonical` propre.
- JSON-LD : `CollectionPage` + `BreadcrumbList` + `ItemList` des discussions.


### 5.3 Rédiger sans compte, publier connecté (nouveau)

Tout le monde peut ouvrir l'éditeur (nouvelle discussion ou réponse) ; seule la
publication exige un compte connecté.

- L'éditeur est accessible depuis `/forum` et depuis une discussion.
- Le brouillon est conservé en `localStorage` (clé par cible : `new` ou
  l'identifiant de la discussion), avec sauvegarde continue.
- Au clic sur « Publier » sans session : redirection vers `/auth` avec le
  paramètre de retour ; après connexion ou inscription, retour à l'éditeur,
  brouillon restauré, publication en un clic.
- Aucune écriture serveur anonyme : les server functions de publication passent
  par `requireSupabaseAuth`, les RLS n'autorisent l'insertion qu'au propriétaire.
- Message clair sous l'éditeur : « Lecture libre. Un compte gratuit est requis
  pour publier. » plutôt qu'un blocage de la saisie.


## 6. Ordre de livraison

1. Migration DB : profils, niveaux, discussions, réponses, votes, modération,
   RLS + GRANT, bucket avatars.
2. Server functions : CRUD, similarité, votes, profil.
3. Agents IA (classement, SAV, modération) via la passerelle Lovable AI.
4. UI `/app/forum` + fiche profil + modale de passage de niveau (§2.1).
5. Surface publique SSR : home `/forum` (§5.2), discussions, lien header (§5.1),
   éditeur ouvert avec publication après connexion (§5.3), JSON-LD + sitemap.

6. Admin modération + mise à jour `docs/BACKEND.md`.

## Détails techniques

- Bots : `openai/gpt-5.6-sol` via `createServerFn`, jamais côté client.
- Slug : normalisation sans accents, stop-words français retirés, max 4 segments,
  suffixe numérique en cas de collision.
- Indexation : `seo_indexable` passe à vrai quand la discussion a au moins une
  réponse et n'est pas en file de modération ; le sitemap SSR lit ce drapeau.
- Avatars : bucket public, politique d'écriture limitée au propriétaire.
