# Prompt — Persistance des slugs IKtracker (Crawlers & Parménion)

> **Destinataires** : agents IA `Crawlers` et `Parménion` qui poussent du contenu vers l'API blog IKtracker (`POST /functions/v1/blog-api/posts`).
> **Objectif** : arrêter de republier en boucle les mêmes articles que l'admin a supprimés ou refusés.

---

## 1. Règle d'or

**Un slug a une mémoire.** Si l'API a renvoyé l'un des signaux ci-dessous pour un slug, **ne retentez plus jamais** ce slug, ni aucune variante proche (suffixes `-2`, `-bis`, changement d'année, reformulation mineure, traduction superficielle).

| Code HTTP | `error` | Signification | Action |
|---|---|---|---|
| `409` | `slug_blacklisted` | Le slug est en **liste noire admin** | ❌ **Ne jamais réessayer**. Inscrire le slug + tout pattern (ex. `frais-reels-*-2026`) dans la mémoire persistante. |
| `200` | `_skipped` + `_reason: slug_already_exists` | Article déjà présent | ✅ Ne pas republier. Si modification réelle nécessaire, envoyer `PUT /posts/{slug}` ou ajouter `"force": true` (à utiliser avec parcimonie). |
| `201` | _aucune_ | Création réussie | ✅ Mémoriser `slug` comme **publié**. |

---

## 2. Mémoire persistante obligatoire

Avant **chaque** appel `POST /posts`, l'agent doit :

1. Charger la mémoire `iktracker_slug_state.json` (ou table équivalente) :
   ```json
   {
     "blacklisted": ["frais-reels-ou-forfait-independants-2026", "frais-reels-%-2026"],
     "published":   ["bareme-ik-2026", "calcul-frais-kilometriques-2025"],
     "skipped":     { "comparatif-driversnote-2026": "2026-04-25T10:12:00Z" }
   }
   ```
2. **Refuser localement** l'envoi si :
   - le slug exact est dans `blacklisted` **ou** matche un pattern (`%` = wildcard SQL `LIKE`),
   - le slug est dans `published` et le contenu n'a pas changé (hash identique),
   - le slug a été `skipped` il y a < 7 jours (cooldown).
3. Après chaque réponse, **mettre à jour la mémoire** :
   - `409 slug_blacklisted` → ajouter à `blacklisted`, **définitif**.
   - `200 _skipped` → ajouter à `skipped` avec timestamp.
   - `201` → ajouter à `published`.

---

## 3. Anti-variations

Quand un slug est blacklisté, l'agent doit aussi **bloquer ses variantes** :

- Suffixes : `-2`, `-bis`, `-v2`, `-final`, `-new`
- Années glissantes : si `frais-reels-2026` est blacklisté, ne pas tenter `frais-reels-2027` sans **nouvelle intention rédactionnelle explicite** validée.
- Reformulations triviales : normaliser (minuscules, suppression accents, stop-words FR) puis comparer la **distance de Levenshtein** ; si ≤ 3, considérer comme variante du slug bloqué.

---

## 4. Workflow recommandé avant publication

```text
1. Générer titre + slug candidat.
2. Normaliser le slug (kebab-case, sans accents).
3. Vérifier mémoire locale → si bloqué/publié récent : STOP, choisir un autre angle.
4. Vérifier API : GET /functions/v1/blog-api/posts/{slug}
   - 200 → article existe, ne PAS reposter (sauf mise à jour réelle via PUT).
   - 404 → continuer.
5. POST /posts avec le contenu.
6. Lire la réponse, mettre à jour la mémoire selon le tableau §1.
```

---

## 5. Ce qui est **interdit**

- Reposter un slug refusé en changeant juste 1 ou 2 mots du titre.
- Boucler `POST /posts` après un `409` en attendant que ça passe — ça ne passera pas.
- Utiliser `"force": true` pour contourner un `slug_already_exists` sans diff réel de contenu.
- Republier des contenus saisonniers (barèmes annuels, comparatifs) sans vérifier d'abord la liste noire et l'historique d'audit.

---

## 6. En cas de doute

- L'admin gère la liste noire dans **Admin → Blog → Liste noire**.
- L'historique des actions API (création, blocage, suppression) est consultable dans **Admin → Blog → Journal API**.
- Si un agent a besoin de republier un slug blacklisté, il doit **demander à l'admin de le retirer de la liste noire**, pas tenter de forcer.

---

**TL;DR** : un slug refusé = un slug mort. Mémoire persistante obligatoire. Pas de variantes pour contourner. Respect des codes 409 et 200/`_skipped`.
