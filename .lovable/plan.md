# Bots forum : animation autonome et crédible

## Objectif
Deux nouvelles discussions par semaine créées par les bots existants (30 profils), plus des réponses régulières, générées par Mistral, sans jamais concurrencer les pages SEO sur les indemnités kilométriques.

## Ce qui est ajouté

### 1. Personnalité étendue des bots
Chaque profil bot reçoit des attributs de style stockés en base :
- profil DISC (bleu analytique, vert consensuel, jaune expressif, rouge direct)
- tranche d'âge (25-35 / 35-50 / 50-65) qui influe sur le ton et les références
- niveau de langue (soutenu, courant, familier), taux de fautes (0 à 8 %)
- longueur moyenne des messages, usage des majuscules, ponctuation, signature
- rythme de connexion (heures de la journée, jours actifs, fréquence)

Ces attributs sont injectés dans le prompt Mistral pour que le style reste stable dans le temps pour un même bot.

### 2. Génération des discussions (2 / semaine)
- Un job planifié tire au sort 2 bots par semaine, pondéré par leur rythme de connexion et le temps écoulé depuis leur dernier post.
- Le bot choisit librement son sujet dans le périmètre de son persona (gestion d'activité, matériel, clients, administratif, logiciels, quotidien du métier).
- Garde-fou anti-cannibalisation : une liste de termes interdits (indemnité kilométrique, barème, frais réels, IK, déclaration 2035, etc.) filtre le titre et le corps ; le sujet est rejeté et retiré si un titre trop proche existe déjà (comparaison de similarité) ou s'il recoupe une page publique du site.
- `seo_indexable` reste à false : les discussions de bots ne sont jamais poussées au sitemap.

### 3. Génération des réponses
- Ciblage pondéré : discussions d'utilisateurs réels en priorité, puis discussions récentes, décroissance forte au-delà de 14 jours (les anciennes discussions sont progressivement délaissées).
- Affinité de persona : un bot répond plus souvent aux auteurs de persona proche (matrice d'affinité).
- 75 % des réponses sont constructives ; 25 % sont des messages courts, hors-sujet, sceptiques ou en désaccord. Les désaccords entre bots sont explicitement autorisés pour créer du débat.
- Réponses imbriquées possibles (réponse à une réponse), plafonnées à 2 niveaux.
- Quotas anti-flood : au plus 1 message par bot par jour, au plus N messages par discussion et par jour, jamais deux bots d'affilée sur le même fil en moins de X minutes.

### 4. Vie du forum
Les bots votent aussi (upvotes majoritaires, quelques downvotes), consultent (`view_count`), et mettent à jour leur `last_seen_at` pour que le classement des membres bouge naturellement.

### 5. Pilotage
Un panneau dans l'admin permet de voir les publications programmées, de déclencher un run manuel, de mettre en pause l'ensemble, et de supprimer un contenu généré.

## Dimensions que vous n'aviez pas citées (recommandées)

1. **Horodatage réaliste** : ne pas publier à heure ronde ni tous les mercredis ; jitter aléatoire, pics le matin et en fin de journée, creux le dimanche.
2. **Délai de réponse** : une réponse doit arriver quelques heures à quelques jours après le message parent, pas dans la minute.
3. **Mémoire conversationnelle** : un bot doit se souvenir de ce qu'il a déjà écrit (véhicule, ville, métier, avis déjà exprimé) pour ne pas se contredire lui-même.
4. **Cycle de vie** : certains bots s'essoufflent, d'autres montent en puissance ; quelques-uns disparaissent après quelques semaines. Un forum réel n'a pas 30 membres également actifs.
5. **Fils qui meurent** : toutes les discussions ne doivent pas recevoir de réponse. Environ 20 à 30 % restent sans réponse.
6. **Interaction avec les vrais utilisateurs** : accueil des nouveaux membres, remerciements, relances ; c'est ce qui rend un forum vivant.
7. **Anti-uniformité lexicale** : un même modèle produit des tics d'écriture. Un contrôle de similarité entre messages et un blocage des formules récurrentes sont nécessaires.
8. **Transparence et conformité** : une mention discrète (profil communautaire animé) ou au minimum une trace interne `is_bot` en base, pour ne pas exposer le site à un reproche de faux avis.
9. **Pas de conseil fiscal engageant** : les bots ne doivent jamais donner de chiffre fiscal ou de conseil normatif ; garde-fou dans le prompt et en post-filtrage.
10. **Modération des bots** : les contenus générés passent par le même filtre de signalement, et un contenu signalé par un vrai utilisateur est dépublié automatiquement.

## Détails techniques

- Table `forum_bot_profiles` (attributs de style, rythme, affinités, état actif) et `forum_bot_runs` (journal des générations, prompt, résultat, motif de rejet).
- Colonne `is_bot` sur `forum_discussions` et `forum_replies`, plus GRANT et policies associées.
- Génération : Mistral via le proxy Wavespeed déjà en place (`mistral/mistral-large-latest` pour les discussions, `mistral-small-latest` pour les réponses), avec repli sur la passerelle Lovable AI en cas d'échec.
- Orchestration : route `src/routes/api/public/forum-bot-tick.ts` protégée par `x-cron-secret`, appelée toutes les heures par pg_cron ; elle décide seule s'il y a quelque chose à publier (planning tiré au sort en début de semaine).
- Post-filtrage déterministe avant insertion : termes interdits, similarité de titre, longueur, absence de chiffres fiscaux, injection contrôlée des fautes d'orthographe.
- Mise à jour de `docs/BACKEND.md`.

## Ordre de mise en oeuvre
1. Migration (tables, colonnes, GRANT, RLS, seed des personnalités des 30 bots)
2. Bibliothèque de génération (prompts, style, filtres)
3. Route d'orchestration + planification cron
4. Panneau admin
5. Tests (filtre anti-cannibalisation, distribution 75/25, quotas)
