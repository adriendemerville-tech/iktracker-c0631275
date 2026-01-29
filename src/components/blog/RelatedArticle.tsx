import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface RelatedPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  featured_image_url: string | null;
}

interface RelatedArticleProps {
  currentPostId: string;
}

export function RelatedArticle({ currentPostId }: RelatedArticleProps) {
  const [relatedPost, setRelatedPost] = useState<RelatedPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      // Fetch a random published article that isn't the current one
      const { data, error } = await supabase
        .from('blog_posts')
        .select('id, slug, title, subtitle, featured_image_url')
        .eq('status', 'published')
        .neq('id', currentPostId)
        .order('display_order', { ascending: true })
        .limit(5);

      if (!error && data && data.length > 0) {
        // Pick a random one from the results
        const randomIndex = Math.floor(Math.random() * data.length);
        setRelatedPost(data[randomIndex]);
      }
      setLoading(false);
    };

    fetchRelated();
  }, [currentPostId]);

  if (loading) {
    return (
      <Card className="mt-12">
        <CardContent className="p-6">
          <Skeleton className="h-5 w-48 mb-4" />
          <div className="flex gap-4">
            <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!relatedPost) {
    return null;
  }

  return (
    <Card className="mt-12 overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <Link to={`/blog/${relatedPost.slug}`} className="block">
          <div className="p-4 bg-muted/30 border-b border-border">
            <span className="text-sm font-medium text-muted-foreground">
              À lire également
            </span>
          </div>
          <div className="p-6 flex gap-4 items-start">
            {/* Thumbnail */}
            {relatedPost.featured_image_url ? (
              <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                <OptimizedImage
                  src={relatedPost.featured_image_url}
                  alt={relatedPost.title}
                  className="w-full h-full"
                  aspectRatio="1/1"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-primary">IK</span>
              </div>
            )}
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                {relatedPost.title}
              </h3>
              {relatedPost.subtitle && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {relatedPost.subtitle}
                </p>
              )}
              <span className="inline-flex items-center gap-1 text-sm text-primary mt-2 font-medium">
                Lire l'article
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
