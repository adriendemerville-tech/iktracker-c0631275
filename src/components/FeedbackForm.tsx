import { useState, useRef, useEffect } from 'react';
import { MessageSquareHeart, Camera, X, Loader2, Send, MessageCircle, Clock, ChevronDown, HelpCircle, User, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFeedback } from '@/hooks/useFeedback';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

const MAX_CHARS = 700;

// FAQ items
const FAQ_ITEMS = [
  {
    question: "Comment sont calculées mes indemnités kilométriques ?",
    answer: "Les indemnités sont calculées selon le barème fiscal officiel 2024, basé sur la puissance fiscale de votre véhicule et le nombre de kilomètres parcourus. Le calcul prend en compte les trois tranches : jusqu'à 5 000 km, de 5 001 à 20 000 km, et au-delà de 20 000 km. Un bonus de 20% est appliqué pour les véhicules électriques."
  },
  {
    question: "Comment synchroniser mon calendrier professionnel ?",
    answer: "Rendez-vous dans la section Calendriers (icône calendrier dans la barre latérale). Vous pouvez connecter Google Calendar ou Outlook pour importer automatiquement vos rendez-vous professionnels. L'application créera un trajet pour chaque événement avec une adresse détectée."
  },
  {
    question: "Comment récupérer mes trajets passés depuis Google Maps ?",
    answer: "Utilisez la fonction 'Récupération Auto' (icône étoile dorée dans la barre latérale). Exportez votre historique de positions depuis Google Takeout, puis importez le fichier JSON. L'application détectera automatiquement vos trajets professionnels et calculera les indemnités correspondantes."
  },
];

interface FeedbackFormProps {
  hasNotification?: boolean;
  onStartTutorial?: () => void;
}

export const FeedbackForm = ({ hasNotification = false, onStartTutorial }: FeedbackFormProps) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { feedbacks, unreadResponsesCount, markAllAsRead } = useFeedback();
  const isMobile = useIsMobile();
  const isDesktop = !isMobile;

  // Mark all as read when dialog opens
  useEffect(() => {
    if (open && unreadResponsesCount > 0) {
      markAllAsRead();
    }
  }, [open, unreadResponsesCount, markAllAsRead]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Image trop volumineuse',
          description: 'La taille maximale est de 5 Mo',
          variant: 'destructive',
        });
        return;
      }
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: 'Message requis',
        description: 'Veuillez écrire votre avis',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Non connecté',
        description: 'Vous devez être connecté pour envoyer un avis',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let imageUrl: string | null = null;

      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('feedback-images')
          .upload(fileName, image);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Erreur lors du téléchargement de l\'image');
        }

        const { data: urlData } = supabase.storage
          .from('feedback-images')
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          message: message.trim(),
          image_url: imageUrl,
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Erreur lors de l\'envoi de votre avis');
      }

      toast({
        title: 'Merci pour votre avis !',
        description: 'Votre retour nous aide à améliorer l\'application',
      });

      setMessage('');
      setImage(null);
      setImagePreview(null);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartTutorial = () => {
    setOpen(false);
    onStartTutorial?.();
  };

  const charsRemaining = MAX_CHARS - message.length;
  const feedbacksWithResponses = feedbacks.filter(f => f.response);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="relative">
          <Button variant="outline" className="w-full">
            <MessageSquareHeart className="w-4 h-4 mr-2" />
            Votre avis compte
          </Button>
          {(unreadResponsesCount > 0 || hasNotification) && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full animate-pulse"
            >
              {unreadResponsesCount || '!'}
            </Badge>
          )}
        </div>
      </DialogTrigger>
      <DialogContent className={`${isDesktop ? 'sm:max-w-lg' : 'sm:max-w-md'} max-h-[90vh] flex flex-col`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareHeart className="w-5 h-5 text-primary" />
            Votre avis compte
          </DialogTitle>
          <DialogDescription>
            Partagez vos suggestions pour améliorer IKtracker
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="flex flex-col gap-4 mt-4">
            {/* Tutorial restart button */}
            {isDesktop && onStartTutorial && (
              <Button
                variant="outline"
                onClick={handleStartTutorial}
                className="w-full justify-start text-muted-foreground hover:text-foreground"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Revoir le didacticiel de l'application
              </Button>
            )}

            {/* Previous feedbacks with responses */}
            {feedbacksWithResponses.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Réponses ({feedbacksWithResponses.length})
                </h4>
                <div className="max-h-[150px] overflow-y-auto rounded-md border p-3">
                  <div className="space-y-4">
                    {feedbacksWithResponses.map((feedback) => (
                      <div key={feedback.id} className="space-y-2">
                        {/* User's message */}
                        <div className="bg-muted/50 rounded-lg p-2">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(feedback.created_at), 'dd MMM yyyy', { locale: fr })}
                          </p>
                          <p className="text-sm mt-1">{feedback.message}</p>
                        </div>
                        {/* Admin response */}
                        <div className="bg-primary/10 rounded-lg p-2 ml-4 border-l-2 border-primary">
                          <p className="text-xs text-primary font-medium">Réponse de l'équipe</p>
                          <p className="text-sm mt-1">{feedback.response}</p>
                          {feedback.responded_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(feedback.responded_at), 'dd MMM yyyy', { locale: fr })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* New message form */}
            <div className="space-y-2">
              <Textarea
                placeholder="Décrivez votre retour d'expérience, une suggestion d'amélioration ou un bug rencontré..."
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
                className="min-h-[100px] resize-none"
              />
              <p className={`text-xs text-right ${charsRemaining < 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {charsRemaining} caractères restants
              </p>
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="feedback-image"
              />
              
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Aperçu"
                    className="max-h-24 rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full shadow-md hover:bg-destructive/90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Ajouter une capture d'écran
                </Button>
              )}
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={loading || !message.trim()}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Envoyer mon avis
            </Button>

            {/* Desktop only: FAQ Section */}
            {isDesktop && (
              <>
                <Separator className="my-2" />
                
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    Questions fréquentes
                  </h4>
                  
                  <Accordion type="single" collapsible className="w-full">
                    {FAQ_ITEMS.map((item, index) => (
                      <AccordionItem key={index} value={`faq-${index}`}>
                        <AccordionTrigger className="text-sm text-left hover:no-underline">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                <Separator className="my-2" />

                {/* Founder testimonial */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">
                    Pourquoi IKTracker est gratuit ?
                  </h4>
                  
                  <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
                    <div className="flex gap-4">
                      <img 
                        src="/src/assets/founder-adrien.jpg" 
                        alt="Adrien, fondateur d'IKTracker"
                        className="w-16 h-16 rounded-full object-cover border-2 border-primary/30 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground italic leading-relaxed">
                          "J'ai créé IKTracker car je perdais des heures à calculer mes indemnités kilométriques sur Excel. Aujourd'hui, je veux que chaque professionnel en déplacement puisse récupérer facilement ce qui lui est dû. La gratuité permet à tous d'y accéder."
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Adrien</span>
                          <span className="text-xs text-muted-foreground">— Fondateur</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
