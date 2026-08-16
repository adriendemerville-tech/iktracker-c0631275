# Audit code IKTracker — 16/08/2026

Périmètre : `src/` (332 fichiers, 72 478 lignes), `supabase/functions/` (42 fonctions), configuration build/test.

## 1. Verdict global

| Axe | État | Note |
|---|---|---|
| Typage TypeScript | Aucune erreur (`tsgo --noEmit` propre, mode strict activé) | Bon |
| Build | Passe (Vite 7 / TanStack Start) | Bon |
| Tests automatisés | **Corrigé le 16/08** : 59/59 au vert, `npm run test` disponible | Bon |
| Lint (hors formatage) | 283 problèmes, dont 239 `any` | Moyen |
| Formatage | 21 400 écarts Prettier non appliqués | Moyen |
| Architecture routes | Duplications `/route` vs `/app/route` | Moyen |
| Taille des modules | 12 fichiers > 1 000 lignes | Moyen |

Conclusion : l'app est **saine côté build** — un développeur peut ajouter une feature sans casser la compilation, la barrière de types tient. En revanche le **filet de sécurité est absent** (tests morts) et la maintenance devient coûteuse sur quelques gros modules.

## 2. Problèmes bloquants

### 2.1 Suite de tests non fonctionnelle
- Aucune entrée `test` dans `package.json`, aucun `vitest.config.ts`.
- Résultat : `environment` par défaut = node → `ReferenceError: document is not defined` sur tous les tests de composants (`VehicleCard`, `AuthForm`, `ThresholdAlert`).
- `jsdom` et `vitest` sont pourtant installés dans `node_modules`.
- Correctif : créer `vitest.config.ts` (`environment: "jsdom"`, `setupFiles` avec `@testing-library/jest-dom`) et ajouter `"test": "vitest run"`.

### 2.2 Hook conditionnel
- `src/pages/RecoveryWizard.tsx:512` : `useIsMobile()` est appelé conditionnellement → violation des règles React, source potentielle de crash aléatoire au re-render.

## 3. Dette technique mesurée

- **`any` : 298 occurrences** (239 signalées par ESLint). Concentration : `useTrips.ts` (30), `usePreferences.ts` (14), `AdminSurveys.tsx` (14), `AdminLinkedIn.tsx` (13), `Admin.tsx` (11). Ces zones perdent le bénéfice des types générés Supabase.
- **`react-hooks/exhaustive-deps` : 22 avertissements** — risque de données périmées (déjà rencontré sur le recalcul de distance).
- **`react-refresh/only-export-components` : 14** — HMR dégradé en dev.
- **Blocs `catch` vides** : `useTourTracker.ts:814`, `Profile.tsx:180` — erreurs silencieuses sur le chemin GPS, difficile à diagnostiquer en production.
- **`@ts-ignore`** dans `useWakeLock.ts:38` (à remplacer par `@ts-expect-error`).
- **Prettier non appliqué** : 21 400 écarts. Chaque PR produit du bruit de diff. `npm run format` réglerait tout d'un coup.

## 4. Architecture

### Points solides
- Séparation nette `src/routes` (routage fichier) / `src/pages` (composants écran) : aucune page orpheline détectée.
- Logique métier IK centralisée dans `src/types/trip.ts` (source unique du barème), conforme à la mémoire projet.
- Edge functions découpées par domaine avec un `_shared` commun.

### Points à corriger
- **Doublons de routes** : `mes-trajets` / `mestrajets` / `app/mestrajets`, `independants` / `indépendants`, `install` / `installer`, `admin/*` / `app/admin/*`, `blog/edit` présent à trois endroits. Cela multiplie les surfaces de bug SEO et de navigation.
- **Fichiers monolithiques** : `linkedin-weekly-post/index.ts` (2 803 l.), `AdminStats.tsx` (2 208 l.), `BlogAdmin.tsx` (1 886 l.), `meta-renderer/index.ts` (1 541 l.), `Index.tsx` (1 534 l.), `MesTrajets.tsx` (1 495 l.). Au-delà de ~600 lignes, la relecture et le diff deviennent risqués.
- **Barème IK dupliqué** web / mobile (`src/types/trip.ts` vs `mobile/src/lib/ik.ts`) — déjà documenté comme dette dans `mobile/README.md`.

## 5. Plan de remise à niveau

**Lot 1 — filet de sécurité — TERMINÉ (16/08/2026)**
1. `vitest.config.ts` (environnement `jsdom`, alias `@`) + `src/test/setup.ts` (matchMedia, ResizeObserver, cleanup) + scripts `test` / `test:watch`.
2. `src/test/router.tsx` : `TestRouter` basé sur `RouterContextProvider` remplace l'ancien `BrowserRouter` react-router-dom hérité de la migration.
3. Mock backend complété dans `AuthForm.test.tsx` (`getSession`, `onAuthStateChange`, `from`, `functions`) — plus aucune promesse rejetée non gérée.
4. Hook conditionnel corrigé : `useIsMobile()` remonté avant le retour anticipé dans `RecoveryWizard.tsx`.
5. Blocs `catch` vides remplis avec un log explicite (`useTourTracker.ts`, `Profile.tsx`).

Résultat : **59 tests / 59 au vert**, `tsgo --noEmit` propre.

**Lot 2 — hygiène (effort faible)**
4. `npm run format` une fois, puis Prettier en pre-commit.
5. `@ts-ignore` → `@ts-expect-error`.

**Lot 3 — typage (effort moyen)**
6. Retirer les `any` des 5 fichiers les plus touchés en s'appuyant sur `src/integrations/supabase/types.ts`.
7. Traiter les 22 `exhaustive-deps`.

**Lot 4 — structure (effort élevé)**
8. Consolider les routes dupliquées en redirections uniques.
9. Découper `AdminStats.tsx`, `BlogAdmin.tsx`, `MesTrajets.tsx` et `linkedin-weekly-post`.
10. Extraire un module partagé pour le barème IK web/mobile.
