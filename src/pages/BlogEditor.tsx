import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  ArrowLeft, Save, Eye, EyeOff, RefreshCw, 
  Image as ImageIcon, X, ExternalLink
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type BlogPostStatus = 'draft' | 'published' | 'archived';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  content: string;
  meta_description: string | null;
  featured_image_url: string | null;
  author_name: string | null;
  status: BlogPostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function BlogEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [existingPost, setExistingPost] = useState<BlogPost | null>(null);
  
  const [form, setForm] = useState({
    title: '',
    slug: '',
    subtitle: '',
    content: '',
    meta_description: '',
    featured_image_url: '',
    author_name: '',
    status: 'draft' as BlogPostStatus,
  });

  // Redirect non-admins
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/blog');
    }
  }, [isAdmin, adminLoading, navigate]);

  // Load existing post if editing
  useEffect(() => {
    if (id && isAdmin) {
      loadPost(id);
    }
  }, [id, isAdmin]);

  const loadPost = async (postId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error || !data) {
      toast.error('Article non trouvé');
      navigate('/blog');
      return;
    }

    setExistingPost(data as BlogPost);
    setForm({
      title: data.title,
      slug: data.slug,
      subtitle: data.subtitle || '',
      content: data.content,
      meta_description: data.meta_description || '',
      featured_image_url: data.featured_image_url || '',
      author_name: data.author_name || '',
      status: data.status as BlogPostStatus,
    });
    setLoading(false);
  };

  const handleSlugChange = (title: string) => {
    if (!existingPost) {
      const slug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setForm(prev => ({ ...prev, title, slug }));
    } else {
      setForm(prev => ({ ...prev, title }));
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const ext = file.name.split('.').pop();
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      const { data, error } = await supabase.storage
        .from('blog-images')
        .upload(filename, file, {
          cacheControl: '31536000',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('blog-images')
        .getPublicUrl(data.path);

      setForm(prev => ({ ...prev, featured_image_url: urlData.publicUrl }));
      toast.success('Image uploadée');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error('Erreur upload: ' + message);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setForm(prev => ({ ...prev, featured_image_url: '' }));
  };

  const savePost = async (publishNow = false) => {
    if (!form.title || !form.slug) {
      toast.error('Le titre et le slug sont requis');
      return;
    }

    setSaving(true);

    const status = publishNow ? 'published' : form.status;
    const postData = {
      title: form.title,
      slug: form.slug,
      subtitle: form.subtitle || null,
      content: form.content,
      meta_description: form.meta_description || null,
      featured_image_url: form.featured_image_url || null,
      author_name: form.author_name || null,
      status,
      ...(status === 'published' && !existingPost?.published_at 
        ? { published_at: new Date().toISOString() } 
        : {}),
    };

    let error;
    if (existingPost) {
      const result = await supabase
        .from('blog_posts')
        .update(postData)
        .eq('id', existingPost.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('blog_posts')
        .insert(postData);
      error = result.error;
    }

    setSaving(false);

    if (error) {
      toast.error('Erreur: ' + error.message);
      return;
    }

    toast.success(publishNow ? 'Article publié !' : (existingPost ? 'Article sauvegardé' : 'Brouillon créé'));
    
    if (publishNow) {
      navigate(`/blog/${form.slug}`);
    } else {
      navigate('/blog');
    }
  };

  const togglePublish = async () => {
    if (!existingPost) return;
    
    const newStatus: BlogPostStatus = existingPost.status === 'published' ? 'draft' : 'published';
    const updateData: Record<string, unknown> = { status: newStatus };
    
    if (newStatus === 'published' && !existingPost.published_at) {
      updateData.published_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', existingPost.id);

    if (error) {
      toast.error('Erreur lors du changement de statut');
      return;
    }

    toast.success(newStatus === 'published' ? 'Article publié' : 'Article dépublié');
    setExistingPost({ ...existingPost, status: newStatus });
    setForm(prev => ({ ...prev, status: newStatus }));
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{existingPost ? 'Modifier l\'article' : 'Nouvel article'} - Blog IKtracker</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <header className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/blog')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              {existingPost && (
                <Badge variant={form.status === 'published' ? 'default' : 'secondary'}>
                  {form.status === 'published' ? 'Publié' : form.status === 'draft' ? 'Brouillon' : 'Archivé'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {existingPost?.status === 'published' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`/blog/${existingPost.slug}`, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Voir
                </Button>
              )}
              {existingPost && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={togglePublish}
                >
                  {form.status === 'published' ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Dépublier
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Publier
                    </>
                  )}
                </Button>
              )}
            </div>
          </header>

          <h1 className="text-3xl font-bold text-foreground mb-8">
            {existingPost ? 'Modifier l\'article' : 'Nouvel article'}
          </h1>

          {/* Editor Form */}
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Title & Slug */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="Titre de l'article"
                    className="text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="url-de-l-article"
                  />
                </div>
              </div>

              {/* Subtitle */}
              <div className="space-y-2">
                <Label htmlFor="subtitle">Sous-titre</Label>
                <Input
                  id="subtitle"
                  value={form.subtitle}
                  onChange={(e) => setForm(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Sous-titre optionnel"
                />
              </div>

              {/* Author & Status */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="author">Auteur</Label>
                  <Input
                    id="author"
                    value={form.author_name}
                    onChange={(e) => setForm(prev => ({ ...prev, author_name: e.target.value }))}
                    placeholder="Nom de l'auteur"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select 
                    value={form.status} 
                    onValueChange={(value: BlogPostStatus) => setForm(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="published">Publié</SelectItem>
                      <SelectItem value="archived">Archivé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Featured Image */}
              <div className="space-y-2">
                <Label>Image de couverture</Label>
                {form.featured_image_url ? (
                  <div className="relative">
                    <img 
                      src={form.featured_image_url} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                    <label 
                      htmlFor="image-upload" 
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      {uploadingImage ? (
                        <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {uploadingImage ? 'Upload en cours...' : 'Cliquez pour uploader une image'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        PNG, JPG, WebP (max 5MB)
                      </span>
                    </label>
                  </div>
                )}
                <Input
                  value={form.featured_image_url}
                  onChange={(e) => setForm(prev => ({ ...prev, featured_image_url: e.target.value }))}
                  placeholder="Ou collez une URL..."
                  className="mt-2"
                />
              </div>

              {/* Meta Description */}
              <div className="space-y-2">
                <Label htmlFor="meta">Meta description (SEO)</Label>
                <Textarea
                  id="meta"
                  value={form.meta_description}
                  onChange={(e) => setForm(prev => ({ ...prev, meta_description: e.target.value }))}
                  placeholder="Description pour les moteurs de recherche (max 160 caractères)"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  {form.meta_description.length}/160 caractères
                </p>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Contenu (HTML)</Label>
                <Textarea
                  id="content"
                  value={form.content}
                  onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="<p>Contenu de l'article en HTML...</p>"
                  rows={16}
                  className="font-mono text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => savePost(false)} 
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Enregistrer en brouillon
                </Button>
                <Button 
                  onClick={() => savePost(true)} 
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  Publier
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
