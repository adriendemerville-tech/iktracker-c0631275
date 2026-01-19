import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Static pages configuration with realistic lastmod dates
// Update these when content actually changes
const staticPages = [
  { url: '/', priority: '1.0', changefreq: 'weekly', lastmod: '2026-01-19' },
  { url: '/signup', priority: '0.9', changefreq: 'monthly', lastmod: '2026-01-15' },
  { url: '/auth', priority: '0.8', changefreq: 'monthly', lastmod: '2026-01-15' },
  { url: '/mode-tournee', priority: '0.9', changefreq: 'monthly', lastmod: '2026-01-10' },
  { url: '/calendrier', priority: '0.9', changefreq: 'monthly', lastmod: '2026-01-10' },
  { url: '/expert-comptable', priority: '0.8', changefreq: 'monthly', lastmod: '2026-01-05' },
  { url: '/install', priority: '0.7', changefreq: 'monthly', lastmod: '2026-01-05' },
  { url: '/bareme-ik-2026', priority: '0.9', changefreq: 'yearly', lastmod: '2026-01-01' },
  { url: '/blog', priority: '0.8', changefreq: 'daily', lastmod: '2026-01-19' },
  { url: '/privacy', priority: '0.3', changefreq: 'yearly', lastmod: '2025-12-01' },
  { url: '/terms', priority: '0.3', changefreq: 'yearly', lastmod: '2025-12-01' },
];

const BASE_URL = 'https://iktracker.fr';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all published blog posts
    const { data: blogPosts, error } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching blog posts:', error);
    }

    // Generate static pages entries with their specific lastmod dates
    const staticEntries = staticPages.map(page => `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n');

    // Generate blog post entries
    const today = new Date().toISOString().split('T')[0];
    const blogEntries = (blogPosts || []).map(post => {
      const lastmod = post.updated_at 
        ? new Date(post.updated_at).toISOString().split('T')[0]
        : post.published_at 
          ? new Date(post.published_at).toISOString().split('T')[0]
          : today;
      
      return `  <url>
    <loc>${BASE_URL}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${blogEntries}
</urlset>`;

    console.log(`Sitemap generated: ${staticPages.length} static pages + ${blogPosts?.length || 0} blog posts`);

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response('Error generating sitemap', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
