# Avis publics avec notation demi-étoile

Objectif : collecter des avis notés, les modérer en back-office, et n'afficher en front que les avis complets et bien notés — avec une note moyenne réutilisée dans les données structurées.

## 1. Collecte de l'avis

Nouveau bloc « Notez IKtracker pour le faire connaître » dans le panneau Avis / support (desktop et mobile), à côté du message existant :

- 5 étoiles à demi-crans : 1 tape sur l'étoile 4 = 3,5 ; 2 tapes = 4. Au survol/tape, la moitié gauche/droite de l'étoile est aussi cliquable à la souris.
- Champs demandés : prénom, nom, nom commercial de la société, métier (pré-rempli si connu), texte de l'avis.
- Publication conditionnée : l'avis n'est proposé à la publication que si prénom + nom + société sont renseignés **et** la note ≥ 3,5. Sinon il est enregistré comme simple retour interne (support), sans passer en file de publication.
- Message clair à l'utilisateur : « Votre avis sera publié après validation ».

## 2. Table et modération

Nouvelle table `public.reviews` :

- note (0,5 à 5 par pas de 0,5), texte, prénom, nom, société, métier, ville optionnelle
- statut : en attente / publié / refusé, date de publication, auteur (utilisateur connecté)
- accès : chacun voit et crée ses propres avis ; lecture publique limitée aux avis publiés ; modération réservée aux administrateurs

Nouvel onglet « Avis publics » dans l'espace admin (à côté d'Avis/support) : liste des avis en attente, aperçu du rendu, boutons publier / refuser / éditer la coquille, et compteur de moyenne.

## 3. Affichage en front

- Le carrousel de témoignages de la home affiche en priorité les avis réels publiés (nom, société, métier, ville), et complète avec les témoignages actuels s'il y en a moins de 6.
- Les avis sont chargés côté serveur (rendu SSR) pour rester visibles des moteurs et ne pas dégrader le temps de chargement.

## 4. Note moyenne et SEO

- La fonction de note agrégée existante lira `reviews` (avis publiés uniquement) : moyenne arrondie à 0,1 et nombre d'avis.
- Les données structurées AggregateRating des pages concernées utiliseront ces chiffres réels au lieu de valeurs figées, avec un seuil minimum (pas d'affichage sous 5 avis publiés) pour rester conforme aux règles Google.

## Détails techniques

- Migration : table `reviews` + GRANTs + RLS (lecture anonyme sur `status = 'published'`, écriture propriétaire, modération via `has_role(auth.uid(), 'admin')`), trigger `updated_at`.
- `get_aggregate_rating()` réécrite sur `reviews`, renvoyant `{ ratingValue, reviewCount }`, avec repli sur les valeurs actuelles sous le seuil.
- Composant `StarRatingInput` (demi-crans, clavier accessible) réutilisable ; intégré dans `FeedbackForm.tsx`.
- Lecture publique via server function + client publishable, consommée par `TestimonialsCarousel`.
- Admin : nouvel onglet dans `src/pages/Admin.tsx`, composant chargé en lazy.
- Docs : mise à jour de `docs/BACKEND.md` (nouvelle table + fonction).
