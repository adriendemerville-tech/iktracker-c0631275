# Prompt Dictadevi — Prise en charge du véhicule par défaut (API IKtracker)

Contexte : l'API partenaire IKtracker expose désormais le véhicule par défaut de
l'utilisateur via l'endpoint `/preferences`. Adapte l'intégration Dictadevi pour
lire et écrire ce paramètre.

## 1. Lecture — GET /preferences

La réponse contient un nouveau champ :

```json
{
  "calendar_import_mode": "tour",
  "ik_rate_override": "auto",
  "default_vehicle_id": "a1b2c3d4-…",
  "has_home_address": true,
  "note": null
}
```

- `default_vehicle_id` : UUID du véhicule présélectionné à l'ouverture d'un
  nouveau trajet, ou `null` si aucun.
- Stocke cette valeur côté Dictadevi (cache ou colonne) et rafraîchis-la à
  chaque appel `GET /preferences` ou à réception du webhook
  `preferences.updated` (le payload inclut désormais `default_vehicle_id`).

## 2. Écriture — PUT /preferences

Le endpoint accepte désormais `default_vehicle_id` en plus de
`calendar_import_mode` et `ik_rate_override` (un ou plusieurs champs par
requête) :

```
PUT /preferences
x-api-key: ikt_live_xxx...
x-external-user-id: <dictadevi user id>
Content-Type: application/json

{ "default_vehicle_id": "a1b2c3d4-…" }
```

Réponse :

```json
{ "success": true, "default_vehicle_id": "a1b2c3d4-…" }
```

Règles :
- Le véhicule doit appartenir à l'utilisateur lié — récupère la liste via
  `GET /vehicles` avant de proposer le choix. Sinon l'API renvoie `400`.
- Passer `"default_vehicle_id": null` efface le véhicule par défaut.

## 3. Comportement attendu côté Dictadevi

1. Au chargement de la fiche utilisateur (ou à l'ouverture du module IK),
   appelle `GET /preferences` et `GET /vehicles`.
2. Dans l'UI, affiche un sélecteur « Véhicule par défaut » alimenté par
   `GET /vehicles`, pré-rempli avec `default_vehicle_id`.
3. Au changement, envoie `PUT /preferences { "default_vehicle_id": <uuid> }`
   (ou `null` pour « Aucun »).
4. Lors de la création d'un trajet via `POST /trips`, si l'utilisateur n'a pas
   choisi de véhicule explicitement, utilise `default_vehicle_id` comme
   `vehicle_id` (l'API auto-assigne sinon, mais expliciter évite les surprises).
5. Gère les erreurs : `400` (véhicule invalide) → re-synchroniser la liste via
   `GET /vehicles` ; `404` (utilisateur non lié) → silencieux, attendre la
   première activité.

## 4. Webhook

Si tu es abonné à `preferences.updated`, le payload contient maintenant
`default_vehicle_id` : mets à jour ton cache local à réception au lieu de
re-poller.

Référence complète : https://iktracker.fr/api-docs
