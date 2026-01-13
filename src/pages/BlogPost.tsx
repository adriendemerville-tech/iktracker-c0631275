import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { ArrowLeft, Pencil, Clock, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Lazy load heavy dependencies - deferred for FCP
const supabasePromise = import('@/integrations/supabase/client').then(m => m.supabase);
const ReactMarkdown = lazy(() => import('react-markdown'));
const remarkGfmPromise = import('remark-gfm').then(m => m.default);

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [remarkGfm, setRemarkGfm] = useState<typeof import('remark-gfm').default | null>(null);

  // Defer admin check and remarkGfm loading
  useEffect(() => {
    remarkGfmPromise.then(setRemarkGfm);
    supabasePromise.then(async (supabase) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.rpc('has_role', { 
          _user_id: session.user.id, 
          _role: 'admin' 
        });
        setIsAdmin(data === true);
      }
    });
  }, []);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const supabase = await supabasePromise;
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
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-64 w-full mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
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
    "inLanguage": "fr-FR"
  };

  // Breadcrumb structured data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Accueil",
        "item": "https://iktracker.fr"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blog",
        "item": "https://iktracker.fr/blog"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": post.title,
        "item": canonicalUrl
      }
    ]
  };

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
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(articleSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <main id="main-content" tabIndex={-1} className="outline-none">
          <article className="container mx-auto px-4 py-12 max-w-3xl">
          {/* Breadcrumb navigation */}
          <nav aria-label="Fil d'Ariane" className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary transition-colors">Accueil</Link></li>
              <li>/</li>
              <li><Link to="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
              <li>/</li>
              <li className="text-foreground font-medium truncate max-w-[200px]">{post.title}</li>
            </ol>
          </nav>

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
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {post.author_name}
                </span>
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

          <div 
            className="prose prose-lg max-w-none dark:prose-invert
              prose-headings:text-foreground prose-headings:font-display
              prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4
              prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3
              prose-h3:text-xl prose-h3:mt-4 prose-h3:mb-2
              prose-p:text-foreground/90 prose-p:leading-relaxed
              prose-a:text-primary hover:prose-a:underline prose-a:font-medium
              prose-strong:text-foreground prose-strong:font-semibold
              prose-ul:text-foreground/90 prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
              prose-ol:text-foreground/90 prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
              prose-li:my-1
              prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
              prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
              prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
              prose-img:rounded-lg prose-img:my-6
              prose-table:border-collapse prose-table:w-full
              prose-th:bg-muted prose-th:p-3 prose-th:text-left prose-th:font-semibold
              prose-td:border prose-td:border-border prose-td:p-3"
          >
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <ReactMarkdown 
                remarkPlugins={remarkGfm ? [remarkGfm] : []}
                components={{
                  // Optimize images in markdown content
                  img: ({ src, alt }) => (
                    <OptimizedImage
                      src={src || ''}
                      alt={alt || ''}
                      className="rounded-lg my-6"
                      aspectRatio="16/9"
                    />
                  )
                }}
              >
                {post.content}
              </ReactMarkdown>
            </Suspense>
          </div>

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
      </div>
    </>
  );
}
