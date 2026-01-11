import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { isBrowser, isBot } from "@/lib/ssr-utils";

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(() => {
    // Default to online for SSR/bots
    if (!isBrowser()) return true;
    return navigator?.onLine ?? true;
  });
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
    // Skip for SSR and bots
    if (!isBrowser() || isBot()) return;

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline };
};
