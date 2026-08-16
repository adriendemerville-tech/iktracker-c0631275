/**
 * Script de validation CI : vérifie que les 3 miroirs de la table de
 * redirection des slugs de blog restent synchronisés.
 *
 *  - Source de vérité : supabase/functions/_shared/blog-redirects.ts
 *  - Miroir SSR       : src/lib/blog-redirects.ts
 *  - Miroir Worker    : cloudflare-worker/iktracker-bot-router.js (LEGACY_REDIRECTS,
 *                       entrées préfixées /blog/)
 *
 * Usage : node scripts/validate-blog-redirects-sync.cjs
 * Exit code 1 si désynchronisation détectée.
 */

const fs = require("fs");

function parseTsMap(filePath) {
  const src = fs.readFileSync(filePath, "utf-8");
  const body = src.slice(src.indexOf("{", src.indexOf("BLOG_SLUG_REDIRECTS")));
  const map = {};
  for (const m of body.matchAll(/"([^"]+)":\s*\n?\s*"([^"]+)"/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

function parseWorkerMap(filePath) {
  const src = fs.readFileSync(filePath, "utf-8");
  const start = src.indexOf("const LEGACY_REDIRECTS");
  const body = src.slice(start, src.indexOf("};", start));
  const map = {};
  for (const m of body.matchAll(/'\/blog\/([^']+)':\s*'([^']+)'/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

const shared = parseTsMap("supabase/functions/_shared/blog-redirects.ts");
const ssr = parseTsMap("src/lib/blog-redirects.ts");
const worker = parseWorkerMap("cloudflare-worker/iktracker-bot-router.js");

let failed = false;
function compare(label, other) {
  for (const [slug, target] of Object.entries(shared)) {
    if (!(slug in other)) {
      console.error(`[${label}] slug manquant : ${slug}`);
      failed = true;
    } else if (other[slug] !== target) {
      console.error(`[${label}] cible divergente pour ${slug} : ${other[slug]} != ${target}`);
      failed = true;
    }
  }
  for (const slug of Object.keys(other)) {
    if (!(slug in shared)) {
      console.error(`[${label}] slug en trop (absent de la source) : ${slug}`);
      failed = true;
    }
  }
}

compare("ssr", ssr);
compare("worker", worker);

if (failed) {
  console.error("\nDésynchronisation des redirections blog détectée.");
  process.exit(1);
}
console.log(
  `Redirections blog synchronisées : ${Object.keys(shared).length} slugs (ssr + worker).`,
);
