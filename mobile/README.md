# IKTracker Mobile (Expo / React Native)

App iOS native d'IKTracker : Mode Tournée GPS en arrière-plan, synchro calendrier, création de trajets manuels, relevés PDF.

> Ce dossier est le **code source initial** à copier dans un repo Git séparé. Lovable ne compile que le web : les builds iOS se font via EAS depuis ton poste.

## 1. Initialisation

```bash
cp -r mobile ~/iktracker-mobile && cd ~/iktracker-mobile
cp .env.example .env
npm install
npx expo install --fix
```

Dépendance babel requise pour l'alias `@/` :

```bash
npm i -D babel-plugin-module-resolver
```

## 2. Lancer en local

```bash
npx expo start           # Expo Go : suffisant pour l'UI, PAS pour le GPS background
npx expo run:ios         # build natif local (nécessaire pour tester le Mode Tournée)
```

Le suivi en arrière-plan (`expo-location` + `expo-task-manager`) ne fonctionne **pas** dans Expo Go : il faut un development build.

## 3. EAS Build pas à pas

### 3.1 Prérequis

- Un compte **Apple Developer** (99 $/an) + un Mac ou un poste quelconque avec un terminal.
- Node.js ≥ 18 et npm installés.
- L’app est destinée à être dans un **repo GitHub séparé** (`iktracker-mobile`).

### 3.2 Préparer le repo local

```bash
# 1. Copier le dossier mobile hors du repo web
cp -r mobile ~/iktracker-mobile && cd ~/iktracker-mobile

# 2. Variables d’environnement publiques
cp .env.example .env
# édite .env avec tes vraies valeurs Supabase (même URL/anon key que le web)

# 3. Installer les dépendances
npm install
npm i -D babel-plugin-module-resolver
npx expo install --fix
```

### 3.3 Lier le projet à Expo / EAS

```bash
npm i -g eas-cli
eas login                 # te connecte avec ton compte Expo
eas init                  # crée le projet EAS et injecte extra.eas.projectId dans app.json
```

> `eas init` modifie automatiquement `app.json`. Ne remplace pas cette valeur ensuite.

### 3.4 Configurer les identifiants Apple

Dans `eas.json`, remplace les placeholders par tes vraies valeurs Apple :

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "adrien@iktracker.fr",
      "ascAppId": "1234567890",
      "appleTeamId": "ABCDEF1234"
    }
  }
}
```

Où les trouver :
- `appleId` : l’e-mail de ton Apple ID utilisé pour App Store Connect.
- `ascAppId` : l’**App ID** de l’app dans App Store Connect (un nombre, ex. `6734567890`).
- `appleTeamId` : l’**Team ID** Apple (10 caractères alphanumériques) visible dans [Apple Developer](https://developer.apple.com) → Membership.

### 3.5 Build de test (simulateur iOS)

Le plus rapide pour vérifier que tout compile :

```bash
eas build --platform ios --profile development
```

Le `.app` est téléchargeable ; tu peux l’installer sur un simulateur iOS depuis Xcode.

### 3.6 Build sur vrai device (TestFlight interne)

```bash
eas build --platform ios --profile preview
```

Ce profil génère un `.ipa` signé pour appareil physique et peut être distribué en **internal distribution** (lien Expo Go ou TestFlight).

### 3.7 Build Production + soumission App Store

```bash
# 1. Build production signé pour l’App Store
eas build --platform ios --profile production

# 2. Envoyer sur App Store Connect
eas submit --platform ios
```

`eas submit` uploie le `.ipa`. Ensuite, tu dois aller dans **App Store Connect** → ton app → **App Store** → cliquer **Submit for Review**.

### 3.8 Commandes récapitulatives

```bash
# Tout en une seule passe (build prod + submit)
eas build --platform ios --profile production --auto-submit

# Build Android (optionnel, même repo)
eas build --platform android --profile production
```

## 4. Structure

```
app/
  _layout.tsx              Providers + enregistrement de la tâche GPS
  index.tsx                Redirection session
  login.tsx                Apple prioritaire sur iOS, Google sinon
  (app)/_layout.tsx        Tabs protégées
  (app)/tournee.tsx        Mode Tournée (start/stop, reprise de session)
  (app)/nouveau-trajet.tsx Saisie manuelle + import agenda du jour
  (app)/rapports.tsx       Historique + export PDF
src/lib/
  supabase.ts              Client backend (AsyncStorage, RLS côté serveur)
  ik.ts                    Barème IK — miroir de src/types/trip.ts du web
  geo.ts                   Haversine, filtres GPS, détection d'arrêts
  tour-tracking.ts         Tâche background + persistance des points
  trips.ts                 Lecture/écriture trajets & véhicules
  calendar.ts              Lecture agenda, regroupement par agenda/jour
  pdf.ts                   Génération et partage du relevé PDF
src/hooks/useAuth.tsx      Session Supabase + OAuth Apple/Google
```

## 5. Invariants métier à ne pas casser

- Bonus **20 %** uniquement pour les véhicules **100 % électriques** (jamais hybrides).
- Barème par tranches (0–5000 / 5001–20000 / >20000 km) avec reset annuel.
- IK d'un trajet = différentiel du cumul annuel, pas un simple `km × taux`.
- Mode Tournée = mobile uniquement ; les RDV d'un même agenda le même jour forment une seule tournée.
- Filtres GPS : intervalle 10 s, ignorer < 5 m, ignorer > 50 m/s, arrêt = 2 min / 100 m.

## 6. App Store — points de vigilance

- Guideline **2.5.4** : le background location doit avoir une utilité visible dans l'app (écran Mode Tournée avec indicateur actif) — c'est le cas ici, ne pas le retirer.
- Textes de permission en français, explicites, déjà présents dans `app.json`.
- Ajouter une capture de l'écran Mode Tournée dans la fiche App Store pour justifier l'usage GPS.
- `Sign in with Apple` est obligatoire dès lors que Google Sign-In est proposé : il est bien implémenté.

## 7. Dette connue

Le barème IK est dupliqué entre web (`src/types/trip.ts`) et mobile (`src/lib/ik.ts`). Extraire un package partagé `@iktracker/core` dès que les deux codebases coexistent durablement.
