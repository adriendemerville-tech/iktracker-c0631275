# Workflow de génération et publication des posts LinkedIn — IKtracker

Documentation technique détaillée de l'automatisation qui publie chaque mois un post sur le profil LinkedIn d'Adrien de Volontat (fondateur IKtracker), puis l'audite et le corrige automatiquement.

## 0. Objectifs stratégiques du module

1. **SEO / GEO** — Publier du contenu public sur LinkedIn que les crawlers et moteurs d'IA vont indexer, associer au domaine `iktracker.fr` et renforcer le référencement naturel / génération augmentée.
2. **Génération de leads** — Attirer des visiteurs qualifiés vers le site et convertir en inscriptions.
3. **Couverture fonctionnelle 360°** — Parler régulièrement de chaque module d'IKtracker pour construire un graphe de connaissances complet afin que les IA recommandent la plateforme (notamment vis-à-vis de solutions concurrentes comme DictaDevi).
4. **Personal branding du fondateur** — Positionner Adrien de Volontat comme voix crédible et authentique, avec un ton à quatre caractéristiques : **précis**, **pédagogue**, **humble**, **sympathique**.

Ces objectifs orientent le choix des topics, le ton des prompts et les médias générés.

Deux Edge Functions composent le système :

| Function | Rôle | Fichier |
|---|---|---|
| `linkedin-weekly-post` | Génère le texte + le média et publie le post | `supabase/functions/linkedin-weekly-post/index.ts` (~2 180 l. — **dette**, cf. §13) |
| `linkedin-post-audit` | Relit le post publié, le note, et le republie corrigé si nécessaire | `supabase/functions/linkedin-post-audit/index.ts` (~630 l.) |

---

## 1. Vue d'ensemble

- **Cadence de publication** : 1ᵉʳ mercredi de chaque mois, 07:00 UTC (~08:00 Paris) — `pg_cron`, expression `0 7 1-7 * 3`.
- **Cadence d'audit** : toutes les 5 minutes (`pg_cron`), ne traite qu'un post à la fois.
- **Cible** : profil personnel Adrien de Volontat, via le **connector LinkedIn Lovable** (gateway `https://connector-gateway.lovable.dev/linkedin`).
- **Mention** : la page entreprise IKtracker est mentionnée en fin de post quand l'URN organisation est résolvable.
- **Traçabilité** : chaque exécution (succès ou échec) insère une ligne dans `public.linkedin_post_log`.
- **Média obligatoire** : aucun post texte seul n'est jamais publié ; si toutes les voies média échouent, la publication est annulée et loggée en `failed`.

### Déclencheurs

| Mode | Auth | Appel |
|---|---|---|
| Cron mensuel | header `x-cron-secret` (= `CRON_SECRET` ou `SYNC_CRON_TOKEN`) | `POST /functions/v1/linkedin-weekly-post` |
| Manuel admin | JWT + `has_role(uid,'admin')` | Admin → onglet **LinkedIn** |
| Dry-run | idem | `?dry_run=1` — génère texte + plan de slides, ne publie rien |
| Forçage sujet | idem | `?topic=<slug>` |
| Forçage format | idem | `?format=video` ou `?format=carousel` ou `?format=image` |
| Republication | idem | `?mode=repost` + body `{ post_id, text, asset_urn? }` |

---

## 2. Flux complet d'un run de publication

```text
0. Auth (cron secret OU JWT admin) ────────────────────► 401 / 403 sinon
1. Sélection du topic
     ├── ?topic=<slug> si forcé
     └── sinon pickTopicForThisMonth() : rotation déterministe sur 12 sujets
2. Chargement du style
     ├── linkedin_style_samples (corpus manuel, active=true, 12 max)
     ├── complément API LinkedIn si < 4 échantillons
     └── analyzeStyle() → StyleProfile chiffré
3. Génération du TEXTE
     ├── Prompt système (ton, garde-fous anti-IA, structure) + StyleProfile
     ├── Prompt user (focus du topic + TOPIC_FACTS + extraits docs BACKEND/FRONTEND)
     ├── Mistral via Wavespeed ── fallback ──► Gemini via Lovable AI Gateway
     └── sanitizePostText() → airifyPostText() → appendTopicLink()
4. Dérivation des visuels À PARTIR DU TEXTE généré
     ├── carousel  → generateSlidePlanFromText()
     ├── wavespeed → deriveVisualPromptFromText()
     └── browserless → deriveCaptureFocus() (labels UI à cadrer)
   [si dry_run → retour JSON ici, rien n'est publié]
5. Génération du MÉDIA
     ├── mediaSource = browserless → PageBolt /v1/video (MP4)
     │        ├── scénario 1 : deriveVideoScenario() — steps écrits par LLM
     │        │                APRÈS le texte, d'après le post + la doc du module
     │        ├── scénario 2 : scriptedVideoSteps() (scénario en dur du module)
     │        ├── scénario 3 : fallbackVideoSteps() (défilement aveugle)
     │        ├── repli 1 : carrousel PDF de captures Browserless
     │        └── repli 2 : capture PNG unique
     └── mediaSource = wavespeed
              ├── video    → text-to-video Wavespeed → MP4
              └── carousel → image de couverture Wavespeed + pdf-lib → PDF
6. Upload + publication LinkedIn (chaîne de tentatives)
     ├── REST versionnée (/rest/images|documents|videos + /rest/posts)
     ├── legacy /v2/assets registerUpload + /v2/ugcPosts
     └── dernier recours : screenshot en post image
7. Log dans linkedin_post_log (status, post_id, asset_urn, durée, fallback)
8. ~5 min plus tard : linkedin-post-audit relit, note, et republie si besoin
```

---

## 3. Sélection du sujet

`TOPICS` contient **12 sujets**, chacun décrit par :

```ts
{ slug, title, url, focus, format, mediaSource, durationMs, visualPrompt?, slideCount? }
```

- `format` : `"video"` | `"carousel"` → détermine le type d'upload LinkedIn (VIDEO ou DOCUMENT).
- `mediaSource` :
  - `"browserless"` → on **montre l'UI réelle** (simulateur, mode tournée, sync calendrier, détection plaque…) ;
  - `"wavespeed"` → visuel **généré par IA** (concepts : barème, bonus électrique, gratuité, confidentialité, comparatif).

Deux pools :
- `PRODUCT_SLUGS` (7 sujets produit),
- `CONTEXT_SLUGS` (5 sujets contexte/valeurs).

`pickTopicForThisMonth()` calcule `n = année*12 + mois` : **2 mois produit pour 1 mois contexte** (`n % 3 === 2` → contexte), avec un index cyclique déterministe. Même mois = même sujet, ce qui rend les runs reproductibles.

---

## 4. Génération du texte

### 4.1 Corpus de style

1. Source primaire : table `public.linkedin_style_samples` (`content`, `active`), alimentée manuellement depuis l'admin. C'est la source de vérité, car l'API LinkedIn ne rend pas les posts passés sans scope de lecture.
2. Complément : `fetchRecentAuthorPosts()` via le gateway, seulement si moins de 4 échantillons manuels.
3. Échantillons < 80 caractères ignorés ; 6 exemples max injectés dans le prompt.

### 4.2 StyleProfile déterministe

`analyzeStyle()` produit des cibles chiffrées, injectées dans le prompt via `styleProfileToPromptBlock()` :

- longueurs moyennes (caractères, mots, phrases, paragraphes) ;
- `short_sentence_ratio` (% de phrases ≤ 8 mots) ;
- `first_person_ratio`, `question_ratio` ;
- `top_opening_words`, `frequent_bigrams`, `frequent_content_words` (signature lexicale, stopwords FR filtrés).

But : donner au modèle des **cibles mesurables** plutôt que des consignes vagues.

### 4.3 Ancrage factuel

Trois couches de faits sont fournies au modèle :

1. `topic.focus` — résumé du module.
2. `TOPIC_FACTS[slug]` — faits techniques vérifiés (chiffres, seuils, règles).
3. Extraits de la documentation interne : `docs-context.ts` est généré depuis `docs/BACKEND.md` + `docs/FRONTEND.md` par `scripts/generate-linkedin-docs-context.cjs`. `docContextForTopic()` sélectionne jusqu'à 4 sections par score de mots-clés (titre pondéré ×3, seuil ≥ 2), plafonné à 4 500 caractères.

Consigne stricte : au moins 3 faits exploités, **aucune invention**, aucun nom de table / fonction / fournisseur d'infra.

### 4.4 Règles de rédaction imposées

- **Longueur : 1 000 à 1 500 signes** (contrainte dure).
- **Hook obligatoire** en première ligne, seul, factuel (pas de question rhétorique).
- **Aération** : ≥ 6 paragraphes, 1 à 2 phrases chacun, séparés par une ligne vide.
- **Pas de chute** : ni morale, ni CTA, ni synthèse. Le post s'arrête sec.
- **Angle produit uniquement** : un seul module, décrit de l'intérieur (déclencheur, mécanisme, seuils, sortie). Pas de persona, pas de témoignage.
- **Garde-fous anti-IA** :
  - interdits : `—`, `–`, tiret d'incise, emojis, hashtags, puces, markdown ;
  - caractères interdits : `( ) @ [ ] { } < > \ * _ ~ |` ;
  - formulations bannies : « Découvrez », « révolutionnaire », « game-changer », « je suis ravi de », « dans un monde où », etc. ;
  - pourcentages toujours en `%` (jamais « pour cent »).

### 4.5 Modèles

| Rang | Modèle | Accès |
|---|---|---|
| 1 | `mistral/mistral-large-latest` | Wavespeed (`WAVESPEED_API_KEY`), soumission + polling `predictions/{id}/result`, timeout 180 s |
| 2 | Gemini | Lovable AI Gateway (`LOVABLE_API_KEY`) |

`callLLM()` bascule automatiquement sur Gemini si Mistral échoue, et remonte la source utilisée (`text_source`).

### 4.6 Post-traitement (déterministe, non négociable)

1. `sanitizePostText()` — remplace `—`/`–` par des virgules, supprime les puces et les caractères interdits, convertit « 20 pour cent » en « 20% », nettoie les doubles espaces.
2. `airifyPostText()` — recompose les paragraphes : hook isolé, puis paquets de 2 phrases séparés par une ligne vide.
3. `appendTopicLink()` — ajoute l'URL de la page concernée (sans ancre) en fin de post ; LinkedIn la rend cliquable automatiquement.
4. `enforceBrandMention()` — invariant I11 : normalise la casse (`Iktracker`, `ik tracker` → `IKtracker`) et, si la marque est absente, rattache la première tournure possessive anonyme (« mon simulateur » → « le simulateur d'IKtracker »). En amont, `brandMentionCount()` déclenche une régénération unique si le texte compte moins de 2 occurrences.
5. Mention entreprise : `restCommentary()` (syntaxe inline `@[IKtracker](urn)`) pour l'API REST, ou `ugcCommentary()` (texte + `attributes` avec `CompanyAttributedEntity`) pour `/v2/ugcPosts`. L'URN vient de `LINKEDIN_ORG_URN`/`LINKEDIN_ORG_ID`, sinon de `/v2/organizationAcls` (mis en cache par instance).

---

## 5. Génération du média

### 5.1 Vidéo d'UI réelle — PageBolt (`mediaSource: "browserless"`)

Endpoint `POST https://pagebolt.dev/api/v1/video`, header `x-api-key: PAGEBOLT_API_KEY`.

Paramètres d'enregistrement : viewport 1280×720, `format: "mp4"`, 30 fps, `pace: "normal"`, `blockBanners: true`, curseur visible en surbrillance `#4F46E5`, effet de clic « ripple », `response_type: "json"` (MP4 renvoyé en base64).

**Scénario 1 — adapté au post (`deriveVideoScenario`, prioritaire)** : rédigé **après** la génération du texte, par LLM, à partir du post publié + des extraits de doc technique du module (`captureHintsForTopic`). Le LLM renvoie `{"steps": [...]}` (8 à 14 étapes) pour filmer précisément le parcours ou le module dont parle le post, dans l'ordre du texte.

Garde-fous (`sanitizeAiSteps`, exécution refusée sinon) :
Garde-fous (`sanitizeAiSteps`, exécution refusée sinon) :
- actions autorisées uniquement : `navigate`, `wait`, `scroll`, `click`, `hover`, `fill`, `evaluate` ;
- `navigate` restreint au domaine `iktracker.fr` ; première étape forcée en `navigate` + `wait` ;
- `wait` borné 800–4000 ms, `scroll` borné −2000/+3000 px, 18 étapes maximum ;
- `evaluate` accepté seulement s'il contient `scrollIntoView` ou `.click()` et fait moins de 400 caractères (pas de JS arbitraire) ;
- `isKnownSelector()` : une action `click`, `hover` ou `fill` n'est conservée que si son sélecteur figure dans `TOPIC_UI_HINTS`, registre des sélecteurs réels du module (`input[id^='annualKm']`, `[id^='electric']`, `[id^='fiscalPower']`…). Les sélecteurs inventés par le LLM sont écartés et loggés.

`uiHintBlock(topic)` injecte cette liste de sélecteurs vérifiés dans le prompt du scénariste. `ensureModuleInteractions()` vérifie ensuite qu'il reste au moins une interaction réelle sur le module ; sinon `moduleInteractionSteps()` réinjecte la séquence scriptée, pour ne jamais publier une vidéo de simple défilement.


**Scénario 2 — scripté en dur** (`scriptedVideoSteps`, repli si le scénario adapté échoue ou est invalide) :

1. `navigate` vers `topic.url`, `wait 3500ms`.
2. Si l'URL contient une ancre : `evaluate` → `scrollIntoView({behavior:'smooth'})` sur l'élément, `wait 2500ms`.
3. Cas `simulateur` : `fill` de `input[id^='annualKm']` avec `12000`, puis `evaluate` → clic sur `[id^='electric']` (bonus 20% électrique) pour montrer le recalcul en direct.
4. Deux `scroll` relatifs (+400, +500) entrecoupés d'attentes, pour parcourir le résultat.

**Scénario 3 — repli aveugle** (`fallbackVideoSteps`) : défilement par positions absolues Y = 700 / 1500 / 2400, valide quel que soit le DOM.

Contrôles : erreur si la réponse ne contient pas de payload, ou si le MP4 fait moins de 50 ko.

> Historique : `page.screencast` de Browserless `/function` n'est pas disponible sur l'offre utilisée (runtime navigateur, sans `fs` ni `ffmpeg`) — d'où le passage à PageBolt pour la vidéo.

### 5.2 Replis média (chaîne complète)

```text
PageBolt MP4 (scénario adapté au post → scénario scripté → défilement aveugle)
  └─ échec → captureUiFrames() (Browserless, 5 captures cadrées sur les
              focusLabels dérivés du texte) → renderScreenshotCarouselPdf()
              → format devient "carousel"
       └─ échec → captureScreenshot() (PNG unique de la page)
                  → format devient "image"
```

Chaque bascule positionne `media_fallback = true` et `media_fallback_reason` dans la réponse et le log.

**Runs de référence (topic `simulateur`)**

| Date | Scénario | Média | Post | Remarque |
|---|---|---|---|---|
| 31/07/2026 | adapté, 10 étapes | MP4 2,64 Mo | `urn:li:ugcPost:7488847876358438912` | run ~77 s, vidéo sans interaction visible sur le simulateur |
| 31/07/2026 | adapté + sélecteurs vérifiés | MP4 3,29 Mo | `urn:li:ugcPost:7488858014503038977` | aucun repli, IKtracker nommé 3 fois dont dès la 2ᵉ ligne, texte 1 383 signes |



### 5.3 Visuels IA — Wavespeed (`mediaSource: "wavespeed"`)

- **Vidéo** : `wavespeed-ai/wan-2.1-t2v-720p`, prompt dérivé du texte publié (`deriveVisualPromptFromText`) sinon `topic.visualPrompt`.
- **Carrousel** : image de couverture `wavespeed-ai/flux-dev`, puis `renderCarouselPdf()` (pdf-lib, pages carrées) assemble couverture + slides.
- `generateSlidePlanFromText()` construit le plan de slides **à partir du texte réellement généré** (repli : `generateSlidePlan(topic)`), pour que le visuel raconte la même chose que le post.
- Texte des PDF passé par `toWinAnsi()` + `wrapText()` (polices standard pdf-lib, pas d'Unicode étendu).

---

## 6. Upload et publication LinkedIn

Toutes les requêtes passent par le gateway Lovable :

```
Authorization: Bearer ${LOVABLE_API_KEY}
X-Connection-Api-Key: ${LINKEDIN_API_KEY}
→ https://connector-gateway.lovable.dev/linkedin/<path>
```

Version d'API REST : `LINKEDIN_API_VERSION` sinon valeur par défaut interne (`202506` côté audit).

### Chaîne de tentatives selon le format final

| Format | Tentative 1 | Tentative 2 | Tentative 3 |
|---|---|---|---|
| `video` | `rest-video` : POST `/rest/videos` avec le paramètre `action` = `initializeUpload`, puis PUT du binaire, puis `/rest/posts` | `legacy-video` (`registerUpload` `feedshare-video` → `/v2/ugcPosts`) | `screenshot-image` |
| `carousel` | `rest-document` (`/rest/documents` → PUT → `/rest/posts`) | `legacy-document` (`feedshare-document`, PDF) | `screenshot-image` |
| `image` | `rest-image` (`/rest/images` → PUT → `/rest/posts`) | — | — |

La voie legacy attend la disponibilité de l'asset via `waitForAssetReady()` (polling jusqu'à 5 min). Si **aucune** tentative n'aboutit, une erreur est levée : pas de post sans média.

---

## 7. Mode « repost » (correction d'un post publié)

L'API LinkedIn ne permet pas d'éditer le texte d'un post via le gateway (`PARTIAL_UPDATE` → 426 `NONEXISTENT_VERSION`). Le mode `?mode=repost` :

1. Retrouve le run d'origine dans `linkedin_post_log` via `linkedin_post_id`.
2. Récupère l'`asset_urn` média déjà uploadé (fourni en body ou lu en base).
3. Supprime le post existant.
4. Republie le texte corrigé avec le même asset — aucun nouvel upload, visuel identique.
5. Journalise le run (`topic_slug: "repost"`).

Body requis : `{ post_id, text }` avec `text` ≥ 50 signes.

---

## 8. Boucle qualité — `linkedin-post-audit`

Cron toutes les 5 minutes. Traite **un seul post** : le dernier run `success` publié depuis plus de 5 min et moins de 24 h, non encore audité.

1. `fetchPublishedText()` relit le texte réellement en ligne (REST `/rest/posts/{urn}`, repli `/v2/ugcPosts`) — source de vérité.
2. Un LLM (Mistral via Wavespeed, mêmes replis) note le post face aux règles de rédaction et à la documentation technique (`docs-context.ts`).
3. Seuils d'arrêt :

| Constante | Valeur | Sens |
|---|---|---|
| `SCORE_THRESHOLD` | 85 | score composite /100 à atteindre |
| `HOOK_THRESHOLD` | 8 | qualité du hook /10 |
| `FACTUAL_THRESHOLD` | 8 | vérifiabilité face à la doc /10 — **bloquant** |
| `MAX_ATTEMPTS` | 3 | itérations max par lignée de post |
| `MIN_GAIN` | 3 | gain de score minimum, sinon plateau → arrêt |

4. Si les seuils ne sont pas atteints, le texte est réécrit et envoyé au mode `repost` de `linkedin-weekly-post`.

Paramètres : `?post_id=<urn>` (forcer un post), `?dry_run=1` (auditer sans republier), `?min_age_min=N`.

---

## 9. Secrets et configuration

| Secret | Usage |
|---|---|
| `LOVABLE_API_KEY` | Gateway connector LinkedIn + Lovable AI (Gemini) |
| `LINKEDIN_API_KEY` | Clé de connexion du connector LinkedIn |
| `LINKEDIN_ORG_URN` / `LINKEDIN_ORG_ID` | (optionnel) URN de la page entreprise pour la mention |
| `LINKEDIN_API_VERSION` | (optionnel) surcharge de la version REST LinkedIn |
| `WAVESPEED_API_KEY` | Mistral, images et vidéos IA |
| `PAGEBOLT_API_KEY` | Capture vidéo MP4 de l'UI |
| `BROWSERLESS_API_KEY` | Captures d'écran et carrousel de repli |
| `CRON_SECRET` / `SYNC_CRON_TOKEN` | Authentification des appels cron |
| `SUPABASE_SERVICE_ROLE_KEY` | Écriture des logs (client admin) |

`supabase/config.toml` : `verify_jwt = true` pour `linkedin-weekly-post` et `linkedin-post-audit` (l'auth cron passe par `x-cron-secret` + la vérification interne).

---

## 10. Tables

### `public.linkedin_post_log`

Table unique du système : elle sert à la fois de journal de publication et de file d'audit (il n'existe pas de table d'audit séparée).

Colonnes écrites par `logRun()` (publication) :

`topic_slug`, `topic_title`, `post_text`, `linkedin_post_id`, `linkedin_asset_urn`, `video_bytes`, `media_type`, `status` (`success` | `failed`), `error_message`, `duration_ms`, `triggered_by` (`cron` | `admin`), `posted_at`.

Colonnes écrites par `linkedin-post-audit` (boucle qualité) :

| Colonne | Sens |
|---|---|
| `audit_status` | `null` = non encore audité (critère de sélection du cron), sinon `approved` / `reposted` / `plateau` / `failed` |
| `audit_score` | score composite /100 du dernier passage |
| `audit_hook_score` | note du hook /10 |
| `audit_attempts` | nombre d'itérations déjà consommées (max `MAX_ATTEMPTS` = 3) |
| `audit_report` | JSON complet du verdict LLM, dont `previous_score` pour la détection de plateau |

Après une republication, la ligne du nouveau post est remise à `audit_status = null` avec `audit_attempts` incrémenté : c'est ce qui la rend à nouveau éligible tout en bornant la boucle.

### `public.linkedin_style_samples`

Corpus de style saisi manuellement dans l'admin : `content`, `active`, `created_at`. Alimente le prompt et le `StyleProfile`.

---

## 11. Diagnostiquer un run

1. Dry-run : `?dry_run=1` renvoie `post_text`, `text_source`, `style_profile`, `style_samples_count`, `slide_plan`, `derived_visual_prompt` — sans rien publier.
2. Logs de la function : préfixes `[llm]`, `[style-samples]`, `[style-profile]`, `[video-scenario]`, `[pagebolt]`, `[media]`, `[mention]`, `[slide-plan]`, `[visual-prompt]`.
3. Réponse JSON de succès : `format` (peut différer du format demandé en cas de repli), `media_fallback`, `media_fallback_reason`, `media_bytes`, `post_id`, `asset_urn`, `duration_ms`.
4. Base : `select posted_at, topic_slug, status, media_type, video_bytes, linkedin_post_id, duration_ms, error_message from linkedin_post_log order by posted_at desc limit 10;` (la colonne de date est `posted_at`, pas `created_at`).
5. Durée d'un run vidéo : ~60 à 90 s. L'appel HTTP côté outillage peut expirer avant la fin ; la fonction continue et écrit son log — vérifier `linkedin_post_log` plutôt que de relancer.


### Symptômes fréquents

| Symptôme | Cause probable |
|---|---|
| Post publié en image au lieu d'une vidéo | PageBolt puis Browserless en échec → voir `media_fallback_reason` |
| Texte hors gabarit (< 1 000 signes) | Corpus de style vide → `StyleProfile` par défaut ; ajouter des échantillons |
| Pas de mention IKtracker | URN organisation non résolu (`[mention]` dans les logs) ; définir `LINKEDIN_ORG_URN` |
| `Média obligatoire indisponible` | Toutes les voies média ET d'upload ont échoué ; le post n'est volontairement pas publié |
| Vidéo générique alors que le post parle d'un module précis | Le scénario adapté a été rejeté (`[video-scenario] échec...`) → JSON invalide ou étapes filtrées par `sanitizeAiSteps` ; le run est retombé sur `scriptedVideoSteps()` |
| Sélecteurs du scénario vidéo cassés | L'UI a changé → mettre à jour `TOPIC_UI_HINTS` ET `scriptedVideoSteps()` (`input[id^='annualKm']`, `[id^='electric']`, `[id^='fiscalPower']`) |
| Vidéo où l'on ne voit pas le module fonctionner | Le LLM a proposé des sélecteurs inventés, filtrés par `isKnownSelector` → log `[video-scenario] N étape(s) écartée(s)` ; la séquence scriptée est désormais injectée automatiquement |

---

## 12. Invariants (règles dures, vérifiables)

| # | Invariant | Appliqué par |
|---|---|---|
| I1 | Jamais de post texte seul. Si aucune voie média n'aboutit, la publication est annulée et loggée en `failed` | garde média avant publication |
| I2 | Texte compris entre 1 000 et 1 500 signes | prompt, puis **régénération unique** si hors gabarit, puis `enforceMaxLength()` qui tronque en dur par paragraphe/phrase (appliqué aussi aux republications de l'audit) |
| I3 | Caractères interdits absents du texte final : parenthèses, crochets, accolades, chevrons, arobase, antislash, astérisque, tiret bas, tilde, barre verticale | `sanitizePostText()` |
| I4 | Pourcentages écrits sous la forme `100%`, jamais « 100 pour cent » | prompt + normalisation |
| I5 | Scénario vidéo : 18 étapes maximum, actions limitées à une liste blanche, navigation restreinte au domaine `iktracker.fr` | `sanitizeAiSteps()` |
| I6 | Un MP4 de moins de 50 ko est considéré comme invalide → repli carrousel | garde taille média |
| I7 | Une republication réutilise l'`asset_urn` existant, sans nouvel upload | mode `repost` |
| I8 | L'audit ne traite qu'un post à la fois, `audit_status is null`, âge entre 5 min et 24 h | requête de sélection du cron |
| I9 | Au plus 3 itérations d'audit par lignée de post, arrêt anticipé si le gain de score est inférieur à 3 | `MAX_ATTEMPTS`, `MIN_GAIN` |
| I10 | Toute exécution, succès ou échec, écrit une ligne dans `linkedin_post_log` | `logRun()` |
| I11 | Le post nomme IKtracker au moins deux fois, dont une dans les trois premières lignes ; aucune tournure anonyme du type "mon simulateur" | prompt, régénération unique, puis `enforceBrandMention()` qui normalise la casse et rattache la tournure anonyme à la marque |
| I12 | Une action `click`, `hover` ou `fill` du scénario vidéo n'est jouée que si son sélecteur figure dans `TOPIC_UI_HINTS` | `isKnownSelector()` dans `sanitizeAiSteps()` |
| I13 | Le scénario vidéo contient au moins une interaction réelle sur le module ; sinon la séquence scriptée est injectée | `ensureModuleInteractions()` / `moduleInteractionSteps()` |
| I14 | Un run PageBolt dont `steps_completed < total_steps` est rejeté et bascule sur le scénario suivant | contrôle dans `requestPageboltVideo()` |

---

## 13. Coûts, quotas et dette

### Consommation par run (ordre de grandeur)

| Poste | Appels par run | Volume typique | Remarque |
|---|---|---|---|
| Wavespeed — Mistral (texte) | 2 à 4 | ~4 à 8 k tokens entrée, ~1 k sortie | rédaction, scénario vidéo, réécriture d'audit |
| Lovable AI — Gemini (repli texte) | 0 à 2 | idem | seulement si Wavespeed échoue |
| PageBolt (vidéo) | 1 | MP4 de 1 à 4 Mo, 40 à 70 s de capture | poste le plus coûteux en temps |
| Browserless (captures / carrousel) | 0 ou 3 à 6 | PNG 1080 px, PDF carrousel | uniquement en repli |
| LinkedIn API | 3 à 5 | upload + post | quota profil : quelques dizaines de posts par jour, sans risque ici |
| Audit | 1 lecture + 1 notation, jusqu'à 3 fois | — | cron toutes les 5 min mais no-op la plupart du temps |

Cadence mensuelle : environ 1 run de publication + 1 à 3 cycles d'audit par mois. Le coût réel du système est donc dominé par PageBolt, pas par le LLM.

### Dette identifiée

1. Nom trompeur : `linkedin-weekly-post` publie en réalité une fois par mois. Renommage à prévoir avec migration du cron et de `config.toml`.
2. Fichier monolithique : ~2 180 lignes dans une seule Edge Function. Découpage cible : `text/`, `media/`, `linkedin-api/`, `scenario/`.
3. Pas de plafond de dépense explicite côté PageBolt et Browserless : à surveiller si la cadence augmente.
