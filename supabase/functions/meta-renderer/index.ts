import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Meta Renderer Edge Function
 * Intercepts bot/crawler requests and returns a minimal HTML page with proper
 * meta tags (title, description, OG, Twitter) so that social media previews
 * and AI crawlers get correct metadata without JavaScript rendering.
 *
 * This is NOT a full pre-renderer — it returns a lightweight HTML shell with
 * the correct meta tags + a redirect for real users.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = 'https://iktracker.fr';
const LOGO = `${BASE_URL}/logo-iktracker-250.webp`;

// Bot detection user-agent patterns
const BOT_PATTERNS = [
  'facebookexternalhit', 'Twitterbot', 'LinkedInBot', 'WhatsApp', 'Slackbot',
  'TelegramBot', 'Discordbot', 'Pinterest', 'Embedly', 'Quora Link Preview',
  'Showyoubot', 'outbrain', 'vkShare', 'W3C_Validator', 'redditbot',
  'Applebot', 'rogerbot', 'Googlebot', 'Bingbot', 'DuckDuckBot',
  'GPTBot', 'ChatGPT-User', 'Google-Extended', 'Claude-Web', 'Anthropic-AI',
  'PerplexityBot', 'Cohere-AI', 'YouBot', 'ia_archiver',
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some(p => ua.includes(p.toLowerCase()));
}

interface PageMeta {
  title: string;
  description: string;
  ogType?: string;
  ogImage?: string;
  canonical: string;
}

// Static page metadata
const STATIC_PAGES: Record<string, PageMeta> = {
  '/': {
    title: 'IKtracker — Outil Gratuit de Calcul des Indemnités Kilométriques 2026',
    description: 'Automatisez gratuitement vos indemnités kilométriques avec IKtracker : mode tournée GPS, synchronisation calendrier, barème fiscal 2026, export PDF. 100% gratuit.',
    canonical: BASE_URL,
  },
  '/signup': {
    title: 'Créer un compte gratuit - Outil communautaire IK | IKtracker',
    description: 'Rejoignez la communauté IKtracker : automatisez vos indemnités kilométriques via GPS et calendrier. Mode Tournée, comparateur frais réels, barème 2026, export PDF. 100% gratuit.',
    canonical: `${BASE_URL}/signup`,
  },
  '/auth': {
    title: 'Connexion | IKtracker',
    description: 'Connectez-vous à votre espace IKtracker pour gérer vos indemnités kilométriques.',
    canonical: `${BASE_URL}/auth`,
  },
  '/mode-tournee': {
    title: 'Mode Tournée IKtracker | Suivi kilométrique pour infirmiers et artisans',
    description: 'Mode Tournée IKtracker : enregistrez gratuitement tous vos arrêts clients grâce à la localisation GPS. Outil professionnel pour infirmiers libéraux, artisans et commerciaux.',
    canonical: `${BASE_URL}/mode-tournee`,
  },
  '/calendrier': {
    title: 'Synchronisation Calendrier IKtracker | Google Calendar & Outlook',
    description: 'Synchronisez librement IKtracker avec Google Calendar ou Outlook. Vos rendez-vous deviennent automatiquement des trajets avec calcul des IK en illimité.',
    canonical: `${BASE_URL}/calendrier`,
  },
  '/expert-comptable': {
    title: 'IKtracker pour Experts-Comptables | Export IK PDF et Excel',
    description: 'Recommandez IKtracker à vos clients en illimité : exports PDF/Excel standardisés, calcul automatique des indemnités kilométriques selon barème fiscal 2026.',
    canonical: `${BASE_URL}/expert-comptable`,
  },
  '/install': {
    title: 'Installer IKtracker | Application PWA gratuite iOS et Android',
    description: 'Installez librement IKtracker sur votre smartphone iOS ou Android en 2 minutes. Outil professionnel PWA gratuit, sans App Store.',
    canonical: `${BASE_URL}/install`,
  },
  '/bareme-ik-2026': {
    title: 'Barème Kilométrique 2026 : Simulateur & Tableau Officiel | IKtracker',
    description: 'Calculez vos indemnités kilométriques 2026 avec notre simulateur gratuit. Barème fiscal officiel, majoration véhicule électrique +20%, toutes puissances fiscales.',
    canonical: `${BASE_URL}/bareme-ik-2026`,
  },
  '/frais-reels': {
    title: 'Frais Réels vs Abattement 10% : Calculateur Gratuit 2026 | IKtracker',
    description: 'Comparez gratuitement l\'abattement forfaitaire de 10% et les frais réels kilométriques. Calculateur barème 2026 pour optimiser votre déclaration d\'impôts.',
    canonical: `${BASE_URL}/frais-reels`,
  },
  '/lexique': {
    title: 'Lexique des indemnités kilométriques France 2026 | IKtracker',
    description: 'Dictionnaire complet des termes liés aux indemnités kilométriques en France : barème 2026, frais réels, BNC, URSSAF, professions libérales.',
    canonical: `${BASE_URL}/lexique`,
  },
  '/comparatif-izika': {
    title: 'Izika vs IKtracker : Le Comparatif 2026 (Alternative Gratuite)',
    description: 'Pourquoi payer un abonnement Izika ? Découvrez IKtracker, l\'alternative 100% gratuite qui synchronise votre agenda et génère vos rapports fiscaux conformes.',
    canonical: `${BASE_URL}/comparatif-izika`,
  },
  '/comparatif-drivers-note': {
    title: 'Alternative Driversnote Gratuite : Comparatif iBeacon vs Agenda | IKtracker',
    description: 'Driversnote est trop cher ou trop intrusif ? Découvrez IKtracker, l\'alternative sans GPS permanent, sans boîtier à acheter et 100% gratuite.',
    canonical: `${BASE_URL}/comparatif-drivers-note`,
  },
  '/blog': {
    title: 'Blog - IKtracker | Conseils et actualités sur les indemnités kilométriques',
    description: 'Découvrez nos articles sur les indemnités kilométriques, le barème fiscal et les bonnes pratiques pour gérer vos frais professionnels.',
    canonical: `${BASE_URL}/blog`,
  },
  '/blog/auteur/adrien-de-volontat': {
    title: 'Adrien de Volontat — Fondateur d\'IKtracker',
    description: 'Adrien de Volontat, fondateur d\'IKtracker, franchisé Avenir Rénovations et développeur. Découvrez son parcours et sa vision.',
    canonical: `${BASE_URL}/blog/auteur/adrien-de-volontat`,
    ogType: 'profile',
  },
  '/privacy': {
    title: 'Politique de confidentialité | IKtracker',
    description: 'Consultez notre politique de confidentialité. IKtracker respecte le RGPD et protège vos données personnelles.',
    canonical: `${BASE_URL}/privacy`,
  },
  '/terms': {
    title: 'Conditions d\'utilisation | IKtracker',
    description: 'Conditions générales d\'utilisation d\'IKtracker, outil gratuit de calcul des indemnités kilométriques.',
    canonical: `${BASE_URL}/terms`,
  },
};

function buildMetaHtml(meta: PageMeta): string {
  const ogType = meta.ogType || 'website';
  const ogImage = meta.ogImage || LOGO;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}">
  <link rel="canonical" href="${meta.canonical}">
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:url" content="${meta.canonical}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:site_name" content="IKtracker">
  <meta property="og:locale" content="fr_FR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(meta.title)}">
  <meta name="twitter:description" content="${escapeHtml(meta.description)}">
  <meta name="twitter:image" content="${ogImage}">
  <meta name="robots" content="index, follow">
</head>
<body>
  <h1>${escapeHtml(meta.title)}</h1>
  <p>${escapeHtml(meta.description)}</p>
  <p><a href="${meta.canonical}">Visiter la page</a></p>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '/';
    const userAgent = req.headers.get('user-agent') || '';

    // Only respond to bots
    if (!isBot(userAgent)) {
      return new Response(JSON.stringify({ redirect: true, url: `${BASE_URL}${path}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check static pages first
    if (STATIC_PAGES[path]) {
      return new Response(buildMetaHtml(STATIC_PAGES[path]), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      });
    }

    // Check for blog post pattern: /blog/:slug
    const blogMatch = path.match(/^\/blog\/([^/]+)$/);
    if (blogMatch && blogMatch[1] !== 'auteur') {
      const slug = blogMatch[1];
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: post } = await supabase
        .from('blog_posts')
        .select('title, meta_description, featured_image_url, content')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (post) {
        const desc = post.meta_description || post.content?.replace(/[#*_\[\]()]/g, '').trim().slice(0, 160) || '';
        const meta: PageMeta = {
          title: `${post.title} | Blog IKtracker`,
          description: desc,
          ogType: 'article',
          ogImage: post.featured_image_url || LOGO,
          canonical: `${BASE_URL}/blog/${slug}`,
        };
        return new Response(buildMetaHtml(meta), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          },
        });
      }
    }

    // Fallback for unknown pages
    const fallback: PageMeta = {
      title: 'IKtracker — Outil Gratuit de Calcul des Indemnités Kilométriques',
      description: 'Automatisez gratuitement vos indemnités kilométriques avec IKtracker.',
      canonical: `${BASE_URL}${path}`,
    };

    return new Response(buildMetaHtml(fallback), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('meta-renderer error:', error);
    return new Response('Error', { status: 500, headers: corsHeaders });
  }
});
