import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAdminLazy } from '@/hooks/useAdminLazy';
import { useAuthLazy } from '@/hooks/useAuthLazy';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MarketingNav } from '@/components/marketing/MarketingNav';
import { EnhancedMarketingFooter } from '@/components/marketing/EnhancedMarketingFooter';
import { Plus, Calendar, User, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getOptimizedImageUrl, getResponsiveSrcSet, imagePresets } from '@/lib/image-transform';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  meta_description: string | null;
  featured_image_url: string | null;
  author_name: string | null;
  published_at: string | null;
  display_order?: number;
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuthLazy();
  const { isAdmin } = useAdminLazy();

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, slug, title, subtitle, meta_description, featured_image_url, author_name, published_at')
        .eq('status', 'published')
        .eq('is_listed', true)
        .order('published_at', { ascending: false });

      if (!error && data) {
        // Sort by display_order if available, fallback to published_at order
        const sortedData = [...data].sort((a: any, b: any) => {
          if (a.display_order !== undefined && b.display_order !== undefined) {
            return a.display_order - b.display_order;
          }
          return 0;
        });
        setPosts(sortedData as BlogPost[]);
      }
      setLoading(false);
    };

    fetchPosts();
  }, []);

  const featuredPost = posts[0];
  const secondaryPosts = posts.slice(1, 3);
  const remainingPosts = posts.slice(3);

  // Get card size class based on position for editorial layout
  const getCardSize = (index: number): 'large' | 'medium' | 'small' => {
    const pattern = [
      'large', 'medium', 'small', 'small', 'medium', 
      'small', 'large', 'small', 'medium', 'small'
    ];
    return pattern[index % pattern.length] as 'large' | 'medium' | 'small';
  };

  return (
    <>
      <Helmet>
        <title>Blog - IKtracker | Conseils et actualités sur les indemnités kilométriques</title>
        <meta name="description" content="Découvrez nos articles sur les indemnités kilométriques, le barème fiscal et les bonnes pratiques pour gérer vos frais professionnels." />
        <link rel="canonical" href="https://iktracker.fr/blog" />
      </Helmet>

      <div className="min-h-screen bg-background font-blog">
        <MarketingNav user={user} loading={authLoading} />
        
        <main id="main-content" tabIndex={-1} className="pt-20 pb-16 outline-none">
          {/* Hero Header - Editorial style */}
          <section className="border-b border-border" aria-labelledby="hero-heading">
            <div className="container mx-auto px-4 py-12 md:py-20">
              <div className="max-w-4xl">
                <span className="text-sm font-medium text-primary uppercase tracking-wider">
                  Actualités & Conseils
                </span>
                <h1 id="hero-heading" className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mt-4 tracking-tight leading-[1.1]">
                  Le Blog<span className="text-primary">.</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl leading-relaxed">
                  Indemnités kilométriques, fiscalité des indépendants et bonnes pratiques pour optimiser vos frais professionnels.
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
                <div className="grid lg:grid-cols-5 gap-6">
                  <div className="lg:col-span-3">
                    <Skeleton className="aspect-[16/10] rounded-2xl" />
                  </div>
                  <div className="lg:col-span-2 space-y-4">
                    <Skeleton className="aspect-[16/10] rounded-xl" />
                    <Skeleton className="aspect-[16/10] rounded-xl" />
                  </div>
                </div>
                {/* Grid skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-12">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
                  ))}
                </div>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                  <Calendar className="w-10 h-10 text-muted-foreground" />
                </div>
                <h2 className="font-serif text-3xl font-bold text-foreground mb-2">Aucun article pour le moment</h2>
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
                {/* Featured + Secondary Grid - Editorial Hero */}
                <div className="grid lg:grid-cols-5 gap-6 mb-12">
                  {/* Featured Article - Large */}
                  {featuredPost && (
                    <Link to={`/blog/${featuredPost.slug}`} className="lg:col-span-3 group block">
                      <article className="relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-muted">
                        {featuredPost.featured_image_url ? (
                          <img 
                            src={getOptimizedImageUrl(featuredPost.featured_image_url, imagePresets.featured) || ''} 
                            srcSet={getResponsiveSrcSet(featuredPost.featured_image_url, [600, 900, 1200]) || ''}
                            sizes="(max-width: 1024px) 100vw, 60vw"
                            alt={featuredPost.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            loading="eager"
                            fetchPriority="high"
                            decoding="async"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/5" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                          <span className="inline-block px-3 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full mb-4">
                            À la une
                          </span>
                          <h2 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight mb-3 group-hover:text-primary-foreground/90 transition-colors">
                            {featuredPost.title}
                          </h2>
                          {featuredPost.subtitle && (
                            <p className="text-white/80 text-base md:text-lg mb-4 line-clamp-2">
                              {featuredPost.subtitle}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-white/70">
                            {featuredPost.author_name && (
                              <span className="flex items-center gap-1.5">
                                <User className="h-4 w-4" />
                                {featuredPost.author_name}
                              </span>
                            )}
                            {featuredPost.published_at && (
                              <span>
                                {format(new Date(featuredPost.published_at), 'dd MMMM yyyy', { locale: fr })}
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    </Link>
                  )}

                  {/* Secondary Articles - Stacked */}
                  {secondaryPosts.length > 0 && (
                    <div className="lg:col-span-2 flex flex-col gap-4">
                      {secondaryPosts.map((post) => (
                        <Link key={post.id} to={`/blog/${post.slug}`} className="group flex-1">
                          <article className="relative h-full min-h-[180px] rounded-xl overflow-hidden bg-muted">
                            {post.featured_image_url ? (
                              <img 
                                src={getOptimizedImageUrl(post.featured_image_url, imagePresets.card) || ''} 
                                srcSet={getResponsiveSrcSet(post.featured_image_url, [400, 600]) || ''}
                                sizes="(max-width: 1024px) 100vw, 40vw"
                                alt={post.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-secondary/50 to-secondary/10" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                              <h3 className="font-serif text-lg md:text-xl font-bold text-white leading-tight mb-2 group-hover:text-primary-foreground/90 transition-colors line-clamp-2">
                                {post.title}
                              </h3>
                              <div className="flex items-center gap-3 text-xs text-white/70">
                                {post.author_name && <span>{post.author_name}</span>}
                                {post.published_at && (
                                  <span>{format(new Date(post.published_at), 'dd MMM yyyy', { locale: fr })}</span>
                                )}
                              </div>
                            </div>
                          </article>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Remaining Articles - Masonry-like Grid */}
                {remainingPosts.length > 0 && (
                  <>
                    <div className="border-t border-border pt-10 mb-8">
                      <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">
                        Tous les articles
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 auto-rows-fr">
                      {remainingPosts.map((post, index) => {
                        const size = getCardSize(index);
                        const isLarge = size === 'large';
                        const isMedium = size === 'medium';
                        
                        return (
                          <Link 
                            key={post.id} 
                            to={`/blog/${post.slug}`} 
                            className={`group block ${isLarge ? 'md:col-span-2 md:row-span-2' : isMedium ? 'md:row-span-2' : ''}`}
                          >
                            <article className={`relative h-full rounded-xl overflow-hidden bg-muted ${isLarge ? 'min-h-[350px]' : isMedium ? 'min-h-[300px]' : 'min-h-[220px]'}`}>
                              {post.featured_image_url ? (
                                <img 
                                  src={getOptimizedImageUrl(post.featured_image_url, isLarge ? imagePresets.featured : imagePresets.card) || ''} 
                                  srcSet={getResponsiveSrcSet(post.featured_image_url, isLarge ? [600, 900] : [400, 600]) || ''}
                                  sizes={isLarge ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 100vw, 25vw"}
                                  alt={post.title}
                                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-accent/5" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-4">
                                <h3 className={`font-serif font-bold text-white leading-tight mb-2 group-hover:text-primary-foreground/90 transition-colors line-clamp-2 ${isLarge ? 'text-xl md:text-2xl' : isMedium ? 'text-lg' : 'text-base'}`}>
                                  {post.title}
                                </h3>
                                {(isLarge || isMedium) && post.subtitle && (
                                  <p className="text-white/70 text-sm mb-3 line-clamp-2">
                                    {post.subtitle}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 text-xs text-white/60">
                                  {post.published_at && (
                                    <span>{format(new Date(post.published_at), 'dd MMM yyyy', { locale: fr })}</span>
                                  )}
                                </div>
                              </div>
                            </article>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </main>
        
        <EnhancedMarketingFooter />
      </div>
    </>
  );
}