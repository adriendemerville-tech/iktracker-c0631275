# Automatisation LinkedIn — intégration Wavespeed (texte Mistral + média IA)

## Objectif

Faire évoluer `linkedin-weekly-post` pour :
- Générer le **texte** du post via **Mistral hébergé sur Wavespeed**.
- Générer les **médias non-screencast** (images de carousel + vidéos courtes) via **Wavespeed**.
- Conserver **Browserless** uniquement pour les topics dont le média est une **capture d'écran vidéo** d'une feature réelle du site (Simulateur, Mode Tournée, Sync Calendrier, Détection plaque…).
- **Nouveau rythme** : passer d'un cron hebdo à un cron **mensuel, le 1er mercredi du mois à 07h UTC** (~08h Paris) + bouton "Tester maintenant" dans l'admin.

## Classification des topics

Chaque topic gagne un champ `mediaSource: 'browserless' | 'wavespeed'` :

| Slug                    | Format   | mediaSource |
| ----------------------- | -------- | ----------- |
| simulateur              | video    | browserless |
| mode-tournee            | video    | browserless |
| sync-calendrier         | video    | browserless |
| detection-plaque        | video    | browserless |
| import-takeout          | carousel | wavespeed   |
| bareme-progressif       | carousel | wavespeed   |
| bonus-electrique        | carousel | wavespeed   |
| *(autres non-UI)*       | *        | wavespeed   |

Règle : `browserless` uniquement pour un carousel/vidéo d'une **UI existante** du produit. Sinon Wavespeed.

## Flux global (par run)

```text
1. Sélection topic (rotation mensuelle — 12 topics = ~1 an sans répétition)
2. TEXTE   → Wavespeed → Mistral
3. MEDIA   → selon mediaSource :
     a) browserless → screencast MP4 (flux actuel inchangé)
     b) wavespeed   → video : modèle vidéo Wavespeed → MP4
                      carousel : N images Wavespeed → PDF pdf-lib
4. Upload LinkedIn (VIDEO / DOCUMENT ugcPost)
5. Log dans linkedin_post_log
```

## Changements techniques

### 1. Cron — passage hebdo → mensuel
- Mettre à jour le job `pg_cron` existant : expression `0 7 1-7 * 3` → 07h UTC le mercredi de la première semaine du mois (= 1er mercredi).
- Renommer le job en `linkedin-monthly-post` pour la lisibilité (l'edge function garde son nom `linkedin-weekly-post` pour éviter les cassures d'URL / signature ; on documente le décalage).
- Suppression de l'ancienne planification hebdo dans la même migration.

### 2. Accès Mistral via Wavespeed
- Nouveau helper `callMistral(system, prompt)` dans `linkedin-weekly-post/index.ts` qui POST `https://api.wavespeed.ai/api/v3/<mistral-model-path>` avec `WAVESPEED_API_KEY` (déjà configuré).
- Modèle par défaut : `mistral/mistral-large-latest` (ajusté selon catalogue Wavespeed après premier test).
- Fallback silencieux sur Gemini (Lovable AI) si l'appel échoue → cron résilient.

### 3. Génération média Wavespeed
- **Image (carousel)** : `wavespeed-ai/flux-dev` (ou `bytedance/seedream-v4`) avec `?wait=1`, télécharge chaque image, embed dans PDF pdf-lib 1080×1080 avec overlay texte via helper existant.
- **Vidéo** : modèle text-to-video Wavespeed (ex: `wavespeed-ai/wan-2.1-t2v-720p`), `?wait=1` avec timeout élargi si nécessaire.
- Helper `generateWavespeedMedia(format, prompt, count)` → `{ buffer: Uint8Array, mimeType: string }`.

### 4. Prompts média
- Nouveau champ `visualPrompt: string` sur chaque topic `mediaSource: 'wavespeed'` — description visuelle (style, ambiance) sans texte incrusté (géré par pdf-lib pour les slides).

### 5. Bouton "Tester maintenant" dans l'admin
- Nouveau composant `AdminLinkedIn.tsx` avec :
  - Sélecteur de topic (dropdown 12 topics)
  - Toggle **Dry-run** (génère texte + média, ne poste PAS sur LinkedIn)
  - Bouton **Lancer** → invoke `linkedin-weekly-post?topic=<slug>&dry_run=1`
  - Affichage : texte généré, aperçu média, request_id Wavespeed, logs
- Onglet "LinkedIn" ajouté dans `src/pages/Admin.tsx` (admin uniquement).

### 6. Edge Function — évolutions
- Nouveaux query params : `?topic=<slug>` (force topic), `?dry_run=1` (skip upload LinkedIn).
- Auth du bouton test : check `has_role(auth.uid(), 'admin')` via JWT côté fonction (plus propre que partager `x-cron-secret` côté client).
- Le cron continue avec `x-cron-secret` (inchangé).

### 7. Documentation
- Mise à jour `docs/BACKEND.md` :
  - Section `linkedin-weekly-post` : nouveau rythme mensuel, source texte Mistral/Wavespeed, source média Wavespeed, matrice topic→source.
  - Régénération du PDF `IKTracker_Backend_Documentation.pdf`.

## Hors scope

- Pas de nouveau secret (WAVESPEED_API_KEY déjà en place, pas de clé Mistral séparée).
- Pas de refonte des topics (juste enrichissement métadonnées).
- Pas de génération audio / voice-over.
- Pas de renommage de l'edge function (reste `linkedin-weekly-post` malgré le rythme mensuel — trace documentée).

## Points à valider pendant l'implémentation

- Modèle Mistral exact disponible sur Wavespeed → test rapide via balance/catalog avant de câbler.
- Latence text-to-video Wavespeed : si > 90s, élargir le timeout de `pollUntilDone` ou basculer en async (submit + poll séparé).
