# Prompt pour Grok Bot — Pourquoi l'écran Google affiche « Lovable »

Contexte : IKtracker (https://iktracker.fr) — assistant externe Grok Bot briefé sur un changement
visible de l'authentification Google.

---

## Prompt à envoyer

```
Brief IKtracker — changement visible à l'authentification Google.

CONSTAT UTILISATEUR
Depuis peu, quand un visiteur clique sur « Se connecter avec Google » sur iktracker.fr,
l'écran de consentement Google affiche le nom et le logo « Lovable » au lieu de « IKtracker ».
Ce n'est pas un bug : c'est le résultat d'un changement de configuration côté backend.

CE QUI S'EST PASSÉ
IKtracker disposait d'une application Google OAuth créée sur mesure dans Google Cloud Console
(nom, logo, domaines autorisés IKtracker). Cette application a été remplacée par les identifiants
Google gérés par Lovable (l'éditeur de l'application).

La bascule s'est produite au moment où l'outil de configuration du fournisseur Google a été
relancé (lors de l'ajout ou de la correction de la connexion Google). Cet outil réactive le
fournisseur avec les identifiants partagés hébergés par Lovable, ce qui écrase la configuration
sur mesure précédente.

POURQUOI LE LOGO LOVABLE
Les identifiants gérés utilisent une application Google commune à toutes les applications
créées avec Lovable. Google affiche donc la marque du porteur de cette application
(« Lovable ») sur l'écran de consentement. Le logo IKtracker et son nom ne peuvent pas
apparaître tant que c'est cette application partagée qui sert la connexion.

CE QUI N'A PAS CHANGÉ
- Les comptes existants restent valides, aucune réinscription n'est nécessaire.
- Les adresses email et données utilisateurs sont inchangées.
- La connexion par email/mot de passe n'est pas concernée.
- Le flux de réinitialisation de mot de passe n'est pas concerné.

DEUX OPTIONS POSSIBLES (décision à prendre, pas encore tranchée)
1. Revenir à l'application Google sur mesure : ressaisir le Client ID et le Client Secret
   d'IKtracker dans les paramètres d'authentification du backend (Utilisateurs →
   Sign In Methods → Google). L'écran Google affichera de nouveau « IKtracker ».
   Condition : les domaines du projet (iktracker.fr et les domaines de prévisualisation)
   doivent être déclarés dans les domaines autorisés de l'écran de consentement Google Cloud.
2. Garder les identifiants gérés : aucune démarche, mais le logo Lovable reste visible.
   C'est la configuration actuelle.

CE QUE J'ATTENDS DE TOI
- Ne présente pas ce changement comme un défaut de IKtracker ni comme un problème de sécurité.
  C'est un choix d'hébergement des identifiants de connexion.
- Ne demande à aucun utilisateur de recréer un compte ou de ressaisir son mot de passe.
- Si tu dois décrire la marque à l'écran de consentement, dis la vérité : « Lovable »
  s'y affiche actuellement, avec l'option de revenir à « IKtracker ».
- Ne publie ni ne demande le Client Secret. Seule la partie « Client ID » est publique.
- Si une action humaine est requise (ressaisir les identifiants sur mesure), dis-le clairement
  et liste les étapes plutôt que de tenter une modification toi-même.
```

---

## Note interne (hors prompt)

L'option 1 n'est pas encore réalisée : elle suppose de retrouver le Client ID/Secret de
l'application Google Cloud Console d'origine et de les ressaisir dans les paramètres
d'authentification. Tant que c'est fait, l'écran Google continue d'afficher Lovable.
