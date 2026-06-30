# Prompt Lovable — Mémoire des slugs IKtracker (Crawlers / Parménion)

> **À coller tel quel dans le chat Lovable des projets `Crawlers` et `Parménion`.**
> Ce prompt demande à Lovable d'implémenter la persistance des slugs côté agent, pour arrêter de republier en boucle les mêmes articles vers l'API IKtracker.

---

## Prompt à copier-coller

```
Implémente une mémoire persistante des slugs publiés vers l'API blog IKtracker
(endpoint POST https://www.iktracker.fr/functions/v1/blog-api/posts).

CONTEXTE
--------
L'API IKtracker renvoie désormais 3 signaux à respecter strictement :

| HTTP | error / champ          | Action obligatoire                                  |
|------|------------------------|-----------------------------------------------------|
| 409  | error: slug_blacklisted| Slug interdit par l'admin → JAMAIS réessayer        |
| 200  | _skipped: true,        | Article déjà présent → ne PAS republier             |
|      | _reason: slug_already_exists |                                               |
| 201  | (aucune)               | Création réussie → mémoriser le slug comme publié   |

Aujourd'hui l'agent renvoie sans arrêt les mêmes slugs (ex.
`frais-reels-ou-forfait-independants-2026`) après suppression admin.
Il faut une mémoire persistante locale + un garde-fou avant chaque POST.

CE QUE TU DOIS FAIRE
--------------------
1. Crée une table Supabase `iktracker_slug_memory` :
   - slug text PRIMARY KEY
   - status text CHECK (status IN ('published','blacklisted','skipped'))
   - reason text NULL
   - last_seen_at timestamptz DEFAULT now()
   - hash_content text NULL  -- hash sha256 du dernier contenu publié
   RLS : lecture/écriture réservée au service role uniquement.

2. Crée un module `src/lib/iktracker-slug-memory.ts` avec :
   - `isBlocked(slug: string): Promise<{ blocked: boolean, reason?: string }>`
     → true si slug en `blacklisted`, ou `skipped` depuis < 7 jours,
       ou matche un motif blacklisté connu (suffixes `-2`, `-bis`, `-v2`,
       `-final`, `-new`, ou même racine + année différente).
   - `normalizeSlug(s: string): string` (kebab-case, sans accents, sans stop-words FR).
   - `isVariantOfBlocked(slug: string): Promise<boolean>`
     → distance de Levenshtein ≤ 3 vs un slug blacklisté connu.
   - `recordResult(slug: string, response: Response, body: any, contentHash: string)`
     → upsert dans `iktracker_slug_memory` selon le tableau ci-dessus.

3. Modifie l'appel `POST /posts` :
   - AVANT l'appel : si `isBlocked(slug) || isVariantOfBlocked(slug)` → ABORT,
     log et choisir un autre angle éditorial (ne JAMAIS retenter la même idée).
   - APRÈS l'appel : appeler `recordResult(...)`.
   - Si réponse 409 `slug_blacklisted` : marquer `blacklisted` définitivement
     ET ajouter automatiquement les variantes évidentes (mêmes mots-clés,
     années adjacentes) en `blacklisted` pour anti-bouclage.
   - Si réponse 200 `_skipped` : marquer `skipped` avec timestamp.
   - Si réponse 201 : marquer `published` + stocker le hash du contenu.

4. Ajoute un cooldown global :
   - Si le même slug normalisé a été tenté ≥ 2 fois dans les 30 derniers jours
     (toutes statuts confondus), refuser localement.

5. INTERDICTIONS strictes à coder :
   - Pas de `force: true` automatique.
   - Pas de reformulation triviale d'un slug refusé (changement de 1-2 mots,
     ajout de suffixe, changement d'année) : doit échouer le check Levenshtein.
   - Pas de retry boucle après un 409.

6. Expose une petite UI admin (page `/slug-memory`) :
   - Liste des slugs mémorisés (filtre par statut).
   - Bouton "purger un slug" (utile si l'admin IKtracker a retiré le slug
     de SA blacklist et qu'on veut pouvoir le republier).
   - Compteur "tentatives bloquées localement aujourd'hui".

7. Documentation : crée `docs/IKTRACKER_API_RULES.md` qui résume
   les 3 codes de retour et les règles ci-dessus.

CONTRAT DE TEST
---------------
- Tenter de poster `frais-reels-ou-forfait-independants-2026` → bloqué localement.
- Tenter `frais-reels-ou-forfait-independants-2027` → bloqué (variante).
- Tenter `bareme-ik-2026` (autorisé) → POST → 201 → enregistré comme published.
- Re-tenter `bareme-ik-2026` avec même contenu → bloqué localement (hash identique).
- Re-tenter `bareme-ik-2026` avec contenu modifié → autorisé via PUT, pas POST.

LIVRABLE
--------
- Migration Supabase pour la table.
- Module TypeScript `iktracker-slug-memory.ts` + tests Vitest.
- Intégration dans le pipeline de publication existant.
- Page admin `/slug-memory`.
- Doc `docs/IKTRACKER_API_RULES.md`.

Ne pose pas de questions, implémente directement. Utilise Lovable Cloud
pour la table. Commence par la migration, puis le module, puis l'intégration.
```

---

## Pourquoi ce prompt

- **Action immédiate** : un seul prompt suffit pour que Lovable génère table + module + UI + tests.
- **Aligné API IKtracker** : reprend exactement les 3 codes (`409`, `200 _skipped`, `201`) que l'edge function `blog-api` renvoie.
- **Anti-bouclage structurel** : Levenshtein + variantes années + hash de contenu = on ne peut plus contourner par reformulation.
- **Réversible côté admin** : la page `/slug-memory` permet de purger si besoin (sans dépendre de l'admin IKtracker).

## À faire après collage

1. Coller le prompt dans Lovable côté **Crawlers**.
2. Coller le même prompt dans Lovable côté **Parménion**.
3. Vérifier que la table `iktracker_slug_memory` est bien créée chez chacun.
4. Lancer un POST test pour confirmer que le 409 est bien capturé et persisté.
