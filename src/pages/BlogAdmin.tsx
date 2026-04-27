import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { convertToWebP } from '@/lib/image-utils';
import { ContentEditor } from '@/components/blog/ContentEditor';
import { BlogKpiDashboard } from '@/components/blog/BlogKpiDashboard';
import { BlogBlacklistManager } from '@/components/admin/BlogBlacklistManager';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, 
  Key, Copy, RefreshCw, Save, X, Image as ImageIcon, GripVertical, FileText, Code2, History, Undo2, Search, Ban
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

interface AuditLog {
  id: string;
  created_at: string;
  action: string;
  resource_type: string;
  resource_id: string;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  api_key_name: string | null;
  reverted: boolean;
  reverted_at: string | null;
}

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
  display_order: number;
}

// Sortable post card component
function SortablePostCard({ 
  post, 
  onEdit, 
  onToggleStatus, 
  onDelete,
  getStatusBadge,
  selected,
  onSelectChange,
}: { 
  post: BlogPost; 
  onEdit: (post: BlogPost) => void;
  onToggleStatus: (post: BlogPost) => void;
  onDelete: (id: string) => void;
  getStatusBadge: (status: BlogPostStatus) => React.ReactNode;
  selected: boolean;
  onSelectChange: (id: string, checked: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? 'ring-2 ring-primary' : selected ? 'ring-2 ring-primary/50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <Checkbox
            checked={selected}
            onCheckedChange={(c) => onSelectChange(post.id, !!c)}
            aria-label={`Sélectionner ${post.title}`}
          />
          <div 
            {...attributes} 
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
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
              onClick={() => onToggleStatus(post)}
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
              onClick={() => onEdit(post)}
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
                  <AlertDialogAction onClick={() => onDelete(post.id)}>
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  monthly_quota: number;
  usage_current_month: number;
  usage_reset_at: string;
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

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);

  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false);

  // Posts list filters
  const [statusFilter, setStatusFilter] = useState<'all' | BlogPostStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk selection state
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [selectedTrashIds, setSelectedTrashIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const toggleSelectPost = (id: string, checked: boolean) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };
  const toggleSelectTrash = (id: string, checked: boolean) => {
    setSelectedTrashIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };
  const clearPostSelection = () => setSelectedPostIds(new Set());
  const clearTrashSelection = () => setSelectedTrashIds(new Set());

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/app');
      return;
    }
    if (isAdmin) {
      fetchPosts();
      fetchApiKeys();
      fetchAuditLogs();
    }
  }, [isAdmin, adminLoading, navigate]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchPosts = async () => {
    setLoadingPosts(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('display_order', { ascending: true });

    if (!error && data) {
      setPosts(data as BlogPost[]);
    }
    setLoadingPosts(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = posts.findIndex((p) => p.id === active.id);
      const newIndex = posts.findIndex((p) => p.id === over.id);
      
      const newPosts = arrayMove(posts, oldIndex, newIndex);
      setPosts(newPosts);
      
      // Update display_order in database
      const updates = newPosts.map((post, index) => ({
        id: post.id,
        display_order: index + 1,
      }));
      
      for (const update of updates) {
        await supabase
          .from('blog_posts')
          .update({ display_order: update.display_order } as any)
          .eq('id', update.id);
      }
      
      toast.success('Ordre mis à jour');
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    const { data, error } = await supabase
      .from('api_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error && data) {
      setAuditLogs(data as AuditLog[]);
    }
    setLoadingAudit(false);
  };

  const revertChange = async (logId: string) => {
    setRevertingId(logId);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/blog-api/audit/revert/${logId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKeys.find(k => k.is_active)?.api_key || '',
          },
        }
      );
      const result = await response.json();
      if (!response.ok) {
        toast.error('Erreur revert: ' + (result.error || 'Erreur inconnue'));
      } else {
        toast.success('Modification annulée avec succès');
        fetchAuditLogs();
        fetchPosts();
      }
    } catch (e) {
      toast.error('Erreur réseau');
    }
    setRevertingId(null);
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
    // Soft-delete: move to trash instead of permanent delete
    const { error } = await supabase
      .from('blog_posts')
      .update({ status: 'deleted' as BlogPostStatus, deleted_at: new Date().toISOString() } as any)
      .eq('id', id);

    if (error) {
      toast.error('Erreur lors de la suppression');
      return;
    }

    toast.success('Article déplacé dans la corbeille');
    fetchPosts();
  };

  const restorePost = async (id: string) => {
    const { error } = await supabase
      .from('blog_posts')
      .update({ status: 'draft' as BlogPostStatus, deleted_at: null } as any)
      .eq('id', id);
    if (error) { toast.error('Erreur lors de la restauration'); return; }
    toast.success('Article restauré en brouillon');
    fetchPosts();
  };

  const purgePost = async (id: string) => {
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) { toast.error('Erreur lors de la purge'); return; }
    toast.success('Article supprimé définitivement');
    fetchPosts();
  };

  // Bulk actions on visible posts (Articles tab)
  const bulkPublish = async (publish: boolean) => {
    const ids = Array.from(selectedPostIds);
    if (ids.length === 0) return;
    setBulkActionLoading(true);
    const updateData: Record<string, unknown> = { status: publish ? 'published' : 'draft' };
    if (publish) updateData.published_at = new Date().toISOString();
    const { error } = await supabase.from('blog_posts').update(updateData).in('id', ids);
    setBulkActionLoading(false);
    if (error) { toast.error('Erreur lors de la mise à jour groupée'); return; }
    toast.success(`${ids.length} article(s) ${publish ? 'publié(s)' : 'dépublié(s)'}`);
    clearPostSelection();
    fetchPosts();
  };

  const bulkSoftDelete = async () => {
    const ids = Array.from(selectedPostIds);
    if (ids.length === 0) return;
    setBulkActionLoading(true);
    const { error } = await supabase
      .from('blog_posts')
      .update({ status: 'deleted' as BlogPostStatus, deleted_at: new Date().toISOString() } as any)
      .in('id', ids);
    setBulkActionLoading(false);
    if (error) { toast.error('Erreur lors de la suppression groupée'); return; }
    toast.success(`${ids.length} article(s) déplacé(s) dans la corbeille`);
    clearPostSelection();
    fetchPosts();
  };

  // Bulk actions on trash
  const bulkRestore = async () => {
    const ids = Array.from(selectedTrashIds);
    if (ids.length === 0) return;
    setBulkActionLoading(true);
    const { error } = await supabase
      .from('blog_posts')
      .update({ status: 'draft' as BlogPostStatus, deleted_at: null } as any)
      .in('id', ids);
    setBulkActionLoading(false);
    if (error) { toast.error('Erreur lors de la restauration groupée'); return; }
    toast.success(`${ids.length} article(s) restauré(s) en brouillon`);
    clearTrashSelection();
    fetchPosts();
  };

  const bulkPurge = async () => {
    const ids = Array.from(selectedTrashIds);
    if (ids.length === 0) return;
    setBulkActionLoading(true);
    const { error } = await supabase.from('blog_posts').delete().in('id', ids);
    setBulkActionLoading(false);
    if (error) { toast.error('Erreur lors de la purge groupée'); return; }
    toast.success(`${ids.length} article(s) supprimé(s) définitivement`);
    clearTrashSelection();
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      // Convert image to WebP with 80% quality
      const webpFile = await convertToWebP(file, 0.8);
      
      // Generate unique filename with .webp extension
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;

      const { data, error } = await supabase.storage
        .from('blog-images')
        .upload(filename, webpFile, {
          cacheControl: '31536000',
          upsert: false,
          contentType: 'image/webp',
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('blog-images')
        .getPublicUrl(data.path);

      setPostForm(prev => ({ ...prev, featured_image_url: urlData.publicUrl }));
      toast.success('Image convertie en WebP et uploadée');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error('Erreur upload: ' + message);
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setPostForm(prev => ({ ...prev, featured_image_url: '' }));
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
      case 'deleted' as BlogPostStatus:
        return <Badge variant="destructive">Corbeille</Badge>;
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  // Main listing always excludes the trash; deleted posts are managed in the dedicated tab
  const visiblePosts = posts.filter((p) => (p.status as string) !== 'deleted');
  const trashedPosts = posts.filter((p) => (p.status as string) === 'deleted');
  const filteredPosts = visiblePosts.filter((post) => {
    if (statusFilter !== 'all' && post.status !== statusFilter) return false;
    if (!normalizedQuery) return true;
    const haystack = [
      post.title,
      post.subtitle ?? '',
      post.slug,
      post.author_name ?? '',
      post.meta_description ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
  const isFiltering = statusFilter !== 'all' || normalizedQuery.length > 0;
  const statusCounts = {
    all: visiblePosts.length,
    published: visiblePosts.filter((p) => p.status === 'published').length,
    draft: visiblePosts.filter((p) => p.status === 'draft').length,
    archived: visiblePosts.filter((p) => p.status === 'archived').length,
  };

  return (
    <>
      <Helmet>
        <title>Administration Blog - IKtracker</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://iktracker.fr/app/admin/blog" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <header className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/app/admin')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour admin
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Administration Blog</h1>
          </header>

          <BlogKpiDashboard />

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
              <TabsTrigger value="api-spec" className="gap-2">
                <Code2 className="h-4 w-4" />
                Spécification API
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <History className="h-4 w-4" />
                Journal API
              </TabsTrigger>
              <TabsTrigger value="blacklist" className="gap-2">
                <Ban className="h-4 w-4" />
                Liste noire
              </TabsTrigger>
              <TabsTrigger value="trash" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Corbeille{trashedPosts.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{trashedPosts.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Posts Tab */}
            <TabsContent value="posts" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  Articles ({isFiltering ? `${filteredPosts.length}/${visiblePosts.length}` : visiblePosts.length})
                </h2>
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
                        <Label>Image de couverture</Label>
                        {postForm.featured_image_url ? (
                          <div className="relative">
                            <img 
                              src={postForm.featured_image_url} 
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
                          value={postForm.featured_image_url}
                          onChange={(e) => setPostForm(prev => ({ ...prev, featured_image_url: e.target.value }))}
                          placeholder="Ou collez une URL..."
                          className="mt-2"
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
                        <Label>Contenu (Markdown/HTML)</Label>
                        <ContentEditor
                          value={postForm.content}
                          onChange={(value) => setPostForm(prev => ({ ...prev, content: value }))}
                          placeholder="Contenu de l'article... Glissez des images pour les insérer automatiquement en WebP."
                          rows={12}
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

              {/* Filters: status + keyword search */}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par titre, slug, auteur, sous-titre…"
                    className="pl-9 pr-9"
                    aria-label="Rechercher un article"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
                      aria-label="Effacer la recherche"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as 'all' | BlogPostStatus)}
                >
                  <SelectTrigger className="w-full sm:w-[220px]" aria-label="Filtrer par statut">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts ({statusCounts.all})</SelectItem>
                    <SelectItem value="published">Publiés ({statusCounts.published})</SelectItem>
                    <SelectItem value="draft">Brouillons ({statusCounts.draft})</SelectItem>
                    <SelectItem value="archived">Archivés ({statusCounts.archived})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk actions bar */}
              {visiblePosts.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={
                        (isFiltering ? filteredPosts : visiblePosts).length > 0 &&
                        (isFiltering ? filteredPosts : visiblePosts).every((p) => selectedPostIds.has(p.id))
                      }
                      onCheckedChange={(c) => {
                        const list = isFiltering ? filteredPosts : visiblePosts;
                        if (c) {
                          setSelectedPostIds(new Set(list.map((p) => p.id)));
                        } else {
                          clearPostSelection();
                        }
                      }}
                      aria-label="Tout sélectionner"
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedPostIds.size > 0
                        ? `${selectedPostIds.size} sélectionné(s)`
                        : 'Tout sélectionner'}
                    </span>
                  </div>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedPostIds.size === 0 || bulkActionLoading}
                      onClick={() => bulkPublish(true)}
                    >
                      <Eye className="mr-2 h-4 w-4" /> Publier
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedPostIds.size === 0 || bulkActionLoading}
                      onClick={() => bulkPublish(false)}
                    >
                      <EyeOff className="mr-2 h-4 w-4" /> Dépublier
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={selectedPostIds.size === 0 || bulkActionLoading}
                        >
                          <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Mettre à la corbeille
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Déplacer {selectedPostIds.size} article(s) à la corbeille ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Les articles sélectionnés seront déplacés dans la corbeille. Vous pourrez les restaurer ou les supprimer définitivement depuis l'onglet « Corbeille ».
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={bulkSoftDelete}>Déplacer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {selectedPostIds.size > 0 && (
                      <Button size="sm" variant="ghost" onClick={clearPostSelection}>
                        <X className="mr-2 h-4 w-4" /> Effacer
                      </Button>
                    )}
                  </div>
                </div>
              )}
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
              ) : visiblePosts.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Aucun article. Créez votre premier article !
                  </CardContent>
                </Card>
              ) : filteredPosts.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground space-y-3">
                    <p>Aucun article ne correspond à ces filtres.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatusFilter('all');
                        setSearchQuery('');
                      }}
                    >
                      Réinitialiser les filtres
                    </Button>
                  </CardContent>
                </Card>
              ) : isFiltering ? (
                // Drag-and-drop reorder is disabled while filtering to avoid
                // reordering against an incomplete list.
                <div className="space-y-3">
                  {filteredPosts.map((post) => (
                    <Card key={post.id} className={selectedPostIds.has(post.id) ? 'ring-2 ring-primary/50' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <Checkbox
                            checked={selectedPostIds.has(post.id)}
                            onCheckedChange={(c) => toggleSelectPost(post.id, !!c)}
                            aria-label={`Sélectionner ${post.title}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-medium text-foreground truncate">{post.title}</h3>
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
                            <Button variant="ghost" size="icon" onClick={() => openEditPost(post)}>
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
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={visiblePosts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {visiblePosts.map((post) => (
                        <SortablePostCard
                          key={post.id}
                          post={post}
                          onEdit={openEditPost}
                          onToggleStatus={togglePostStatus}
                          onDelete={deletePost}
                          getStatusBadge={getStatusBadge}
                          selected={selectedPostIds.has(post.id)}
                          onSelectChange={toggleSelectPost}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
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
                    curl -H "x-api-key: VOTRE_CLE" {import.meta.env.VITE_SUPABASE_URL}/functions/v1/blog-api/posts
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
                            {/* Quota mensuel */}
                            <div className="mt-2 space-y-1">
                              {(() => {
                                const usage = key.usage_current_month ?? 0;
                                const quota = key.monthly_quota ?? 10000;
                                const pct = Math.min(100, Math.round((usage / quota) * 100));
                                const colorClass = pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-orange-500' : 'bg-primary';
                                return (
                                  <>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">
                                        Quota mensuel : <strong className="text-foreground">{usage.toLocaleString()}</strong> / {quota.toLocaleString()} écritures
                                      </span>
                                      <span className="text-muted-foreground">
                                        Reset : {format(new Date(key.usage_reset_at), 'dd MMM', { locale: fr })}
                                      </span>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className={`h-full ${colorClass} transition-all`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </>
                                );
                              })()}
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

            {/* API Specification Tab */}
            <TabsContent value="api-spec" className="space-y-6">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">API Content — Spécification technique</h2>
                    <p className="text-muted-foreground">
                      Cette API REST permet à des services externes (ex: crawlers.fr) de lire et modifier l'intégralité des contenus du site IKtracker : articles de blog et pages statiques.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">🔐 Authentification</h3>
                    <p className="text-sm text-muted-foreground">Toutes les requêtes en écriture (POST, PUT, DELETE) nécessitent une clé API active.</p>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`Header requis :
x-api-key: <votre_clé_api>

Ou bien :
Authorization: Bearer <webhook_token>`}
                    </pre>
                    <p className="text-sm text-muted-foreground">Les clés API se gèrent dans l'onglet « Clés API » ci-dessus.</p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">🌐 Base URL</h3>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blog-api`}
                    </pre>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">📝 Endpoints — Articles de blog</h3>
                    <div className="space-y-3">
                      <div className="border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-green-600 text-white">GET</Badge>
                          <code className="text-sm font-mono">/posts</code>
                          <Badge variant="outline">Public</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Liste les articles publiés. Params: <code>limit</code>, <code>offset</code></p>
                      </div>

                      <div className="border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-green-600 text-white">GET</Badge>
                          <code className="text-sm font-mono">/posts/:slug</code>
                          <Badge variant="outline">Public</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Récupère un article publié par son slug</p>
                      </div>

                      <div className="border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-blue-600 text-white">POST</Badge>
                          <code className="text-sm font-mono">/posts</code>
                          <Badge variant="destructive">Auth</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">Crée ou met à jour un article (upsert par slug)</p>
                        <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`{
  "title": "Mon article",
  "slug": "mon-article",
  "content": "# Contenu Markdown...",
  "meta_description": "Description SEO",
  "featured_image_url": "https://...",
  "author_name": "Adrien",
  "status": "published"  // draft | published | archived
}`}
                        </pre>
                      </div>

                      <div className="border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-yellow-600 text-white">PUT</Badge>
                          <code className="text-sm font-mono">/posts/:slug</code>
                          <Badge variant="destructive">Auth</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Mise à jour partielle d'un article (seuls les champs envoyés sont modifiés)</p>
                      </div>

                      <div className="border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-red-600 text-white">DELETE</Badge>
                          <code className="text-sm font-mono">/posts/:slug</code>
                          <Badge variant="destructive">Auth</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Supprime un article</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">📄 Endpoints — Pages statiques</h3>
                    <div className="space-y-3">
                      <div className="border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-green-600 text-white">GET</Badge>
                          <code className="text-sm font-mono">/pages</code>
                          <Badge variant="outline">Public</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Liste toutes les pages et leur contenu</p>
                      </div>

                      <div className="border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-green-600 text-white">GET</Badge>
                          <code className="text-sm font-mono">/pages/:page_key</code>
                          <Badge variant="outline">Public</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Récupère le contenu d'une page par sa clé</p>
                      </div>

                      <div className="border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-yellow-600 text-white">PUT</Badge>
                          <code className="text-sm font-mono">/pages/:page_key</code>
                          <Badge variant="destructive">Auth</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">Met à jour le contenu d'une page existante</p>
                        <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`{
  "title": "Nouveau titre",
  "meta_title": "Title SEO",
  "meta_description": "Description SEO",
  "content": {
    "hero_title": "Titre principal",
    "hero_subtitle": "Sous-titre",
    "sections": [
      { "title": "Section 1", "body": "Contenu..." }
    ]
  }
}`}
                        </pre>
                      </div>

                      <div className="border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-blue-600 text-white">POST</Badge>
                          <code className="text-sm font-mono">/pages</code>
                          <Badge variant="destructive">Auth</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Crée ou met à jour une page (upsert par page_key). Champ requis: <code>page_key</code></p>
                      </div>

                      <div className="border border-border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-red-600 text-white">DELETE</Badge>
                          <code className="text-sm font-mono">/pages/:page_key</code>
                          <Badge variant="destructive">Auth</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Supprime une page</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">📋 Pages disponibles (page_key)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {['landing', 'mode-tournee', 'calendrier', 'expert-comptable', 'bareme-ik-2026', 'frais-reels', 'lexique', 'comparatif-izika', 'comparatif-drivers-note', 'install', 'privacy', 'terms'].map(key => (
                        <code key={key} className="bg-muted px-3 py-1.5 rounded text-xs font-mono">{key}</code>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">💡 Exemple cURL</h3>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
{`# Modifier la page "barème IK 2026"
curl -X PUT \\
  ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blog-api/pages/bareme-ik-2026 \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: VOTRE_CLE_API" \\
  -d '{
    "meta_title": "Barème IK 2026 - Simulateur gratuit",
    "meta_description": "Calculez vos indemnités kilométriques 2026",
    "content": {
      "hero_title": "Barème kilométrique 2026",
      "faq": [
        { "q": "Comment calculer ?", "a": "Utilisez notre simulateur..." }
      ]
    }
  }'

# Créer un article de blog
curl -X POST \\
  ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blog-api/posts \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: VOTRE_CLE_API" \\
  -d '{
    "title": "Nouvel article SEO",
    "slug": "nouvel-article-seo",
    "content": "# Mon contenu en Markdown",
    "status": "published"
  }'`}
                    </pre>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">⚠️ Codes de retour</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2"><Badge className="bg-green-600 text-white">200</Badge> Succès</div>
                      <div className="flex items-center gap-2"><Badge className="bg-green-600 text-white">201</Badge> Créé avec succès</div>
                      <div className="flex items-center gap-2"><Badge className="bg-yellow-600 text-white">400</Badge> Paramètres manquants</div>
                      <div className="flex items-center gap-2"><Badge className="bg-red-600 text-white">401</Badge> Clé API invalide</div>
                      <div className="flex items-center gap-2"><Badge className="bg-red-600 text-white">404</Badge> Ressource non trouvée</div>
                      <div className="flex items-center gap-2"><Badge className="bg-red-600 text-white">500</Badge> Erreur serveur</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            {/* Audit Log Tab */}
            <TabsContent value="audit" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Journal des modifications API</h2>
                <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={loadingAudit}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingAudit ? 'animate-spin' : ''}`} />
                  Rafraîchir
                </Button>
              </div>

              <Card className="bg-muted/50">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Toutes les modifications effectuées via l'API externe sont tracées ici. Vous pouvez annuler une modification pour restaurer l'état précédent.
                </CardContent>
              </Card>

              {loadingAudit ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}><CardContent className="p-4"><Skeleton className="h-6 w-full mb-2" /><Skeleton className="h-4 w-2/3" /></CardContent></Card>
                  ))}
                </div>
              ) : auditLogs.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    Aucune modification API enregistrée pour le moment.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => {
                    const actionLabels: Record<string, string> = { create: 'Création', update: 'Modification', delete: 'Suppression' };
                    const actionColors: Record<string, string> = { create: 'bg-green-600 text-white', update: 'bg-yellow-600 text-white', delete: 'bg-red-600 text-white' };
                    const resourceLabels: Record<string, string> = { post: 'Article', page: 'Page' };

                    return (
                      <Card key={log.id} className={log.reverted ? 'opacity-60' : ''}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge className={actionColors[log.action] || 'bg-muted'}>
                                  {actionLabels[log.action] || log.action}
                                </Badge>
                                <Badge variant="outline">
                                  {resourceLabels[log.resource_type] || log.resource_type}
                                </Badge>
                                <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{log.resource_id}</code>
                                {log.reverted && <Badge variant="secondary">Annulé</Badge>}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {format(new Date(log.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                {log.api_key_name && <span> • via <strong>{log.api_key_name}</strong></span>}
                                {log.reverted && log.reverted_at && (
                                  <span> • Annulé le {format(new Date(log.reverted_at), 'dd MMM yyyy à HH:mm', { locale: fr })}</span>
                                )}
                              </div>
                              {log.action === 'update' && log.previous_data && log.new_data && (
                                <details className="mt-2">
                                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                    Voir les changements
                                  </summary>
                                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <p className="font-medium text-muted-foreground mb-1">Avant</p>
                                      <pre className="bg-muted p-2 rounded overflow-x-auto max-h-40">
                                        {JSON.stringify(log.previous_data, null, 2)}
                                      </pre>
                                    </div>
                                    <div>
                                      <p className="font-medium text-muted-foreground mb-1">Après</p>
                                      <pre className="bg-muted p-2 rounded overflow-x-auto max-h-40">
                                        {JSON.stringify(log.new_data, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                </details>
                              )}
                            </div>
                            {!log.reverted && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" disabled={revertingId === log.id}>
                                    {revertingId === log.id ? (
                                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Undo2 className="mr-2 h-4 w-4" />
                                    )}
                                    Annuler
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Annuler cette modification ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {log.action === 'create' && `L'élément "${log.resource_id}" sera supprimé.`}
                                      {log.action === 'update' && `L'élément "${log.resource_id}" sera restauré à son état précédent.`}
                                      {log.action === 'delete' && `L'élément "${log.resource_id}" sera recréé avec ses données précédentes.`}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Garder</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => revertChange(log.id)}>
                                      Annuler la modification
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Blacklist Tab */}
            <TabsContent value="blacklist" className="space-y-4">
              <BlogBlacklistManager />
            </TabsContent>

            {/* Trash Tab */}
            <TabsContent value="trash" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Trash2 className="h-5 w-5 text-destructive" />
                    <h3 className="font-semibold">Corbeille ({trashedPosts.length})</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Les articles supprimés sont conservés ici. L'API blog refuse leur recréation tant qu'ils sont en corbeille.
                    Restaurez-les en brouillon, ou supprimez-les définitivement.
                  </p>
                  {trashedPosts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun article dans la corbeille.</p>
                  ) : (
                    <>
                      {/* Bulk actions bar - trash */}
                      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={trashedPosts.length > 0 && trashedPosts.every((p) => selectedTrashIds.has(p.id))}
                            onCheckedChange={(c) => {
                              if (c) setSelectedTrashIds(new Set(trashedPosts.map((p) => p.id)));
                              else clearTrashSelection();
                            }}
                            aria-label="Tout sélectionner"
                          />
                          <span className="text-sm text-muted-foreground">
                            {selectedTrashIds.size > 0
                              ? `${selectedTrashIds.size} sélectionné(s)`
                              : 'Tout sélectionner'}
                          </span>
                        </div>
                        <div className="ml-auto flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={selectedTrashIds.size === 0 || bulkActionLoading}
                            onClick={bulkRestore}
                          >
                            <Undo2 className="mr-2 h-4 w-4" /> Restaurer
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={selectedTrashIds.size === 0 || bulkActionLoading}
                              >
                                <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Supprimer définitivement
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer définitivement {selectedTrashIds.size} article(s) ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Les articles sélectionnés seront supprimés de la base de données. Cette action est irréversible. Pensez à ajouter les slugs à la liste noire pour empêcher leur recréation par l'API.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={bulkPurge}>Supprimer définitivement</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          {selectedTrashIds.size > 0 && (
                            <Button size="sm" variant="ghost" onClick={clearTrashSelection}>
                              <X className="mr-2 h-4 w-4" /> Effacer
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {trashedPosts.map((p) => (
                          <div
                            key={p.id}
                            className={`border rounded-lg p-3 flex items-center justify-between gap-3 ${selectedTrashIds.has(p.id) ? 'ring-2 ring-primary/50' : ''}`}
                          >
                            <Checkbox
                              checked={selectedTrashIds.has(p.id)}
                              onCheckedChange={(c) => toggleSelectTrash(p.id, !!c)}
                              aria-label={`Sélectionner ${p.title}`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium truncate">{p.title}</span>
                                <Badge variant="destructive">Corbeille</Badge>
                              </div>
                              <code className="text-xs text-muted-foreground break-all">{p.slug}</code>
                              {(p as any).deleted_at && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Supprimé le {new Date((p as any).deleted_at).toLocaleString('fr-FR')}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button size="sm" variant="outline" onClick={() => restorePost(p.id)} title="Restaurer en brouillon">
                                <Undo2 className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline" title="Supprimer définitivement">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Suppression définitive ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      L'article « {p.title} » sera supprimé définitivement de la base. Cette action est irréversible.
                                      Pensez à ajouter le slug à la liste noire si vous voulez empêcher sa recréation par l'API.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => purgePost(p.id)}>
                                      Supprimer définitivement
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
