# Audit poids JS mobile — build production (29/08/2026)

Méthode : `bun run build`, mesure des chunks `dist/client/assets/*.js` (brut + gzip -9).

## Totaux

- JS total livré par le build : **4 882 Ko brut / 1 458 Ko gzip** (tous chunks, toutes routes)
- La majorité est en lazy-loading : une route publique ne télécharge qu'une fraction.

## Ce que charge réellement la home `/`

| Chunk | Brut | Gzip | Contenu |
|---|---|---|---|
| `index-*.js` (route `/`) | 543 Ko | **160 Ko** | Landing + framer-motion + deps |
| `client-*.js` (Supabase JS) | 207 Ko | **53 Ko** | chargé uniquement par chunks /app & auth |
| noyau react/router | ~75 Ko | **~15 Ko** | react, react-dom, router |

- Supabase JS **n'est pas** dans le bundle home (importé seulement par AuthForm, DesktopSidebar, MesTrajets…). ✔
- html2pdf (261 Ko gz) **n'est chargé** que via `pdf-utils` / export PDF. ✔

## Top chunks les plus lourds (gzip)

| Chunk | Gzip | Route / usage | Lazy ? |
|---|---|---|---|
| html2pdf | 261 Ko | export PDF | ✔ dynamique |
| index (home) | 160 Ko | `/` | entrée |
| _slug (blog article) | 103 Ko | `/blog/:slug` | route |
| BarChart (recharts) | 95 Ko | admin stats | ✔ admin |
| admin | 89 Ko | `/app/admin` | ✔ protégé |
| client (supabase) | 53 Ko | auth + /app | partagé |
| proxy | 39 Ko | edge proxy utils | partiel |
| jszip | 28 Ko | recovery Takeout | ✔ |
| recovery | 22 Ko | recovery wizard | ✔ desktop |
| app | 21 Ko | layout /app | ✔ protégé |
| DesktopSidebar | 21 Ko | /app desktop | ✔ |
| NewTripSheet | 19 Ko | /app | ✔ |
| blog (liste) | 15 Ko | `/blog` | route |

## Points d'optimisation (par impact)

1. **Home `index` 160 Ko gz** — le plus gros chunk public. Pistes :
   - framer-motion présent dans le chunk home : remplacer les animations de la home par du CSS ou isoler framer-motion dans les composants lazy → gain estimé 30-40 Ko gz.
   - Vérifier que les sections DeferUntilVisible ne tirent pas leurs deps dans le chunk principal.
2. **`_slug` blog 103 Ko gz** — markdown renderer (rehype-raw, highlight ?). Envisager un renderer MD plus léger ou lazy des blocs riches.
3. **recharts 95 Ko gz** — déjà cantonné à l'admin, OK.
4. **jszip 28 Ko gz** — déjà lazy (recovery), OK.

## Conclusion

L'architecture de découpage est saine : les librairies lourdes (PDF, zip, recharts, supabase) sont hors du chemin critique public. Le seul chantier mobile pertinent est le chunk home (160 Ko gz), principalement framer-motion.
