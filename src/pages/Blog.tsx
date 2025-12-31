import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { Plus, Calendar, User, ArrowRight } from 'lucide-react';
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
  const { isAdmin } = useAdmin();

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

  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  return (
    <>
      <Helmet>
        <title>Blog - IKtracker | Conseils et actualités sur les indemnités kilométriques</title>
        <meta name="description" content="Découvrez nos articles sur les indemnités kilométriques, le barème fiscal et les bonnes pratiques pour gérer vos frais professionnels." />
        <link rel="canonical" href="https://iktracker.fr/blog" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <MarketingNav />
        
        <main className="pt-20 pb-16">
          {/* Hero Header */}
          <section className="border-b border-border bg-gradient-to-b from-muted/30 to-background">
            <div className="container mx-auto px-4 py-12 md:py-16">
              <div className="max-w-3xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 tracking-tight">
                  Le Blog
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground">
                  Actualités, conseils et guides sur les indemnités kilométriques et la gestion de vos frais professionnels
                </p>
                
                {isAdmin && (
                  <div className="mt-8">
                    <Link to="/admin/blog/edit">
                      <Button variant="gradient" size="lg">
                        <Plus className="mr-2 h-5 w-5" />
                        Nouvel article
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="container mx-auto px-4 py-12">
            {loading ? (
              <div className="space-y-8">
                {/* Featured skeleton */}
                <div className="grid lg:grid-cols-2 gap-8">
                  <Skeleton className="aspect-[16/10] rounded-2xl" />
                  <div className="space-y-4 py-4">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
                {/* Grid skeleton */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-4">
                      <Skeleton className="aspect-[16/10] rounded-xl" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                  <Calendar className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">Aucun article pour le moment</h2>
                <p className="text-muted-foreground mb-6">Les premiers articles arrivent bientôt !</p>
                {isAdmin && (
                  <Link to="/admin/blog/edit">
                    <Button variant="gradient">
                      <Plus className="mr-2 h-4 w-4" />
                      Créer le premier article
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/* Featured Article */}
                {featuredPost && (
                  <Link to={`/blog/${featuredPost.slug}`} className="group block mb-16">
                    <article className="grid lg:grid-cols-2 gap-8 items-center">
                      <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-muted">
                        {featuredPost.featured_image_url ? (
                          <img 
                            src={featuredPost.featured_image_url} 
                            alt={featuredPost.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="eager"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <span className="text-6xl font-bold text-primary/20">IK</span>
                          </div>
                        )}
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                            À la une
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                          {featuredPost.title}
                        </h2>
                        {featuredPost.subtitle && (
                          <p className="text-lg text-muted-foreground">
                            {featuredPost.subtitle}
                          </p>
                        )}
                        {featuredPost.meta_description && (
                          <p className="text-muted-foreground line-clamp-3">
                            {featuredPost.meta_description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-2">
                          {featuredPost.author_name && (
                            <span className="flex items-center gap-1.5">
                              <User className="h-4 w-4" />
                              {featuredPost.author_name}
                            </span>
                          )}
                          {featuredPost.published_at && (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(featuredPost.published_at), 'dd MMMM yyyy', { locale: fr })}
                            </span>
                          )}
                        </div>
                        <div className="pt-4">
                          <span className="inline-flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                            Lire l'article
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                )}

                {/* Articles Grid */}
                {otherPosts.length > 0 && (
                  <>
                    <div className="border-t border-border pt-12">
                      <h2 className="text-2xl font-bold text-foreground mb-8">Tous les articles</h2>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {otherPosts.map((post) => (
                        <Link key={post.id} to={`/blog/${post.slug}`} className="group block">
                          <article className="h-full flex flex-col">
                            <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-muted mb-4">
                              {post.featured_image_url ? (
                                <img 
                                  src={post.featured_image_url} 
                                  alt={post.title}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                                  <span className="text-4xl font-bold text-primary/20">IK</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 flex flex-col">
                              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                                {post.title}
                              </h3>
                              {post.subtitle && (
                                <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                                  {post.subtitle}
                                </p>
                              )}
                              <div className="mt-auto flex items-center gap-3 text-xs text-muted-foreground pt-3 border-t border-border/50">
                                {post.author_name && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3.5 w-3.5" />
                                    {post.author_name}
                                  </span>
                                )}
                                {post.published_at && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {format(new Date(post.published_at), 'dd MMM yyyy', { locale: fr })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </article>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
