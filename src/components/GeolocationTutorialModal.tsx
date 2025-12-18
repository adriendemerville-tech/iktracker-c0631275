import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Settings, Chrome, Globe, RefreshCw } from 'lucide-react';

interface GeolocationTutorialModalProps {
  open: boolean;
  onClose: () => void;
  isGpsDisabled: boolean;
}

export function GeolocationTutorialModal({
  open,
  onClose,
  isGpsDisabled,
}: GeolocationTutorialModalProps) {
  // Detect browser
  const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|Edg/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const isFirefox = /Firefox/.test(navigator.userAgent);

  if (isGpsDisabled) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <MapPin className="w-7 h-7 text-destructive" />
            </div>
            <DialogTitle className="text-center">GPS désactivé</DialogTitle>
            <DialogDescription className="text-center">
              Veuillez activer le GPS de votre téléphone pour utiliser IKtracker
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Settings className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Sur iPhone :</p>
                <p className="text-muted-foreground">
                  Réglages → Confidentialité → Service de localisation → Activer
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Settings className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Sur Android :</p>
                <p className="text-muted-foreground">
                  Paramètres → Localisation → Activer
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button onClick={onClose}>Compris</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
            <MapPin className="w-7 h-7 text-amber-500" />
          </div>
          <DialogTitle className="text-center">Localisation refusée</DialogTitle>
          <DialogDescription className="text-center">
            Pour utiliser la fonction d'automatisation des trajets, vous devez autoriser l'accès à votre position.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground text-center">
            Voici comment réactiver la localisation :
          </p>
          
          {(isChrome || (!isSafari && !isFirefox)) && (
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Chrome className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Chrome :</p>
                <ol className="text-muted-foreground list-decimal list-inside space-y-1 mt-1">
                  <li>Cliquez sur l'icône de cadenas dans la barre d'adresse</li>
                  <li>Cliquez sur "Paramètres du site"</li>
                  <li>Définissez "Position" sur "Autoriser"</li>
                  <li>Rechargez la page</li>
                </ol>
              </div>
            </div>
          )}
          
          {isSafari && (
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Globe className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Safari :</p>
                <ol className="text-muted-foreground list-decimal list-inside space-y-1 mt-1">
                  <li>Allez dans Réglages → Safari</li>
                  <li>Faites défiler jusqu'à "Position"</li>
                  <li>Sélectionnez "Demander" ou "Autoriser"</li>
                  <li>Rechargez la page</li>
                </ol>
              </div>
            </div>
          )}
          
          {isFirefox && (
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Globe className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Firefox :</p>
                <ol className="text-muted-foreground list-decimal list-inside space-y-1 mt-1">
                  <li>Cliquez sur l'icône du site dans la barre d'adresse</li>
                  <li>Cliquez sur "Supprimer l'autorisation" pour la position</li>
                  <li>Rechargez et autorisez à nouveau</li>
                </ol>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onClose}>
            Plus tard
          </Button>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Recharger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
