import { useState, useRef } from 'react';
import { MessageSquareHeart, Camera, X, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

const MAX_CHARS = 700;

export const FeedbackForm = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

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

      // Upload image if provided
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

      // Insert feedback
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

      // Reset form
      setMessage('');
      setImage(null);
      setImagePreview(null);
      setOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <MessageSquareHeart className="w-4 h-4 mr-2" />
          Votre avis compte
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareHeart className="w-5 h-5 text-primary" />
            Votre avis compte
          </DialogTitle>
          <DialogDescription>
            Partagez vos suggestions pour améliorer IkTracker
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Message textarea */}
          <div className="space-y-2">
            <Textarea
              placeholder="Décrivez votre retour d'expérience, une suggestion d'amélioration ou un bug rencontré..."
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
              className="min-h-[150px] resize-none"
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
                  className="max-h-32 rounded-lg border"
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
      </DialogContent>
    </Dialog>
  );
};
