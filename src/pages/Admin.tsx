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
import { AdminAffiliation } from '@/components/admin/AdminAffiliation';
import { AdminDocumentation } from '@/components/admin/AdminDocumentation';
import { AdminMonitoring } from '@/components/admin/AdminMonitoring';
import { AdminAutopilot } from '@/components/admin/AdminAutopilot';
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
  Eye,
  Monitor,
  Smartphone,
  Globe,
  Link2,
  Zap,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  is_admin_message: boolean;
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
  const [selectedConversationUserId, setSelectedConversationUserId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newAdminId, setNewAdminId] = useState('');
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'stats');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [userSheetOpen, setUserSheetOpen] = useState(false);
  const [convoToDelete, setConvoToDelete] = useState<string | null>(null);
  const [adminMessageText, setAdminMessageText] = useState('');

  // Unresolved critical errors count for header alert
  const { data: unresolvedErrors = 0 } = useQuery({
    queryKey: ['admin-unresolved-errors-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false);
      if (error) throw error;
      return count || 0;
    },
    enabled: isAdmin,
    refetchInterval: 5 * 60 * 1000,
  });

  const sendAdminMessage = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!user || !adminMessageText.trim()) return;
      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: targetUserId,
          message: adminMessageText.trim(),
          response: null,
          is_admin_message: true,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedbacks'] });
      setAdminMessageText('');
      toast({ title: 'Message envoyé' });
    },
    onError: () => {
      toast({ title: "Erreur lors de l'envoi", variant: 'destructive' });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('feedback')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedbacks'] });
      if (selectedConversationUserId === convoToDelete) {
        setSelectedConversationUserId(null);
        setSelectedFeedback(null);
      }
      setConvoToDelete(null);
      toast({ title: 'Conversation supprimée' });
    },
    onError: () => {
      toast({ title: 'Erreur lors de la suppression', variant: 'destructive' });
    },
  });
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

  const CLOSING_FORMULAS = ['Bien à toi', 'Amicalement', 'Bonne journée', 'A bientôt'];
  const getRandomClosing = () => CLOSING_FORMULAS[Math.floor(Math.random() * CLOSING_FORMULAS.length)];

  // Respond to feedback mutation
  const respondMutation = useMutation({
    mutationFn: async ({ feedbackId, response, existingResponse }: { feedbackId: string; response: string; existingResponse: string | null }) => {
      const signedResponse = `${response}\n\n${getRandomClosing()},\nAdrien.`;
      const fullResponse = existingResponse 
        ? `${existingResponse}\n\n---\n\n${signedResponse}`
        : signedResponse;

      const { error } = await supabase
        .from('feedback')
        .update({ 
          response: fullResponse, 
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

  const handleRespond = (feedbackToRespond: Feedback) => {
    if (!responseText.trim()) return;
    respondMutation.mutate({ 
      feedbackId: feedbackToRespond.id, 
      response: responseText.trim(),
      existingResponse: feedbackToRespond.response || null,
    });
  };

  // Group feedbacks by user_id as conversations
  interface ConversationGroup {
    userId: string;
    userName: string;
    userEmail: string;
    messages: Feedback[];
    lastMessageAt: string;
    unrespondedCount: number;
    totalCount: number;
  }

  const conversations: ConversationGroup[] = (() => {
    const grouped = new Map<string, Feedback[]>();
    for (const f of feedbacks) {
      const existing = grouped.get(f.user_id) || [];
      existing.push(f);
      grouped.set(f.user_id, existing);
    }
    
    return Array.from(grouped.entries()).map(([userId, msgs]) => {
      const sorted = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const latest = sorted[sorted.length - 1];
      const name = latest.user_first_name || latest.user_last_name 
        ? `${latest.user_first_name || ''} ${latest.user_last_name || ''}`.trim()
        : '';
      return {
        userId,
        userName: name,
        userEmail: latest.user_email || userId.slice(0, 8) + '...',
        messages: sorted,
        lastMessageAt: latest.created_at,
        unrespondedCount: sorted.filter(m => !m.response).length,
        totalCount: sorted.length,
      };
    }).sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  })();

  const selectedConversation = conversations.find(c => c.userId === selectedConversationUserId) || null;

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

  // Not authenticated — redirect to auth
  if (!user) {
    navigate('/auth', { replace: true });
    return null;
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
            <div className="flex items-center gap-2">
              {unresolvedErrors > 0 && (
                <button
                  onClick={() => setActiveTab('monitoring')}
                  className="flex items-center gap-1.5 bg-destructive/20 hover:bg-destructive/30 text-primary-foreground rounded-full px-3 py-1.5 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-semibold">{unresolvedErrors} erreur{unresolvedErrors > 1 ? 's' : ''}</span>
                </button>
              )}
              <Shield className="w-8 h-8 opacity-80" />
            </div>
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
              onClick={() => navigate('/app/admin/blog')}
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
          <TabsList className={`grid w-full mb-4 ${adminRole === 'viewer' ? 'grid-cols-5' : 'grid-cols-8'}`}>
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
              <span className="hidden sm:inline">Finances</span>
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-1 text-xs sm:text-sm">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Backend</span>
            </TabsTrigger>
            <TabsTrigger value="autopilot" className="flex items-center gap-1 text-xs sm:text-sm">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Autopilot</span>
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
                {/* Conversation List - grouped by user */}
                <Card className="md:col-span-1">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Conversations ({conversations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-1 p-4 pt-0">
                        {conversations.map((convo) => (
                          <div
                            key={convo.userId}
                            onClick={() => {
                              setSelectedConversationUserId(convo.userId);
                              setSelectedFeedback(null);
                              setResponseText('');
                            }}
                            className={`group relative p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedConversationUserId === convo.userId
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConvoToDelete(convo.userId);
                              }}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              title="Supprimer la conversation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex items-start justify-between gap-2 mb-1.5 pr-6">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-sm font-medium block truncate">
                                    {convo.userName || convo.userEmail}
                                  </span>
                                  {convo.userName && (
                                    <span className="text-[11px] text-muted-foreground truncate block">{convo.userEmail}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {convo.totalCount > 1 && (
                                  <Badge variant="secondary" className="text-[10px] h-5">
                                    {convo.totalCount} msg
                                  </Badge>
                                )}
                                {convo.unrespondedCount > 0 ? (
                                  <Badge variant="destructive" className="text-[10px] h-5">
                                    {convo.unrespondedCount}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-green-600 border-green-600 text-[10px] h-5">
                                    <CheckCircle2 className="w-3 h-3" />
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {convo.messages[convo.messages.length - 1].message}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {format(new Date(convo.lastMessageAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Conversation Thread Panel */}
                <Card className="md:col-span-1">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      {selectedConversation 
                        ? `Conversation avec ${selectedConversation.userName || selectedConversation.userEmail}`
                        : 'Détail & Réponse'}
                    </CardTitle>
                    <CardDescription>
                      {selectedConversation 
                        ? `${selectedConversation.totalCount} message${selectedConversation.totalCount > 1 ? 's' : ''}`
                        : 'Sélectionnez une conversation'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedConversation ? (
                      <ScrollArea className="h-[440px]">
                        <div className="space-y-4 pr-2">
                          {selectedConversation.messages.map((msg, idx) => (
                            <div key={msg.id} className="space-y-2">
                              {/* Message bubble */}
                              <div className={`rounded-lg p-3 ${msg.is_admin_message ? 'bg-primary/10 ml-4 border-l-2 border-primary' : 'bg-muted/50'}`}>
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className={`text-xs font-medium flex items-center gap-1 ${msg.is_admin_message ? 'text-primary' : 'text-muted-foreground'}`}>
                                    <User className="w-3 h-3" />
                                    {msg.is_admin_message ? 'Admin' : `${msg.user_first_name || ''} ${msg.user_last_name || ''}`.trim() || 'Utilisateur'}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(msg.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                                  </p>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                
                                {msg.phone_number && (
                                  <div className="mt-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-2">
                                    <p className="text-xs font-medium text-green-700 dark:text-green-400">
                                      📞 {msg.phone_number}
                                    </p>
                                  </div>
                                )}
                                
                                {msg.image_url && (
                                  <a href={msg.image_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
                                    <img src={msg.image_url} alt="Capture" className="max-h-32 rounded border hover:opacity-90 transition-opacity" />
                                  </a>
                                )}

                                {msg.device_info && (
                                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    {msg.device_info.platform === 'mobile' ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                                    <span>{msg.device_info.os} · {msg.device_info.browser}</span>
                                  </div>
                                )}
                              </div>

                              {/* Admin response(s) */}
                              {msg.response && (
                                <div className="bg-primary/10 rounded-lg p-3 ml-4 border-l-2 border-primary">
                                  <p className="text-[11px] text-primary font-medium mb-1">Réponse admin</p>
                                  <p className="text-sm whitespace-pre-wrap">{msg.response}</p>
                                  {msg.responded_at && (
                                    <p className="text-[10px] text-muted-foreground mt-1.5">
                                      {format(new Date(msg.responded_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Reply form for the latest unreplied message, or last message */}
                              {!msg.response && !(msg as any).is_admin_message && (
                                <div className="ml-4 space-y-2">
                                  <Textarea
                                    placeholder="Répondre à ce message..."
                                    value={selectedFeedback?.id === msg.id ? responseText : ''}
                                    onFocus={() => { setSelectedFeedback(msg); setResponseText(''); }}
                                    onChange={(e) => {
                                      if (selectedFeedback?.id !== msg.id) setSelectedFeedback(msg);
                                      setResponseText(e.target.value);
                                    }}
                                    className="min-h-[70px] text-sm"
                                  />
                                  {selectedFeedback?.id === msg.id && responseText.trim() && (
                                    <>
                                      <p className="text-[10px] text-muted-foreground">Signature « Adrien. » ajoutée automatiquement.</p>
                                      <Button 
                                        onClick={() => handleRespond(msg)}
                                        disabled={respondMutation.isPending}
                                        size="sm"
                                        className="w-full"
                                      >
                                        {respondMutation.isPending ? (
                                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                        ) : (
                                          <Send className="w-3 h-3 mr-1" />
                                        )}
                                        Envoyer
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Separator between messages */}
                              {idx < selectedConversation.messages.length - 1 && (
                                <div className="border-t border-dashed my-2" />
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Sélectionnez une conversation</p>
                      </div>
                    )}
                  {selectedConversationUserId && (
                    <div className="border-t mt-3 pt-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Envoyer un message..."
                          value={adminMessageText}
                          onChange={(e) => setAdminMessageText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && adminMessageText.trim()) {
                              e.preventDefault();
                              sendAdminMessage.mutate(selectedConversationUserId);
                            }
                          }}
                          className="flex-1 text-sm"
                        />
                        <Button
                          size="icon"
                          onClick={() => sendAdminMessage.mutate(selectedConversationUserId)}
                          disabled={!adminMessageText.trim() || sendAdminMessage.isPending}
                        >
                          {sendAdminMessage.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
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

          {/* Finances Tab */}
          <TabsContent value="costs">
            <Tabs defaultValue="costs-sub" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="costs-sub" className="text-xs sm:text-sm">
                  <Euro className="w-3.5 h-3.5 mr-1.5" />
                  Coûts API
                </TabsTrigger>
                <TabsTrigger value="affiliation" className="text-xs sm:text-sm">
                  <Link2 className="w-3.5 h-3.5 mr-1.5" />
                  Affiliation
                </TabsTrigger>
              </TabsList>
              <TabsContent value="costs-sub">
                <AdminCosts />
              </TabsContent>
              <TabsContent value="affiliation">
                <AdminAffiliation />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring">
            <AdminMonitoring />
          </TabsContent>

          {/* Autopilot Tab */}
          <TabsContent value="autopilot">
            <AdminAutopilot />
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

      <AlertDialog open={!!convoToDelete} onOpenChange={(open) => !open && setConvoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les messages de cet utilisateur seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => convoToDelete && deleteConversation.mutate(convoToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
};

export default Admin;
