# IKtracker iOS — App native React Native (Expo)

Version 1.0 — dossier de build pour un repo séparé `iktracker-mobile`.
Le web (TanStack Start) reste inchangé : seul le backend est partagé.

## 1. Périmètre v1

| Fonction | Statut v1 | Techno |
| --- | --- | --- |
| Suivi GPS arrière-plan / Mode Tournée | Oui | `expo-location` + `expo-task-manager` |
| Synchro calendrier | Oui | `expo-calendar` (natif iOS) + sync backend existante |
| Création de trajets manuels | Oui | formulaire RN + table `trips` |
| Rapports PDF | Oui | `expo-print` + `expo-sharing`, ou lien signé du backend |
| Blog / pages marketing | Non | reste sur iktracker.fr |
| Admin | Non | web uniquement |

## 2. Stack

- Expo SDK 54, React Native 0.81, TypeScript strict
- Expo Router (navigation par fichiers, proche de TanStack Router)
- `@supabase/supabase-js` + `expo-secure-store` pour la session
- TanStack Query (déjà utilisé côté web : hooks réutilisables)
- EAS Build (compilation cloud) + EAS Submit (envoi App Store Connect)

Prérequis : compte Apple Developer (99 $/an), Xcode récent, un Mac pour les tests
simulateur (pas obligatoire avec EAS Build + TestFlight).

## 3. Arborescence cible

```text
iktracker-mobile/
  app/
    _layout.tsx            session + providers
    (auth)/signin.tsx      Apple Sign In (obligatoire App Store) + Google
    (app)/index.tsx        dashboard IK
    (app)/tournee.tsx      Mode Tournée
    (app)/trajet/new.tsx   création manuelle
    (app)/rapports.tsx     PDF / archives
  src/
    lib/supabase.ts
    lib/ik.ts              barème copié depuis le web (source unique à extraire)
    features/tour/         tâche GPS background
    features/calendar/
  app.json / eas.json
```

## 4. Client backend (session persistée)

```ts
// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const storage = {
  getItem: (k: string) => SecureStore.getItemAsync(k),
  setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
  removeItem: (k: string) => SecureStore.deleteItemAsync(k),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } },
);
```

Les RLS existantes s'appliquent telles quelles : aucune migration nécessaire.

## 5. Mode Tournée — GPS en arrière-plan

C'est le vrai gain face à la PWA : iOS ne permet pas le suivi continu en web.

`app.json` :

```json
{
  "ios": {
    "bundleIdentifier": "fr.iktracker.app",
    "infoPlist": {
      "UIBackgroundModes": ["location", "fetch"],
      "NSLocationAlwaysAndWhenInUseUsageDescription": "IKtracker enregistre votre itinéraire professionnel pendant vos tournées, même écran éteint.",
      "NSLocationWhenInUseUsageDescription": "Pour détecter vos départs et arrêts de tournée.",
      "NSCalendarsFullAccessUsageDescription": "Pour transformer vos rendez-vous en trajets."
    }
  },
  "plugins": [
    ["expo-location", { "isIosBackgroundLocationEnabled": true }],
    "expo-calendar", "expo-secure-store"
  ]
}
```

Tâche de fond, alignée sur les règles métier actuelles (intervalle 10 s, rejet
des sauts > 50 m/s et des micro-déplacements < 5 m, arrêt détecté après 2 min
sous 100 m) :

```ts
// src/features/tour/task.ts
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { appendPoints } from './buffer';

export const TOUR_TASK = 'iktracker-tour-location';

TaskManager.defineTask(TOUR_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  await appendPoints(locations); // stockage local, flush vers tour_sessions
});

export async function startTour() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') throw new Error('permission-foreground');
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') throw new Error('permission-background');

  await Location.startLocationUpdatesAsync(TOUR_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 10_000,
    distanceInterval: 5,
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
    foregroundService: { notificationTitle: 'Tournée en cours', notificationBody: 'Suivi kilométrique actif' },
  });
}

export const stopTour = () => Location.stopLocationUpdatesAsync(TOUR_TASK);
```

Les points sont bufferisés en local (SQLite/AsyncStorage) et flushés vers les
tables de session existantes ; la finalisation (Distance Matrix entre arrêts)
reste côté backend, donc identique au web.

## 6. Calendrier

Deux sources cumulables :
- **Calendrier iOS local** via `expo-calendar` (`getEventsAsync` sur la journée),
  utile hors Google.
- **Synchro Google existante** : on garde `sync-calendar-trips` côté backend,
  l'app ne fait que lire les trajets générés. Le regroupement d'un même agenda
  sur une même journée en une tournée reste inchangé.

Le consentement Google se fait via le broker OAuth managé déjà en place
(`/~oauth/initiate`) ouvert dans `expo-web-browser` avec un retour deep link
`iktracker://auth-callback`.

## 7. Rapports PDF

Deux chemins, à choisir selon le rendu voulu :
1. **Local** : `expo-print.printToFileAsync({ html })` avec le même gabarit HTML
   que le relevé web, puis `expo-sharing` (AirDrop, Mail, Fichiers).
2. **Serveur** : appel du flux existant (génération + lien signé) et
   téléchargement via `expo-file-system` — recommandé pour garder un rendu
   strictement identique aux relevés envoyés au comptable.

## 8. Authentification

Apple exige Sign in with Apple dès qu'un autre login social est proposé :
`expo-apple-authentication` en bouton principal sur iOS, Google en second —
même hiérarchie que `/signup` sur le web.

## 9. Chemin vers l'App Store

1. `npx create-expo-app iktracker-mobile -t expo-template-blank-typescript`
2. Ajouter les dépendances et `app.json` ci-dessus
3. `eas build --platform ios --profile preview` → test TestFlight
4. Fiche App Store Connect : nom, captures 6.7"/6.5", politique de
   confidentialité (https://iktracker.fr/privacy), catégorie Finance/Productivité
5. Déclaration « App Privacy » : localisation liée à l'identité, usage
   fonctionnel, pas de tracking publicitaire
6. `eas submit --platform ios`

Point de vigilance revue Apple : la justification du background location doit
être visible dans l'app (écran Mode Tournée explicite, indicateur système actif),
sinon rejet au titre de la guideline 2.5.4.

## 10. Ce qui reste à mutualiser

Extraire dans un package partagé (`@iktracker/core`) : barème IK et bonus 20 %
électrique, reset d'année fiscale, types `Trip`/`Vehicle`, calcul Haversine.
Cela évite deux implémentations divergentes du calcul fiscal.
