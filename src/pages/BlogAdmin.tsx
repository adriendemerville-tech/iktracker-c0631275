import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, 
  Key, Copy, RefreshCw, FileText, Save
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

const generateApiKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'ik_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function BlogAdmin() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingKeys, setLoadingKeys] = useState(true);
  
  // Post form state
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [postForm, setPostForm] = useState({
    title: '',
    slug: '',
    subtitle: '',
    content: '',
    meta_description: '',
    featured_image_url: '',
    author_name: '',
    status: 'draft' as BlogPostStatus,
  });
  const [savingPost, setSavingPost] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);

  // API Key form state
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/app');
      return;
    }
    if (isAdmin) {
      fetchPosts();
      fetchApiKeys();
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchPosts = async () => {
    setLoadingPosts(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPosts(data as BlogPost[]);
    }
    setLoadingPosts(false);
  };

  const fetchApiKeys = async () => {
    setLoadingKeys(true);
    const { data, error } = await supabase
      .from('blog_api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setApiKeys(data);
    }
    setLoadingKeys(false);
  };

  const resetPostForm = () => {
    setPostForm({
      title: '',
      slug: '',
      subtitle: '',
      content: '',
      meta_description: '',
      featured_image_url: '',
      author_name: '',
      status: 'draft',
    });
    setEditingPost(null);
  };

  const openEditPost = (post: BlogPost) => {
    setEditingPost(post);
    setPostForm({
      title: post.title,
      slug: post.slug,
      subtitle: post.subtitle || '',
      content: post.content,
      meta_description: post.meta_description || '',
      featured_image_url: post.featured_image_url || '',
      author_name: post.author_name || '',
      status: post.status,
    });
    setPostDialogOpen(true);
  };

  const handleSlugChange = (title: string) => {
    if (!editingPost) {
      const slug = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setPostForm(prev => ({ ...prev, title, slug }));
    } else {
      setPostForm(prev => ({ ...prev, title }));
    }
  };

  const savePost = async () => {
    if (!postForm.title || !postForm.slug) {
      toast.error('Le titre et le slug sont requis');
      return;
    }

    setSavingPost(true);

    const postData = {
      title: postForm.title,
      slug: postForm.slug,
      subtitle: postForm.subtitle || null,
      content: postForm.content,
      meta_description: postForm.meta_description || null,
      featured_image_url: postForm.featured_image_url || null,
      author_name: postForm.author_name || null,
      status: postForm.status,
      ...(postForm.status === 'published' && !editingPost?.published_at 
        ? { published_at: new Date().toISOString() } 
        : {}),
    };

    let error;
    if (editingPost) {
      const result = await supabase
        .from('blog_posts')
        .update(postData)
        .eq('id', editingPost.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('blog_posts')
        .insert(postData);
      error = result.error;
    }

    setSavingPost(false);

    if (error) {
      toast.error('Erreur lors de la sauvegarde: ' + error.message);
      return;
    }

    toast.success(editingPost ? 'Article modifié' : 'Article créé');
    setPostDialogOpen(false);
    resetPostForm();
    fetchPosts();
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erreur lors de la suppression');
      return;
    }

    toast.success('Article supprimé');
    fetchPosts();
  };

  const togglePostStatus = async (post: BlogPost) => {
    const newStatus: BlogPostStatus = post.status === 'published' ? 'draft' : 'published';
    const updateData: Record<string, unknown> = { status: newStatus };
    
    if (newStatus === 'published' && !post.published_at) {
      updateData.published_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', post.id);

    if (error) {
      toast.error('Erreur lors du changement de statut');
      return;
    }

    toast.success(newStatus === 'published' ? 'Article publié' : 'Article dépublié');
    fetchPosts();
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Le nom de la clé est requis');
      return;
    }

    setCreatingKey(true);
    const apiKey = generateApiKey();

    const { error } = await supabase
      .from('blog_api_keys')
      .insert({
        name: newKeyName.trim(),
        api_key: apiKey,
      });

    setCreatingKey(false);

    if (error) {
      toast.error('Erreur lors de la création: ' + error.message);
      return;
    }

    toast.success('Clé API créée');
    setKeyDialogOpen(false);
    setNewKeyName('');
    fetchApiKeys();
  };

  const toggleKeyStatus = async (key: ApiKey) => {
    const { error } = await supabase
      .from('blog_api_keys')
      .update({ is_active: !key.is_active })
      .eq('id', key.id);

    if (error) {
      toast.error('Erreur lors du changement de statut');
      return;
    }

    toast.success(key.is_active ? 'Clé désactivée' : 'Clé activée');
    fetchApiKeys();
  };

  const deleteApiKey = async (id: string) => {
    const { error } = await supabase
      .from('blog_api_keys')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erreur lors de la suppression');
      return;
    }

    toast.success('Clé API supprimée');
    fetchApiKeys();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papier');
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

  const getStatusBadge = (status: BlogPostStatus) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500">Publié</Badge>;
      case 'draft':
        return <Badge variant="secondary">Brouillon</Badge>;
      case 'archived':
        return <Badge variant="outline">Archivé</Badge>;
    }
  };

  return (
    <>
      <Helmet>
        <title>Administration Blog - IKtracker</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/admin')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour admin
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Administration Blog</h1>
          </header>

          <Tabs defaultValue="posts" className="space-y-6">
            <TabsList>
              <TabsTrigger value="posts" className="gap-2">
                <FileText className="h-4 w-4" />
                Articles
              </TabsTrigger>
              <TabsTrigger value="api-keys" className="gap-2">
                <Key className="h-4 w-4" />
                Clés API
              </TabsTrigger>
            </TabsList>

            {/* Posts Tab */}
            <TabsContent value="posts" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Articles ({posts.length})</h2>
                <Dialog open={postDialogOpen} onOpenChange={(open) => {
                  setPostDialogOpen(open);
                  if (!open) resetPostForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Nouvel article
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingPost ? 'Modifier l\'article' : 'Nouvel article'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Titre *</Label>
                          <Input
                            id="title"
                            value={postForm.title}
                            onChange={(e) => handleSlugChange(e.target.value)}
                            placeholder="Titre de l'article"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="slug">Slug *</Label>
                          <Input
                            id="slug"
                            value={postForm.slug}
                            onChange={(e) => setPostForm(prev => ({ ...prev, slug: e.target.value }))}
                            placeholder="url-de-l-article"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subtitle">Sous-titre</Label>
                        <Input
                          id="subtitle"
                          value={postForm.subtitle}
                          onChange={(e) => setPostForm(prev => ({ ...prev, subtitle: e.target.value }))}
                          placeholder="Sous-titre optionnel"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="author">Auteur</Label>
                          <Input
                            id="author"
                            value={postForm.author_name}
                            onChange={(e) => setPostForm(prev => ({ ...prev, author_name: e.target.value }))}
                            placeholder="Nom de l'auteur"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="status">Statut</Label>
                          <Select 
                            value={postForm.status} 
                            onValueChange={(value: BlogPostStatus) => setPostForm(prev => ({ ...prev, status: value }))}
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
                      <div className="space-y-2">
                        <Label htmlFor="image">URL Image de couverture</Label>
                        <Input
                          id="image"
                          value={postForm.featured_image_url}
                          onChange={(e) => setPostForm(prev => ({ ...prev, featured_image_url: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="meta">Meta description (SEO)</Label>
                        <Textarea
                          id="meta"
                          value={postForm.meta_description}
                          onChange={(e) => setPostForm(prev => ({ ...prev, meta_description: e.target.value }))}
                          placeholder="Description pour les moteurs de recherche (max 160 caractères)"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="content">Contenu (HTML)</Label>
                        <Textarea
                          id="content"
                          value={postForm.content}
                          onChange={(e) => setPostForm(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="<p>Contenu de l'article en HTML...</p>"
                          rows={12}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Annuler</Button>
                      </DialogClose>
                      <Button onClick={savePost} disabled={savingPost}>
                        {savingPost ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        {editingPost ? 'Sauvegarder' : 'Créer'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {loadingPosts ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-6 w-1/2 mb-2" />
                        <Skeleton className="h-4 w-1/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Aucun article. Créez votre premier article !
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {posts.map((post) => (
                    <Card key={post.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-medium text-foreground truncate">
                                {post.title}
                              </h3>
                              {getStatusBadge(post.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              /{post.slug} • {format(new Date(post.created_at), 'dd MMM yyyy', { locale: fr })}
                              {post.author_name && ` • ${post.author_name}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => togglePostStatus(post)}
                              title={post.status === 'published' ? 'Dépublier' : 'Publier'}
                            >
                              {post.status === 'published' ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditPost(post)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer l'article ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible. L'article "{post.title}" sera définitivement supprimé.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deletePost(post.id)}>
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="api-keys" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Clés API ({apiKeys.length})</h2>
                <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Nouvelle clé
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Créer une clé API</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="keyName">Nom de la clé</Label>
                        <Input
                          id="keyName"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="Ex: Production, Test, Blog externe..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Annuler</Button>
                      </DialogClose>
                      <Button onClick={createApiKey} disabled={creatingKey}>
                        {creatingKey ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Key className="mr-2 h-4 w-4" />
                        )}
                        Créer
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Comment utiliser l'API :</p>
                  <code className="block bg-background p-2 rounded text-xs">
                    curl -H "x-api-key: VOTRE_CLE" https://yarjaudctshlxkatqgeb.supabase.co/functions/v1/blog-api/posts
                  </code>
                </CardContent>
              </Card>

              {loadingKeys ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-6 w-1/3 mb-2" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : apiKeys.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Aucune clé API. Créez une clé pour accéder à l'API du blog.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((key) => (
                    <Card key={key.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-medium text-foreground">
                                {key.name}
                              </h3>
                              <Badge variant={key.is_active ? 'default' : 'secondary'}>
                                {key.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs">
                                {key.api_key.slice(0, 12)}...
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(key.api_key)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <span>
                                • Créée le {format(new Date(key.created_at), 'dd MMM yyyy', { locale: fr })}
                              </span>
                              {key.last_used_at && (
                                <span>
                                  • Dernière utilisation: {format(new Date(key.last_used_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleKeyStatus(key)}
                              title={key.is_active ? 'Désactiver' : 'Activer'}
                            >
                              {key.is_active ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer la clé API ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible. Toutes les applications utilisant cette clé perdront l'accès.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteApiKey(key.id)}>
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
