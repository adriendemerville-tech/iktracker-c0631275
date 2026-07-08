
# Mode d'import "Tournée" pour la synchronisation calendrier

Nouvelle option dans les préférences utilisateur : quand elle est activée, la synchronisation calendrier (Google / Outlook / ICS) regroupe **tous les événements pro d'une même journée** en une seule tournée (domicile → RDV₁ → RDV₂ → … → domicile) au lieu de créer N trajets individuels aller depuis le domicile.

## Comportement fonctionnel

- Trois modes possibles côté préférences :
  - `individual` (défaut, comportement actuel) — 1 event = 1 trajet
  - `tour` — regroupement automatique en tournée si ≥ 2 events pro le même jour
  - Si un seul event pro sur la journée en mode `tour` → fallback silencieux sur `individual` pour ce jour (pas de "tournée" à une seule étape)
- La tournée est enregistrée comme **`tour_session` finalisée + trip lié** (même chemin que le Mode Tournée existant), donc :
  - Visible dans "Mes trajets" comme une tournée avec ses étapes
  - Distance = somme des segments Distance Matrix domicile→RDV₁, RDV₁→RDV₂, …, RDV_N→domicile
  - IK calculé une seule fois sur la distance totale (barème tiered inchangé, bonus EV 20% inchangé)
  - `source = 'google_calendar' | 'outlook_calendar' | 'ics'`, `tour_stops` = JSON des étapes
- Idempotence : si la tournée du jour existe déjà (même user_id, même date, même signature d'events) → skip (comme aujourd'hui pour les trips individuels via `google_event_id` / `outlook_event_id` / `ics_uid`)
- Contrainte "future events" préservée : une journée n'est agrégée qu'une fois **le jour même arrivé** (respect de `calendar-import-timing-constraint`)

## Changements techniques

### 1. Base de données (migration)
- Ajouter colonne `calendar_import_mode text not null default 'individual'` sur `public.user_preferences` avec check `in ('individual','tour')`

### 2. Edge Function `sync-calendar-trips`
- Après récupération des events d'un utilisateur, lire son `calendar_import_mode`
- Si `tour` : grouper les events par date locale utilisateur, pour chaque jour à ≥ 2 events :
  1. Récupérer adresse domicile (locations type=home, fallback logique existante)
  2. Trier events par heure de début
  3. Extraire l'adresse de chaque event (déjà géocodée par le parser existant)
  4. Appeler Distance Matrix pour chaque segment consécutif → distance totale
  5. Calculer IK via la logique tiered existante (même helpers que `recalculate-distances`)
  6. Insérer `tour_session` finalisée + `trip` avec `tour_stops` JSON, `source` = provider
  7. Marquer chaque event source comme importé (même table de dédoublonnage qu'aujourd'hui) pour éviter les re-imports individuels
- Si `individual` : comportement actuel inchangé
- Ne PAS traiter les jours à 1 seul event en mode `tour` → passer au flux individuel pour ce jour

### 3. UI Préférences (`PreferencesContent.tsx`)
- Nouvelle section "Import calendrier" avec un `RadioGroup` :
  - **Trajets individuels** (défaut) — "Chaque événement devient un trajet aller depuis mon domicile"
  - **Tournée journalière** — "Tous mes rendez-vous d'une même journée sont regroupés en une seule tournée domicile → étapes → domicile"
- Persistance via `usePreferences` (ajout du champ dans le hook + type)

### 4. Documentation
- Mettre à jour `docs/BACKEND.md` (nouvelle colonne + comportement sync) et régénérer le PDF puisque c'est un changement significatif sur la fonction sync

## Schéma du flux

```text
Mode individual (actuel):
  Event A 09h → Trip domicile→A
  Event B 14h → Trip domicile→B
  Event C 16h → Trip domicile→C

Mode tour (nouveau):
  Events A,B,C du même jour →
    1 Tournée: domicile → A → B → C → domicile
    (distance cumulée, IK unique, tour_stops = [A,B,C])
```

## Points explicitement hors scope

- Pas de rétroactivité automatique sur les trajets calendrier déjà importés (l'utilisateur peut les supprimer manuellement s'il veut re-synchroniser en mode tournée)
- Pas de détection intelligente "cet event est-il vraiment pro ?" — on garde le filtre actuel de `sync-calendar-trips`
- Pas de changement sur le mode Tournée manuel mobile (module Tour Mode intact)
