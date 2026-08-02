/**
 * Script de génération automatique du sitemap statique.
 * Exécuté automatiquement avant chaque build (prebuild).
 * Récupère les articles de blog publiés depuis Supabase et fusionne
 * avec les pages statiques pour produire public/sitemap.xml.
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const BASE_URL = 'https://iktracker.fr';

const staticPages = [
  { url: '/', priority: '1.0', changefreq: 'weekly' },
  { url: '/signup', priority: '0.5', changefreq: 'monthly' },
  { url: '/mode-tournee', priority: '0.8', changefreq: 'monthly' },
  { url: '/calendrier', priority: '0.8', changefreq: 'monthly' },
  { url: '/expert-comptable', priority: '0.7', changefreq: 'monthly' },
  { url: '/installer', priority: '0.6', changefreq: 'monthly' },
  { url: '/bareme-ik-2026', priority: '0.9', changefreq: 'monthly' },
  { url: '/frais-reels', priority: '0.8', changefreq: 'monthly' },
  { url: '/note-de-frais-kilometrique', priority: '0.8', changefreq: 'monthly' },
  { url: '/indemnite-kilometrique-velo', priority: '0.8', changefreq: 'monthly' },
  { url: '/indemnite-grand-deplacement-2026', priority: '0.8', changefreq: 'monthly' },
  { url: '/mes-trajets', priority: '0.8', changefreq: 'monthly' },
  { url: '/tarifs', priority: '0.7', changefreq: 'monthly' },
  { url: '/lexique', priority: '0.8', changefreq: 'monthly' },
  { url: '/comparatif-izika', priority: '0.8', changefreq: 'monthly' },
  { url: '/comparatif-driversnote', priority: '0.8', changefreq: 'monthly' },
  { url: '/meilleure-application-indemnites-kilometriques', priority: '1.0', changefreq: 'monthly' },
  { url: '/api-docs', priority: '0.5', changefreq: 'monthly' },
  { url: '/fonctionnalites', priority: '0.9', changefreq: 'monthly' },
  { url: '/artisans', priority: '0.8', changefreq: 'monthly' },
  { url: '/blog', priority: '0.8', changefreq: 'weekly' },
  { url: '/blog/auteur/adrien-de-volontat', priority: '0.6', changefreq: 'monthly' },
  { url: '/mentions-legales', priority: '0.5', changefreq: 'yearly' },
  { url: '/contact', priority: '0.6', changefreq: 'monthly' },
  { url: '/privacy', priority: '0.5', changefreq: 'yearly' },
  { url: '/rgpd', priority: '0.5', changefreq: 'yearly' },
  { url: '/terms', priority: '0.5', changefreq: 'yearly' },
];

const today = new Date().toISOString().split('T')[0];

async function fetchBlogPosts() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('⚠️  Variables Supabase manquantes, sitemap généré sans articles de blog.');
    return [];
  }

  const allPosts = [];
  let from = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/blog_posts?select=slug,updated_at,published_at&status=eq.published&order=published_at.desc&offset=${from}&limit=${PAGE_SIZE}`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!res.ok) {
      console.error(`❌ Erreur API (${res.status}): ${await res.text()}`);
      break;
    }

    const data = await res.json();
    if (!data || data.length === 0) break;
    allPosts.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allPosts;
}

function buildXml(posts) {
  const staticEntries = staticPages.map(p => `  <url>
    <loc>${BASE_URL}${p.url}</loc>${p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ''}
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');

  const blogEntries = posts.map(post => {
    const lastmod = post.updated_at
      ? new Date(post.updated_at).toISOString().split('T')[0]
      : post.published_at
        ? new Date(post.published_at).toISOString().split('T')[0]
        : today;
    return `  <url>
    <loc>${BASE_URL}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${blogEntries}
</urlset>`;
}

async function main() {
  console.log('🗺️  Génération du sitemap statique...');
  const posts = await fetchBlogPosts();
  const xml = buildXml(posts);
  const outputPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf-8');
  console.log(`✅ Sitemap généré : ${staticPages.length} pages + ${posts.length} articles → ${outputPath}`);
}

main().catch(err => {
  console.error('❌ Erreur lors de la génération du sitemap:', err);
  process.exit(1);
});
