# Workflow de publication LinkedIn — IKtracker

Documentation détaillée de l'automatisation qui publie chaque mois un post sur le profil LinkedIn d'Adrien de Volontat (fondateur IKtracker).

---

## 1. Vue d'ensemble

- **Cadence** : 1ᵉʳ mercredi de chaque mois, 07:00 UTC (~08:00 Paris).
- **Cible** : profil personnel Adrien de Volontat (compte connecté via le connector LinkedIn Lovable).
- **Cron** : `pg_cron` — expression `0 7 1-7 * 3` (mercredi de la première semaine du mois).
- **Edge function** : `supabase/functions/linkedin-weekly-post/index.ts` (nom historique, rythme désormais mensuel).
- **Déclencheurs** :
  - Automatique via cron (header `x-cron-secret`).
  - Manuel via l'admin (`/admin` → onglet **LinkedIn**), auth JWT admin.
  - Diagnostic via `?dry_run=1` (génère mais ne publie pas).
- **Traçabilité** : chaque exécution insère une ligne dans `public.linkedin_post_log`.

---

## 2. Flux général d'un run

```text
1. Auth de la requête (cron secret OU admin JWT)
2. Sélection du topic
     ├── ?topic=<slug> si forcé
     └── sinon rotation mensuelle sur la liste TOPICS (12 sujets)
3. Génération du TEXTE
     ├── Lecture des N derniers posts LinkedIn (style samples)
     ├── Extraction d'un StyleProfile déterministe
     ├── Prompt système + user → Mistral (Wavespeed)
     │     └── fallback Gemini (Lovable AI) si erreur
     └── Sanitisation (suppression tirets, caractères interdits, longueur 1000-1500)
4. Génération du MÉDIA selon mediaSource
     ├── browserless → screencast MP4 d'une UI réelle
     └── wavespeed
           ├── video    → text-to-video Wavespeed → MP4
           └── carousel → N images Wavespeed → PDF (pdf-lib, 1200×1200)
5. Publication LinkedIn
     ├── registerUpload (assets/registerUpload)
     ├── PUT du binaire vers l'URL retournée
     ├── ugcPost (VIDEO ou DOCUMENT)
     └── fallback text-only si registerUpload retourne 403
6. Log dans linkedin_post_log (statut, durée, erreurs, urn)
```

---

## 3. Sources & secrets

| Rôle | Secret / env | Fournisseur |
|---|---|---|
| Auth LinkedIn (post + upload) | `LINKEDIN_API_KEY` (injecté par le connector Lovable) | Connector Lovable (workspace) |
| Passerelle connector | `LOVABLE_API_KEY` | Lovable |
| Texte primaire (Mistral) | `WAVESPEED_API_KEY` | Wavespeed |
| Texte fallback (Gemini) | `LOVABLE_API_KEY` | Lovable AI Gateway |
| Vidéo écrans réels | `BROWSERLESS_TOKEN` | Browserless |
| Images/vidéos IA | `WAVESPEED_API_KEY` | Wavespeed |
| Trigger cron | `CRON_SECRET` | interne |

Scopes LinkedIn actifs sur le connector : `openid`, `profile`, `email`, `w_member_social`.
→ Suffisants pour publier texte + média sur le **profil personnel**. Ne permettent pas la publication sur les **pages entreprise** (nécessiterait un app LinkedIn dédié + Community Management API).

---

## 4. Classification des topics

Chaque entrée de `TOPICS` (dans `linkedin-weekly-post/index.ts`) porte :

- `slug`, `title`, `url`, `focus` — métadonnées éditoriales
- `format`: `video` | `carousel` — type de post LinkedIn
- `mediaSource`: `browserless` | `wavespeed` — comment produire le média
- `durationMs` — durée du screencast Browserless
- `visualPrompt` — prompt visuel Wavespeed (si `mediaSource=wavespeed`)
- `slideCount` — nombre de slides intermédiaires (carousel)

Règle : **`browserless` uniquement pour un carousel/vidéo d'une UI existante du produit**. Sinon Wavespeed.

Matrice actuelle :

| Slug | Format | mediaSource |
|---|---|---|
| simulateur | video | browserless |
| mode-tournee | video | browserless |
| sync-calendrier | video | browserless |
| detection-plaque | video | browserless |
| export-pdf | video | browserless |
| import-takeout | carousel | wavespeed |
| bareme-progressif | carousel | wavespeed |
| bonus-electrique | carousel | wavespeed |
| gratuit-a-vie | carousel | wavespeed |
| confidentialite | carousel | wavespeed |
| comparatif | carousel | wavespeed |
| trajets-recurrents | carousel (6 slides) | wavespeed |

Rotation mensuelle déterministe et pondérée : **2 posts sur 3** portent sur une fonctionnalité produit (`PRODUCT_SLUGS`), le 3e sur un sujet de contexte fiscal ou de marque (`CONTEXT_SLUGS`). Le topic IK vélo a été retiré de la rotation.

---

## 5. Génération de texte

### 5.1 Apprentissage du style (`fetchRecentAuthorPosts` + `analyzeStyle`)

Avant chaque génération :

1. Récupère les derniers posts du profil connecté via `/v2/ugcPosts` (connector LinkedIn).
2. Extrait un `StyleProfile` déterministe :
   - Longueur moyenne (caractères, mots)
   - Nombre de phrases / mots par phrase
   - Nombre de paragraphes / mots par paragraphe
   - Ratio de phrases courtes (< 8 mots)
   - Ratio de phrases commençant par "je"
   - Ratio de questions
   - Top ouvertures (premiers mots), bigrammes, vocabulaire signature

Ce profil est injecté dans le prompt comme **cibles chiffrées** ("vise ~180 mots, 12 phrases, 30% de phrases courtes…").

### 5.2 Prompt & garde-fous

Le prompt système impose :

- **Longueur** : 1000 à 1500 signes (espaces inclus).
- **Hook** obligatoire dès la 1ʳᵉ ligne, **aucune chute / CTA / question finale**.
- **Interdits typographiques** : tirets cadratins/demis (`—`, `–`), `( ) @ [ ] { } < > \ * _ ~ |`.
- **Interdits lexicaux** : formules IA typiques ("En tant que", "Dans un monde…", emojis démonstratifs, hashtags à outrance).
- Ton et rythme calqués sur le `StyleProfile`.

### 5.3 Appel Mistral (Wavespeed)

`callMistral(system, prompt)` POST vers `https://api.wavespeed.ai/api/v3/mistral/mistral-large-latest` avec `WAVESPEED_API_KEY`. Réponse texte pure.

### 5.4 Fallback Gemini

Si Mistral échoue (timeout, 5xx, quota), bascule silencieuse vers Gemini 2.5 Flash via `LOVABLE_AI_GATEWAY`. Le champ `text_source` du log précise laquelle a produit le texte.

### 5.5 Post-traitement (`sanitizePostText`)

- Strip des caractères interdits.
- Normalisation des espaces / retours ligne.
- Truncate à 1500 si dépassement.
- Vérification de longueur minimale (1000) — sinon nouvelle tentative avec prompt plus explicite.

---

## 6. Génération du média

### 6.1 Screencast Browserless (`mediaSource: 'browserless'`)

- POST vers `https://production-sfo.browserless.io/screencast` avec un script Playwright qui :
  - Navigue vers `topic.url`
  - Effectue une interaction scriptée (scroll, hover, focus) sur la feature
  - Enregistre pendant `topic.durationMs` (10-15s)
- Retour MP4 → uploadé tel quel comme LinkedIn VIDEO.

### 6.2 Wavespeed vidéo (`mediaSource: 'wavespeed'`, `format: 'video'`)

- Modèle : `wavespeed-ai/wan-2.1-t2v-720p`
- POST `?wait=1` avec `topic.visualPrompt`
- Timeout élargi (~120s), retour MP4.

### 6.3 Wavespeed carousel (`mediaSource: 'wavespeed'`, `format: 'carousel'`)

Pipeline PDF :

1. **Plan de slides** — Mistral/Gemini génère un JSON `{ cover, slides[], cta }` (nombre variable, `topic.slideCount` intermédiaires).
2. **Cover** — 1 image Wavespeed via `wavespeed-ai/flux-dev` avec `topic.visualPrompt` (style éditorial ivoire).
3. **Slides intermédiaires** — chaque slide est rendue en pdf-lib :
   - Fond ivoire (cf. mémoire *Light Theme Warm Ivory*)
   - Titre + texte via `StandardFonts` + fallback wrap
   - Petits éléments graphiques (numéro slide, footer iktracker.fr)
4. **PDF final** — 1200×1200 (format LinkedIn document), embed image cover + slides texte, uploadé comme LinkedIn DOCUMENT.

---

## 7. Upload & publication LinkedIn

### 7.1 `registerUpload`

POST `/v2/assets?action=registerUpload` avec :

- `recipes` : `urn:li:digitalmediaRecipe:feedshare-video` ou `feedshare-document`
- `owner` : URN du membre (récupéré via `/v2/userinfo` → `sub`)
- `serviceRelationships` : `urn:li:userGeneratedContent`

Retour : `uploadUrl` + `asset` URN.

### 7.2 Upload binaire

PUT du buffer (MP4 ou PDF) sur `uploadUrl`, headers Bearer. Attendre 201.

### 7.3 `ugcPosts`

POST `/v2/ugcPosts` avec :

- `author` = URN du membre
- `lifecycleState` = `PUBLISHED`
- `specificContent."com.linkedin.ugc.ShareContent"` :
  - `shareCommentary.text` = texte généré
  - `shareMediaCategory` = `VIDEO` ou `DOCUMENT`
  - `media[0]` = `{ status: READY, media: <asset URN> }`

Retour : `x-restli-id` = URN du post → sauvegardé en log.

### 7.4 Fallback text-only

Si `registerUpload` renvoie **403 ACCESS_DENIED** (scope média manquant sur le connector) :

- Nouveau ugcPost sans média (`shareMediaCategory: 'NONE'`).
- Log `media_fallback: true` + `error_message` d'origine conservé.

---

## 8. Auth et modes de déclenchement

| Mode | Auth | Résultat |
|---|---|---|
| Cron (`pg_cron`) | Header `x-cron-secret` == `CRON_SECRET` | Publication réelle |
| Admin UI (bouton) | JWT Supabase + check `has_role(auth.uid(), 'admin')` | Publication ou dry-run |
| `?dry_run=1` | idem | Génère texte + média, **ne publie pas** |
| `?topic=<slug>` | idem | Force le sujet |
| `?format=video\|carousel` | idem | Force le format |


Les appels sans auth valide retournent 401.

---

## 9. Journalisation (`linkedin_post_log`)

Colonnes clés :

- `topic_slug`, `topic_title`
- `media_type` (`video` / `carousel` / `text`)
- `status` (`success` / `error`)
- `error_message`
- `triggered_by` (`cron` / `admin:<user_id>`)
- `duration_ms`
- `post_id` (URN LinkedIn)
- `posted_at`

Affiché dans l'admin (`AdminLinkedIn.tsx` → historique 15 derniers runs).

---

## 10. Admin UI

`src/components/admin/AdminLinkedIn.tsx` (onglet **LinkedIn** de `/admin`) :

- Sélecteur topic (miroir client de `TOPICS`)
- Sélecteur format (auto / video / carousel)
- Toggle **Dry-run** (par défaut ON)
- Bouton **Tester maintenant** / **Publier maintenant**
- Aperçu résultat : texte, `StyleProfile` calculé, plan carousel, réponse brute
- Historique des runs (15 dernières lignes de `linkedin_post_log`)

⚠️ Le bouton en mode "Publier" pousse **réellement** sur LinkedIn — un warning rouge est affiché.

---

## 11. Coûts par run (ordre de grandeur)

| Étape | Modèle / service | Coût approx. |
|---|---|---|
| Texte Mistral | Wavespeed `mistral-large-latest` | < 0,01 $ |
| Style samples | LinkedIn API | gratuit |
| Video Wavespeed | `wan-2.1-t2v-720p` | ~0,15-0,30 $ |
| Image Wavespeed (cover carousel) | `flux-dev` | ~0,02 $ |
| Screencast Browserless | Browserless usage | ~0,01 $ |
| Upload + post LinkedIn | connector Lovable | gratuit |

Sur 12 mois : ~1-3 $ de coût média total.

---

## 12. Points de vigilance & limitations connues

- **Pas de publication sur pages entreprise** (iktracker, dictadevi) via ce connector — nécessiterait un App LinkedIn dédié + Community Management API.
- **Scopes média** parfois refusés (403 registerUpload) → fallback text-only actif.
- **Latence text-to-video Wavespeed** parfois > 90s → si récurrent, basculer en submit + poll séparé.
- **Rotation figée** : forcer un topic via cron nécessite un update SQL, sinon utiliser l'admin.
- L'edge function garde son nom historique `linkedin-weekly-post` malgré le rythme mensuel (URL / signature préservées).

---

## 13. Fichiers concernés

- `supabase/functions/linkedin-weekly-post/index.ts` — pipeline complet
- `supabase/functions/linkedin-profile/index.ts` — endpoint public profil (auteur)
- `src/components/admin/AdminLinkedIn.tsx` — UI admin
- `src/pages/Admin.tsx` — onglet LinkedIn
- Table `public.linkedin_post_log` — historique
- `pg_cron` job `linkedin-monthly-post` — planificateur
