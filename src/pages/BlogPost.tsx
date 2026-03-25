import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLazy } from '@/hooks/useAdminLazy';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ArrowLeft, Pencil, Clock, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EnhancedMarketingFooter } from '@/components/marketing/EnhancedMarketingFooter';
import { ArticleSummary } from '@/components/blog/ArticleSummary';
import { BlogContentWithRelated } from '@/components/blog/BlogContentWithRelated';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content: string;
  meta_description: string | null;
  featured_image_url: string | null;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// Calculate reading time from content
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

// Extract first paragraph for description fallback
function extractFirstParagraph(content: string): string {
  const paragraphs = content.split('\n\n').filter(p => p.trim() && !p.startsWith('#'));
  const firstPara = paragraphs[0]?.replace(/[#*_\[\]()]/g, '').trim() || '';
  return firstPara.slice(0, 160);
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAdminLazy();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setPost(data);
      }
      setLoading(false);
    };

    fetchPost();
  }, [slug]);

  // Memoized calculations
  const readingTime = useMemo(() => 
    post ? calculateReadingTime(post.content) : 0
  , [post?.content]);

  const metaDescription = useMemo(() => 
    post?.meta_description || (post ? extractFirstParagraph(post.content) : '')
  , [post]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          {/* Breadcrumb skeleton */}
          <Skeleton className="h-5 w-48 mb-6" />
          {/* Back link skeleton */}
          <Skeleton className="h-5 w-32 mb-8" />
          {/* Title skeleton - matches h1 height */}
          <Skeleton className="h-10 md:h-12 w-full mb-4" />
          <Skeleton className="h-10 md:h-12 w-3/4 mb-4" />
          {/* Subtitle skeleton */}
          <Skeleton className="h-7 w-2/3 mb-6" />
          {/* Meta info skeleton */}
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-28" />
          </div>
          {/* Featured image skeleton - preserves aspect ratio for CLS */}
          <Skeleton className="w-full mb-8 rounded-lg" style={{ aspectRatio: '16/9' }} />
          {/* Content skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Article non trouvé</h1>
          <p className="text-muted-foreground mb-6">
            L'article que vous recherchez n'existe pas ou n'est plus disponible.
          </p>
          <Button onClick={() => navigate('/blog')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au blog
          </Button>
        </div>
      </div>
    );
  }

  const publishDate = post.published_at || post.created_at;
  const canonicalUrl = `https://iktracker.fr/blog/${post.slug}`;
  const dateISO = new Date(publishDate).toISOString();
  const modifiedDateISO = new Date(post.updated_at || publishDate).toISOString();

  // JSON-LD structured data for Article (SEO + GEO optimization)
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": metaDescription,
    "image": post.featured_image_url || "https://iktracker.fr/logo-iktracker-250.webp",
    "author": {
      "@type": "Person",
      "name": post.author_name || "IKtracker",
      "url": "https://iktracker.fr"
    },
    "publisher": {
      "@type": "Organization",
      "name": "IKtracker",
      "logo": {
        "@type": "ImageObject",
        "url": "https://iktracker.fr/logo-iktracker-250.webp"
      }
    },
    "datePublished": dateISO,
    "dateModified": modifiedDateISO,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    "wordCount": post.content.trim().split(/\s+/).length,
    "timeRequired": `PT${readingTime}M`,
    "inLanguage": "fr-FR",
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["article header h1", "article header + .article-summary"]
    }
  };

  // Breadcrumb structured data is now handled by Breadcrumb component

  return (
    <>
      <Helmet>
        <title>{post.title} | Blog IKtracker</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Preconnect for faster image loading */}
        <link rel="preconnect" href="https://yarjaudctshlxkatqgeb.supabase.co" />
        
        {/* Open Graph */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={post.featured_image_url || "https://iktracker.fr/logo-iktracker-250.webp"} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="IKtracker" />
        <meta property="og:locale" content="fr_FR" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={post.featured_image_url || "https://iktracker.fr/logo-iktracker-250.webp"} />
        
        {/* Article metadata */}
        <meta property="article:published_time" content={dateISO} />
        <meta property="article:modified_time" content={modifiedDateISO} />
        {post.author_name && <meta property="article:author" content={post.author_name} />}
        <meta property="article:section" content="Indemnités kilométriques" />
        
        {/* GEO optimization */}
        <meta name="geo.region" content="FR" />
        <meta name="geo.placename" content="France" />
        <meta name="content-language" content="fr" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="author" content={post.author_name || "IKtracker"} />
        
        {/* Structured Data - Article */}
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <main id="main-content" tabIndex={-1} className="outline-none">
          <article className="container mx-auto px-4 py-12 max-w-3xl">
            {/* Breadcrumb navigation with schema.org */}
            <Breadcrumb 
              items={[
                { label: 'Blog', href: '/blog' },
                { label: post.title }
              ]} 
            />

            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
              <Link 
                to="/blog" 
                className="inline-flex items-center text-primary hover:underline text-sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au blog
              </Link>
              
              {isAdmin && (
                <Link to={`/blog/edit/${post.id}`}>
                  <Button variant="outline" size="sm">
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifier
                  </Button>
                </Link>
              )}
            </div>

            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
                {post.title}
              </h1>
              
              {post.subtitle && (
                <p className="text-xl text-muted-foreground mb-4">{post.subtitle}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                {post.author_name && (
                  <Link 
                    to="/blog/auteur/adrien-de-volontat"
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span className="underline underline-offset-2">{post.author_name}</span>
                  </Link>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(publishDate), 'dd MMMM yyyy', { locale: fr })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {readingTime} min de lecture
                </span>
              </div>
            </header>

            {/* Article Summary - Key Points */}
            <ArticleSummary content={post.content} />

            {post.featured_image_url && (
              <div className="mb-8 rounded-lg overflow-hidden">
                <OptimizedImage 
                  src={post.featured_image_url} 
                  alt={post.title}
                  className="w-full"
                  aspectRatio="16/9"
                  eager={true}
                  width={800}
                  height={450}
                />
              </div>
            )}

            <BlogContentWithRelated 
              content={post.content} 
              postId={post.id}
            />

            <footer className="mt-12 pt-8 border-t border-border flex items-center justify-between flex-wrap gap-4">
              <Link 
                to="/blog" 
                className="inline-flex items-center text-primary hover:underline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voir tous les articles
              </Link>
              
              {isAdmin && (
                <Link to={`/blog/edit/${post.id}`}>
                  <Button variant="ghost" size="sm">
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifier cet article
                  </Button>
                </Link>
              )}
            </footer>
          </article>
        </main>
        <EnhancedMarketingFooter />
      </div>
    </>
  );
}
