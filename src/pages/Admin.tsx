import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AdminStats } from '@/components/AdminStats';
import { AdminCosts } from '@/components/admin/AdminCosts';
import { AdminDocumentation } from '@/components/admin/AdminDocumentation';
import { AdminMonitoring } from '@/components/admin/AdminMonitoring';
import { UserKPISheet } from '@/components/admin/UserKPISheet';
import { AdminSurveys } from '@/components/admin/AdminSurveys';
import { 
  ArrowLeft, 
  MessageSquare, 
  Send, 
  User, 
  Clock, 
  CheckCircle2,
  Image as ImageIcon,
  Shield,
  Loader2,
  Users,
  Search,
  UserPlus,
  UserMinus,
  Crown,
  BarChart3,
  FileText,
  ChevronRight,
  Euro,
  BookOpen,
  Activity,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DeviceInfo {
  platform: string;
  os: string;
  browser: string;
  browser_version: string;
  device: string | null;
  user_agent: string;
}

interface Feedback {
  id: string;
  user_id: string;
  message: string;
  image_url: string | null;
  response: string | null;
  responded_at: string | null;
  read_by_user: boolean;
  created_at: string;
  phone_number: string | null;
  device_info: DeviceInfo | null;
  // User info (joined from users)
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
}

interface UserWithRole {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  isAdmin: boolean;
  userRole: 'admin' | 'viewer' | null;
  feedbackCount: number;
  lastActivity: string | null;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, adminRole, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [responseText, setResponseText] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newAdminId, setNewAdminId] = useState('');
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'stats');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [userSheetOpen, setUserSheetOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(userSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Fetch feedbacks with user info - refresh every 15 minutes
  const { data: feedbacks = [], isLoading: feedbacksLoading } = useQuery({
    queryKey: ['admin-feedbacks'],
    queryFn: async () => {
      // Cleanup phone numbers older than 7 days
      await supabase.rpc('cleanup_old_phone_numbers' as any);

      const { data: feedbackData, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get unique user IDs from feedbacks
      const userIds = [...new Set(feedbackData.map(f => f.user_id))];
      
      // Fetch user info for all feedback users
      const userInfoMap = new Map<string, { first_name: string; last_name: string; email: string }>();
      
      for (const userId of userIds) {
        const { data: userData } = await supabase.rpc('search_users', { 
          search_term: userId,
          limit_count: 1
        });
        if (userData && userData.length > 0) {
          userInfoMap.set(userId, {
            first_name: userData[0].first_name || '',
            last_name: userData[0].last_name || '',
            email: userData[0].email || '',
          });
        }
      }
      
      // Merge user info into feedbacks
      return feedbackData.map(f => ({
        ...f,
        phone_number: (f as any).phone_number || null,
        device_info: (f as any).device_info as DeviceInfo | null,
        user_first_name: userInfoMap.get(f.user_id)?.first_name,
        user_last_name: userInfoMap.get(f.user_id)?.last_name,
        user_email: userInfoMap.get(f.user_id)?.email,
      })) as Feedback[];
    },
    enabled: isAdmin,
    refetchInterval: 15 * 60 * 1000, // 15 minutes
  });

  // Fetch user roles - refresh every 15 minutes
  const { data: userRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .in('role', ['admin', 'viewer'] as any[]);

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
    refetchInterval: 15 * 60 * 1000, // 15 minutes
  });

  // Search users with the new function
  const { data: searchedUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-search-users', debouncedSearch],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_users', { 
        search_term: debouncedSearch,
        limit_count: 500
      });
      if (error) throw error;
      return data as { user_id: string; email: string; first_name: string; last_name: string; created_at: string }[];
    },
    enabled: isAdmin,
    refetchInterval: 15 * 60 * 1000, // 15 minutes
  });

  // Build users list with roles and feedback counts
  const users: UserWithRole[] = searchedUsers.map(u => {
    const feedbackCount = feedbacks.filter(f => f.user_id === u.user_id).length;
    const userFeedbacks = feedbacks.filter(f => f.user_id === u.user_id);
    const lastActivity = userFeedbacks.length > 0 
      ? userFeedbacks.reduce((latest, f) => 
          new Date(f.created_at) > new Date(latest) ? f.created_at : latest, 
          userFeedbacks[0].created_at
        )
      : null;
    
    return {
      user_id: u.user_id,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      isAdmin: userRoles.some(r => r.user_id === u.user_id),
      userRole: (userRoles.find(r => r.user_id === u.user_id)?.role as 'admin' | 'viewer') || null,
      feedbackCount,
      lastActivity,
      created_at: u.created_at,
    };
  });

  const filteredUsers = users;

  // Respond to feedback mutation
  const respondMutation = useMutation({
    mutationFn: async ({ feedbackId, response }: { feedbackId: string; response: string }) => {
      const { error } = await supabase
        .from('feedback')
        .update({ 
          response, 
          responded_at: new Date().toISOString(),
          read_by_user: false 
        })
        .eq('id', feedbackId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedbacks'] });
      toast({
        title: 'Réponse envoyée',
        description: "L'utilisateur sera notifié de votre réponse",
      });
      setResponseText('');
      setSelectedFeedback(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible d'envoyer la réponse",
        variant: 'destructive',
      });
    },
  });

  // Add role mutation
  const addAdminMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'viewer' }) => {
      // Remove existing role first if any
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .in('role', ['admin', 'viewer'] as any[]);

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role } as any);

      if (error) throw error;
    },
    onSuccess: (_, { role }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast({
        title: role === 'admin' ? 'Créateur ajouté' : 'Viewer ajouté',
        description: `Le rôle ${role === 'admin' ? 'Créateur' : 'Viewer'} a été attribué`,
      });
      setNewAdminId('');
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible d'attribuer le rôle",
        variant: 'destructive',
      });
    },
  });

  // Remove role mutation
  const removeAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .in('role', ['admin', 'viewer'] as any[]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast({
        title: 'Rôle retiré',
        description: "Le rôle a été retiré",
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible de retirer le rôle",
        variant: 'destructive',
      });
    },
  });

  const handleRespond = () => {
    if (!selectedFeedback || !responseText.trim()) return;
    respondMutation.mutate({ 
      feedbackId: selectedFeedback.id, 
      response: responseText.trim() 
    });
  };

  const handleAddAdmin = () => {
    if (!newAdminId.trim()) return;
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(newAdminId.trim())) {
      toast({
        title: 'ID invalide',
        description: "Veuillez entrer un UUID valide",
        variant: 'destructive',
      });
      return;
    }
    addAdminMutation.mutate({ userId: newAdminId.trim(), role: 'admin' });
  };

  // Loading state
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Accès refusé</h2>
            <p className="text-muted-foreground mb-4">Vous devez être connecté pour accéder à cette page.</p>
            <Button onClick={() => navigate('/auth')}>Se connecter</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Accès restreint</h2>
            <p className="text-muted-foreground mb-4">Cette page est réservée aux administrateurs.</p>
            <Button variant="outline" onClick={() => navigate('/app')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingCount = feedbacks.filter(f => !f.response).length;
  const respondedCount = feedbacks.filter(f => f.response).length;
  const adminCount = userRoles.length;

  return (
    <>
      <Helmet>
        <title>Administration | IKtracker</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://iktracker.fr/admin" />
      </Helmet>
      <div className="min-h-screen bg-background cursor-default">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground px-4 pt-12 pb-6 rounded-b-[2rem]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/app')}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Administration</h1>
              <p className="text-sm opacity-80">Gestion des avis et utilisateurs</p>
            </div>
            <Shield className="w-8 h-8 opacity-80" />
          </div>
          
          {/* Stats */}
          <div className="flex gap-3 mt-4 flex-wrap">
            <div className="bg-primary-foreground/10 rounded-xl px-4 py-2">
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs opacity-80">En attente</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-xl px-4 py-2">
              <p className="text-2xl font-bold">{respondedCount}</p>
              <p className="text-xs opacity-80">Répondus</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-xl px-4 py-2">
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-xs opacity-80">Utilisateurs</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-xl px-4 py-2">
              <p className="text-2xl font-bold">{adminCount}</p>
              <p className="text-xs opacity-80">{adminRole === 'admin' ? 'Créateur' : 'Viewer'}</p>
            </div>
          </div>
          
          {/* Quick actions */}
          <div className="mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/admin/blog')}
              className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 border-0"
            >
              <FileText className="w-4 h-4 mr-2" />
              Gérer le blog
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full mb-4 ${adminRole === 'viewer' ? 'grid-cols-4' : 'grid-cols-7'}`}>
            <TabsTrigger value="stats" className="flex items-center gap-1 text-xs sm:text-sm">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="feedbacks" className="flex items-center gap-1 text-xs sm:text-sm">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Avis</span> ({feedbacks.length})
            </TabsTrigger>
            {adminRole !== 'viewer' && (
              <TabsTrigger value="users" className="flex items-center gap-1 text-xs sm:text-sm">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="costs" className="flex items-center gap-1 text-xs sm:text-sm">
              <Euro className="w-4 h-4" />
              <span className="hidden sm:inline">Coût</span>
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-1 text-xs sm:text-sm">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Backend</span>
            </TabsTrigger>
            {adminRole !== 'viewer' && (
              <TabsTrigger value="surveys" className="flex items-center gap-1 text-xs sm:text-sm">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Surveys</span>
              </TabsTrigger>
            )}
            {adminRole !== 'viewer' && (
              <TabsTrigger value="docs" className="flex items-center gap-1 text-xs sm:text-sm">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Docs</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <AdminStats />
          </TabsContent>

          {/* Feedbacks Tab */}
          <TabsContent value="feedbacks" className="space-y-4">
            {feedbacksLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : feedbacks.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun avis pour le moment</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {/* Feedback List */}
                <Card className="md:col-span-1">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Avis des utilisateurs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[450px]">
                      <div className="space-y-2 p-4 pt-0">
                        {feedbacks.map((feedback) => (
                          <div
                            key={feedback.id}
                            onClick={() => {
                              setSelectedFeedback(feedback);
                              setResponseText(feedback.response || '');
                            }}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedFeedback?.id === feedback.id
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium truncate">
                                  {feedback.user_first_name || feedback.user_last_name 
                                    ? `${feedback.user_first_name || ''} ${feedback.user_last_name || ''}`.trim()
                                    : feedback.user_email || feedback.user_id.slice(0, 8) + '...'}
                                </span>
                              </div>
                              {feedback.response ? (
                                <Badge variant="outline" className="text-green-600 border-green-600 shrink-0">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Répondu
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="shrink-0">En attente</Badge>
                              )}
                            </div>
                            <p className="text-sm line-clamp-2">{feedback.message}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {format(new Date(feedback.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                              {feedback.image_url && (
                                <ImageIcon className="w-3 h-3 ml-2" />
                              )}
                              {feedback.phone_number && (
                                <span className="ml-2 text-green-600">📞</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Response Panel */}
                <Card className="md:col-span-1">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Détail & Réponse</CardTitle>
                    <CardDescription>
                      {selectedFeedback 
                        ? 'Répondez à cet avis' 
                        : 'Sélectionnez un avis pour répondre'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedFeedback ? (
                      <div className="space-y-4">
                        {/* Original message */}
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">
                              {selectedFeedback.user_first_name || selectedFeedback.user_last_name 
                                ? `${selectedFeedback.user_first_name || ''} ${selectedFeedback.user_last_name || ''}`.trim()
                                : selectedFeedback.user_email || 'Utilisateur'}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(selectedFeedback.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                            </p>
                          </div>
                          {selectedFeedback.user_email && (
                            <p className="text-xs text-muted-foreground mb-2">{selectedFeedback.user_email}</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{selectedFeedback.message}</p>
                          
                          {selectedFeedback.phone_number && (
                            <div className="mt-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                              <p className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                                📞 {selectedFeedback.user_first_name || 'L\'utilisateur'} souhaite que tu l'appelles : {selectedFeedback.phone_number}
                              </p>
                            </div>
                          )}
                          
                          {selectedFeedback.image_url && (
                            <div className="mt-3">
                              <a 
                                href={selectedFeedback.image_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <img 
                                  src={selectedFeedback.image_url} 
                                  alt="Capture" 
                                  className="max-h-40 rounded-lg border hover:opacity-90 transition-opacity"
                                />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Response form */}
                        <div className="space-y-3">
                          <Textarea
                            placeholder="Écrivez votre réponse..."
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            className="min-h-[100px]"
                          />
                          <Button 
                            onClick={handleRespond}
                            disabled={!responseText.trim() || respondMutation.isPending}
                            className="w-full"
                          >
                            {respondMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Send className="w-4 h-4 mr-2" />
                            )}
                            {selectedFeedback.response ? 'Modifier la réponse' : 'Envoyer la réponse'}
                          </Button>
                        </div>

                        {/* Previous response */}
                        {selectedFeedback.response && (
                          <div className="bg-primary/10 rounded-lg p-4 border-l-2 border-primary">
                            <p className="text-xs text-primary font-medium mb-2">Réponse actuelle</p>
                            <p className="text-sm whitespace-pre-wrap">{selectedFeedback.response}</p>
                            {selectedFeedback.responded_at && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Envoyée le {format(new Date(selectedFeedback.responded_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Sélectionnez un avis dans la liste</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            {/* Add new admin */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Ajouter un administrateur
                </CardTitle>
                <CardDescription>
                  Entrez l'ID utilisateur pour lui donner les droits admin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="UUID de l'utilisateur (ex: 7858d450-74c5-4403-...)"
                    value={newAdminId}
                    onChange={(e) => setNewAdminId(e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                  <Button 
                    onClick={handleAddAdmin}
                    disabled={!newAdminId.trim() || addAdminMutation.isPending}
                  >
                    {addAdminMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Crown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Search users */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Liste des utilisateurs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par prénom, nom ou email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setDebouncedSearch(userSearch);
                        }
                      }}
                      className="pl-10"
                    />
                  </div>
                  <Button 
                    onClick={() => setDebouncedSearch(userSearch)}
                    variant="outline"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                {usersLoading || rolesLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun utilisateur trouvé</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {filteredUsers.map((u) => (
                        <div
                          key={u.user_id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedUser(u);
                            setUserSheetOpen(true);
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm font-medium truncate">
                                {u.first_name || u.last_name 
                                  ? `${u.first_name} ${u.last_name}`.trim() 
                                  : u.email || u.user_id.slice(0, 8) + '...'}
                              </span>
                              {u.userRole === 'admin' && (
                                <Badge className="bg-amber-500 hover:bg-amber-600 flex-shrink-0">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Créateur
                                </Badge>
                              )}
                              {u.userRole === 'viewer' && (
                                <Badge variant="secondary" className="flex-shrink-0">
                                  Viewer
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5 mt-1 text-xs text-muted-foreground">
                              {u.email && (
                                <span className="truncate">{u.email}</span>
                              )}
                              <div className="flex items-center gap-4">
                                <span>{u.feedbackCount} avis</span>
                                <span>Inscrit le {format(new Date(u.created_at), 'dd/MM/yyyy', { locale: fr })}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            {u.isAdmin ? (
                              <div className="flex items-center gap-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" disabled={addAdminMutation.isPending}>
                                      {u.userRole === 'admin' ? <Crown className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => addAdminMutation.mutate({ userId: u.user_id, role: 'admin' })}
                                      className={u.userRole === 'admin' ? 'bg-accent' : ''}
                                    >
                                      <Crown className="w-4 h-4 mr-2 text-amber-500" />
                                      Créateur
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => addAdminMutation.mutate({ userId: u.user_id, role: 'viewer' })}
                                      className={u.userRole === 'viewer' ? 'bg-accent' : ''}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      Viewer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (u.user_id === user?.id) {
                                      toast({
                                        title: 'Action impossible',
                                        description: 'Vous ne pouvez pas retirer vos propres droits',
                                        variant: 'destructive',
                                      });
                                      return;
                                    }
                                    removeAdminMutation.mutate(u.user_id);
                                  }}
                                  disabled={removeAdminMutation.isPending || u.user_id === user?.id}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" disabled={addAdminMutation.isPending}>
                                    <Crown className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => addAdminMutation.mutate({ userId: u.user_id, role: 'admin' })}>
                                    <Crown className="w-4 h-4 mr-2 text-amber-500" />
                                    Créateur
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => addAdminMutation.mutate({ userId: u.user_id, role: 'viewer' })}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Viewer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Costs Tab */}
          <TabsContent value="costs">
            <AdminCosts />
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring">
            <AdminMonitoring />
          </TabsContent>

          {/* Surveys Tab */}
          <TabsContent value="surveys">
            <AdminSurveys />
          </TabsContent>

          {/* Docs Tab */}
          <TabsContent value="docs">
            <AdminDocumentation />
          </TabsContent>
        </Tabs>
      </main>

      {/* User KPI Sheet */}
      <UserKPISheet
        user={selectedUser}
        open={userSheetOpen}
        onOpenChange={setUserSheetOpen}
      />
    </div>
    </>
  );
};

export default Admin;
