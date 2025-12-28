import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
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

  return (
    <>
      <Helmet>
        <title>{post.title} - Blog IKtracker</title>
        {post.meta_description && (
          <meta name="description" content={post.meta_description} />
        )}
        <link rel="canonical" href={`https://iktracker.fr/blog/${post.slug}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={post.title} />
        {post.meta_description && (
          <meta property="og:description" content={post.meta_description} />
        )}
        {post.featured_image_url && (
          <meta property="og:image" content={post.featured_image_url} />
        )}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://iktracker.fr/blog/${post.slug}`} />
        
        {/* Article metadata */}
        <meta property="article:published_time" content={publishDate} />
        {post.author_name && (
          <meta property="article:author" content={post.author_name} />
        )}
      </Helmet>

      <div className="min-h-screen bg-background">
        <article className="container mx-auto px-4 py-12 max-w-3xl">
          <Link 
            to="/blog" 
            className="inline-flex items-center text-primary hover:underline text-sm mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au blog
          </Link>

          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {post.title}
            </h1>
            
            {post.subtitle && (
              <p className="text-xl text-muted-foreground mb-4">{post.subtitle}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {post.author_name && <span>Par {post.author_name}</span>}
              <span>
                {format(new Date(publishDate), 'dd MMMM yyyy', { locale: fr })}
              </span>
            </div>
          </header>

          {post.featured_image_url && (
            <div className="mb-8 rounded-lg overflow-hidden">
              <img 
                src={post.featured_image_url} 
                alt={post.title}
                className="w-full h-auto"
              />
            </div>
          )}

          <div 
            className="prose prose-lg max-w-none dark:prose-invert
              prose-headings:text-foreground 
              prose-p:text-foreground/90
              prose-a:text-primary hover:prose-a:underline
              prose-strong:text-foreground
              prose-ul:text-foreground/90
              prose-ol:text-foreground/90
              prose-blockquote:border-primary prose-blockquote:text-muted-foreground
              prose-code:bg-muted prose-code:px-1 prose-code:rounded
              prose-pre:bg-muted"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <footer className="mt-12 pt-8 border-t border-border">
            <Link 
              to="/blog" 
              className="inline-flex items-center text-primary hover:underline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voir tous les articles
            </Link>
          </footer>
        </article>
      </div>
    </>
  );
}
