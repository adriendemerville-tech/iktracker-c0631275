import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    if (wasOffline) {
      toast.success("Connexion rétablie", {
        description: "Vous êtes de nouveau connecté à Internet. Vos données seront synchronisées.",
        duration: 4000,
        icon: "🌐",
      });
    }
    setWasOffline(false);
  }, [wasOffline]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
    toast.warning("Connexion perdue", {
      description: "Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.",
      duration: 5000,
      icon: "📴",
    });
  }, []);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline };
};
