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

## Lot 2 — cohérence de style — TERMINÉ (16/08/2026)

1. `.prettierrc.json` créé (semi, double quotes, trailingComma `all`, printWidth 100, LF) — la configuration était implicite jusque-là, d'où les 21 400 écarts constatés.
2. `.prettierignore` créé : exclut les fichiers auto-générés (`routeTree.gen.ts`, l'intégration backend générée, `config.toml`), les artefacts de build (`dist`, `.output`, `node_modules`, `mobile/ios`, `mobile/android`) et le contenu non-code (`docs`, `public`, `*.md`, lockfiles).
3. Passe `prettier --write .` appliquée sur l'ensemble du dépôt : composants, hooks, pages, fonctions backend, scripts et fichiers de configuration.
4. Les 2 derniers `@ts-ignore` convertis en `@ts-expect-error` commentés (`src/hooks/useWakeLock.ts` pour `navigator.getBattery`, fonction backend `backfill-blog-covers` pour `EdgeRuntime`).
5. Script `npm run format:check` ajouté pour verrouiller le style et permettre un contrôle en CI.

Vérifications : `prettier --check .` propre sur tout le dépôt, `tsgo --noEmit` sans erreur, 59 tests / 59 au vert, preview HTTP 200.

## Lot 3 — typage des hooks de données — TERMINÉ (16/08/2026)

1. `src/hooks/useTrips.ts` : 0 `any` restant (42 avant). Types générés `Tables`/`TablesInsert` importés, alias `TripRow` / `TripInsert` / `VehicleRow`, mappers uniques `mapTripRow` et `mapVehicleRow` remplaçant les 4 blocs de mapping dupliqués (chargement actif, archives, rechargement après recalcul IK, véhicules).
2. Type `StoredTrip` introduit pour la réhydratation localStorage (utilisateurs non connectés), et helper `toJson` pour les colonnes `jsonb` (`tour_stops`) au lieu d'un cast `any`.
3. `src/hooks/usePreferences.ts` : 0 `any` restant. Les colonnes `persona`, `calendar_import_mode`, `ik_rate_override`, `accountant_*` et `user_monthly_report_enabled` existent désormais dans les types générés — les casts de lecture et les `upsert(... as any)` ont été supprimés, et le patch de planification comptable inclut `user_monthly_report_enabled`.
4. `src/hooks/useRecurringTrips.ts` : 0 `any` restant. `from("recurring_trips" as any)` supprimé, `mapRow` typé sur `Tables<"recurring_trips">`, payload d'update typé `TablesUpdate`, insert validé par `satisfies TablesInsert`.

Résultat : `tsgo --noEmit` propre, `prettier` propre, **59 tests / 59 au vert**.

Reste au Lot 3 : les 22 avertissements `react-hooks/exhaustive-deps`, à traiter cas par cas (certains sont intentionnels et demandent un commentaire justificatif plutôt qu'un ajout de dépendance).

## Lot 4 — structure (1re passe) — 16/08/2026

**Routes dupliquées**

1. Suppression de `src/routes/app/blog/edit/` (`index.tsx` et `$id.tsx`) : ces deux routes montaient le même composant `BlogEditor` que `/app/admin/blog/edit/*` et n'étaient référencées nulle part.
2. `/blog/edit` et `/blog/edit/$id` redirigent désormais vers `/app/admin/blog/edit` (l'`$id` est conservé dans la redirection, il était perdu auparavant).
3. `BlogEditor` : canonical corrigé vers `/app/admin/blog/edit/...` + `noindex, nofollow` (page d'administration).
4. Vérifié : les autres paires (`/install` → `/installer`, `/experts-comptables` → `/expert-comptable`, `/indépendants` → `/independants`, `/mestrajets` → `/app/mestrajets`, `/recovery` → `/app/recovery`) sont des alias 301 volontaires et ont été conservés.

**Fichiers > 1000 lignes découpés**

| Fichier | Avant | Après | Modules extraits |
| --- | --- | --- | --- |
| `src/lib/print-utils.ts` | 1453 | 75 | `src/lib/print/report-shared.ts`, `report-html.ts`, `clean-pdf-html.ts` |
| `src/components/admin/AdminSurveys.tsx` | 1600 | 809 | `admin/surveys/survey-types.ts`, `SurveyEditors.tsx`, `SurveyStats.tsx` |
| `src/components/admin/AdminAutopilot.tsx` | 1418 | 498 | `admin/autopilot/types.ts`, `AutopilotCards.tsx`, `report.ts` |
| `src/components/admin/AdminDocumentation.tsx` | 1201 | 728 | `admin/documentation/doc-data.tsx`, `doc-pdf-html.ts` |
| `src/pages/Lexique.tsx` | 1252 | 961 | `src/data/lexique-terms.ts` |
| `src/components/AdminStats.tsx` | 2633 | 2511 | `admin/admin-stats-config.ts` (types, périodes, ordres de sections) |

Vérifications : `tsgo --noEmit` propre, `prettier` propre, 59 tests / 59 au vert, `/`, `/lexique` et `/blog/edit/:id` en HTTP 200.

**Reste au Lot 4** (découpage lourd, JSX à extraire en sous-composants avec props) : `AdminStats.tsx` (2511), `BlogAdmin.tsx` (2089), `Index.tsx` (1693), `MesTrajets.tsx` (1650), `Admin.tsx` (1368), `Landing.tsx` (1278), `useTrips.ts` (1239), `useTourTracker.ts` (1234), `Profile.tsx` (1199), `BaremeIK2026.tsx` (1168), `RecoveryWizard.tsx` (1141), `TripSettingsModal.tsx` (1099).
