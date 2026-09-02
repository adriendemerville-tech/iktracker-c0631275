/**
 * Script de validation CI : vérifie que les URLs statiques sont identiques
 * entre la route SSR (src/lib/sitemap.server.ts)
 * et le script prebuild (scripts/generate-sitemap.cjs).
 *
 * Usage : node scripts/validate-sitemap-sync.cjs
 * Exit code 1 si désynchronisation détectée.
 */

const fs = require("fs");
const path = require("path");

function extractStaticPages(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  // Accepte `url:` (script prebuild) et `path:` (route SSR)
  const pageRegex =
    /\{\s*(?:url|path):\s*['"]([^'"]+)['"],\s*priority:\s*['"]([^'"]+)['"],\s*changefreq:\s*['"]([^'"]+)['"](?:,\s*lastmod:\s*['"]([^'"]+)['"])?\s*,?\s*\}/g;
  const pages = [];
  let match;
  while ((match = pageRegex.exec(content)) !== null) {
    pages.push({
      url: match[1],
      priority: match[2],
      changefreq: match[3],
      lastmod: match[4] || null,
    });
  }
  return pages;
}

const edgeFunctionPath = path.join(__dirname, "..", "src", "lib", "sitemap.server.ts");
const prebuildPath = path.join(__dirname, "generate-sitemap.cjs");

if (!fs.existsSync(edgeFunctionPath)) {
  console.error("❌ SSR sitemap route not found:", edgeFunctionPath);
  process.exit(1);
}
if (!fs.existsSync(prebuildPath)) {
  console.error("❌ Prebuild script not found:", prebuildPath);
  process.exit(1);
}

const edgePages = extractStaticPages(edgeFunctionPath);
const prebuildPages = extractStaticPages(prebuildPath);


let hasErrors = false;

// Compare URL lists
const edgeUrls = edgePages.map((p) => p.url).sort();
const prebuildUrls = prebuildPages.map((p) => p.url).sort();

const onlyInEdge = edgeUrls.filter((u) => !prebuildUrls.includes(u));
const onlyInPrebuild = prebuildUrls.filter((u) => !edgeUrls.includes(u));

if (onlyInEdge.length > 0) {
  console.error("❌ URLs présentes uniquement dans l'Edge Function :");
  onlyInEdge.forEach((u) => console.error(`   - ${u}`));
  hasErrors = true;
}

if (onlyInPrebuild.length > 0) {
  console.error("❌ URLs présentes uniquement dans generate-sitemap.cjs :");
  onlyInPrebuild.forEach((u) => console.error(`   - ${u}`));
  hasErrors = true;
}

// Compare properties for shared URLs
const edgeMap = Object.fromEntries(edgePages.map((p) => [p.url, p]));
const prebuildMap = Object.fromEntries(prebuildPages.map((p) => [p.url, p]));

const sharedUrls = edgeUrls.filter((u) => prebuildUrls.includes(u));
for (const url of sharedUrls) {
  const e = edgeMap[url];
  const p = prebuildMap[url];

  if (e.priority !== p.priority) {
    console.error(`❌ Priority mismatch for ${url}: SSR=${e.priority}, Prebuild=${p.priority}`);
    hasErrors = true;
  }
  if (e.changefreq !== p.changefreq) {
    console.error(
      `❌ Changefreq mismatch for ${url}: SSR=${e.changefreq}, Prebuild=${p.changefreq}`,
    );
    hasErrors = true;
  }
  if (e.lastmod && p.lastmod && e.lastmod !== p.lastmod) {
    console.error(`❌ Lastmod mismatch for ${url}: SSR=${e.lastmod}, Prebuild=${p.lastmod}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error("\n❌ Sitemap sources are OUT OF SYNC. Fix the discrepancies above.");
  process.exit(1);
} else {
  console.log(
    `✅ Sitemap sync OK: ${edgePages.length} pages statiques identiques entre les 2 sources.`,
  );
  console.log(`   URLs: ${edgeUrls.join(", ")}`);
}
