import { Suspense, useEffect, useState, type ReactNode } from "react";

interface DeferUntilIdleProps {
  children: ReactNode;
  /** Délai maximum avant montage forcé, même sans interaction (ms). */
  timeout?: number;
}

const INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

/**
 * Monte ses enfants uniquement après la première interaction utilisateur
 * (ou après `timeout` ms). Objectif : sortir les chunks lourds non critiques
 * (framer-motion, modales marketing…) du chemin critique de chargement —
 * le code n'est téléchargé ni exécuté qu'une fois la page interactive.
 *
 * À réserver aux composants `lazy` sans contenu indexable.
 */
export const DeferUntilIdle = ({ children, timeout = 4000 }: DeferUntilIdleProps) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const enable = () => setReady(true);
    const timer = window.setTimeout(enable, timeout);
    INTERACTION_EVENTS.forEach((event) =>
      window.addEventListener(event, enable, { once: true, passive: true }),
    );
    return () => {
      window.clearTimeout(timer);
      INTERACTION_EVENTS.forEach((event) => window.removeEventListener(event, enable));
    };
  }, [timeout]);

  if (!ready) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
};
