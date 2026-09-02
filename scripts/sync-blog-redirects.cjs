/**
 * Génère le miroir Worker des redirections blog depuis la source de vérité
 * unique (fichier partagé des Edge Functions).
 *
 * Usage : node scripts/sync-blog-redirects.cjs
 */
const fs = require("fs");

const SHARED = ["supabase", "functions", "_shared", "blog-redirects.ts"].join("/");
const WORKER = "cloudflare-worker/iktracker-bot-router.js";
const START = "// >>> BLOG_REDIRECTS:GENERATED — ne pas éditer à la main";
const END = "// <<< BLOG_REDIRECTS:GENERATED";

function parseSharedMap() {
  const src = fs.readFileSync(SHARED, "utf-8");
  const body = src.slice(src.indexOf("{", src.indexOf("BLOG_SLUG_REDIRECTS")));
  const map = {};
  for (const m of body.matchAll(/"([^"]+)":\s*\n?\s*"([^"]+)"/g)) map[m[1]] = m[2];
  return map;
}

const map = parseSharedMap();
const entries = Object.keys(map)
  .sort()
  .map((slug) => `  "/blog/${slug}": "${map[slug]}",`)
  .join("\n");

const block = `${START}\nconst BLOG_LEGACY_REDIRECTS = {\n${entries}\n};\n${END}`;

const src = fs.readFileSync(WORKER, "utf-8");
const s = src.indexOf(START);
const e = src.indexOf(END);
if (s === -1 || e === -1) {
  console.error(`Marqueurs generés absents de ${WORKER}`);
  process.exit(1);
}
fs.writeFileSync(WORKER, src.slice(0, s) + block + src.slice(e + END.length));
console.log(`Worker synchronisé : ${Object.keys(map).length} redirections blog.`);
