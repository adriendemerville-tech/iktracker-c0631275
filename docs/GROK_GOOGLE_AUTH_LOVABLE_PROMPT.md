# Prompt pour Grok Bot — Écran Google « Lovable » + procédure de retour à l'application Google sur mesure

Contexte : IKtracker (https://iktracker.fr) — brief d'un assistant externe (Grok Bot) sur un
changement visible de l'authentification Google et sur la remise en place de l'application
Google OAuth personnelle.

---

## Prompt à envoyer

```
Brief IKtracker (https://iktracker.fr) — authentification Google : pourquoi « Lovable »
s'affiche, et comment revenir à l'application Google personnelle.

════════════════════════════════════════
1. CONSTAT VISIBLE PAR LES UTILISATEURS
════════════════════════════════════════
Quand un visiteur clique sur « Se connecter avec Google » sur iktracker.fr, l'écran de
consentement Google affiche le nom et le logo « Lovable » au lieu de « IKtracker ».
Ce n'est ni un bug ni un problème de sécurité : c'est un changement de configuration côté
backend.

════════════════════════════════════════
2. POURQUOI « LOVABLE » S'AFFICHE
════════════════════════════════════════
IKtracker utilisait une application Google OAuth créée sur mesure dans Google Cloud Console
(son propre nom, son propre logo, ses propres domaines autorisés).

Cette application a été remplacée par les identifiants Google gérés par Lovable, l'éditeur
de l'application. La bascule s'est produite quand l'outil de configuration automatique du
fournisseur Google a été relancé (lors de l'ajout ou de la correction de la connexion
Google) : cet outil réactive toujours le fournisseur avec les identifiants partagés hébergés
par Lovable, ce qui écrase la configuration sur mesure.

Conséquence : les identifiants gérés reposent sur une application Google commune à toutes les
applications créées avec Lovable. Google affiche donc la marque du porteur de cette
application, « Lovable », sur l'écran de consentement. Le nom et le logo IKtracker ne peuvent
pas réapparaître tant que c'est cette application partagée qui sert la connexion.

Ce qui n'a PAS changé : les comptes existants restent valides, aucune réinscription ni aucun
nouveau mot de passe n'est nécessaire ; les emails et données sont inchangés ; la connexion
email/mot de passe et la réinitialisation de mot de passe ne sont pas concernées.

════════════════════════════════════════
3. CE QUE TU DOIS FAIRE : RESTAURER L'APPLICATION GOOGLE SUR MESURE
════════════════════════════════════════
Objectif : faire en sorte que l'écran de consentement affiche de nouveau « IKtracker ».
Le principe : redonner la main à l'application Google d'IKtracker en saisissant son Client ID
et son Client Secret dans les paramètres d'authentification, au lieu des identifiants gérés.

RÈGLE ABSOLUE : ne relance surtout pas l'outil de configuration automatique de la connexion
Google (l'outil qui active le fournisseur avec les identifiants gérés). C'est lui qui a écrasé
la configuration sur mesure ; le relancer annulerait tout le travail ci-dessous. La
restauration passe uniquement par les champs Client ID / Client Secret de l'écran de
configuration du fournisseur Google.

ÉTAPE A — Google Cloud Console : retrouver ou créer les identifiants
  A1. Écran de consentement OAuth (OAuth consent screen) :
      - Nom de l'application : IKtracker
      - Logo : logo IKtracker
      - Email d'assistance : l'email de contact IKtracker
      - Domaines autorisés (Authorized domains) : iktracker.fr, et le domaine de
        prévisualisation utilisé pendant les tests (les sous-domaines de prévisualisation
        doivent être déclarés, sinon Google bloque le flux en test).
      - Scopes : uniquement email, profile, openid (pas de scope sensible).
      - Statut : si l'application est en « testing », ajouter les adresses Gmail de test en
        utilisateurs de test, ou publier l'application pour le public.
  A2. Identifiants (Credentials) :
      - Client ID OAuth existant d'IKtracker, de type « Web application ».
      - Dans « URIs de redirection autorisés », saisir exactement l'URI de callback affichée
        dans les paramètres d'authentification (voir ÉTAPE B, point B1). Ne pas inventer cette
        URI : elle est affichée par l'écran de configuration du fournisseur Google.
      - Sauvegarder.

ÉTAPE B — Paramètres d'authentification IKtracker : brancher ces identifiants
  B1. Ouvrir les paramètres d'authentification (Utilisateurs → Authentication Settings →
      Sign In Methods → Google) et lire l'URI de callback qui y est affichée. C'est elle qui
      doit être déclarée en Google Cloud Console à l'étape A2.
  B2. Saisir le Client ID et le Client Secret récupérés à l'étape A2 dans les champs du
      fournisseur Google, puis enregistrer. Cette saisie remplace les identifiants gérés par
      les vôtres.
  B3. Contrôler le Site URL et la liste des URLs de redirection de confiance : ils doivent
      couvrir https://iktracker.fr (domaine principal) et le domaine de prévisualisation.
  B4. Ne pas toucher aux autres fournisseurs pendant l'opération.

ÉTAPE C — Vérification (obligatoire avant de conclure)
  C1. En navigation privée, sur https://iktracker.fr, cliquer sur « Se connecter avec Google ».
  C2. Contrôler que l'écran Google affiche « IKtracker » et son logo, et non « Lovable ».
  C3. Terminer la connexion avec un compte de test et vérifier l'arrivée dans l'espace
      connecté.
  C4. Vérifier qu'un compte existant inscrit via Google se reconnecte sans création de doublon.
  C5. Vérifier que la connexion email/mot de passe fonctionne toujours.
  C6. Vérifier aussi le flux de réinitialisation de mot de passe, qui a été corrigé récemment
      et ne doit pas régresser.

════════════════════════════════════════
4. CONTRAINTES ET GARDE-FOUS
════════════════════════════════════════
- Le Client Secret est confidentiel : jamais dans le code, jamais dans une page publique,
  jamais affiché, journalisé ou transmis dans une conversation. Seul le Client ID est public.
- Ne jamais publier ni demander l'identifiant technique du projet backend ni ses URLs internes ;
  ne jamais demander ni afficher une clé de service ni le mot de passe de base de données :
  ils ne sont pas disponibles et ne sont pas nécessaires ici.
- Ne jamais demander à un utilisateur de recréer un compte ou de ressaisir son mot de passe.
- Ne présente pas l'affichage actuel de « Lovable » comme un défaut de IKtracker : c'est un
  choix d'hébergement des identifiants de connexion, en cours de correction.
- Si l'écran Google affiche encore « Lovable » après la saisie : ne pas relancer l'outil de
  configuration automatique, ne pas répéter la saisie en boucle. Vérifier dans l'ordre :
  l'URI de callback exactement identique des deux côtés, le domaine présent dans les domaines
  autorisés Google, le statut de l'application Google (testing vs publié), et la bonne
  redirection vers le domaine principal.
- Si une action humaine est indispensable (saisir le Client Secret, publier l'application
  Google, approuver une modification), dis-le clairement et liste les étapes précises plutôt
  que de simuler l'action ou de la déclarer faite.

════════════════════════════════════════
5. LIVRABLE ATTENDU
════════════════════════════════════════
Rends compte en trois points :
  1. État de l'application Google (Client ID retrouvé ou créé, écran de consentement, statut).
  2. Résultat de la saisie dans les paramètres d'authentification (sans jamais citer le secret).
  3. Résultat du test de connexion, en précisant quelle marque s'affiche désormais sur l'écran
     Google.
Si un point bloque, indique lequel et l'action humaine exacte qu'il reste à faire.
```

---

## Note interne (hors prompt)

Tant que la saisie du Client ID / Client Secret n'a pas été faite dans les paramètres
d'authentification, l'écran Google continue d'afficher Lovable. L'URI de callback exacte à
déclarer en Google Cloud Console n'est pas connue ici : elle s'affiche dans l'écran de
configuration du fournisseur Google, et c'est elle qui doit être recopiée à l'identique.
