import { useState, useRef, useEffect } from 'react';
import { MessageSquareHeart, Camera, X, Loader2, Send, MessageCircle, Clock, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFeedback } from '@/hooks/useFeedback';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

const MAX_CHARS = 700;

interface FeedbackFormProps {
  hasNotification?: boolean;
}

export const FeedbackForm = ({ hasNotification = false }: FeedbackFormProps) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wantsCall, setWantsCall] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { feedbacks, unreadResponsesCount, markAllAsRead } = useFeedback();

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

  const isValidPhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    return /^0[67]\d{8}$/.test(cleaned);
  };

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    
    // OS detection
    let os = 'Unknown';
    if (/Windows NT 10/i.test(ua)) os = 'Windows 10';
    else if (/Windows NT 11|Windows NT 10.*Build\/(2[2-9]|[3-9])/i.test(ua)) os = 'Windows 11';
    else if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac OS X/i.test(ua)) {
      const match = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
      os = match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
    } else if (/CrOS/i.test(ua)) os = 'Chrome OS';
    else if (/Android/i.test(ua)) {
      const match = ua.match(/Android (\d+\.?\d*)/);
      os = match ? `Android ${match[1]}` : 'Android';
    } else if (/iPhone OS|iPad/i.test(ua)) {
      const match = ua.match(/OS (\d+_\d+)/);
      os = match ? `iOS ${match[1].replace('_', '.')}` : 'iOS';
    } else if (/Linux/i.test(ua)) os = 'Linux';
    
    // Browser detection
    let browser = 'Unknown';
    let browserVersion = '';
    if (/OPR|Opera/i.test(ua)) {
      browser = 'Opera';
      browserVersion = ua.match(/(?:OPR|Opera)\/(\d+\.?\d*)/)?.[1] || '';
    } else if (/Edg/i.test(ua)) {
      browser = 'Edge';
      browserVersion = ua.match(/Edg\/(\d+\.?\d*)/)?.[1] || '';
    } else if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) {
      browser = 'Chrome';
      browserVersion = ua.match(/Chrome\/(\d+\.?\d*)/)?.[1] || '';
    } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
      browser = 'Safari';
      browserVersion = ua.match(/Version\/(\d+\.?\d*)/)?.[1] || '';
    } else if (/Firefox/i.test(ua)) {
      browser = 'Firefox';
      browserVersion = ua.match(/Firefox\/(\d+\.?\d*)/)?.[1] || '';
    }
    
    // Device brand/model
    let device = '';
    if (/iPhone/i.test(ua)) device = 'Apple iPhone';
    else if (/iPad/i.test(ua)) device = 'Apple iPad';
    else if (/Macintosh/i.test(ua)) device = 'Apple Mac';
    else {
      const androidMatch = ua.match(/;\s*([^;)]+)\s*Build/);
      if (androidMatch) device = androidMatch[1].trim();
    }
    
    return {
      platform: isMobileDevice ? 'mobile' : 'desktop',
      os,
      browser,
      browser_version: browserVersion,
      device: device || null,
      user_agent: ua,
    };
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

    if (wantsCall && !isValidPhone(phoneNumber)) {
      toast({
        title: 'Numéro invalide',
        description: 'Veuillez entrer un numéro commençant par 06 ou 07 (10 chiffres)',
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
          phone_number: wantsCall ? phoneNumber.replace(/\s/g, '') : null,
          device_info: getDeviceInfo(),
        } as any);

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
      setWantsCall(false);
      setPhoneNumber('');
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col cursor-default select-none">
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
                className="min-h-[150px] resize-none cursor-text select-text"
              />
              <p className={`text-xs text-right ${charsRemaining < 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {charsRemaining} caractères restants
              </p>
            </div>

            {/* Call me checkbox */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="wants-call"
                  checked={wantsCall}
                  onCheckedChange={(checked) => {
                    setWantsCall(checked === true);
                    if (!checked) setPhoneNumber('');
                  }}
                />
                <label htmlFor="wants-call" className="text-sm font-medium cursor-pointer">
                  <Phone className="w-4 h-4 inline mr-1.5 text-primary" />
                  Adrien, j'aimerais que tu m'appelle
                </label>
              </div>

              {wantsCall && (
                <div className="space-y-2 ml-7">
                  <Input
                    type="tel"
                    placeholder="06 XX XX XX XX ou 07 XX XX XX XX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="cursor-text select-text"
                    maxLength={14}
                  />
                  <p className="text-xs text-green-600 dark:text-green-400 leading-relaxed">
                    Numéro non sauvegardé, il s'effacera de la conversation au bout de 7 jours.
                  </p>
                </div>
              )}
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

          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
