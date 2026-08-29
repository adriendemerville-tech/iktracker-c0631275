# Audit du poids des pages (mobile) — 2026-08-29

Méthode : Chromium headless, viewport 390×844, production `https://iktracker.fr`,
`performance.getEntriesByType('resource')` (poids transféré, donc gzip/brotli).

## Poids transféré par page

| Page | Total | JS | CSS | Polices | Images |
|---|---|---|---|---|---|
| `/` | 495 KB | 394 KB | 34 KB | 63 KB | 2 KB |
| `/bareme-ik-2026` | 484 KB | 383 KB | 34 KB | 63 KB | 2 KB |
| `/forum` | 430 KB | 329 KB | 34 KB | 63 KB | 2 KB |
| `/indemnites-kilometriques` | 436 KB | 335 KB | 34 KB | 63 KB | 2 KB |
| `/blog` | 418 KB + ~1,5 Mo d'images | 317 KB | 34 KB | 63 KB | 1 483 KB |

## Plus gros fichiers (transféré / brut)

| Fichier | Transféré | Brut | Contenu |
|---|---|---|---|
| `assets/index-*.js` | 156 KB | 529 KB | entrée : React DOM, router, routeTree, lucide, chrome applicatif |
| `assets/client-*.js` | 52 KB | 202 KB | `@supabase/supabase-js` (auth + realtime + storage) |
| `assets/proxy-*.js` | 38 KB | 118 KB | framer-motion (chargé sur `/` et `/bareme-ik-2026`) |
| `assets/styles-*.css` | 34 KB | — | CSS global unique |
| polices Google | 63 KB | — | DM Sans 36 KB + Plus Jakarta 27 KB (+ Urbanist sur certaines pages) |

Chunks présents dans le build mais **non chargés** sur les pages publiques (OK) :
`html2pdf` (914 KB), `admin` (372 KB), `BarChart`/recharts (352 KB), `_slug` blog (335 KB),
`jszip` (94 KB), `recovery` (70 KB).

## Problèmes classés par impact

1. **Images du blog non redimensionnées** — une seule cover pèse **1,3 Mo** (upload brut en
   storage). `/blog` transfère ~1,5 Mo d'images pour des vignettes affichées en ~350 px.
   → générer des variantes WebP 400/800 px à l'upload (ou passer par un transformateur d'images)
   et servir `srcset`. Gain estimé : **~1,4 Mo sur `/blog`**.
2. **Supabase JS (52 KB gz) chargé à l'hydratation de chaque page publique** via `useAuth`
   dans `AppChrome`, alors qu'un visiteur anonyme n'en a pas besoin avant interaction.
   → différer `getSupabase()` après `requestIdleCallback` / première interaction quand aucun
   cookie de session n'est présent. Gain : **~50 KB + ~200 KB de parsing** sur le chemin critique.
3. **framer-motion (38 KB gz) sur `/` et `/bareme-ik-2026`** pour des composants secondaires
   (notification PWA marketing, modales). → charger ces composants uniquement après interaction.
4. **Bundle d'entrée 529 KB brut** : le routeTree tire les `head()` + composants partagés de
   toutes les routes. → vérifier que chaque route publique reste en import différé et sortir
   les icônes lucide rarement utilisées.
5. **Polices : 3 familles** (DM Sans, Plus Jakarta, Urbanist). `font-urbanist` n'est utilisé
   quasi exclusivement dans l'espace privé `/app`. → retirer Urbanist du `<link>` global et le
   charger dans le layout `/app`. Gain : **~27 KB** sur toutes les pages publiques.
6. **CSS unique 34 KB gz** appliqué à toutes les pages, y compris les styles admin/forum.
   Gain plus faible, à traiter en dernier.

## Ordre de traitement recommandé

1. Images blog (gain massif, aucun risque SEO)
2. Supabase différé pour les visiteurs anonymes
3. Urbanist hors des pages publiques
4. framer-motion après interaction
5. Dégraissage du bundle d'entrée
