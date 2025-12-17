import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
  Loader2
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

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [responseText, setResponseText] = useState('');

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
        description: 'L\'utilisateur sera notifié de votre réponse',
      });
      setResponseText('');
      setSelectedFeedback(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'envoyer la réponse',
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
              <p className="text-sm opacity-80">Gestion des avis utilisateurs</p>
            </div>
            <Shield className="w-8 h-8 opacity-80" />
          </div>
          
          {/* Stats */}
          <div className="flex gap-4 mt-4">
            <div className="bg-primary-foreground/10 rounded-xl px-4 py-2">
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs opacity-80">En attente</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-xl px-4 py-2">
              <p className="text-2xl font-bold">{respondedCount}</p>
              <p className="text-xs opacity-80">Répondus</p>
            </div>
            <div className="bg-primary-foreground/10 rounded-xl px-4 py-2">
              <p className="text-2xl font-bold">{feedbacks.length}</p>
              <p className="text-xs opacity-80">Total</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
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
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Avis des utilisateurs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2 p-4">
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
              <CardHeader>
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
                        className="min-h-[120px]"
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
      </main>
    </div>
  );
};

export default Admin;
