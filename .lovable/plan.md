## Lot 1 — Sécurité critique (impact immédiat)

**1. Fermer les IDOR sur les envois de relevés**
- `send-accountant-report` et `send-user-monthly-report` : ajouter un contrôle d'appelant unique et partagé.
- Règle : autoriser si (a) header `x-cron-secret` valide (appels planifiés), OU (b) JWT valide dont `user.id === user_id`, OU (c) JWT d'un utilisateur `admin` via `has_role`.
- `override_email` : restreint aux admins et au secret cron uniquement ; sinon on ignore le champ et on envoie à l'adresse enregistrée.
- Journaliser qui a déclenché l'envoi (user_id appelant, cible, canal) pour traçabilité.
- Extraire ce garde-fou dans `_shared/auth-guard.ts` pour éviter la divergence.

**2. Verrouiller la base**
- `report_shares` : restreindre le SELECT public — lecture uniquement via token de partage (fonction SECURITY DEFINER prenant le token), plus d'énumération, `html_content` non exposé en direct.
- `vehicle_cache` : remplacer `USING (true)` par une lecture authentifiée en lecture seule, écriture réservée au service role.
- Réactiver la protection des mots de passe compromis.
- Passe sur les warns linter : `search_path` fixé sur les fonctions, retrait de l'exécution `anon` sur les SECURITY DEFINER qui ne la nécessitent pas.

## Lot 2 — Justesse des kilomètres et des IK

**3. Conserver les coordonnées**
- `useTrips.ts` : persister et remapper `address`, `lat`, `lng` pour départ/arrivée (et étapes) au lieu de les reconstruire vides.
- Vérifier la colonne de stockage côté base ; migration si les coordonnées ne sont pas toutes stockées.

**4. Interdire les distances calculées depuis (0,0)**
- `useAddressAutocomplete.ts` : ne plus renvoyer `lat:0,lng:0` — marquer la suggestion comme « à géocoder ».
- `DetailsStepContent.tsx` : géocoder avant tout calcul si coordonnées absentes, comme le fait déjà `TripViewSheet`.
- Refuser silencieusement toute distance issue d'une coordonnée nulle et afficher une erreur claire.
- Corriger `autoRecalcDone.current` (réinitialisation à l'ouverture d'un autre trajet).

**5. Regroupement en tournée sans perte**
- `MesTrajets.tsx` : créer la tournée d'abord, ne supprimer les trajets sources qu'après succès confirmé ; rollback et message d'erreur sinon.

**6. Timers GPS**
- `useTourTracker.ts` : stocker le timeout 90s dans une ref, le nettoyer au démontage et à chaque nouvelle mesure, lire l'état via refs plutôt qu'une closure figée.

## Lot 3 — Robustesse backend ✅ terminé

- ✅ `report-archive` : pagination des trajets (`fetchTripsForPeriod`) + garde de taille sur le PDF.
- ✅ `partner-api` : pagination réelle de la recherche d'utilisateur par e-mail.
- ✅ Générateur PDF dédupliqué : `send-user-monthly-report` et `send-accountant-report` consomment `_shared/report-pdf.ts`.
- ✅ `_shared/config.ts` pour `FRONTEND_URL`, `BROWSERLESS_BASE`, `RESEND_GATEWAY`, `FROM_EMAIL`.
- ✅ `config.toml` : `verify_jwt` déclaré explicitement pour toutes les fonctions.
- ✅ `vehicle-lookup` et `test-bot-rendering` : 400 explicite sur body vide/invalide.


## Lot 4 — Frontend, propreté, tests

- `src/test/setup.ts` : mock `ResizeObserver` (débloque les 9 tests `AuthForm`).
- Couleurs hardcodées → tokens du design system (`Index.tsx`, `VehicleForm.tsx`, `MesTrajets.tsx`, `TripViewSheet.tsx` incluant les `ring-white/80` invisibles en clair).
- `Index.tsx` : dépendances correctes sur l'effet de récupération de tournée, via refs.
- `useTrips.ts` : migration localStorage→DB transactionnelle, suppression locale seulement après succès complet.
- `TripPromptBar.tsx` : passer à `AudioWorklet` ou au minimum fermer l'`AudioContext` sur tous les chemins d'échec.
- `Archive.tsx` : garde de démontage sur les appels async.
- `mcp/index.ts` : régénéré, pas édité manuellement.

## Détails techniques

- Chaque lot se termine par : `tsgo --noEmit`, `vitest run`, `supabase--linter`, `security--run_security_scan`, et test réseau des fonctions touchées.
- Toute modification backend entraîne la mise à jour de `docs/BACKEND.md`, et la régénération du PDF si structurelle (nouvelle table, nouveau secret, nouvelle fonction).
- Le secret cron : réutiliser celui déjà en place pour `linkedin-post-audit` plutôt que d'en créer un nouveau.
- Les changements RLS passent par migration, avec `GRANT` explicites.

## Ordre recommandé

Lot 1 d'abord (faille exploitable en un appel), puis Lot 2 (fausses distances = mauvais IK déclarés), puis 3 et 4.