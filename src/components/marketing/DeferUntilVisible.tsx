import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";

interface DeferUntilVisibleProps {
  children: ReactNode;
  /** Placeholder rendu tant que le bloc n'est pas proche du viewport (réserve la hauteur → pas de CLS). */
  fallback?: ReactNode;
  /** Marge d'anticipation avant l'entrée dans le viewport. */
  rootMargin?: string;
}

/**
 * Monte ses enfants uniquement quand le bloc approche du viewport.
 *
 * Objectif LCP mobile : les chunks lourds sous la ligne de flottaison
 * (simulateur, encarts partenaires, QR code…) ne se téléchargent plus en
 * concurrence du rendu du hero. À n'utiliser QUE pour des composants déjà
 * `lazy` (donc absents du HTML SSR) : le contenu indexable doit rester rendu
 * statiquement autour de ce wrapper.
 */
export const DeferUntilVisible = ({
  children,
  fallback = null,
  rootMargin = "300px",
}: DeferUntilVisibleProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref}>{visible ? <Suspense fallback={fallback}>{children}</Suspense> : fallback}</div>
  );
};
