# IKtracker Mobile — Plan de tâches (iOS puis Android)

État de départ : le dossier `mobile/` contient déjà la config Expo, le client backend,
le barème IK miroir, le tracking GPS background, l'import agenda, l'export PDF,
les écrans expo-router et les deux workflows GitHub Actions.
Ce document liste ce qu'il reste à faire, par lot, avec critère de sortie.

---

## Lot 0 — Mise en place du repo (0,5 j)

| # | Tâche | Qui | Sortie |
| --- | --- | --- | --- |
| 0.1 | `cp -r mobile ~/iktracker-mobile`, `git init`, push vers GitHub `iktracker-mobile` | Toi | Repo distant créé |
| 0.2 | `cp .env.example .env` + valeurs réelles | Toi | App démarre en local |
| 0.3 | `npm install` + `npm i -D babel-plugin-module-resolver` + `npx expo install --fix` | Toi | `npm run typecheck` passe |
| 0.4 | Compte Apple Developer (99 $/an) + Google Play Console (25 $ une fois) | Toi | Accès App Store Connect |
| 0.5 | `eas login` + `eas init` (injecte `extra.eas.projectId`) | Toi | `app.json` complété |
| 0.6 | Secrets GitHub : `EXPO_TOKEN`, `EXPO_PUBLIC_*`, `EXPO_APPLE_APP_SPECIFIC_PASSWORD` | Toi | Workflow CI vert |

**Critère de sortie** : `npx expo start` affiche l'écran de login sur ton iPhone via Expo Go.

---

## Lot 1 — Premier build natif (1 j)

| # | Tâche | Détail |
| --- | --- | --- |
| 1.1 | `eas build --platform ios --profile development` | Build simulateur, valide la compilation |
| 1.2 | `npx expo run:ios` sur device réel | Seul moyen de tester le GPS background |
| 1.3 | Vérifier les 3 prompts de permission (localisation en usage, localisation toujours, calendrier) | Textes FR déjà dans `app.json` |
| 1.4 | Corriger les erreurs de dépendances natives éventuelles | `npx expo-doctor` |

**Critère de sortie** : l'app se lance sur un iPhone physique et la session Supabase persiste après kill de l'app.

---

## Lot 2 — Authentification (1 j)

| # | Tâche |
| --- | --- |
| 2.1 | Sign in with Apple : activer la capability dans le portail Apple + `eas credentials` |
| 2.2 | Google via `expo-web-browser` + broker OAuth managé, retour deep link `iktracker://auth-callback` |
| 2.3 | Écran de qualification persona (obligatoire, aligné sur le web) |
| 2.4 | Gate e-mail non vérifié : max 3 trajets + 1 tournée, pas d'export |
| 2.5 | Déconnexion → purge SecureStore/AsyncStorage |

**Critère de sortie** : création de compte Apple de bout en bout, profil visible en base, RLS respectée.

---

## Lot 3 — Mode Tournée (2–3 j) — cœur de valeur

| # | Tâche |
| --- | --- |
| 3.1 | Vérifier les filtres GPS : intervalle 10 s, ignorer < 5 m, rejeter > 50 m/s |
| 3.2 | Détection d'arrêt : 2 min sous 100 m → nouveau stop |
| 3.3 | Buffer local (AsyncStorage/SQLite) + flush vers `tour_sessions` avec retry hors-ligne |
| 3.4 | Reprise de session après crash / redémarrage du téléphone |
| 3.5 | Finalisation : Distance Matrix entre stops côté backend (inchangé vs web) |
| 3.6 | Écran actif explicite + indicateur système (exigence Apple 2.5.4) |
| 3.7 | Test terrain : 1 tournée réelle > 30 km, écran éteint |

**Critère de sortie** : écart < 3 % entre la distance mesurée et le compteur du véhicule.

---

## Lot 4 — Trajets & calendrier (2 j)

| # | Tâche |
| --- | --- |
| 4.1 | Création manuelle : adresses, autocomplete Géoplateforme, aller-retour |
| 4.2 | Import agenda iOS du jour via `expo-calendar` |
| 4.3 | Regroupement : mêmes agenda + même jour = une tournée |
| 4.4 | Masquer les RDV futurs jusqu'à la date prévue |
| 4.5 | Choix du véhicule + hiérarchie de véhicule par défaut |
| 4.6 | Dédoublonnage avec les trajets créés côté web (`normalize_trip_dedupe_text`) |

**Critère de sortie** : un trajet créé sur mobile apparaît sur le web sans doublon, et inversement.

---

## Lot 5 — Calcul IK & relevés (1,5 j)

| # | Tâche |
| --- | --- |
| 5.1 | Vérifier le barème par tranches (0–5000 / 5001–20000 / > 20000) |
| 5.2 | Bonus 20 % véhicules 100 % électriques uniquement (jamais hybrides) |
| 5.3 | IK = différentiel du cumul annuel, pas `km × taux` |
| 5.4 | Reset d'année fiscale (1er janvier ou date personnalisée) |
| 5.5 | Export PDF `expo-print` + partage `expo-sharing` |
| 5.6 | Alternative : lien signé serveur pour un rendu identique au web |

**Critère de sortie** : total IK mobile = total IK web au centime près sur le même compte.

---

## Lot 6 — Dette technique : `@iktracker/core` (1 j)

Extraire dans un package partagé : barème IK + bonus électrique, reset fiscal,
types `Trip`/`Vehicle`, Haversine. Aujourd'hui dupliqué entre `src/types/trip.ts` (web)
et `mobile/src/lib/ik.ts`.

**Critère de sortie** : une seule source de vérité, tests unitaires communs.

---

## Lot 7 — Polish & conformité App Store (1,5 j)

| # | Tâche |
| --- | --- |
| 7.1 | Icône, splash screen, mode sombre |
| 7.2 | États vides, erreurs réseau, bandeau hors-ligne |
| 7.3 | Captures 6,7" et 6,5" — dont une de l'écran Mode Tournée (justifie le GPS) |
| 7.4 | Fiche App Store Connect : nom, description, catégorie Finance/Productivité |
| 7.5 | Déclaration App Privacy : localisation liée à l'identité, usage fonctionnel, zéro tracking pub |
| 7.6 | Lien politique de confidentialité : https://iktracker.fr/privacy |

---

## Lot 8 — TestFlight puis App Store (1 j + délai Apple)

| # | Tâche |
| --- | --- |
| 8.1 | `eas build --platform ios --profile preview` → TestFlight interne |
| 8.2 | 3–5 testeurs sur une semaine, collecte des retours |
| 8.3 | `eas build --profile production --auto-submit` (ou workflow `eas-submit.yml`) |
| 8.4 | Submit for Review dans App Store Connect |
| 8.5 | Répondre à la revue Apple (risque principal : guideline 2.5.4) |

**Délai Apple** : 24–48 h en moyenne, prévoir un aller-retour.

---

## Lot 9 — Android (1 j, après validation iOS)

Même codebase. `eas build --platform android --profile production`,
vérifier le foreground service de localisation et la déclaration
Play Console « Localisation en arrière-plan » (vidéo de démonstration exigée).

---

## Planning indicatif

| Semaine | Contenu |
| --- | --- |
| S1 | Lots 0, 1, 2 |
| S2 | Lot 3 (Mode Tournée + test terrain) |
| S3 | Lots 4, 5 |
| S4 | Lots 6, 7, 8.1–8.2 (TestFlight) |
| S5 | Lot 8.3–8.5 (soumission) puis Lot 9 |

Total ≈ 12–14 jours de dev effectifs, 5 semaines calendaires avec les délais Apple.

---

## Risques identifiés

| Risque | Impact | Mitigation |
| --- | --- | --- |
| Rejet Apple 2.5.4 (background location) | Bloquant | Écran Mode Tournée explicite + capture dans la fiche |
| Dérive du barème IK entre web et mobile | Fiscal | Lot 6 prioritaire dès que les deux codebases vivent ensemble |
| Consommation batterie en tournée longue | Désinstallation | `distanceInterval` 5 m + arrêt auto après finalisation |
| Doublons de trajets web/mobile | Confiance utilisateur | Dédoublonnage backend déjà en place, à tester en Lot 4.6 |
