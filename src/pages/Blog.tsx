import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  meta_description: string | null;
  featured_image_url: string | null;
  author_name: string | null;
  published_at: string | null;
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, slug, title, subtitle, meta_description, featured_image_url, author_name, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (!error && data) {
        setPosts(data);
      }
      setLoading(false);
    };

    fetchPosts();
  }, []);

  return (
    <>
      <Helmet>
        <title>Blog - IKtracker | Conseils et actualités sur les indemnités kilométriques</title>
        <meta name="description" content="Découvrez nos articles sur les indemnités kilométriques, le barème fiscal et les bonnes pratiques pour gérer vos frais professionnels." />
        <link rel="canonical" href="https://iktracker.fr/blog" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <header className="mb-12 text-center">
            <Link to="/" className="text-primary hover:underline text-sm mb-4 inline-block">
              ← Retour à l'accueil
            </Link>
            <h1 className="text-4xl font-bold text-foreground mb-4">Blog IKtracker</h1>
            <p className="text-muted-foreground text-lg">
              Conseils, actualités et guides sur les indemnités kilométriques
            </p>
          </header>

          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucun article pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    {post.featured_image_url && (
                      <div className="w-full h-48 overflow-hidden rounded-t-lg">
                        <img 
                          src={post.featured_image_url} 
                          alt={post.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="text-xl text-foreground hover:text-primary transition-colors">
                        {post.title}
                      </CardTitle>
                      {post.subtitle && (
                        <p className="text-muted-foreground">{post.subtitle}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      {post.meta_description && (
                        <p className="text-muted-foreground line-clamp-2 mb-4">
                          {post.meta_description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {post.author_name && <span>Par {post.author_name}</span>}
                        {post.published_at && (
                          <span>
                            {format(new Date(post.published_at), 'dd MMMM yyyy', { locale: fr })}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
