# Suivi Lighthouse mobile (production)

Méthode : Lighthouse 12, form-factor mobile, Chromium headless, URLs de production.

## 2026-08-29 — baseline

| Page | Perf | TTFB (doc) | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|---|
| `/` | 52 | 1 550 ms | 3,5 s | 3,9 s | 1 410 ms | 0,011 | 5,2 s |
| `/indemnites-kilometriques` | 74 | 1 000 ms | 2,2 s | 3,3 s | 600 ms | 0 | 3,2 s |

Principaux leviers identifiés (identiques sur les deux pages) :

1. TTFB serveur : ~1,45 s d'économie estimée sur `/`, ~0,9 s sur la page pilier.
   Cause probable : cold start SSR + proxy Cloudflare, le cache stats est déjà en SWR.
2. JS inutilisé au premier rendu : ~330 ms sur `/`, ~310 ms sur la page pilier.
3. TBT élevé sur `/` (1 410 ms) : hydratation lourde de la home.

CLS déjà maîtrisé (≤ 0,011).

## Après optimisation — 2026-08-29 (Lighthouse 12, mobile simulé, iktracker.fr)

| Page | Perf | TTFB | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|
| / | 63 (était 52) | 262 ms (était 1550) | 2251 ms | 3430 ms (était 3900) | 1509 ms (était 1410) | 0.033 |
| /indemnites-kilometriques | 72 (était 74) | 159 ms (était 1000) | 2583 ms | 4219 ms (était 3300, bruit mesure) | 316 ms (était 600) | 0.000 |

Leviers restants : TBT/JS inutilisé (framer-motion dans chunk home), LCP home.
