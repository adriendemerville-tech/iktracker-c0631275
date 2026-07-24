# Prompt Lovable — Intégration des relevés IKtracker dans Dictadevi

À copier-coller dans le projet Lovable **Dictadevi** pour lui indiquer comment
adapter son intégration API IKtracker afin de récupérer les relevés mensuels
(PDF + résumé chiffré) de chaque utilisateur.

---

## Contexte

IKtracker expose une API partenaire (`partner-api`) déjà utilisée par Dictadevi
pour créer des trajets et récupérer des statistiques. Depuis la mise en place
de l'envoi automatique du relevé mensuel côté IKtracker (15 du mois, mois
écoulé, PDF + PDF annuel), deux évolutions sont disponibles pour Dictadevi :

1. **Push** — un webhook `monthly_report.sent` est émis à chaque relevé envoyé
   par IKtracker. Il contient le résumé chiffré et deux URLs temporaires
   (mensuel + annuel).
2. **Pull** — les endpoints REST existants permettent de générer un relevé à la
   demande sur n'importe quelle période et de télécharger le PDF associé.

Dictadevi doit implémenter **les deux** : le webhook pour la synchro automatique
et le pull pour permettre à un utilisateur de re-générer un relevé à la demande
depuis l'UI Dictadevi.

---

## Configuration requise

Variables d'environnement à ajouter côté Dictadevi (backend / edge function) :

```
IKTRACKER_API_URL=https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/partner-api
IKTRACKER_API_KEY=<clé partenaire fournie par IKtracker>
IKTRACKER_WEBHOOK_SECRET=<secret HMAC configuré côté IKtracker pour Dictadevi>
```

Header d'authentification pour tous les appels sortants :

```
x-api-key: ${IKTRACKER_API_KEY}
x-external-user-id: <identifiant Dictadevi de l'utilisateur>   # requis sur les routes user-scoped
Content-Type: application/json
```

---

## 1. Webhook `monthly_report.sent` (push automatique)

IKtracker POST le webhook vers l'URL enregistrée dans `partner_webhooks` pour
Dictadevi. Événement : `monthly_report.sent`.

### Headers reçus

```
Content-Type: application/json
X-IKtracker-Event: monthly_report.sent
X-IKtracker-Signature: sha256=<hex(HMAC_SHA256(body, IKTRACKER_WEBHOOK_SECRET))>
X-IKtracker-Timestamp: <unix seconds>
```

### Payload

```json
{
  "event": "monthly_report.sent",
  "sent_at": "2026-08-15T07:00:12.000Z",
  "external_user_id": "dictadevi-user-abc123",
  "iktracker_user_id": "9e2f...",
  "period": {
    "year": 2026,
    "month": 7,
    "label": "juillet 2026",
    "start": "2026-07-01",
    "end": "2026-07-31"
  },
  "totals": {
    "trips_count": 42,
    "total_km": 1287.4,
    "total_ik": 623.18
  },
  "ytd": {
    "year": 2026,
    "total_km": 8912.7,
    "total_ik": 4310.55
  },
  "vehicle": {
    "plate": "AA-123-BB",
    "model": "Renault Zoe",
    "fuel": "electric",
    "fiscal_hp": 4,
    "scale": "official_2026"
  },
  "downloads": {
    "monthly_pdf_url": "https://iktracker.fr/temporaryreport/<token>?raw=1",
    "annual_pdf_url": "https://iktracker.fr/temporaryreport/<token>?raw=1",
    "expires_at": "2026-09-14T07:00:12.000Z"
  }
}
```

### Vérification signature (Deno edge function Dictadevi)

```ts
const raw = await req.text();
const sig = req.headers.get('x-iktracker-signature')?.replace('sha256=', '') ?? '';
const key = await crypto.subtle.importKey(
  'raw', new TextEncoder().encode(Deno.env.get('IKTRACKER_WEBHOOK_SECRET')!),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
);
const ok = await crypto.subtle.verify(
  'HMAC', key,
  Uint8Array.from(sig.match(/.{2}/g)!.map(h => parseInt(h, 16))),
  new TextEncoder().encode(raw),
);
if (!ok) return new Response('invalid signature', { status: 401 });
```

### Traitement recommandé côté Dictadevi

1. Retourner **200** immédiatement (le webhook est fire-and-forget côté IKtracker).
2. Persister dans une table `iktracker_reports` :
   `external_user_id`, `period_start`, `period_end`, `totals_json`,
   `monthly_pdf_url`, `annual_pdf_url`, `expires_at`, `received_at`.
3. Télécharger les PDF **avant `expires_at`** (30 jours) et les stocker dans le
   bucket Dictadevi si l'utilisateur doit y accéder au-delà.
4. Afficher un badge « Nouveau relevé mensuel disponible » dans l'UI Dictadevi.

---

## 2. Pull à la demande

### 2.1 Générer un relevé sur période libre

```
POST /reports/generate
x-api-key: ...
x-external-user-id: <dictadevi user id>
```

Body :

```json
{
  "start_date": "2026-07-01",
  "end_date":   "2026-07-31",
  "purpose":    "professionnel"   // optionnel
}
```

Réponse :

```json
{
  "report_id": "rpt_01H...",
  "pdf_url":   "https://iktracker.fr/temporaryreport/<token>?raw=1",
  "expires_at":"2026-09-14T07:00:12.000Z",
  "summary": { "trips_count": 42, "total_km": 1287.4, "total_ik": 623.18 }
}
```

### 2.2 Télécharger le PDF binaire directement

```
GET /reports/{report_id}/pdf
x-api-key: ...
x-external-user-id: <dictadevi user id>
```

Réponse : `application/pdf` (stream). Utiliser cet endpoint pour intégrer le
PDF dans l'UI Dictadevi sans passer par l'URL publique temporaire.

### 2.3 Statistiques / dashboard

- `GET /stats` — cumul annuel courant.
- `GET /dashboard` — cumul annuel + breakdown mensuel des N derniers mois
  (query param `months=12`).

Utiliser ces deux endpoints pour afficher des KPI dans Dictadevi **sans**
générer de PDF (plus léger, pas de quota PDF consommé).

---

## 3. Provisioning utilisateur

Lorsqu'un utilisateur Dictadevi est créé pour la première fois, appeler
n'importe quelle route user-scoped (typiquement `POST /trips` ou
`POST /sso/magic-link`) déclenche automatiquement :

- création de l'utilisateur IKtracker miroir,
- upsert d'une ligne `user_preferences` avec `user_monthly_report_enabled = true`.

**Conséquence** : dès qu'un utilisateur Dictadevi a créé son premier trajet,
il recevra automatiquement le webhook `monthly_report.sent` le 15 du mois
suivant. Aucune action supplémentaire n'est requise pour activer le push.

Pour désactiver l'envoi automatique pour un utilisateur donné :

```
PUT /preferences
x-external-user-id: <dictadevi user id>
{ "user_monthly_report_enabled": false }
```

---

## 4. Gestion d'erreurs

| Code | Cause                                      | Action Dictadevi                              |
|------|--------------------------------------------|-----------------------------------------------|
| 401  | Signature webhook invalide / clé absente   | Rejeter, alerter l'admin                      |
| 403  | Scope manquant (`reports` / `trips:read`)  | Contacter IKtracker pour élargir les scopes   |
| 404  | Utilisateur non lié (pas encore de trajet) | Silencieux — attendre la première activité    |
| 410  | `expires_at` dépassé sur un lien PDF       | Rappeler `POST /reports/generate`             |
| 429  | Quota mensuel atteint                      | Backoff + notifier l'user                     |

---

## 5. Checklist d'implémentation Dictadevi

- [ ] Ajouter les 3 variables d'environnement.
- [ ] Créer l'edge function `iktracker-webhook` (vérif HMAC + insert DB + 200).
- [ ] Enregistrer l'URL du webhook auprès d'IKtracker (support / admin).
- [ ] Créer la table `iktracker_reports` + RLS user-scopée.
- [ ] Ajouter dans l'UI un onglet « Relevés IK » listant les entrées de cette table.
- [ ] Bouton « Générer un relevé » → `POST /reports/generate` + download PDF via `/reports/{id}/pdf`.
- [ ] Job quotidien qui télécharge les PDF proches d'expiration et les archive dans le bucket Dictadevi.
- [ ] Afficher les KPI mensuels via `GET /dashboard?months=12` (pas de génération PDF).

---

Référence complète de l'API : `https://iktracker.fr/api-docs`
