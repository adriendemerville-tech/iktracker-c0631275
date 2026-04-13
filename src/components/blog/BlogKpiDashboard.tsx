import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, Users, Tag, Image, AlertTriangle, 
  BarChart3, Clock, Type 
} from 'lucide-react';

interface FullPost {
  id: string;
  title: string;
  content: string;
  slug: string;
  subtitle: string | null;
  meta_description: string | null;
  featured_image_url: string | null;
  author_name: string | null;
  published_at: string | null;
  status: string;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Extract likely topic from slug
function extractTopic(slug: string): string {
  const topics: Record<string, string> = {
    'bareme': 'Barème IK',
    'frais-reels': 'Frais réels',
    'impot': 'Fiscalité',
    'fiscal': 'Fiscalité',
    'comptab': 'Comptabilité',
    'expert-comptable': 'Comptabilité',
    'independant': 'Indépendants',
    'liberal': 'Professions libérales',
    'infirmier': 'Santé',
    'aide-soignant': 'Santé',
    'commercial': 'Commercial',
    'vtc': 'Transport',
    'taxi': 'Transport',
    'livreur': 'Transport',
    'artisan': 'Artisanat',
    'btp': 'BTP',
    'immobilier': 'Immobilier',
    'comparatif': 'Comparatif',
    'guide': 'Guide',
    'tutoriel': 'Tutoriel',
    'astuce': 'Astuces',
    'conseil': 'Conseils',
    'declaration': 'Déclaration',
    'tournee': 'Mode tournée',
  };

  for (const [key, label] of Object.entries(topics)) {
    if (slug.includes(key)) return label;
  }
  return 'Autre';
}

export function BlogKpiDashboard() {
  const [posts, setPosts] = useState<FullPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, content, slug, subtitle, meta_description, featured_image_url, author_name, published_at, status')
        .eq('status', 'published');
      if (data) setPosts(data as FullPost[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const kpis = useMemo(() => {
    if (!posts.length) return null;

    const totalArticles = posts.length;
    const authors = new Set(posts.map(p => p.author_name || 'Anonyme'));
    const topics = posts.map(p => extractTopic(p.slug));
    const topicSet = new Set(topics);
    const topicCounts = topics.reduce<Record<string, number>>((acc, t) => {
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});

    const words = posts.map(p => wordCount(p.content));
    const avgWords = Math.round(words.reduce((a, b) => a + b, 0) / words.length);
    const shortArticles = words.filter(w => w < 500).length;
    const longArticles = words.filter(w => w > 1500).length;

    const withoutImage = posts.filter(p => !p.featured_image_url).length;
    const withoutMeta = posts.filter(p => !p.meta_description).length;
    const withoutSubtitle = posts.filter(p => !p.subtitle).length;

    // Publication frequency
    const dates = posts
      .filter(p => p.published_at)
      .map(p => new Date(p.published_at!).getTime())
      .sort((a, b) => a - b);
    
    let avgDaysBetween = 0;
    if (dates.length > 1) {
      const totalDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
      avgDaysBetween = Math.round(totalDays / (dates.length - 1));
    }

    // Top 3 topics
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      totalArticles,
      authorCount: authors.size,
      topicCount: topicSet.size,
      avgWords,
      shortArticles,
      longArticles,
      withoutImage,
      withoutMeta,
      withoutSubtitle,
      avgDaysBetween,
      topTopics,
    };
  }, [posts]);

  if (loading) {
    return <Skeleton className="h-20 w-full rounded-xl" />;
  }

  if (!kpis) return null;

  const warnings = kpis.withoutImage + kpis.withoutMeta + kpis.withoutSubtitle;

  return (
    <div className="bg-muted/50 border border-border rounded-xl p-4 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Tableau de bord éditorial</span>
        <Badge variant="outline" className="text-[10px] h-5 ml-auto">Admin</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {/* Total articles */}
        <KpiCard icon={FileText} label="Articles publiés" value={kpis.totalArticles} color="text-blue-600" />
        
        {/* Authors */}
        <KpiCard icon={Users} label="Auteurs" value={kpis.authorCount} color="text-emerald-600" />
        
        {/* Topics */}
        <KpiCard icon={Tag} label="Sujets couverts" value={kpis.topicCount} color="text-violet-600" />
        
        {/* Avg words */}
        <KpiCard icon={Type} label="Mots / article" value={kpis.avgWords} color="text-cyan-600" />
        
        {/* Publication frequency */}
        <KpiCard icon={Clock} label="Fréquence" value={kpis.avgDaysBetween > 0 ? `${kpis.avgDaysBetween}j` : '—'} color="text-amber-600" subLabel="entre articles" />
        
        {/* Short articles */}
        <KpiCard icon={FileText} label="Courts (<500 mots)" value={kpis.shortArticles} color={kpis.shortArticles > 0 ? 'text-orange-600' : 'text-muted-foreground'} />
        
        {/* Long articles */}
        <KpiCard icon={FileText} label="Longs (>1500 mots)" value={kpis.longArticles} color="text-sky-600" />
        
        {/* Missing image */}
        <KpiCard icon={Image} label="Sans image" value={kpis.withoutImage} color={kpis.withoutImage > 0 ? 'text-red-600' : 'text-emerald-600'} />
        
        {/* Missing meta */}
        <KpiCard icon={AlertTriangle} label="Sans méta desc." value={kpis.withoutMeta} color={kpis.withoutMeta > 0 ? 'text-red-600' : 'text-emerald-600'} />
        
        {/* Missing subtitle */}
        <KpiCard icon={AlertTriangle} label="Sans sous-titre" value={kpis.withoutSubtitle} color={kpis.withoutSubtitle > 0 ? 'text-orange-600' : 'text-emerald-600'} />
      </div>

      {/* Top topics */}
      {kpis.topTopics.length > 0 && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-[11px] text-muted-foreground">Top sujets :</span>
          {kpis.topTopics.map(([topic, count]) => (
            <Badge key={topic} variant="secondary" className="text-[10px]">
              {topic} ({count})
            </Badge>
          ))}
          {warnings > 0 && (
            <Badge variant="destructive" className="text-[10px] ml-auto">
              {warnings} alerte{warnings > 1 ? 's' : ''} SEO
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color, subLabel }: {
  icon: typeof FileText;
  label: string;
  value: number | string;
  color: string;
  subLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
      <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
      <div className="min-w-0">
        <div className="text-sm font-bold leading-none">{value}</div>
        <div className="text-[10px] text-muted-foreground truncate">{label}</div>
        {subLabel && <div className="text-[9px] text-muted-foreground/70">{subLabel}</div>}
      </div>
    </div>
  );
}
