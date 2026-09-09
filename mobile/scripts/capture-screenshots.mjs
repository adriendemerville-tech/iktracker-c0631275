/**
 * Génère les captures App Store (6,7" = 1290x2796) à partir de l'app web mobile.
 * Usage: node mobile/scripts/capture-screenshots.mjs [baseUrl]
 * Sortie: mobile/store-assets/screenshots/*.png
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'https://iktracker.fr';
const OUT = path.resolve('mobile/store-assets/screenshots');

const PAGES = [
  { slug: '01-accueil', url: '/' },
  { slug: '02-indemnites', url: '/indemnites-kilometriques' },
  { slug: '03-frais-reels', url: '/frais-reels' },
  { slug: '04-fonctionnalites', url: '/fonctionnalites' },
  { slug: '05-forum', url: '/forum' },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: 'fr-FR',
});
const page = await context.newPage();

for (const p of PAGES) {
  const url = `${BASE}${p.url}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);
    const file = path.join(OUT, `${p.slug}.png`);
    await page.screenshot({ path: file });
    console.log(`OK  ${url} -> ${file}`);
  } catch (e) {
    console.error(`FAIL ${url}: ${e.message}`);
  }
}

await browser.close();
