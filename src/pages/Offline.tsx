import { WifiOff, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const Offline = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon animé */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
          <div className="relative flex items-center justify-center w-32 h-32 bg-gradient-to-br from-primary to-primary/80 rounded-full shadow-lg">
            <WifiOff className="w-16 h-16 text-primary-foreground" />
          </div>
        </div>

        {/* Message principal */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-foreground">
            Oups, pas de connexion !
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Il semble que vous n'êtes pas connecté à Internet. 
            Vérifiez votre connexion et réessayez.
          </p>
        </div>

        {/* Conseils */}
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 text-left space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            💡 Quelques conseils :
          </h2>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Vérifiez que le Wi-Fi ou les données mobiles sont activés
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Essayez de vous rapprocher de votre routeur
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Redémarrez votre connexion Internet
            </li>
          </ul>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={handleRetry}
            className="gap-2"
            size="lg"
          >
            <RefreshCw className="w-5 h-5" />
            Réessayer
          </Button>
          <Button 
            onClick={handleGoHome}
            variant="outline"
            className="gap-2"
            size="lg"
          >
            <Home className="w-5 h-5" />
            Accueil
          </Button>
        </div>

        {/* Message de réassurance */}
        <p className="text-sm text-muted-foreground">
          🚗 Vos trajets enregistrés sont sauvegardés et seront synchronisés dès que vous serez de nouveau en ligne.
        </p>
      </div>
    </div>
  );
};

export default Offline;
