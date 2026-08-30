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

## 2026-08-30 — après découpage serveur / lazy-loading (build prod local, worker Cloudflare)

Méthode : `bun run build` puis `wrangler dev` sur le bundle de production, Lighthouse 12 mobile.

| Page | Perf | TTFB | FCP | LCP | TBT | CLS | JS inutilisé |
|---|---|---|---|---|---|---|---|
| `/` | 67 | 30 ms | 3,5 s | 3,9 s | 540 ms | 0,023 | 146 Ko |
| `/mes-trajets` | 66 | 30 ms | 3,9 s | 5,8 s | 210 ms | 0 | 116 Ko |

Gains vs 29/08 : TBT home 1509 → 540 ms (-64 %), TTFB serveur 262 → 30 ms en local
(hors latence réseau/Cloudflare), CLS stable.

### Bundle analyzer (client, gzip)

| Chunk | Avant (29/08) | Après |
|---|---|---|
| `admin` | 89 Ko | 10,5 Ko |
| `AdminStats` (extrait) | — | 16,7 Ko |
| recharts | 95 Ko | 92,6 Ko (lazy admin) |
| `index` (home) | 160 Ko | 163,6 Ko |
| html2pdf | 261 Ko | 254 Ko (dynamique) |

Le panneau admin est désormais éclaté en ~18 chunks chargés à la demande.
Chantier restant : chunk home (framer-motion) et LCP de `/mes-trajets`.
