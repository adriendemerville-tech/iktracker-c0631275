import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useToast } from '@/hooks/use-toast';
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
  Crown
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Feedback {
  id: string;
  user_id: string;
  message: string;
  image_url: string | null;
  response: string | null;
  responded_at: string | null;
  read_by_user: boolean;
  created_at: string;
}

interface UserWithRole {
  user_id: string;
  isAdmin: boolean;
  feedbackCount: number;
  lastActivity: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [responseText, setResponseText] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [newAdminId, setNewAdminId] = useState('');

  // Fetch feedbacks
  const { data: feedbacks = [], isLoading: feedbacksLoading } = useQuery({
    queryKey: ['admin-feedbacks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Feedback[];
    },
    enabled: isAdmin,
  });

  // Fetch user roles
  const { data: userRoles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'admin');

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Build users list from feedbacks and roles
  const users: UserWithRole[] = (() => {
    const userMap = new Map<string, UserWithRole>();
    
    // Add users from feedbacks
    feedbacks.forEach(f => {
      if (!userMap.has(f.user_id)) {
        userMap.set(f.user_id, {
          user_id: f.user_id,
          isAdmin: false,
          feedbackCount: 0,
          lastActivity: null,
        });
      }
      const u = userMap.get(f.user_id)!;
      u.feedbackCount++;
      if (!u.lastActivity || new Date(f.created_at) > new Date(u.lastActivity)) {
        u.lastActivity = f.created_at;
      }
    });

    // Mark admins
    userRoles.forEach(r => {
      if (!userMap.has(r.user_id)) {
        userMap.set(r.user_id, {
          user_id: r.user_id,
          isAdmin: true,
          feedbackCount: 0,
          lastActivity: r.created_at,
        });
      } else {
        userMap.get(r.user_id)!.isAdmin = true;
      }
    });

    return Array.from(userMap.values());
  })();

  // Filter users by search
  const filteredUsers = users.filter(u => 
    u.user_id.toLowerCase().includes(userSearch.toLowerCase())
  );

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

  // Add admin role mutation
  const addAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast({
        title: 'Admin ajouté',
        description: "L'utilisateur est maintenant administrateur",
      });
      setNewAdminId('');
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible d'ajouter l'admin",
        variant: 'destructive',
      });
    },
  });

  // Remove admin role mutation
  const removeAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast({
        title: 'Admin retiré',
        description: "Le rôle admin a été retiré",
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible de retirer l'admin",
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
    addAdminMutation.mutate(newAdminId.trim());
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
            <Button variant="outline" onClick={() => navigate('/')}>
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground px-4 pt-12 pb-6 rounded-b-[2rem]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
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
              <p className="text-xs opacity-80">Admins</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <Tabs defaultValue="feedbacks" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="feedbacks" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Avis ({feedbacks.length})
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Utilisateurs ({users.length})
            </TabsTrigger>
          </TabsList>

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
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground font-mono">
                                  {feedback.user_id.slice(0, 8)}...
                                </span>
                              </div>
                              {feedback.response ? (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Répondu
                                </Badge>
                              ) : (
                                <Badge variant="destructive">En attente</Badge>
                              )}
                            </div>
                            <p className="text-sm line-clamp-2">{feedback.message}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {format(new Date(feedback.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                              {feedback.image_url && (
                                <ImageIcon className="w-3 h-3 ml-2" />
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
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(selectedFeedback.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{selectedFeedback.message}</p>
                          
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
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par ID utilisateur..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10 font-mono"
                  />
                </div>

                {rolesLoading ? (
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
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-mono text-sm truncate">
                                {u.user_id}
                              </span>
                              {u.isAdmin && (
                                <Badge className="bg-amber-500 hover:bg-amber-600 flex-shrink-0">
                                  <Crown className="w-3 h-3 mr-1" />
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span>{u.feedbackCount} avis</span>
                              {u.lastActivity && (
                                <span>
                                  Dernière activité: {format(new Date(u.lastActivity), 'dd/MM/yyyy', { locale: fr })}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {u.isAdmin ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (u.user_id === user?.id) {
                                  toast({
                                    title: 'Action impossible',
                                    description: 'Vous ne pouvez pas retirer vos propres droits admin',
                                    variant: 'destructive',
                                  });
                                  return;
                                }
                                removeAdminMutation.mutate(u.user_id);
                              }}
                              disabled={removeAdminMutation.isPending || u.user_id === user?.id}
                              className="text-destructive hover:text-destructive flex-shrink-0"
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addAdminMutation.mutate(u.user_id)}
                              disabled={addAdminMutation.isPending}
                              className="flex-shrink-0"
                            >
                              <Crown className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
