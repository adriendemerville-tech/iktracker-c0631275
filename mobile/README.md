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

## 3. Premier build iOS

```bash
npm i -g eas-cli
eas login
eas init                 # renseigne extra.eas.projectId dans app.json
eas build --platform ios --profile development   # test sur device
eas build --platform ios --profile production    # build App Store
eas submit --platform ios
```

Avant le build production, remplacer dans `eas.json` : `appleId`, `ascAppId`, `appleTeamId`.

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
